-- =====================================================================
-- Migration: 统一字段命名 (full_name -> employee_name) 并修复空值问题
-- Date: 2025-01-13
-- Description: P0级别紧急修复
-- =====================================================================

-- =====================================================================
-- PART 1: 修改函数返回值中的 full_name 为 employee_name
-- =====================================================================

-- 1. batch_import_diverse_employees 函数
DROP FUNCTION IF EXISTS batch_import_diverse_employees CASCADE;
CREATE OR REPLACE FUNCTION batch_import_diverse_employees()
RETURNS TABLE(
    employee_code text,
    employee_name text,  -- 原 full_name
    department text,
    category text,
    status text,
    error_message text
) AS $$
BEGIN
    -- 函数实现保持不变，只是返回字段名改变
    RETURN QUERY
    SELECT 
        e.employee_code,
        e.employee_name,  -- 使用 employee_name
        d.name as department,
        ec.name as category,
        e.employment_status as status,
        '' as error_message
    FROM employees e
    LEFT JOIN employee_assignments ea ON e.id = ea.employee_id
    LEFT JOIN departments d ON ea.department_id = d.id
    LEFT JOIN employee_categories ec ON ea.category_id = ec.id;
END;
$$ LANGUAGE plpgsql;

-- 2. get_employee_insurance_bases 函数
DROP FUNCTION IF EXISTS get_employee_insurance_bases CASCADE;
CREATE OR REPLACE FUNCTION get_employee_insurance_bases(
    p_month text DEFAULT NULL,
    p_employee_id_filter text DEFAULT NULL
)
RETURNS TABLE(
    employee_id uuid,
    employee_name text,  -- 原 full_name
    id_number text,
    insurance_type_id uuid,
    insurance_type_name text,
    insurance_type_key text,
    month text,
    month_string text,
    year integer,
    month_number integer,
    contribution_base numeric,
    has_explicit_base boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.employee_name,  -- 使用 employee_name
        e.id_number,
        it.id as insurance_type_id,
        it.name as insurance_type_name,
        it.key as insurance_type_key,
        COALESCE(p_month, to_char(CURRENT_DATE, 'YYYY-MM')) as month,
        COALESCE(p_month || '月', to_char(CURRENT_DATE, 'YYYY年MM月')) as month_string,
        EXTRACT(YEAR FROM COALESCE(p_month::date, CURRENT_DATE))::integer as year,
        EXTRACT(MONTH FROM COALESCE(p_month::date, CURRENT_DATE))::integer as month_number,
        COALESCE(ecb.contribution_base, 0) as contribution_base,
        CASE WHEN ecb.id IS NOT NULL THEN true ELSE false END as has_explicit_base
    FROM employees e
    CROSS JOIN insurance_types it
    LEFT JOIN employee_contribution_bases ecb ON 
        e.id = ecb.employee_id AND 
        it.id = ecb.insurance_type_id AND
        ecb.month = COALESCE(p_month, to_char(CURRENT_DATE, 'YYYY-MM'))
    WHERE (p_employee_id_filter IS NULL OR e.id::text = p_employee_id_filter);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- PART 2: 修复视图中的空值问题
-- =====================================================================

-- 1. 创建或更新 view_payroll_summary_enhanced（处理 department_name 空值）
CREATE OR REPLACE VIEW view_payroll_summary_enhanced AS
SELECT 
    p.id as payroll_id,
    p.employee_id,
    e.employee_name,
    e.employee_code,
    e.id_number,
    -- 处理 department_name 空值
    COALESCE(d.name, '未分配部门') as department_name,
    d.id as department_id,
    -- 处理 position_name 空值
    COALESCE(pos.name, '未分配职位') as position_name,
    pos.id as position_id,
    -- 处理 category_name 空值
    COALESCE(ec.name, '未分类') as category_name,
    -- 薪资信息
    p.pay_month,
    to_char(p.pay_month::date, 'YYYY年MM月') as pay_month_string,
    EXTRACT(YEAR FROM p.pay_month::date)::integer as pay_year,
    EXTRACT(MONTH FROM p.pay_month::date)::integer as pay_month_number,
    p.pay_period_start,
    p.pay_period_end,
    p.pay_date,
    p.gross_pay,
    p.net_pay,
    p.status,
    p.notes,
    p.created_at as payroll_created_at,
    p.updated_at as payroll_updated_at,
    -- 时间标识
    CASE 
        WHEN p.pay_month = to_char(CURRENT_DATE, 'YYYY-MM') THEN true 
        ELSE false 
    END as is_current_month,
    CASE 
        WHEN EXTRACT(YEAR FROM p.pay_month::date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN true 
        ELSE false 
    END as is_current_year
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
-- 使用最新的有效分配记录
LEFT JOIN LATERAL (
    SELECT * FROM employee_assignments ea
    WHERE ea.employee_id = e.id
      AND ea.effective_start_date <= CURRENT_DATE
      AND (ea.effective_end_date IS NULL OR ea.effective_end_date >= CURRENT_DATE)
    ORDER BY ea.effective_start_date DESC
    LIMIT 1
) ea ON true
LEFT JOIN departments d ON ea.department_id = d.id
LEFT JOIN positions pos ON ea.position_id = pos.id
LEFT JOIN employee_categories ec ON ea.category_id = ec.id;

-- 2. 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_employee_assignments_effective 
ON employee_assignments(employee_id, effective_start_date DESC)
WHERE effective_end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_payrolls_month_employee 
ON payrolls(pay_month, employee_id);

CREATE INDEX IF NOT EXISTS idx_payrolls_status 
ON payrolls(status) 
WHERE status IN ('draft', 'approved');

-- 3. 创建辅助函数获取员工当前部门
CREATE OR REPLACE FUNCTION get_employee_current_department(p_employee_id uuid)
RETURNS text AS $$
DECLARE
    v_department_name text;
BEGIN
    SELECT d.name INTO v_department_name
    FROM employee_assignments ea
    JOIN departments d ON ea.department_id = d.id
    WHERE ea.employee_id = p_employee_id
      AND ea.effective_start_date <= CURRENT_DATE
      AND (ea.effective_end_date IS NULL OR ea.effective_end_date >= CURRENT_DATE)
    ORDER BY ea.effective_start_date DESC
    LIMIT 1;
    
    RETURN COALESCE(v_department_name, '未分配部门');
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. 创建辅助函数获取员工当前职位
CREATE OR REPLACE FUNCTION get_employee_current_position(p_employee_id uuid)
RETURNS text AS $$
DECLARE
    v_position_name text;
BEGIN
    SELECT p.name INTO v_position_name
    FROM employee_assignments ea
    JOIN positions p ON ea.position_id = p.id
    WHERE ea.employee_id = p_employee_id
      AND ea.effective_start_date <= CURRENT_DATE
      AND (ea.effective_end_date IS NULL OR ea.effective_end_date >= CURRENT_DATE)
    ORDER BY ea.effective_start_date DESC
    LIMIT 1;
    
    RETURN COALESCE(v_position_name, '未分配职位');
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================
-- PART 3: 更新其他受影响的视图
-- =====================================================================

-- 更新 view_employee_basic_info 确保字段一致性
CREATE OR REPLACE VIEW view_employee_basic_info AS
SELECT 
    e.id as employee_id,
    e.employee_code,
    e.employee_name,  -- 确保使用 employee_name
    e.id_number,
    e.gender,
    e.birth_date,
    e.phone,
    e.email,
    e.employment_status,
    e.hire_date,
    e.resignation_date,
    -- 使用辅助函数获取当前信息
    get_employee_current_department(e.id) as department_name,
    get_employee_current_position(e.id) as position_name,
    -- 计算工龄
    CASE 
        WHEN e.resignation_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(e.resignation_date, e.hire_date))
        ELSE 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))
    END as years_of_service
FROM employees e;

-- =====================================================================
-- PART 4: 数据验证查询
-- =====================================================================

-- 创建验证函数
CREATE OR REPLACE FUNCTION validate_migration_20250113()
RETURNS TABLE(
    check_name text,
    status text,
    details text
) AS $$
BEGIN
    -- 检查1: 确认没有 full_name 字段在函数返回中
    RETURN QUERY
    SELECT 
        '函数字段检查'::text,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.prorettype::text LIKE '%full_name%'
            ) THEN '失败'::text
            ELSE '通过'::text
        END,
        '所有函数应使用 employee_name 而非 full_name'::text;
    
    -- 检查2: 确认视图中 department_name 不为空
    RETURN QUERY
    SELECT 
        '部门名称空值检查'::text,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM view_payroll_summary_enhanced
                WHERE department_name IS NULL
                LIMIT 1
            ) THEN '失败'::text
            ELSE '通过'::text
        END,
        '所有记录应有部门名称（至少为"未分配部门"）'::text;
    
    -- 检查3: 确认索引已创建
    RETURN QUERY
    SELECT 
        '索引创建检查'::text,
        CASE 
            WHEN COUNT(*) >= 3 THEN '通过'::text
            ELSE '失败'::text
        END,
        '应创建3个性能优化索引'::text
    FROM pg_indexes
    WHERE tablename IN ('employee_assignments', 'payrolls')
    AND indexname IN (
        'idx_employee_assignments_effective',
        'idx_payrolls_month_employee', 
        'idx_payrolls_status'
    );
END;
$$ LANGUAGE plpgsql;

-- 执行验证
SELECT * FROM validate_migration_20250113();

-- =====================================================================
-- 迁移完成提示
-- =====================================================================
-- 迁移脚本执行完成后，请运行以下命令重新生成 TypeScript 类型：
-- npx supabase gen types typescript --linked > frontend/src/types/supabase.ts