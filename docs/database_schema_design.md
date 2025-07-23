# 工资管理系统数据库设计方案

这是一个为工资管理系统设计的、世界级的 Supabase 表结构方案。该方案遵循了规范化、数据完整性、安全性和可扩展性的核心原则。

---

## 设计原则

1.  **规范化 (Normalization)**: 避免数据冗余。员工信息、部门、职级等都将作为独立实体，通过外键关联。
2.  **数据完整性 (Data Integrity)**: 使用外键约束、非空约束和精确的数据类型（如 `NUMERIC`）来确保数据的准确性。
3.  **安全性 (Security)**: 利用 Supabase 的行级安全（RLS）和加密功能（pgsodium）来保护敏感数据。
4.  **可扩展性 (Scalability)**: 结构设计能轻松应对未来新增的工资项或员工类型，而无需修改核心表结构。
5.  **审计与历史追溯 (Auditing & History)**: 完整记录每一次工资发放，并能追溯历史变更。

---

## 核心表结构设计

### 1. `departments` - 部门表
存储组织结构，支持层级关系。

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_department_id UUID REFERENCES departments(id), -- 支持层级结构
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE departments IS '存储组织部门信息';
```

### 2. `employee_categories` - 员工身份表
用于定义员工的身份类别（如公务员、参公、事业、聘用等），支持层级关系。

```sql
CREATE TABLE employee_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 例如: '已登记公务员', '参公人员', '综合类聘用'
    description TEXT,
    parent_category_id UUID REFERENCES employee_categories(id), -- 支持层级结构
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE employee_categories IS '定义员工的身份类别，支持层级关系';
```

### 3. `job_ranks` - 员工职级表
用于定义员工的职级（如县处级正职、一级主任科员、综合四级等）。

```sql
CREATE TABLE job_ranks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 例如: '县处级正职', '一级主任科员'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE job_ranks IS '定义员工的职级信息';
```

### 4. `employees` - 员工主表
存储员工的核心静态信息。

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id), -- 关联到 Supabase 的认证用户
    full_name TEXT NOT NULL,
    -- 使用 pgsodium 对敏感信息进行加密
    id_number_encrypted BYTEA, -- 存储加密后的身份证号
    id_number_nonce BYTEA,     -- 加密所需的一次性随机数
    hire_date DATE NOT NULL,
    termination_date DATE,
    employment_status TEXT NOT NULL DEFAULT 'active', -- e.g., 'active', 'inactive', 'on_leave'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE employees IS '存储员工的核心信息';
```

### 5. `salary_components` - 工资项定义表
将所有工资项抽象出来，提供极大的灵活性。

```sql
CREATE TYPE component_type AS ENUM ('earning', 'deduction');

CREATE TABLE salary_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 例如: '基本工资', '个人所得税', '公务交通补贴'
    type component_type NOT NULL, -- 'earning' (应发) 或 'deduction' (扣发)
    description TEXT,
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE, -- 是否应税
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE salary_components IS '定义所有可能的工资构成项目';
```

### 6. `payrolls` - 工资单主表
记录每一次的工资发放事件。

```sql
CREATE TYPE payroll_status AS ENUM ('draft', 'approved', 'paid', 'cancelled');

CREATE TABLE payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 应发合计
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 扣发合计
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 实发工资
    status payroll_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, pay_period_start) -- 一个员工在一个周期只能有一张工资单
);
COMMENT ON TABLE payrolls IS '记录每位员工每月的工资单主信息';
```

### 7. `payroll_items` - 工资单明细表
存储每张工资单的具体构成项和金额。

```sql
CREATE TABLE payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id),
    amount NUMERIC(12, 2) NOT NULL,
    notes TEXT, -- 可用于记录补扣发等特殊情况的原因
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE payroll_items IS '存储每张工资单的具体构成项目和金额';
```

---

## 员工详细信息与历史追溯管理

为了优雅地管理员工的个人信息、工作履历和个人属性，我们遵循关注点分离的原则，将身份、职位分配和个人属性分开管理。

### 对 `employees` 表的增强

为核心身份表增加基础信息。

```sql
ALTER TABLE employees
ADD COLUMN gender TEXT, -- 建议使用 ENUM: ('male', 'female', 'other')
ADD COLUMN date_of_birth DATE;

COMMENT ON COLUMN employees.gender IS '性别';
COMMENT ON COLUMN employees.date_of_birth IS '出生日期，可从身份证号中提取并存储，以方便查询';
```

### 8. `positions` - 职务表
定义员工的职务或头衔，区别于“职级”。

```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 例如: '部门主管', '项目经理', '普通科员'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE positions IS '定义员工的职务或头衔';
```

### 9. `employee_job_history` - 员工职位历史表
这是追踪员工职业生涯的核心，记录每一次职位、职级或部门的变动。

```sql
CREATE TABLE employee_job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    position_id UUID NOT NULL REFERENCES positions(id),
    rank_id UUID NOT NULL REFERENCES job_ranks(id),
    effective_start_date DATE NOT NULL,
    effective_end_date DATE, -- NULL 表示当前有效的记录
    notes TEXT, -- 例如: '晋升', '部门调动'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, effective_start_date)
);
COMMENT ON TABLE employee_job_history IS '记录员工的职务、职级和部门的每一次变动历史';
```

### 10. `employee_bank_accounts` - 员工银行账户表
安全地管理员工的银行账户信息，支持历史记录。

```sql
CREATE TABLE employee_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- 使用 pgsodium 加密敏感信息
    bank_name_encrypted BYTEA NOT NULL,
    account_number_encrypted BYTEA NOT NULL,
    account_holder_name_encrypted BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE employee_bank_accounts IS '存储员工的银行账户信息，并加密敏感数据';
```

### 11. `employee_contacts` - 员工联系方式表
管理多种类型的联系方式。

```sql
CREATE TYPE contact_method_type AS ENUM ('personal_email', 'work_email', 'mobile_phone', 'home_phone', 'address');

CREATE TABLE employee_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contact_type contact_method_type NOT NULL,
    contact_value_encrypted BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, contact_type, is_primary)
);
COMMENT ON TABLE employee_contacts IS '存储员工的多种联系方式，并加密敏感数据';
```

### 12. `employee_education` - 员工学历信息表
记录员工的多条教育背景。

```sql
CREATE TABLE employee_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL, -- 毕业院校
    degree TEXT NOT NULL, -- 学位，例如: '学士', '硕士', '博士'
    field_of_study TEXT NOT NULL, -- 专业
    graduation_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE employee_education IS '存储员工的多条学历信息';
```

---

## 社保公积金的精细化管理

为了优雅地处理动态变化的社保公积金政策（基数、费率），我们设计了以下结构，以实现历史追溯和地区差异化管理。

### 13. `insurance_types` - 险种定义表

```sql
CREATE TABLE insurance_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_key TEXT NOT NULL UNIQUE, -- 'pension', 'medical', 'unemployment', 'work_injury', 'maternity', 'housing_fund'
    name TEXT NOT NULL UNIQUE, -- '养老保险', '医疗保险', '失业保险', '工伤保险', '生育保险', '住房公积金'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE insurance_types IS '定义五险一金等社会保险的类型';
```

### 14. `social_insurance_policies` - 社保政策表

```sql
CREATE TABLE social_insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 例如: '成都高新区2025年度社保公积金政策'
    region TEXT NOT NULL, -- 例如: '成都高新区'
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (region, effective_start_date)
);
COMMENT ON TABLE social_insurance_policies IS '存储不同地区、不同时期的社保公积金政策版本';
```

### 15. `policy_rules` - 政策规则明细表

```sql
CREATE TABLE policy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES social_insurance_policies(id) ON DELETE CASCADE,
    insurance_type_id UUID NOT NULL REFERENCES insurance_types(id),
    employee_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.00, -- 个人缴费费率 (例如 0.0800 代表 8%)
    employer_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.00, -- 单位缴费费率
    base_floor NUMERIC(10, 2) NOT NULL, -- 缴费基数下限
    base_ceiling NUMERIC(10, 2) NOT NULL, -- 缴费基数上限
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (policy_id, insurance_type_id)
);
COMMENT ON TABLE policy_rules IS '存储每项社保政策中各险种的具体规则（费率、基数上下限）';
```

### 16. `employee_contribution_bases` - 员工缴费基数表

```sql
CREATE TABLE employee_contribution_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    insurance_type_id UUID NOT NULL REFERENCES insurance_types(id),
    contribution_base NUMERIC(10, 2) NOT NULL,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, insurance_type_id, effective_start_date)
);
COMMENT ON TABLE employee_contribution_bases IS '存储每个员工各项保险的个人缴费基数及其生效时间';
```

---

## 个税规则的精细化管理

为了能够优雅地处理复杂的个税规则（如累进税率、专项附加扣除）和政策变更，我们设计了以下版本化的表结构。

### 17. `tax_jurisdictions` - 税收管辖区表

```sql
CREATE TABLE tax_jurisdictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL UNIQUE, -- 'CN', 'US', etc.
    name TEXT NOT NULL UNIQUE, -- '中华人民共和国', 'United States'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tax_jurisdictions IS '定义税收管辖区，为国际化做准备';
```

### 18. `tax_policies` - 税收政策版本表

```sql
CREATE TABLE tax_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_id UUID NOT NULL REFERENCES tax_jurisdictions(id),
    name TEXT NOT NULL, -- 例如: '2019版个人所得税综合所得税法'
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    standard_monthly_threshold NUMERIC(10, 2) NOT NULL, -- 月度起征点/标准扣除额 (例如 5000.00)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (jurisdiction_id, effective_start_date)
);
COMMENT ON TABLE tax_policies IS '存储不同时期、不同管辖区的税收政策版本';
```

### 19. `tax_brackets` - 累进税率表

```sql
CREATE TABLE tax_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES tax_policies(id) ON DELETE CASCADE,
    bracket_level INT NOT NULL,
    annual_income_floor NUMERIC(12, 2) NOT NULL, -- 级距下限
    annual_income_ceiling NUMERIC(12, 2), -- 级距上限 (最高级可为 NULL)
    rate NUMERIC(5, 4) NOT NULL, -- 例如 0.0300 代表 3%
    quick_deduction NUMERIC(10, 2) NOT NULL,
    UNIQUE (policy_id, bracket_level),
    UNIQUE (policy_id, annual_income_floor)
);
COMMENT ON TABLE tax_brackets IS '存储与特定税收政策关联的年度累进税率等级';
```

### 20. `special_deduction_types` - 专项附加扣除类型表

```sql
CREATE TABLE special_deduction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES tax_policies(id),
    system_key TEXT NOT NULL, -- 'child_education', 'mortgage_interest', 'rent', 'elderly_care'
    name TEXT NOT NULL, -- '子女教育', '住房贷款利息', '住房租金', '赡养老人'
    standard_monthly_amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (policy_id, system_key)
);
COMMENT ON TABLE special_deduction_types IS '定义合法的专项附加扣除项目及其标准';
```

### 21. `employee_special_deductions` - 员工个人专项附加扣除申报表

```sql
CREATE TABLE employee_special_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    deduction_type_id UUID NOT NULL REFERENCES special_deduction_types(id),
    claimed_monthly_amount NUMERIC(10, 2) NOT NULL,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, deduction_type_id, effective_start_date)
);
COMMENT ON TABLE employee_special_deductions IS '记录员工个人申报的专项附加扣除项目';
```

---

## Supabase 特性增强与自动化

利用 Supabase 的独特优势，将数据库从一个静态的设计提升为一个高效、智能的应用后端。

### 1. 权限与安全：实现经理级访问和角色管理

**a. 定义汇报关系与角色**

```sql
-- 在 employees 表中增加 manager_id 来定义汇报关系
ALTER TABLE employees ADD COLUMN manager_id UUID REFERENCES employees(id);

-- 创建 user_roles 表来管理权限
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'employee', 'manager', 'hr_admin', 'finance_admin'
    UNIQUE (user_id, role)
);
```

**b. 编写更强大的 RLS 策略**

```sql
-- 允许经理访问其直接下属的员工信息
CREATE POLICY "Allow manager access to their reports"
ON employees FOR SELECT USING (
    id IN (
        SELECT id FROM employees WHERE manager_id = (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    )
);
```

### 2. 自动化与集成：使用 `pg_cron` 和数据库 Webhooks

**a. 使用 `pg_cron` 自动生成工资单草稿**

```sql
-- 安排一个 cron 任务，在每个月25号的凌晨1点执行
SELECT cron.schedule(
    'generate-monthly-payrolls',
    '0 1 25 * *', -- Cron 表达式
    $$
    SELECT create_all_draft_payrolls(make_date(EXTRACT(YEAR FROM NOW())::int, EXTRACT(MONTH FROM NOW())::int, 1));
    $$
);
```

**b. 使用数据库 Webhooks (`pg_net`) 发送通知**

```sql
-- 创建一个触发器函数，在工资单支付后发送通知
CREATE OR REPLACE FUNCTION notify_employee_on_payroll_paid()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM net.http_post(
        url:='https://api.youremailservice.com/send',
        headers:='{"Authorization": "Bearer YOUR_API_KEY"}'::jsonb,
        body:=jsonb_build_object(
            'to', (SELECT email FROM auth.users WHERE id = (SELECT user_id FROM employees WHERE id = NEW.employee_id)),
            'subject', '您的工资已发放',
            'body', '您 ' || to_char(NEW.pay_period_start, 'YYYY-MM') || ' 的工资单已生成，请登录系统查看。'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 将触发器绑定到 payrolls 表
CREATE TRIGGER payroll_paid_trigger
AFTER UPDATE OF status ON payrolls
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status <> 'paid')
EXECUTE FUNCTION notify_employee_on_payroll_paid();
```

### 3. 实时功能：打造动态仪表盘

利用 Supabase 的实时引擎，为管理端提供动态、实时的工资处理进度仪表盘。

```javascript
// Supabase JS Client 示例
const payrollsSubscription = supabase
  .channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'payrolls' },
    (payload) => {
      console.log('Payroll change received!', payload);
      // 在前端UI上实时更新工资单的状态
      updatePayrollStatusInUI(payload.new.id, payload.new.status);
    }
  )
  .subscribe();
```

### 4. 存储集成：管理员工的电子档案

利用 Supabase Storage 存储员工的电子文件，并通过关联表进行管理。

```sql
CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Supabase Storage 中文件的路径
    document_type TEXT NOT NULL, -- 'employment_contract', 'id_scan', 'degree_certificate'
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
