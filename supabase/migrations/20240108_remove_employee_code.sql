-- 删除员工表的工号列并设置身份证号为必填
-- Remove employee_code column and make id_number required

-- 首先更新所有空的身份证号（如果有的话）为一个临时值
UPDATE employees 
SET id_number = 'TEMP_' || id::text 
WHERE id_number IS NULL OR id_number = '';

-- 修改 id_number 列为 NOT NULL
ALTER TABLE employees 
ALTER COLUMN id_number SET NOT NULL;

-- 添加唯一约束确保身份证号唯一
ALTER TABLE employees 
ADD CONSTRAINT employees_id_number_unique UNIQUE (id_number);

-- 删除 employee_code 列
ALTER TABLE employees 
DROP COLUMN IF EXISTS employee_code;

-- 更新视图 v_employees_comprehensive 以移除 employee_code
CREATE OR REPLACE VIEW v_employees_comprehensive AS
SELECT 
    e.id,
    e.full_name,
    e.full_name as display_name,
    e.gender,
    e.date_of_birth,
    e.id_number,
    e.hire_date,
    e.first_work_date,
    e.current_status,
    e.department_id,
    d.name as department_name,
    e.position,
    e.job_level,
    e.position_id,
    e.personnel_category_id,
    pc.name as personnel_category_name,
    pc.name as personnel_category,
    e.created_at,
    e.updated_at,
    e.metadata,
    -- 联系信息
    ec.phone_number,
    ec.email,
    ec.address,
    ec.emergency_contact_name,
    ec.emergency_contact_phone,
    ec.emergency_contact_relationship,
    -- 个人详情
    epd.education_level,
    epd.education_details,
    epd.marital_status,
    epd.political_status,
    epd.social_security_number,
    epd.housing_fund_number,
    epd.certifications,
    epd.work_experience,
    epd.interrupted_service_years,
    epd.special_skills,
    epd.languages,
    epd.personal_notes,
    epd.tags,
    -- 银行账户
    eba.bank_name,
    eba.bank_code,
    eba.branch_name,
    eba.account_holder_name,
    eba.account_number as bank_account_number,
    CASE 
        WHEN eba.account_number IS NOT NULL THEN 
            CASE 
                WHEN LENGTH(eba.account_number) > 4 THEN 
                    LEFT(eba.account_number, 4) || '****' || RIGHT(eba.account_number, 4)
                ELSE '****'
            END
        ELSE NULL
    END as account_number_masked,
    eba.account_type,
    -- 兼容性字段
    e.full_name as name,
    e.current_status = 'active' as is_active,
    CASE 
        WHEN LENGTH(e.id_number) > 10 THEN 
            LEFT(e.id_number, 6) || '********' || RIGHT(e.id_number, 4)
        ELSE '******************'
    END as id_number_masked,
    e.position as position_name,
    CASE 
        WHEN e.current_status = 'active' THEN '在职'
        WHEN e.current_status = 'inactive' THEN '休假'
        WHEN e.current_status = 'terminated' THEN '离职'
        ELSE '未知'
    END as employee_status
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN personnel_categories pc ON e.personnel_category_id = pc.id
LEFT JOIN employee_contacts ec ON e.id = ec.employee_id
LEFT JOIN employee_personal_details epd ON e.id = epd.employee_id
LEFT JOIN employee_bank_accounts eba ON e.id = eba.employee_id;

-- 为视图添加注释
COMMENT ON VIEW v_employees_comprehensive IS '员工综合信息视图，包含所有相关联表的数据';