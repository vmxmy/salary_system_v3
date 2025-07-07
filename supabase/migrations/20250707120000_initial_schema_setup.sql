-- Supabase Initial Schema Migration
-- Version: 1.0
-- Generated: 2025-07-07
--
-- This script sets up the entire database schema from scratch,
-- following a Supabase-native, time-sliced design.
-- It should be run by the Supabase CLI.

BEGIN;

-- =============================================================================
-- Section 1: Core & Shared Services (Lookup Tables)
-- =============================================================================

-- Table for defining categories of lookup values (enums)
CREATE TABLE public.lookup_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);
COMMENT ON TABLE public.lookup_types IS 'Defines categories for lookup values (e.g., GENDER, EMPLOYEE_STATUS).';

-- Table for storing individual options for each lookup type
CREATE TABLE public.lookup_values (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lookup_type_code TEXT NOT NULL REFERENCES public.lookup_types(code) ON DELETE CASCADE,
  value TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (lookup_type_code, value)
);
COMMENT ON TABLE public.lookup_values IS 'Stores individual options for each lookup type (e.g., "Male", "Female" for GENDER).';


-- =============================================================================
-- Section 2: Human Resources Module
-- =============================================================================

-- Table for organizational departments
CREATE TABLE public.departments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true
);
COMMENT ON TABLE public.departments IS 'Defines the organizational department hierarchy.';

-- Table for job positions
CREATE TABLE public.positions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.positions(id),
  is_active BOOLEAN DEFAULT true
);
COMMENT ON TABLE public.positions IS 'Defines the job position hierarchy.';

-- Table for personnel categories (e.g., Full-time, Contractor)
CREATE TABLE public.personnel_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);
COMMENT ON TABLE public.personnel_categories IS 'Defines categories of personnel (e.g., "Civil Servant", "Contractor").';

-- Table for storing static, biographical employee information
CREATE TABLE public.employees (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  id_number TEXT UNIQUE,
  gender_lookup_id BIGINT REFERENCES public.lookup_values(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.employees IS 'Stores static, biographical information about an employee. All dynamic data is in employee_assignments.';

-- Core table for time-sliced employee assignments (role, department, status, etc.)
CREATE TABLE public.employee_assignments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT '9999-12-31' NOT NULL,
  
  -- Assignment Details
  department_id BIGINT NOT NULL REFERENCES public.departments(id),
  position_id BIGINT NOT NULL REFERENCES public.positions(id),
  personnel_category_id BIGINT REFERENCES public.personnel_categories(id),
  manager_assignment_id BIGINT REFERENCES public.employee_assignments(id),
  
  -- Status & Type
  status_lookup_id BIGINT NOT NULL REFERENCES public.lookup_values(id),
  employment_type_lookup_id BIGINT REFERENCES public.lookup_values(id),
  
  -- Salary Grades
  salary_level_lookup_id BIGINT REFERENCES public.lookup_values(id),
  salary_grade_lookup_id BIGINT REFERENCES public.lookup_values(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.employee_assignments IS 'Time-sliced record of an employee''s role, department, and status. The single source of truth for HR history.';


-- =============================================================================
-- Section 3: Payroll Module
-- =============================================================================

-- Table for defining all possible payroll components (earnings, deductions)
CREATE TABLE public.payroll_components (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type_lookup_id BIGINT NOT NULL REFERENCES public.lookup_values(id),
  subtype_lookup_id BIGINT REFERENCES public.lookup_values(id),
  data_type_lookup_id BIGINT NOT NULL REFERENCES public.lookup_values(id),
  calculation_type_lookup_id BIGINT NOT NULL REFERENCES public.lookup_values(id),
  calculation_formula TEXT,
  is_taxable BOOLEAN DEFAULT false NOT NULL,
  is_social_insurance_base BOOLEAN DEFAULT false NOT NULL,
  is_housing_fund_base BOOLEAN DEFAULT false NOT NULL,
  display_order INT DEFAULT 0 NOT NULL,
  is_visible_on_payslip BOOLEAN DEFAULT true NOT NULL,
  is_editable_by_user BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.payroll_components IS 'Defines the metadata, classification, and behavior of every payroll item.';

-- Table for payroll calculation periods
CREATE TABLE public.payroll_periods (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status_lookup_id BIGINT REFERENCES public.lookup_values(id),
  UNIQUE (start_date, end_date)
);
COMMENT ON TABLE public.payroll_periods IS 'Defines payroll calculation periods (e.g., "July 2024 Payroll").';

-- Table for employee-specific, time-sliced payroll parameters like contribution bases
CREATE TABLE public.employee_payroll_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT '9999-12-31' NOT NULL,
  
  -- Contribution Bases
  social_insurance_base NUMERIC(18, 4),
  housing_fund_base NUMERIC(18, 4),
  occupational_pension_base NUMERIC(18, 4),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, end_date)
);
COMMENT ON TABLE public.employee_payroll_configs IS 'Stores time-sliced, employee-specific payroll parameters like contribution bases.';

-- Table for storing final calculated payslip results
CREATE TABLE public.payroll_results (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  period_id BIGINT NOT NULL REFERENCES public.payroll_periods(id),
  employee_id BIGINT NOT NULL REFERENCES public.employees(id),
  source_assignment_id BIGINT NOT NULL REFERENCES public.employee_assignments(id),
  
  -- Result Details
  earnings_details JSONB DEFAULT '{}',
  deductions_details JSONB DEFAULT '{}',
  
  -- Aggregates
  gross_pay NUMERIC(18, 4) NOT NULL,
  total_deductions NUMERIC(18, 4) NOT NULL,
  net_pay NUMERIC(18, 4) NOT NULL,
  
  -- Audit
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by_user_id UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.payroll_results IS 'Stores the final calculated payslip for an employee for a specific period.';


-- =============================================================================
-- Section 4: Supabase-Specific Integration (Auth & Storage)
-- =============================================================================

-- Table to link Supabase auth users to HR employee records
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id BIGINT UNIQUE NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.user_profiles IS 'Links Supabase auth users to HR employee records.';

-- Function to automatically create a user_profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is a placeholder.
  -- In a real scenario, you would need a mechanism to link the new auth.users.id
  -- to an existing or new employees.id. This often requires a manual step or
  -- an invitation system. For now, we just insert the user_id.
  -- A robust implementation might look up the employee by email from an invite table.
  -- For this example, we assume an employee_id must be manually linked later.
  -- INSERT INTO public.user_profiles (id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
-- NOTE: This trigger is commented out by default because it requires a robust
-- employee linking strategy to be truly useful. Enable it once you have
-- decided on your user-invitation/employee-linking workflow.
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =============================================================================
-- Section 5: Row Level Security (RLS) Activation
-- =============================================================================
-- Enable RLS for all tables by default. Policies will be defined elsewhere.

ALTER TABLE public.lookup_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payroll_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Section 6: Default Policies for Service Role
-- =============================================================================
-- Create a default "allow all" policy for the service_role, which the
-- FastAPI backend will use. This bypasses RLS for backend operations.

CREATE POLICY "Allow service_role access" ON public.lookup_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.lookup_values FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.personnel_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.employee_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.payroll_components FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.employee_payroll_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.payroll_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role access" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);


-- =============================================================================
-- Section 7: Initial Data Seeding (Optional)
-- =============================================================================
-- Seed the essential lookup types.
INSERT INTO public.lookup_types (code, name, description) VALUES
  ('COMPONENT_TYPE', '薪资项主分类', '定义一个薪资项是收入、扣除还是其他。'),
  ('COMPONENT_SUBTYPE', '薪资项子分类', '对主分类的进一步细化。'),
  ('DATA_TYPE', '数据类型', '定义该薪资项的数据是数字、布尔值还是文本。'),
  ('CALCULATION_TYPE', '计算类型', '定义该项是固定值、公式计算还是手动输入。'),
  ('GENDER', '性别', '生理性别分类。'),
  ('EMPLOYEE_STATUS', '员工状态', '员工在公司的当前状态，如在职、离职等。'),
  ('EMPLOYMENT_TYPE', '用工类型', '员工的雇佣形式，如全职、兼职、合同工等。');

-- Seed some initial lookup values.
-- Note: In a real project, you would add all necessary options here.
INSERT INTO public.lookup_values (lookup_type_code, value, display_order) VALUES
  ('GENDER', '男', 1),
  ('GENDER', '女', 2),
  ('EMPLOYEE_STATUS', '在职', 1),
  ('EMPLOYEE_STATUS', '离职', 2),
  ('EMPLOYEE_STATUS', '休假', 3),
  ('COMPONENT_TYPE', 'EARNING', 1),
  ('COMPONENT_TYPE', 'DEDUCTION', 2),
  ('COMPONENT_TYPE', 'BENEFIT', 3),
  ('COMPONENT_TYPE', 'STATISTICAL', 4),
  ('DATA_TYPE', 'NUMERIC', 1),
  ('DATA_TYPE', 'BOOLEAN', 2),
  ('DATA_TYPE', 'TEXT', 3),
  ('CALCULATION_TYPE', 'FIXED_VALUE', 1),
  ('CALCULATION_TYPE', 'FORMULA', 2),
  ('CALCULATION_TYPE', 'MANUAL_INPUT', 3);


COMMIT;
