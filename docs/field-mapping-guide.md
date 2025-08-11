# 字段映射规范指南

## 概述

本文档定义了薪资管理系统V3版本中前后端字段命名规范和映射关系，确保整个系统的数据一致性。

## 命名规范原则

### 1. 基本原则

- **一致性**：前后端使用相同的字段名
- **语义化**：字段名应清晰表达其含义
- **标准化**：遵循snake_case命名规范
- **统一性**：避免同义字段的不同命名

### 2. 命名模式

```
表名_字段名  // 当需要明确来源时
字段名       // 通用字段
```

## 核心字段映射表

### 员工相关字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| employee_id | employee_id | string (UUID) | 员工唯一标识 | - |
| employee_name | employee_name | string | 员工姓名 | full_name |
| id_number | id_number | string | 身份证号 | - |
| gender | gender | string | 性别 | - |
| date_of_birth | date_of_birth | date | 出生日期 | - |
| hire_date | hire_date | date | 入职日期 | - |
| termination_date | termination_date | date | 离职日期 | - |
| employment_status | employment_status | string | 在职状态 | - |
| mobile_phone | mobile_phone | string | 手机号码 | - |
| email | email | string | 电子邮箱 | - |

### 组织架构字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| department_id | department_id | string (UUID) | 部门ID | - |
| department_name | department_name | string | 部门名称 | - |
| position_id | position_id | string (UUID) | 职位ID | - |
| position_name | position_name | string | 职位名称 | position_title |
| rank_id | rank_id | string (UUID) | 职级ID | - |
| rank_name | rank_name | string | 职级名称 | - |
| category_id | category_id | string (UUID) | 人员类别ID | personnel_category_id |
| category_name | category_name | string | 人员类别名称 | personnel_category_name |

### 薪资相关字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| payroll_id | payroll_id | string (UUID) | 薪资记录ID | id |
| pay_period_start | pay_period_start | date | 计薪开始日期 | - |
| pay_period_end | pay_period_end | date | 计薪结束日期 | - |
| pay_date | pay_date | date | 发薪日期 | - |
| pay_month | pay_month | string | 薪资月份(YYYY-MM) | - |
| pay_month_string | pay_month_string | string | 中文月份(YYYY年MM月) | - |
| pay_year | pay_year | number | 薪资年份 | - |
| pay_month_number | pay_month_number | number | 月份数字(1-12) | - |
| gross_pay | gross_pay | number | 应发工资 | - |
| total_deductions | total_deductions | number | 扣除合计 | - |
| net_pay | net_pay | number | 实发工资 | - |
| status | status | string | 薪资状态 | - |

### 薪资明细字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| payroll_item_id | payroll_item_id | string (UUID) | 薪资项ID | - |
| component_id | component_id | string (UUID) | 薪资组件ID | - |
| component_name | component_name | string | 组件名称 | - |
| component_type | component_type | string | 组件类型 | - |
| component_category | component_category | string | 组件分类 | - |
| category_name | category_name | string | 分类名称 | - |
| item_amount | item_amount | number | 项目金额 | amount |
| item_notes | item_notes | string | 项目备注 | notes |

### 保险基数字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| insurance_type_id | insurance_type_id | string (UUID) | 保险类型ID | - |
| insurance_type_name | insurance_type_name | string | 保险类型名称 | - |
| insurance_type_key | insurance_type_key | string | 保险类型键值 | - |
| contribution_base | contribution_base | number | 缴费基数 | - |
| employee_rate | employee_rate | number | 个人费率 | - |
| employer_rate | employer_rate | number | 单位费率 | - |
| employee_amount | employee_amount | number | 个人缴费额 | - |
| employer_amount | employer_amount | number | 单位缴费额 | - |

### 银行信息字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| bank_account_number | bank_account_number | string | 银行账号 | primary_bank_account |
| bank_name | bank_name | string | 银行名称 | - |
| bank_branch | bank_branch | string | 开户支行 | branch_name |

### 时间戳字段

| 数据库字段 | 前端字段 | 类型 | 说明 | 原字段名(已废弃) |
|-----------|---------|------|------|-----------------|
| created_at | created_at | timestamp | 创建时间 | - |
| updated_at | updated_at | timestamp | 更新时间 | - |
| deleted_at | deleted_at | timestamp | 删除时间(软删除) | - |

## TypeScript类型定义

### 基础类型

```typescript
// 员工基本信息
interface Employee {
  employee_id: string;
  employee_name: string;  // 注意：不再使用full_name
  id_number: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'terminated' | 'suspended';
  mobile_phone?: string;
  email?: string;
}

// 薪资记录
interface Payroll {
  payroll_id: string;
  employee_id: string;
  employee_name: string;  // 冗余字段，便于显示
  department_name?: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatus;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
}

// 薪资状态枚举
enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATING = 'calculating',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}
```

### 视图类型

```typescript
// 薪资汇总视图
interface PayrollSummaryView {
  payroll_id: string;
  employee_id: string;
  employee_name: string;  // 映射自employees.full_name
  department_name?: string;
  position_name?: string;
  pay_date: string;
  pay_month: string;      // 格式: YYYY-MM
  pay_month_string: string; // 格式: YYYY年MM月
  status: PayrollStatus;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  is_current_month: boolean;
  is_current_year: boolean;
}

// 薪资详情视图
interface PayrollDetailView extends PayrollSummaryView {
  payroll_item_id?: string;
  component_name?: string;
  component_type?: string;
  item_amount?: number;
  item_notes?: string;
  category_sort_order?: number;
}
```

## 数据转换示例

### 前端到后端

```typescript
// 创建薪资记录
function createPayrollRequest(data: PayrollFormData): PayrollInsert {
  return {
    employee_id: data.employeeId,
    pay_period_start: data.periodStart,
    pay_period_end: data.periodEnd,
    pay_date: data.payDate,
    status: 'draft',
    gross_pay: 0,
    total_deductions: 0,
    net_pay: 0
  };
}
```

### 后端到前端

```typescript
// 转换视图数据为前端格式
function mapPayrollViewToUI(data: PayrollSummaryView): PayrollListItem {
  return {
    id: data.payroll_id,
    employeeName: data.employee_name,  // 统一使用employee_name
    departmentName: data.department_name,
    payDate: data.pay_date,
    status: data.status,
    grossPay: data.gross_pay,
    netPay: data.net_pay,
    // 其他字段...
  };
}
```

## 迁移指南

### 从旧字段迁移到新字段

```typescript
// 旧代码（不推荐）
const employeeName = employee.full_name;
const accountNumber = employee.primary_bank_account;

// 新代码（推荐）
const employeeName = employee.employee_name;
const accountNumber = employee.bank_account_number;
```

### 兼容性处理

```typescript
// 如果需要兼容旧数据
function getEmployeeName(employee: any): string {
  return employee.employee_name || employee.full_name || '';
}

// 但应该尽快更新数据源，避免使用兼容代码
```

## 注意事项

### 1. 避免的做法

```typescript
// ❌ 错误：混用不同的字段名
const name = data.full_name || data.employee_name;

// ❌ 错误：手动映射字段
const mapped = {
  full_name: data.employee_name,
  // ...
};

// ❌ 错误：在前端使用数据库原始字段名
const query = `SELECT full_name FROM employees`;
```

### 2. 推荐的做法

```typescript
// ✅ 正确：使用统一的字段名
const name = data.employee_name;

// ✅ 正确：使用视图提供的字段
const { data } = await supabase
  .from('view_payroll_summary')
  .select('employee_name, department_name');

// ✅ 正确：使用类型定义
interface EmployeeData {
  employee_name: string;
  // 其他字段...
}
```

## 验证清单

- [ ] 所有API响应使用统一的字段名
- [ ] TypeScript类型定义与数据库字段一致
- [ ] 前端组件props使用正确的字段名
- [ ] 表格列配置使用正确的accessor
- [ ] 搜索和过滤功能使用正确的字段
- [ ] 导出功能使用正确的字段映射

## 更新历史

- **2025-01-10**: 初始版本，统一字段命名规范
- **2025-01-10**: 废弃full_name，统一使用employee_name
- **2025-01-10**: 创建视图层，优化数据结构