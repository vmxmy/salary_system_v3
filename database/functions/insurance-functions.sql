-- ============================================================================
-- 社保和公积金计算核心函数
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 核心类型定义
-- ----------------------------------------------------------------------------

-- 社保组件类型
CREATE TYPE social_insurance_component AS (
    component_code text,
    component_name text,
    calculation_base numeric,
    employee_rate numeric,
    employer_rate numeric,
    employee_amount numeric,
    employer_amount numeric,
    min_base numeric,
    max_base numeric,
    is_applicable boolean,
    rounding_rule text,
    calculation_metadata jsonb
);

-- 社保计算结果类型
CREATE TYPE social_insurance_result AS (
    employee_id uuid,
    period_id uuid,
    calculation_date date,
    components social_insurance_component[],
    total_employee_amount numeric,
    total_employer_amount numeric,
    applied_rules text[],
    unapplied_rules text[],
    calculation_steps jsonb[],
    warnings text[],
    errors text[],
    metadata jsonb
);

-- ----------------------------------------------------------------------------
-- 1. calculate_employee_social_insurance - 计算员工完整社保
-- ----------------------------------------------------------------------------
-- 这是最核心的社保计算函数，处理所有保险类型的计算
-- 特点：
-- - 自动获取员工信息和缴费基数
-- - 应用基数上下限规则
-- - 支持规则条件判断
-- - 包含详细的计算步骤记录

CREATE OR REPLACE FUNCTION public.calculate_employee_social_insurance(
    p_employee_id uuid,
    p_period_id uuid,
    p_calculation_date date DEFAULT CURRENT_DATE
)
RETURNS social_insurance_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result social_insurance_result;
    v_employee_info RECORD;
    v_base_amounts RECORD;
    v_applicable_configs RECORD;
    v_component social_insurance_component;
    v_components social_insurance_component[] := '{}';
    v_calculation_steps JSONB[] := '{}';
    v_applied_rules TEXT[] := '{}';
    v_unapplied_rules TEXT[] := '{}';
    v_warnings TEXT[] := '{}';
    v_errors TEXT[] := '{}';
    v_total_employee DECIMAL(12,2) := 0;
    v_total_employer DECIMAL(12,2) := 0;
    v_calculation_base DECIMAL(12,2);
    v_adjusted_base DECIMAL(12,2);
    v_base_validation JSONB;
BEGIN
    -- 步骤1: 获取员工信息
    SELECT 
        e.id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as full_name,
        ep.department_id,
        ep.position_id,
        pc.code as personnel_category,
        ep.effective_from,
        ep.effective_to,
        ep.current_status
    INTO v_employee_info
    FROM employees e
    LEFT JOIN employee_positions ep ON e.id = ep.employee_id
    LEFT JOIN personnel_categories pc ON ep.personnel_category_id = pc.id
    WHERE e.id = p_employee_id
        AND p_calculation_date >= ep.effective_from
        AND (ep.effective_to IS NULL OR p_calculation_date < ep.effective_to)
    ORDER BY ep.effective_from DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Employee not found or no valid position for calculation date');
        RAISE EXCEPTION 'Employee % not found or no valid position for date %', p_employee_id, p_calculation_date;
    END IF;

    -- 步骤2: 获取员工缴费基数
    SELECT 
        epc.base_salary,
        emb.social_insurance_base,
        emb.housing_fund_base,
        emb.occupational_pension_base,
        emb.effective_date
    INTO v_base_amounts
    FROM employee_payroll_configs epc
    LEFT JOIN employee_monthly_bases emb ON epc.employee_id = emb.employee_id
    WHERE epc.employee_id = p_employee_id
        AND p_calculation_date >= epc.effective_from
        AND (epc.effective_to IS NULL OR p_calculation_date < epc.effective_to)
        AND (emb.effective_date IS NULL OR p_calculation_date >= emb.effective_date)
    ORDER BY epc.effective_from DESC, emb.effective_date DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        v_warnings := array_append(v_warnings, 'No payroll config found, using default base amounts');
        -- 使用默认值
        SELECT 5000, 5000, 5000, NULL, CURRENT_DATE 
        INTO v_base_amounts;
    END IF;

    -- 步骤3: 遍历所有扣缴配置进行逐项计算
    FOR v_applicable_configs IN 
        SELECT 
            dc.id,
            dc.code,
            dc.name,
            dc.type,
            dc.rates,
            dc.base_config,
            dc.calculation_rules,
            dc.applicable_rules,
            dc.priority,
            sibc.min_base,
            sibc.max_base,
            sibc.avg_salary,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM deduction_rule_conditions drc
                    WHERE drc.deduction_config_id = dc.id
                        AND drc.is_active = true
                        AND evaluate_rule_condition(
                            jsonb_build_object(
                                'personnel_category', v_employee_info.personnel_category,
                                'department_id', v_employee_info.department_id,
                                'employee_id', p_employee_id
                            ),
                            drc
                        )
                ) THEN true
                ELSE false
            END as is_applicable
        FROM deduction_configs dc
        LEFT JOIN social_insurance_base_configs sibc 
            ON sibc.insurance_type = CASE
                WHEN dc.code = 'pension_insurance' THEN 'pension'
                WHEN dc.code = 'medical_insurance' THEN 'medical'
                WHEN dc.code = 'unemployment_insurance' THEN 'unemployment'
                WHEN dc.code = 'injury_insurance' THEN 'injury'
                WHEN dc.code = 'housing_fund' THEN 'housing_fund'
                ELSE dc.code
            END
            AND sibc.region = 'beijing'
            AND p_calculation_date >= sibc.effective_from
            AND (sibc.effective_to IS NULL OR p_calculation_date < sibc.effective_to)
        WHERE dc.is_active = true
            AND p_calculation_date >= dc.effective_from
            AND (dc.effective_to IS NULL OR p_calculation_date < dc.effective_to)
        ORDER BY dc.priority
    LOOP
        -- 初始化组件
        v_component := ROW(
            v_applicable_configs.code,
            v_applicable_configs.name,
            0,  -- calculation_base
            0,  -- employee_rate
            0,  -- employer_rate
            0,  -- employee_amount
            0,  -- employer_amount
            COALESCE(v_applicable_configs.min_base, 0),
            COALESCE(v_applicable_configs.max_base, 999999),
            v_applicable_configs.is_applicable,
            'round_to_cent',
            '{}'::JSONB
        )::social_insurance_component;
        
        -- 如果不适用，跳过计算但记录原因
        IF NOT v_applicable_configs.is_applicable THEN
            v_unapplied_rules := array_append(v_unapplied_rules, 
                v_applicable_configs.name || ': 不符合适用条件');
            v_components := array_append(v_components, v_component);
            CONTINUE;
        END IF;
        
        -- 确定缴费基数
        v_calculation_base := CASE
            WHEN v_applicable_configs.code = 'housing_fund' THEN 
                COALESCE(v_base_amounts.housing_fund_base, v_base_amounts.base_salary)
            WHEN v_applicable_configs.code = 'occupational_pension' THEN 
                COALESCE(v_base_amounts.occupational_pension_base, v_base_amounts.base_salary)
            ELSE 
                COALESCE(v_base_amounts.social_insurance_base, v_base_amounts.base_salary)
        END;
        
        -- 应用基数上下限
        v_base_validation := validate_insurance_base(
            'beijing',
            v_applicable_configs.code,
            v_calculation_base,
            p_calculation_date
        );
        
        IF (v_base_validation->>'valid')::BOOLEAN THEN
            v_adjusted_base := (v_base_validation->>'base')::DECIMAL;
        ELSE
            v_adjusted_base := (v_base_validation->>'adjusted_base')::DECIMAL;
            v_warnings := array_append(v_warnings, 
                v_applicable_configs.name || ': ' || (v_base_validation->>'reason'));
        END IF;
        
        -- 计算缴费金额
        v_component.calculation_base := v_adjusted_base;
        v_component.employee_rate := COALESCE((v_applicable_configs.rates->>'employee')::DECIMAL, 0);
        v_component.employer_rate := COALESCE((v_applicable_configs.rates->>'employer')::DECIMAL, 0);
        
        v_component.employee_amount := ROUND(v_adjusted_base * v_component.employee_rate, 2);
        v_component.employer_amount := ROUND(v_adjusted_base * v_component.employer_rate, 2);
        
        -- 处理特殊情况（如工伤保险个人不缴费）
        IF v_applicable_configs.code = 'injury_insurance' THEN
            v_component.employee_amount := 0;
        END IF;
        
        -- 累计总额
        v_total_employee := v_total_employee + v_component.employee_amount;
        v_total_employer := v_total_employer + v_component.employer_amount;
        
        -- 记录应用的规则
        v_applied_rules := array_append(v_applied_rules, v_applicable_configs.name);
        
        -- 添加计算元数据
        v_component.calculation_metadata := jsonb_build_object(
            'original_base', v_calculation_base,
            'adjusted_base', v_adjusted_base,
            'base_validation', v_base_validation,
            'calculation_date', p_calculation_date,
            'config_id', v_applicable_configs.id
        );
        
        -- 添加到组件数组
        v_components := array_append(v_components, v_component);
        
        -- 记录计算步骤
        v_calculation_steps := array_append(v_calculation_steps, 
            jsonb_build_object(
                'step', 'calculate_' || v_applicable_configs.code,
                'component', to_jsonb(v_component),
                'timestamp', NOW()
            )
        );
    END LOOP;

    -- 封装最终结果
    v_result := ROW(
        p_employee_id,
        p_period_id,
        p_calculation_date,
        v_components,
        v_total_employee,
        v_total_employer,
        v_applied_rules,
        v_unapplied_rules,
        v_calculation_steps,
        v_warnings,
        v_errors,
        jsonb_build_object(
            'calculation_version', '2.0',
            'calculated_at', NOW(),
            'employee_info', to_jsonb(v_employee_info),
            'base_amounts', to_jsonb(v_base_amounts),
            'total_components', array_length(v_components, 1)
        )
    )::social_insurance_result;

    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- 确保即使出错也返回结构化结果
    v_errors := array_append(v_errors, 'Calculation failed: ' || SQLERRM);
    
    v_result := ROW(
        p_employee_id,
        p_period_id,
        p_calculation_date,
        v_components,
        0,
        0,
        v_applied_rules,
        v_unapplied_rules,
        v_calculation_steps,
        v_warnings,
        v_errors,
        jsonb_build_object(
            'calculation_version', '2.0',
            'calculated_at', NOW(),
            'error', SQLERRM,
            'sql_state', SQLSTATE
        )
    )::social_insurance_result;
    
    RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. calculate_monthly_insurance_with_eligibility - 带资格检查的月度保险计算
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_monthly_insurance_with_eligibility(
    p_employee_id uuid,
    p_period_date date
)
RETURNS TABLE(
    insurance_type_id uuid,
    insurance_name text,
    system_key text,
    is_eligible boolean,
    contribution_base numeric,
    employer_rate numeric,
    employee_rate numeric,
    employer_amount numeric,
    employee_amount numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH insurance_configs AS (
        SELECT 
            it.id as insurance_type_id,
            it.name as insurance_name,
            it.system_key,
            check_insurance_eligibility(p_employee_id, it.id, p_period_date) as is_eligible,
            CASE 
                WHEN it.system_key IN ('pension', 'medical', 'unemployment', 'injury', 'maternity') THEN
                    COALESCE(
                        (SELECT emb.social_insurance_base 
                         FROM employee_monthly_bases emb 
                         WHERE emb.employee_id = p_employee_id 
                           AND emb.year_month = to_char(p_period_date, 'YYYY-MM')
                         LIMIT 1),
                        (SELECT epc.base_salary 
                         FROM employee_payroll_configs epc 
                         WHERE epc.employee_id = p_employee_id 
                           AND p_period_date >= epc.effective_from 
                           AND (epc.effective_to IS NULL OR p_period_date < epc.effective_to)
                         LIMIT 1),
                        0
                    )
                WHEN it.system_key = 'housing_fund' THEN
                    COALESCE(
                        (SELECT emb.housing_fund_base 
                         FROM employee_monthly_bases emb 
                         WHERE emb.employee_id = p_employee_id 
                           AND emb.year_month = to_char(p_period_date, 'YYYY-MM')
                         LIMIT 1),
                        (SELECT epc.base_salary 
                         FROM employee_payroll_configs epc 
                         WHERE epc.employee_id = p_employee_id 
                           AND p_period_date >= epc.effective_from 
                           AND (epc.effective_to IS NULL OR p_period_date < epc.effective_to)
                         LIMIT 1),
                        0
                    )
                WHEN it.system_key = 'occupational_pension' THEN
                    COALESCE(
                        (SELECT emb.occupational_pension_base 
                         FROM employee_monthly_bases emb 
                         WHERE emb.employee_id = p_employee_id 
                           AND emb.year_month = to_char(p_period_date, 'YYYY-MM')
                         LIMIT 1),
                        (SELECT epc.base_salary 
                         FROM employee_payroll_configs epc 
                         WHERE epc.employee_id = p_employee_id 
                           AND p_period_date >= epc.effective_from 
                           AND (epc.effective_to IS NULL OR p_period_date < epc.effective_to)
                         LIMIT 1),
                        0
                    )
                ELSE 0
            END as contribution_base,
            ir.employer_rate,
            ir.employee_rate
        FROM insurance_types it
        LEFT JOIN insurance_rates ir ON ir.insurance_type_id = it.id
            AND p_period_date >= ir.effective_from
            AND (ir.effective_to IS NULL OR p_period_date < ir.effective_to)
        WHERE it.is_active = true
    )
    SELECT 
        ic.insurance_type_id,
        ic.insurance_name,
        ic.system_key,
        ic.is_eligible,
        CASE WHEN ic.is_eligible THEN ic.contribution_base ELSE 0 END as contribution_base,
        COALESCE(ic.employer_rate, 0) as employer_rate,
        COALESCE(ic.employee_rate, 0) as employee_rate,
        CASE WHEN ic.is_eligible THEN ROUND(ic.contribution_base * COALESCE(ic.employer_rate, 0), 2) ELSE 0 END as employer_amount,
        CASE WHEN ic.is_eligible THEN ROUND(ic.contribution_base * COALESCE(ic.employee_rate, 0), 2) ELSE 0 END as employee_amount
    FROM insurance_configs ic
    ORDER BY 
        CASE ic.system_key
            WHEN 'pension' THEN 1
            WHEN 'medical' THEN 2
            WHEN 'unemployment' THEN 3
            WHEN 'injury' THEN 4
            WHEN 'maternity' THEN 5
            WHEN 'housing_fund' THEN 6
            WHEN 'occupational_pension' THEN 7
            ELSE 99
        END;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. validate_insurance_base - 验证并调整保险基数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_insurance_base(
    p_region text,
    p_insurance_type text,
    p_base_amount numeric,
    p_check_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_config RECORD;
    v_adjusted_base NUMERIC;
    v_result JSONB;
BEGIN
    -- 获取对应的基数配置
    SELECT * INTO v_config
    FROM social_insurance_base_configs
    WHERE region = p_region
        AND insurance_type = p_insurance_type
        AND p_check_date >= effective_from
        AND (effective_to IS NULL OR p_check_date < effective_to)
    ORDER BY effective_from DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'base', p_base_amount,
            'adjusted_base', p_base_amount,
            'reason', '未找到对应的基数配置',
            'config_found', false
        );
    END IF;
    
    -- 应用基数上下限
    v_adjusted_base := p_base_amount;
    
    IF p_base_amount < v_config.min_base THEN
        v_adjusted_base := v_config.min_base;
        v_result := jsonb_build_object(
            'valid', false,
            'base', p_base_amount,
            'adjusted_base', v_adjusted_base,
            'min_base', v_config.min_base,
            'max_base', v_config.max_base,
            'reason', format('基数 %.2f 低于最低基数 %.2f，已调整', p_base_amount, v_config.min_base),
            'adjustment_type', 'min_limit'
        );
    ELSIF p_base_amount > v_config.max_base THEN
        v_adjusted_base := v_config.max_base;
        v_result := jsonb_build_object(
            'valid', false,
            'base', p_base_amount,
            'adjusted_base', v_adjusted_base,
            'min_base', v_config.min_base,
            'max_base', v_config.max_base,
            'reason', format('基数 %.2f 高于最高基数 %.2f，已调整', p_base_amount, v_config.max_base),
            'adjustment_type', 'max_limit'
        );
    ELSE
        v_result := jsonb_build_object(
            'valid', true,
            'base', p_base_amount,
            'adjusted_base', p_base_amount,
            'min_base', v_config.min_base,
            'max_base', v_config.max_base,
            'reason', '基数在有效范围内',
            'adjustment_type', 'none'
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. check_insurance_eligibility - 检查员工保险资格
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_insurance_eligibility(
    p_employee_id uuid,
    p_insurance_type_id uuid,
    p_effective_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_employee_category_id UUID;
    v_is_eligible BOOLEAN := false;
BEGIN
    -- 获取员工在指定日期的身份类别
    SELECT ec.employee_category_id INTO v_employee_category_id
    FROM employee_categories ec
    WHERE ec.employee_id = p_employee_id
        AND p_effective_date >= ec.effective_start_date
        AND (ec.effective_end_date IS NULL OR p_effective_date <= ec.effective_end_date)
    ORDER BY ec.effective_start_date DESC
    LIMIT 1;
    
    -- 如果没有找到员工类别，默认不符合资格
    IF v_employee_category_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- 检查保险资格规则
    SELECT pr.is_eligible INTO v_is_eligible
    FROM policy_rules pr
    WHERE pr.insurance_type_id = p_insurance_type_id
        AND pr.employee_category_id = v_employee_category_id
        AND p_effective_date >= pr.effective_from
        AND (pr.effective_to IS NULL OR p_effective_date < pr.effective_to)
    ORDER BY pr.effective_from DESC
    LIMIT 1;
    
    RETURN COALESCE(v_is_eligible, false);
END;
$$;