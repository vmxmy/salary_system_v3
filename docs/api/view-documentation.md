# 数据库视图API文档

## 概述

本文档说明了薪资管理系统V3版本中的数据库视图结构和使用方法。系统采用了优化的视图设计，解决了数据冗余和性能问题。

## 视图架构

### 1. 核心设计原则

- **单一职责**：每个视图负责特定的数据展示需求
- **性能优化**：避免不必要的JOIN操作导致的数据重复
- **字段统一**：前后端使用一致的字段命名规范
- **向后兼容**：通过兼容层支持旧版本代码

## 主要视图说明

### view_payroll_summary（薪资汇总视图）

**用途**：用于薪资列表页面展示，每个薪资记录一行数据

**特点**：
- 不包含薪资明细项，避免数据重复
- 包含员工基本信息和部门信息
- 优化了查询性能

**表结构**：
```sql
CREATE VIEW view_payroll_summary AS
SELECT DISTINCT
    p.id as payroll_id,           -- 薪资记录ID
    p.employee_id,                -- 员工ID
    e.full_name as employee_name, -- 员工姓名（统一使用employee_name）
    e.id_number,                  -- 身份证号
    p.pay_period_start,          -- 计薪开始日期
    p.pay_period_end,            -- 计薪结束日期
    p.pay_date,                  -- 发薪日期
    p.status,                    -- 薪资状态
    p.gross_pay,                 -- 应发工资
    p.total_deductions,          -- 扣除合计
    p.net_pay,                   -- 实发工资
    p.notes,                     -- 备注
    p.created_at as payroll_created_at,  -- 创建时间
    p.updated_at as payroll_updated_at,  -- 更新时间
    -- 员工关联信息
    ea.department_id,            -- 部门ID
    d.name as department_name,   -- 部门名称
    ea.position_id,              -- 职位ID
    pos.name as position_name,   -- 职位名称
    -- 时间维度
    TO_CHAR(p.pay_period_start, 'YYYY-MM') as pay_month,        -- 月份
    TO_CHAR(p.pay_period_start, 'YYYY年MM月') as pay_month_string, -- 中文月份
    EXTRACT(YEAR FROM p.pay_period_start)::integer as pay_year,    -- 年份
    EXTRACT(MONTH FROM p.pay_period_start)::integer as pay_month_number, -- 月份数字
    -- 辅助标识
    CASE 
        WHEN EXTRACT(YEAR FROM p.pay_period_start) = EXTRACT(YEAR FROM CURRENT_DATE) 
        THEN true ELSE false
    END as is_current_year,      -- 是否当前年份
    CASE 
        WHEN p.pay_period_start >= DATE_TRUNC('month', CURRENT_DATE) 
         AND p.pay_period_start < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' 
        THEN true ELSE false
    END as is_current_month      -- 是否当前月份
FROM payrolls p
LEFT JOIN employees e ON p.employee_id = e.id
LEFT JOIN employee_assignments ea ON p.employee_id = ea.employee_id 
    AND ea.is_active = true
LEFT JOIN departments d ON ea.department_id = d.id
LEFT JOIN positions pos ON ea.position_id = pos.id;
```

**使用示例**：

```typescript
// 获取薪资列表
const { data, error } = await supabase
  .from('view_payroll_summary')
  .select('*')
  .eq('pay_month', '2025-01')
  .order('pay_date', { ascending: false });

// 返回数据结构
{
  payroll_id: "uuid",
  employee_id: "uuid",
  employee_name: "张三",
  department_name: "技术部",
  pay_date: "2025-01-25",
  status: "paid",
  gross_pay: 10000,
  total_deductions: 2000,
  net_pay: 8000,
  // ...其他字段
}
```

### view_payroll_unified（薪资详情统一视图）

**用途**：用于薪资详情展示，包含所有薪资项目明细

**特点**：
- 包含薪资项目明细（一个薪资对应多行）
- 适合详情页面和报表生成
- 支持多维度筛选

**表结构**：
```sql
CREATE VIEW view_payroll_unified AS
SELECT 
    -- 薪资基本信息
    p.id as payroll_id,
    p.employee_id,
    p.pay_period_start,
    p.pay_period_end,
    p.pay_date,
    p.status,
    p.gross_pay,
    p.total_deductions,
    p.net_pay,
    -- 薪资项目明细
    pi.id as payroll_item_id,
    pi.component_id,
    pc.name as component_name,
    pc.type as component_type,
    pc.category as component_category,
    cat.name as category_name,
    cat.sort_order as category_sort_order,
    pi.amount as item_amount,
    pi.notes as item_notes,
    -- 员工信息
    e.full_name as employee_name,
    e.id_number,
    -- 部门职位信息
    ea.department_id,
    d.name as department_name,
    ea.position_id,
    pos.name as position_name,
    -- 时间维度和标识
    TO_CHAR(p.pay_period_start, 'YYYY-MM') as pay_month,
    TO_CHAR(p.pay_period_start, 'YYYY年MM月') as pay_month_string,
    -- ... 其他字段
FROM payrolls p
LEFT JOIN payroll_items pi ON p.id = pi.payroll_id
LEFT JOIN payroll_components pc ON pi.component_id = pc.id
LEFT JOIN lookup_values cat ON pc.category = cat.key AND cat.type_id = 'PAYROLL_CATEGORY'
LEFT JOIN employees e ON p.employee_id = e.id
-- ... 其他JOIN
```

**使用示例**：

```typescript
// 获取薪资详情（包含所有明细项）
const { data, error } = await supabase
  .from('view_payroll_unified')
  .select('*')
  .eq('payroll_id', 'specific-payroll-id')
  .order('category_sort_order', { ascending: true });

// 返回数据结构（多行，每行一个薪资项）
[
  {
    payroll_id: "uuid",
    employee_name: "张三",
    payroll_item_id: "uuid-1",
    component_name: "基本工资",
    item_amount: 5000,
    // ...
  },
  {
    payroll_id: "uuid",  // 相同的payroll_id
    employee_name: "张三",
    payroll_item_id: "uuid-2",
    component_name: "绩效奖金",
    item_amount: 2000,
    // ...
  }
]
```

### view_employee_insurance_base_unified（保险基数统一视图）

**用途**：管理和查询员工的五险一金缴费基数

**特点**：
- 支持历史数据查询
- 包含时间标识符便于筛选
- 使用row_number实现最新记录标识

**使用示例**：

```typescript
// 获取最新的保险基数
const { data, error } = await supabase
  .from('view_employee_insurance_base_unified')
  .select('*')
  .eq('employee_id', 'employee-uuid')
  .eq('rn', 1);  // rn=1表示最新记录
```

### view_payroll_trend_unified（薪资趋势统一视图）

**用途**：用于薪资统计和趋势分析

**特点**：
- 按月份汇总薪资数据
- 包含员工数量、总额、平均值等统计
- 支持年度和近期数据筛选

**使用示例**：

```typescript
// 获取最近12个月的薪资趋势
const { data, error } = await supabase
  .from('view_payroll_trend_unified')
  .select('*')
  .eq('is_recent_12_months', true)
  .order('pay_month', { ascending: false });
```

## API调用规范

### 1. 列表查询

```typescript
// 薪资列表 - 使用view_payroll_summary
async getPayrollList(month: string) {
  const { data, error } = await supabase
    .from('view_payroll_summary')
    .select('*')
    .eq('pay_month', month)
    .order('employee_name');
    
  return data;
}
```

### 2. 详情查询

```typescript
// 薪资详情 - 使用view_payroll_unified
async getPayrollDetails(payrollId: string) {
  const { data, error } = await supabase
    .from('view_payroll_unified')
    .select('*')
    .eq('payroll_id', payrollId)
    .not('payroll_item_id', 'is', null)  // 只获取有明细的记录
    .order('category_sort_order');
    
  return data;
}
```

### 3. 统计查询

```typescript
// 月度统计 - 使用view_payroll_trend_unified
async getMonthlyStatistics(year: number) {
  const { data, error } = await supabase
    .from('view_payroll_trend_unified')
    .select('*')
    .eq('pay_year', year)
    .order('pay_month_number');
    
  return data;
}
```

## 性能优化建议

### 1. 使用正确的视图

- **列表页面**：使用 `view_payroll_summary`（一对一关系）
- **详情页面**：使用 `view_payroll_unified`（一对多关系）
- **统计报表**：使用 `view_payroll_trend_unified`（预聚合数据）

### 2. 合理使用过滤条件

```typescript
// 好的做法 - 使用索引字段过滤
.eq('pay_month', '2025-01')
.eq('status', 'paid')

// 避免 - 全表扫描
.ilike('employee_name', '%张%')  // 如果必须，考虑添加其他过滤条件
```

### 3. 分页查询

```typescript
// 大数据集分页
const pageSize = 20;
const { data, error, count } = await supabase
  .from('view_payroll_summary')
  .select('*', { count: 'exact' })
  .range((page - 1) * pageSize, page * pageSize - 1);
```

## 错误处理

```typescript
try {
  const { data, error } = await supabase
    .from('view_payroll_summary')
    .select('*');
    
  if (error) {
    console.error('查询失败:', error.message);
    // 处理特定错误
    if (error.code === '42P01') {
      console.error('视图不存在');
    }
  }
} catch (err) {
  console.error('网络错误:', err);
}
```

## 版本历史

- **v1.0.0** (2025-01): 初始版本，创建基础视图
- **v1.1.0** (2025-01): 优化薪资视图，解决数据重复问题
- **v1.2.0** (2025-01): 统一字段命名，使用employee_name替代full_name