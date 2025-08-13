-- ============================================================================
-- 薪资管理核心函数
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. create_payroll_batch - 批量创建薪资记录
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_payroll_batch(
    p_pay_period_start date,
    p_pay_period_end date,
    p_pay_date date,
    p_source_period_start date DEFAULT NULL,
    p_source_period_end date DEFAULT NULL,
    p_selected_employee_ids uuid[] DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
RETURNS TABLE(
    success boolean,
    error_code text,
    error_message text,
    summary jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_validation_result RECORD;
    v_copy_result RECORD;
    v_summary JSONB;
    v_created_count INTEGER := 0;
    v_employee_record RECORD;
    v_new_payroll_id UUID;
    v_start_time TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- 步骤1: 验证薪资创建
    SELECT * INTO v_validation_result 
    FROM validate_payroll_creation(p_pay_period_start, p_pay_period_end, p_selected_employee_ids);
    
    IF NOT v_validation_result.is_valid THEN
        RETURN QUERY SELECT 
            FALSE, 
            v_validation_result.error_code, 
            v_validation_result.error_message,
            jsonb_build_object(
                'conflicting_records', v_validation_result.conflicting_records,
                'validation_failed', true,
                'execution_time_ms', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000
            );
        RETURN;
    END IF;

    -- 步骤2: 根据模式创建薪资记录
    IF p_source_period_start IS NOT NULL AND p_source_period_end IS NOT NULL THEN
        -- 复制模式：从源期间复制数据
        SELECT * INTO v_copy_result 
        FROM copy_payroll_data_from_source(
            p_source_period_start,
            p_source_period_end,
            p_pay_period_start,
            p_pay_period_end,
            p_pay_date,
            p_selected_employee_ids
        );
        
        v_summary := jsonb_build_object(
            'pay_period_start', p_pay_period_start,
            'pay_period_end', p_pay_period_end,
            'pay_date', p_pay_date,
            'source_period_start', p_source_period_start,
            'source_period_end', p_source_period_end,
            'copied_employees', v_copy_result.copied_employees,
            'copied_items', v_copy_result.copied_items,
            'total_amount', v_copy_result.total_amount,
            'creation_mode', 'copy',
            'execution_time_ms', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000
        );
    ELSE
        -- 手动模式：创建空薪资记录
        FOR v_employee_record IN (
            SELECT e.id, e.employee_name
            FROM employees e
            WHERE (p_selected_employee_ids IS NULL OR e.id = ANY(p_selected_employee_ids))
            AND e.status = 'active'
        ) LOOP
            INSERT INTO payrolls (
                employee_id,
                pay_period_start,
                pay_period_end,
                pay_date,
                gross_pay,
                total_deductions,
                net_pay,
                status,
                notes,
                created_at,
                updated_at
            ) VALUES (
                v_employee_record.id,
                p_pay_period_start,
                p_pay_period_end,
                p_pay_date,
                0.00,
                0.00,
                0.00,
                'draft',
                '手动创建的薪资记录',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id INTO v_new_payroll_id;
            
            v_created_count := v_created_count + 1;
        END LOOP;
        
        v_summary := jsonb_build_object(
            'pay_period_start', p_pay_period_start,
            'pay_period_end', p_pay_period_end,
            'pay_date', p_pay_date,
            'created_employees', v_created_count,
            'creation_mode', 'manual',
            'execution_time_ms', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000
        );
    END IF;

    RETURN QUERY SELECT 
        TRUE, 
        NULL::TEXT, 
        NULL::TEXT,
        v_summary;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            'TRANSACTION_ERROR', 
            '创建薪资记录时发生错误: ' || SQLERRM,
            jsonb_build_object(
                'sql_state', SQLSTATE,
                'sql_error', SQLERRM,
                'execution_time_ms', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000
            );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. validate_payroll_creation - 验证薪资创建
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_payroll_creation(
    p_pay_period_start date,
    p_pay_period_end date,
    p_selected_employee_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
    is_valid boolean,
    error_code text,
    error_message text,
    conflicting_records integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    -- 检查日期有效性
    IF p_pay_period_start > p_pay_period_end THEN
        RETURN QUERY SELECT 
            FALSE,
            'INVALID_DATE_RANGE'::TEXT,
            '薪资期间开始日期不能晚于结束日期'::TEXT,
            0;
        RETURN;
    END IF;

    -- 检查是否存在冲突的薪资记录
    SELECT COUNT(*) INTO v_conflict_count
    FROM payrolls p
    WHERE p.pay_period_start = p_pay_period_start
        AND p.pay_period_end = p_pay_period_end
        AND (p_selected_employee_ids IS NULL OR p.employee_id = ANY(p_selected_employee_ids))
        AND p.status != 'cancelled';

    IF v_conflict_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'DUPLICATE_PAYROLL'::TEXT,
            format('已存在 %s 条相同期间的薪资记录', v_conflict_count)::TEXT,
            v_conflict_count;
        RETURN;
    END IF;

    -- 验证通过
    RETURN QUERY SELECT 
        TRUE,
        NULL::TEXT,
        NULL::TEXT,
        0;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. copy_payroll_data_from_source - 从源期间复制薪资数据
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_payroll_data_from_source(
    p_source_period_start date,
    p_source_period_end date,
    p_target_period_start date,
    p_target_period_end date,
    p_target_pay_date date,
    p_selected_employee_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
    copied_employees integer,
    copied_items integer,
    total_amount numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_payroll RECORD;
    v_new_payroll_id UUID;
    v_copied_employees INTEGER := 0;
    v_copied_items INTEGER := 0;
    v_total_amount NUMERIC := 0;
BEGIN
    -- 遍历源期间的薪资记录
    FOR v_source_payroll IN (
        SELECT p.*
        FROM payrolls p
        WHERE p.pay_period_start = p_source_period_start
            AND p.pay_period_end = p_source_period_end
            AND (p_selected_employee_ids IS NULL OR p.employee_id = ANY(p_selected_employee_ids))
            AND p.status != 'cancelled'
    ) LOOP
        -- 创建新的薪资记录
        INSERT INTO payrolls (
            employee_id,
            pay_period_start,
            pay_period_end,
            pay_date,
            gross_pay,
            total_deductions,
            net_pay,
            status,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_source_payroll.employee_id,
            p_target_period_start,
            p_target_period_end,
            p_target_pay_date,
            v_source_payroll.gross_pay,
            v_source_payroll.total_deductions,
            v_source_payroll.net_pay,
            'draft',
            '从' || p_source_period_start || '至' || p_source_period_end || '期间复制',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_new_payroll_id;

        -- 复制薪资项目
        INSERT INTO payroll_items (
            payroll_id,
            component_id,
            component_name,
            component_type,
            amount,
            calculation_method,
            calculation_base,
            rate,
            notes,
            created_at,
            updated_at
        )
        SELECT 
            v_new_payroll_id,
            pi.component_id,
            pi.component_name,
            pi.component_type,
            pi.amount,
            pi.calculation_method,
            pi.calculation_base,
            pi.rate,
            pi.notes,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM payroll_items pi
        WHERE pi.payroll_id = v_source_payroll.id;

        v_copied_employees := v_copied_employees + 1;
        v_copied_items := v_copied_items + (SELECT COUNT(*) FROM payroll_items WHERE payroll_id = v_source_payroll.id);
        v_total_amount := v_total_amount + v_source_payroll.gross_pay;
    END LOOP;

    RETURN QUERY SELECT 
        v_copied_employees,
        v_copied_items,
        v_total_amount;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. get_payroll_batch_summary - 获取薪资批次摘要
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payroll_batch_summary(
    p_pay_period_start date,
    p_pay_period_end date
)
RETURNS TABLE(
    period_info jsonb,
    employee_count integer,
    item_count integer,
    total_gross_pay numeric,
    total_net_pay numeric,
    status_breakdown jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH payroll_stats AS (
        SELECT 
            COUNT(DISTINCT p.employee_id) as emp_count,
            COUNT(DISTINCT p.id) as payroll_count,
            SUM(p.gross_pay) as total_gross,
            SUM(p.net_pay) as total_net,
            jsonb_object_agg(
                COALESCE(p.status::text, 'unknown'),
                status_count
            ) as status_breakdown
        FROM payrolls p
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as status_count
            FROM payrolls p2
            WHERE p2.pay_period_start = p.pay_period_start
                AND p2.pay_period_end = p.pay_period_end
                AND p2.status = p.status
        ) sc ON true
        WHERE p.pay_period_start = p_pay_period_start
            AND p.pay_period_end = p_pay_period_end
        GROUP BY p.pay_period_start, p.pay_period_end
    ),
    item_stats AS (
        SELECT COUNT(*) as total_items
        FROM payroll_items pi
        JOIN payrolls p ON pi.payroll_id = p.id
        WHERE p.pay_period_start = p_pay_period_start
            AND p.pay_period_end = p_pay_period_end
    )
    SELECT 
        jsonb_build_object(
            'period_start', p_pay_period_start,
            'period_end', p_pay_period_end,
            'period_days', p_pay_period_end - p_pay_period_start + 1
        ) as period_info,
        COALESCE(ps.emp_count, 0)::integer as employee_count,
        COALESCE(its.total_items, 0)::integer as item_count,
        COALESCE(ps.total_gross, 0) as total_gross_pay,
        COALESCE(ps.total_net, 0) as total_net_pay,
        COALESCE(ps.status_breakdown, '{}'::jsonb) as status_breakdown
    FROM payroll_stats ps
    CROSS JOIN item_stats its;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. get_department_salary_stats - 部门薪资统计
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_department_salary_stats(
    target_month text
)
RETURNS TABLE(
    department_name text,
    employee_count bigint,
    avg_salary numeric,
    min_salary numeric,
    max_salary numeric,
    total_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH employee_salaries AS (
        SELECT 
            e.department_id,
            e.id as employee_id,
            SUM(CASE 
                WHEN pi.component_type = 'earning' THEN pi.amount 
                WHEN pi.component_type = 'deduction' THEN -pi.amount 
                ELSE 0 
            END) as net_salary
        FROM payrolls p
        JOIN employees e ON p.employee_id = e.id
        JOIN payroll_items pi ON pi.payroll_id = p.id
        WHERE to_char(p.pay_date, 'YYYY-MM') = target_month
        GROUP BY e.department_id, e.id
    )
    SELECT 
        COALESCE(d.name, '未分配部门') as department_name,
        COUNT(DISTINCT es.employee_id)::bigint as employee_count,
        AVG(es.net_salary) as avg_salary,
        MIN(es.net_salary) as min_salary,
        MAX(es.net_salary) as max_salary,
        SUM(es.net_salary) as total_cost
    FROM employee_salaries es
    LEFT JOIN departments d ON d.id = es.department_id
    GROUP BY d.name
    ORDER BY d.name;
END;
$$;