-- Create comprehensive employee view for frontend
-- Version: 1.0
-- Generated: 2025-07-08

BEGIN;

-- =============================================================================
-- Section 1: Update employees table structure to match frontend expectations
-- =============================================================================

-- Add missing columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS first_work_date DATE,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS job_level TEXT,
ADD COLUMN IF NOT EXISTS department_id BIGINT,
ADD COLUMN IF NOT EXISTS position_id BIGINT,
ADD COLUMN IF NOT EXISTS personnel_category_id BIGINT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update the table structure to match the expected schema
ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id),
ADD CONSTRAINT fk_employees_position_id FOREIGN KEY (position_id) REFERENCES public.positions(id),
ADD CONSTRAINT fk_employees_personnel_category_id FOREIGN KEY (personnel_category_id) REFERENCES public.personnel_categories(id);

-- =============================================================================
-- Section 2: Create additional tables for extended employee information
-- =============================================================================

-- Employee personal details
CREATE TABLE IF NOT EXISTS public.employee_personal_details (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    education_level TEXT,
    interrupted_service_years INTEGER,
    social_security_number TEXT,
    housing_fund_number TEXT,
    political_status TEXT,
    marital_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id)
);

-- Employee contacts
CREATE TABLE IF NOT EXISTS public.employee_contacts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id)
);

-- Employee bank accounts
CREATE TABLE IF NOT EXISTS public.employee_bank_accounts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    bank_name TEXT,
    bank_code TEXT,
    branch_name TEXT,
    account_holder_name TEXT,
    account_number TEXT, -- Direct storage (no encryption in v3)
    account_type TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id)
);

-- =============================================================================
-- Section 3: Create comprehensive employee view
-- =============================================================================

CREATE OR REPLACE VIEW public.v_employees_comprehensive AS
SELECT 
    e.id,
    e.employee_code,
    e.full_name,
    e.full_name as display_name,
    CASE 
        WHEN lv_gender.value IS NOT NULL THEN lv_gender.value
        ELSE '未知'
    END as gender,
    e.date_of_birth,
    e.hire_date,
    e.first_work_date,
    e.current_status,
    e.id_number,
    e.position,
    e.job_level,
    e.department_id,
    d.name as department_name,
    e.position_id,
    p.name as position_name,
    e.personnel_category_id,
    pc.name as personnel_category,
    pc.name as personnel_category_name,
    e.created_at,
    e.updated_at,
    
    -- Personal details
    epd.education_level,
    epd.interrupted_service_years,
    epd.social_security_number,
    epd.housing_fund_number,
    epd.political_status,
    epd.marital_status,
    
    -- Contact information
    ec.phone_number,
    ec.email,
    ec.address,
    ec.emergency_contact_name,
    ec.emergency_contact_phone,
    ec.emergency_contact_relationship,
    
    -- Bank information
    eba.bank_name,
    eba.bank_code,
    eba.branch_name,
    eba.account_holder_name,
    eba.account_number,
    eba.account_type
    
FROM public.employees e
LEFT JOIN public.departments d ON e.department_id = d.id
LEFT JOIN public.positions p ON e.position_id = p.id
LEFT JOIN public.personnel_categories pc ON e.personnel_category_id = pc.id
LEFT JOIN public.lookup_values lv_gender ON e.gender_lookup_id = lv_gender.id
LEFT JOIN public.employee_personal_details epd ON e.id = epd.employee_id
LEFT JOIN public.employee_contacts ec ON e.id = ec.employee_id
LEFT JOIN public.employee_bank_accounts eba ON e.id = eba.employee_id;

-- Add comments
COMMENT ON VIEW public.v_employees_comprehensive IS 'Comprehensive view of employee data including all related information for frontend consumption';

-- =============================================================================
-- Section 4: Insert sample lookup data
-- =============================================================================

-- Insert lookup types if they don't exist
INSERT INTO public.lookup_types (code, name, description) VALUES
('GENDER', '性别', '员工性别选项'),
('EMPLOYEE_STATUS', '员工状态', '员工当前状态'),
('EMPLOYMENT_TYPE', '雇佣类型', '员工雇佣类型'),
('SALARY_LEVEL', '薪资等级', '员工薪资等级'),
('SALARY_GRADE', '薪资级别', '员工薪资级别')
ON CONFLICT (code) DO NOTHING;

-- Insert lookup values if they don't exist
INSERT INTO public.lookup_values (lookup_type_code, value, display_order) VALUES
('GENDER', '男', 1),
('GENDER', '女', 2),
('EMPLOYEE_STATUS', 'active', 1),
('EMPLOYEE_STATUS', 'inactive', 2),
('EMPLOYEE_STATUS', 'terminated', 3),
('EMPLOYMENT_TYPE', 'full_time', 1),
('EMPLOYMENT_TYPE', 'part_time', 2),
('EMPLOYMENT_TYPE', 'contract', 3),
('EMPLOYMENT_TYPE', 'intern', 4)
ON CONFLICT (lookup_type_code, value) DO NOTHING;

-- =============================================================================
-- Section 5: Insert sample data if tables are empty
-- =============================================================================

-- Insert sample departments
INSERT INTO public.departments (name, is_active) VALUES
('人力资源部', true),
('财务部', true),
('技术部', true),
('市场部', true),
('行政部', true)
ON CONFLICT DO NOTHING;

-- Insert sample positions
INSERT INTO public.positions (name, is_active) VALUES
('部门经理', true),
('高级工程师', true),
('工程师', true),
('助理工程师', true),
('行政专员', true),
('财务专员', true)
ON CONFLICT DO NOTHING;

-- Insert sample personnel categories
INSERT INTO public.personnel_categories (name, is_active) VALUES
('正式员工', true),
('合同工', true),
('实习生', true),
('兼职员工', true)
ON CONFLICT DO NOTHING;

COMMIT;