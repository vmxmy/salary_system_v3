-- Create employee metadata table for salary data management
CREATE TABLE IF NOT EXISTS employee_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    
    -- Basic salary components
    basic_salary DECIMAL(10,2) DEFAULT 0,
    position_salary DECIMAL(10,2) DEFAULT 0,
    performance_salary DECIMAL(10,2) DEFAULT 0,
    allowances DECIMAL(10,2) DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    other_income DECIMAL(10,2) DEFAULT 0,
    total_salary DECIMAL(10,2) GENERATED ALWAYS AS (
        basic_salary + position_salary + performance_salary + 
        allowances + overtime_pay + bonus + other_income
    ) STORED,
    
    -- Social insurance and housing fund bases
    pension_base DECIMAL(10,2) DEFAULT 0,
    medical_base DECIMAL(10,2) DEFAULT 0,
    unemployment_base DECIMAL(10,2) DEFAULT 0,
    work_injury_base DECIMAL(10,2) DEFAULT 0,
    maternity_base DECIMAL(10,2) DEFAULT 0,
    housing_fund_base DECIMAL(10,2) DEFAULT 0,
    
    -- Employee deductions
    pension_employee DECIMAL(10,2) DEFAULT 0,
    medical_employee DECIMAL(10,2) DEFAULT 0,
    unemployment_employee DECIMAL(10,2) DEFAULT 0,
    housing_fund_employee DECIMAL(10,2) DEFAULT 0,
    individual_tax DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) GENERATED ALWAYS AS (
        pension_employee + medical_employee + unemployment_employee + 
        housing_fund_employee + individual_tax + other_deductions
    ) STORED,
    
    -- Net salary calculation
    net_salary DECIMAL(10,2) GENERATED ALWAYS AS (
        total_salary - total_deductions
    ) STORED,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'locked', 'archived')),
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES auth.users(id),
    
    -- Manual adjustment tracking
    has_manual_adjustment BOOLEAN DEFAULT FALSE,
    adjustment_reason TEXT,
    adjusted_at TIMESTAMP WITH TIME ZONE,
    adjusted_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(employee_id, period),
    CHECK (total_salary >= 0),
    CHECK (total_deductions >= 0),
    CHECK (period ~ '^\d{4}-\d{2}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_metadata_employee_id ON employee_metadata(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_period ON employee_metadata(period);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_status ON employee_metadata(status);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_created_at ON employee_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_compound ON employee_metadata(employee_id, period, status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_employee_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_metadata_updated_at
    BEFORE UPDATE ON employee_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_metadata_updated_at();

-- Create comprehensive metadata view
CREATE OR REPLACE VIEW employee_metadata_view AS
SELECT 
    em.id,
    em.employee_id,
    e.employee_no,
    e.name as employee_name,
    e.status as employee_status,
    
    -- Department information
    em.employee_id as department_id,
    COALESCE(d.name, '未分配部门') as department_name,
    
    -- Position information  
    em.employee_id as position_id,
    COALESCE(p.name, '未分配职位') as position_name,
    
    -- Personnel category
    em.employee_id as personnel_category_id,
    COALESCE(pc.name, '未分类') as personnel_category_name,
    
    -- Period
    em.period,
    
    -- Salary components
    em.basic_salary,
    em.position_salary,
    em.performance_salary,
    em.allowances,
    em.overtime_pay,
    em.bonus,
    em.other_income,
    em.total_salary,
    
    -- Insurance bases
    em.pension_base,
    em.medical_base,
    em.unemployment_base,
    em.work_injury_base,
    em.maternity_base,
    em.housing_fund_base,
    
    -- Deductions
    em.pension_employee,
    em.medical_employee,
    em.unemployment_employee,
    em.housing_fund_employee,
    em.individual_tax,
    em.other_deductions,
    em.total_deductions,
    
    -- Net salary
    em.net_salary,
    
    -- Status
    em.status,
    em.is_locked,
    em.locked_at,
    em.locked_by,
    
    -- Adjustments
    em.has_manual_adjustment,
    em.adjustment_reason,
    em.adjusted_at,
    em.adjusted_by,
    
    -- Timestamps
    em.created_at,
    em.updated_at,
    em.created_by,
    em.updated_by

FROM employee_metadata em
LEFT JOIN employees e ON em.employee_id = e.id
LEFT JOIN employee_assignments ea ON e.id = ea.employee_id 
    AND ea.effective_date <= CURRENT_DATE 
    AND (ea.end_date IS NULL OR ea.end_date > CURRENT_DATE)
LEFT JOIN departments d ON ea.department_id = d.id
LEFT JOIN positions p ON ea.position_id = p.id
LEFT JOIN personnel_categories pc ON ea.personnel_category_id = pc.id
WHERE e.id IS NOT NULL;

-- Create RLS policies
ALTER TABLE employee_metadata ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view metadata
CREATE POLICY "Users can view employee metadata" ON employee_metadata
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy for HR users to manage metadata
CREATE POLICY "HR users can manage employee metadata" ON employee_metadata
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('super_admin', 'admin', 'hr_manager')
        )
    );

-- Policy for locked records - only admins can modify
CREATE POLICY "Only admins can modify locked metadata" ON employee_metadata
    FOR UPDATE
    USING (
        NOT is_locked OR 
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('super_admin', 'admin')
        )
    );

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS employee_metadata_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metadata_id UUID REFERENCES employee_metadata(id),
    employee_id UUID REFERENCES employees(id),
    period VARCHAR(7),
    action VARCHAR(20) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_employee_metadata_audit_metadata_id ON employee_metadata_audit(metadata_id);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_audit_employee_id ON employee_metadata_audit(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_metadata_audit_changed_at ON employee_metadata_audit(changed_at);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION employee_metadata_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_row RECORD;
    new_row RECORD;
    column_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Set up records based on operation
    IF TG_OP = 'DELETE' THEN
        old_row = OLD;
        new_row = NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_row = NULL;
        new_row = NEW;
    ELSE -- UPDATE
        old_row = OLD;
        new_row = NEW;
    END IF;

    -- Log the change
    IF TG_OP = 'DELETE' THEN
        INSERT INTO employee_metadata_audit (
            metadata_id, employee_id, period, action, changed_by
        ) VALUES (
            old_row.id, old_row.employee_id, old_row.period, TG_OP, auth.uid()
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO employee_metadata_audit (
            metadata_id, employee_id, period, action, changed_by
        ) VALUES (
            new_row.id, new_row.employee_id, new_row.period, TG_OP, auth.uid()
        );
    ELSE -- UPDATE
        -- Check each column for changes
        FOR column_name IN 
            SELECT column_name::text 
            FROM information_schema.columns 
            WHERE table_name = 'employee_metadata' 
            AND column_name NOT IN ('id', 'created_at', 'updated_at')
        LOOP
            EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', column_name, column_name) 
            INTO old_val, new_val 
            USING old_row, new_row;
            
            IF COALESCE(old_val, '') != COALESCE(new_val, '') THEN
                INSERT INTO employee_metadata_audit (
                    metadata_id, employee_id, period, action, field_name, 
                    old_value, new_value, changed_by
                ) VALUES (
                    new_row.id, new_row.employee_id, new_row.period, TG_OP, 
                    column_name, old_val, new_val, auth.uid()
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN COALESCE(new_row, old_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
CREATE TRIGGER employee_metadata_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON employee_metadata
    FOR EACH ROW EXECUTE FUNCTION employee_metadata_audit_trigger();

-- Grant permissions
GRANT SELECT ON employee_metadata_view TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_metadata TO authenticated;
GRANT SELECT ON employee_metadata_audit TO authenticated;

-- Insert sample data for testing
INSERT INTO employee_metadata (
    employee_id, period, basic_salary, position_salary, performance_salary,
    allowances, individual_tax, created_by
) 
SELECT 
    e.id,
    '2025-01',
    5000 + (RANDOM() * 5000)::DECIMAL(10,2),
    2000 + (RANDOM() * 3000)::DECIMAL(10,2),
    1000 + (RANDOM() * 2000)::DECIMAL(10,2),
    500 + (RANDOM() * 1500)::DECIMAL(10,2),
    (RANDOM() * 1000)::DECIMAL(10,2),
    (SELECT id FROM auth.users LIMIT 1)
FROM employees e
WHERE e.status = 'active'
LIMIT 20
ON CONFLICT (employee_id, period) DO NOTHING;