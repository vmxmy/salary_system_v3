-- 迁移身份证号数据到 employees.id_number 字段
-- 这个脚本用于处理 V3 版本移除加密后的数据迁移

BEGIN;

-- 1. 首先检查是否有其他地方存储了身份证号
-- 检查 employee_personal_details 表是否有相关字段
DO $$
BEGIN
    -- 添加临时列来检查是否有其他身份证号字段
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'employee_personal_details' 
        AND column_name = 'national_id'
    ) THEN
        -- 如果 employee_personal_details 有 national_id 字段，迁移数据
        UPDATE employees e
        SET id_number = epd.national_id
        FROM employee_personal_details epd
        WHERE e.id = epd.employee_id
        AND epd.national_id IS NOT NULL
        AND e.id_number IS NULL;
        
        RAISE NOTICE '已从 employee_personal_details.national_id 迁移身份证号';
    END IF;
END $$;

-- 2. 检查是否需要从旧的加密系统迁移数据
-- 注意：这里需要根据实际的加密机制调整
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 统计当前没有身份证号的员工数量
    SELECT COUNT(*) INTO v_count
    FROM employees
    WHERE id_number IS NULL;
    
    RAISE NOTICE '当前有 % 个员工没有身份证号', v_count;
    
    -- 如果 metadata 中有身份证号相关信息，可以在这里处理
    -- 例如：如果 metadata->>'id_number_encrypted' 存在
    UPDATE employees
    SET id_number = metadata->>'id_number_plain'
    WHERE id_number IS NULL
    AND metadata->>'id_number_plain' IS NOT NULL;
    
    -- 记录更新结果
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE '从 metadata 中恢复了 % 个身份证号', v_count;
    END IF;
END $$;

-- 3. 创建一个函数来帮助查找可能存储身份证号的位置
CREATE OR REPLACE FUNCTION find_id_number_locations()
RETURNS TABLE (
    table_name TEXT,
    column_name TEXT,
    sample_value TEXT,
    record_count BIGINT
) AS $$
BEGIN
    -- 检查各种可能的 JSONB 字段
    RETURN QUERY
    SELECT 
        'employees'::TEXT as table_name,
        'metadata'::TEXT as column_name,
        jsonb_object_keys(metadata)::TEXT as sample_value,
        COUNT(*)::BIGINT as record_count
    FROM employees
    WHERE metadata IS NOT NULL
    GROUP BY jsonb_object_keys(metadata);
END;
$$ LANGUAGE plpgsql;

-- 4. 添加数据完整性检查
DO $$
DECLARE
    v_total_employees INTEGER;
    v_employees_with_id INTEGER;
    v_completion_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_employees FROM employees;
    SELECT COUNT(*) INTO v_employees_with_id FROM employees WHERE id_number IS NOT NULL;
    
    IF v_total_employees > 0 THEN
        v_completion_rate := (v_employees_with_id::NUMERIC / v_total_employees) * 100;
        RAISE NOTICE '身份证号完整率: % / % (%.2f%%)', 
            v_employees_with_id, v_total_employees, v_completion_rate;
    END IF;
END $$;

-- 5. 创建一个视图来显示身份证号的状态
CREATE OR REPLACE VIEW v_id_number_status AS
SELECT 
    id,
    full_name,
    employee_code,
    CASE 
        WHEN id_number IS NOT NULL THEN '已填写'
        WHEN metadata->>'id_number_import' IS NOT NULL THEN '已导入但未迁移'
        ELSE '未填写'
    END as id_number_status,
    metadata->>'id_number_import' as import_info
FROM employees
ORDER BY employee_code;

COMMENT ON VIEW v_id_number_status IS '员工身份证号状态视图，用于检查数据完整性';

COMMIT;

-- 使用说明：
-- 1. 先运行 SELECT * FROM find_id_number_locations(); 查看可能的存储位置
-- 2. 根据实际情况修改上面的迁移逻辑
-- 3. 运行 SELECT * FROM v_id_number_status LIMIT 20; 查看迁移状态