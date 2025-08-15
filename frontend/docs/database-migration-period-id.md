# 数据库迁移：从日期字段到薪资周期ID关联

## 变更概述

系统已完成重大数据库结构调整，将所有时间相关的字段从日期类型迁移到薪资周期ID (period_id) 关联。这提供了更好的数据一致性和查询性能。

## 受影响的表

### 1. payrolls 表
- **保留字段**：
  - `pay_date` (date) - 发薪日期
  - `period_id` (uuid) - 关联到 payroll_periods 表
- **已删除字段**：
  - `pay_period_start` 
  - `pay_period_end`
- **数据迁移状态**：✅ 已关联53条1月记录，1条8月记录

### 2. payroll_items 表
- **新增字段**：`period_id` (uuid)
- **数据迁移状态**：✅ 已关联895条薪资明细

### 3. employee_contribution_bases 表
- **新增字段**：`period_id` (uuid)
- **已删除字段**：
  - `effective_date`
  - `end_date`
- **数据迁移状态**：✅ 已添加period_id字段

### 4. employee_category_assignments 表
- **新增字段**：`period_id` (uuid)
- **已删除字段**：
  - `effective_date`
  - `end_date`
- **数据迁移状态**：✅ 已添加period_id字段

### 5. employee_job_history 表
- **新增字段**：`period_id` (uuid)
- **已删除字段**：
  - `effective_date`
  - `end_date`
- **数据迁移状态**：✅ 已添加period_id字段

### 6. payroll_periods 表（新的核心表）
- **字段结构**：
  - `id` (uuid) - 主键
  - `period_code` (text) - 周期代码，如 "2025-01"
  - `period_name` (text) - 周期名称，如 "2025年1月"
  - `period_year` (integer) - 年份
  - `period_month` (integer) - 月份
  - `period_start` (date) - 周期开始日期
  - `period_end` (date) - 周期结束日期
  - `pay_date` (date) - 发薪日期
  - `status` (text) - 状态：draft, open, closed, archived
  - `employee_count` (integer) - 员工数量
  - `total_gross_pay` (numeric) - 总应发工资
  - `total_net_pay` (numeric) - 总实发工资

## 前端 Hooks 需要的修改

### 需要修改的 Hooks

1. **usePayroll** ✅
   - 查询需要 JOIN payroll_periods 表获取周期信息
   - 过滤条件从日期改为 period_id
   - 创建薪资时需要先选择或创建 period

2. **useEmployeeCategory** ✅
   - employee_assignments 表仍然使用 effective_date/end_date
   - employee_category_assignments 表使用 period_id
   - 需要区分两种不同的数据源

3. **useEmployeePosition** ✅ 
   - employee_assignments 表仍然使用 effective_date/end_date
   - employee_job_history 表使用 period_id
   - 需要区分两种不同的数据源

4. **useContributionBase** (待创建)
   - 完全基于 period_id 查询
   - 不再使用日期范围查询

5. **usePayrollEarnings** (待创建)
   - 基于 period_id 查询收入明细
   - 关联 payroll_items 表

### 需要新增的 Hooks

1. **usePayrollPeriod** (新增)
   - 管理薪资周期的 CRUD
   - 获取可用周期列表
   - 周期状态管理
   - 周期锁定/解锁

## 查询模式变更

### 旧模式（基于日期）
```typescript
// 查询某月薪资
query.gte('pay_period_start', '2025-01-01')
     .lte('pay_period_start', '2025-01-31')
```

### 新模式（基于 period_id）
```typescript
// 先获取周期
const period = await getPeriodByMonth('2025-01')
// 然后查询该周期的薪资
query.eq('period_id', period.id)
```

## 优势

1. **数据一致性**：所有相关数据都关联到同一个周期
2. **查询性能**：通过 UUID 索引查询比日期范围查询更快
3. **业务逻辑清晰**：周期管理更加集中和规范
4. **版本控制**：可以轻松实现薪资周期的版本管理
5. **批量操作**：基于周期的批量操作更加高效

## 注意事项

1. **兼容性**：employee_assignments 表仍保留日期字段，用于员工任职历史
2. **数据迁移**：确保所有历史数据都正确关联到对应的周期
3. **周期创建**：在创建薪资前必须先创建或选择周期
4. **权限控制**：周期的状态决定了是否可以修改该周期的数据