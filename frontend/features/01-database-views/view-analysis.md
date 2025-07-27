# 数据库视图分析报告

## 现有视图清单

1. **view_department_hierarchy** - 部门层级视图
2. **view_employee_basic_info** - 员工基本信息视图（包含部门、职位、类别等）
3. **view_employee_category_hierarchy** - 员工类别层级视图
4. **view_insurance_category_applicability** - 保险类别适用性视图
5. **view_payroll_summary** - 薪资汇总视图（简单）

## 现有表结构

### 薪资相关表
- **payrolls** - 薪资主表
- **payroll_items** - 薪资明细项
- **salary_components** - 薪资组件（已分六大类）

### 保险相关表
- **employee_contribution_bases** - 员工缴费基数表（按时间段）
- **insurance_types** - 保险类型
- **insurance_type_category_rules** - 保险类型与员工类别规则
- **social_insurance_policies** - 社保政策
- **social_insurance_policy_applicable_categories** - 政策适用类别
- **insurance_calculation_logs** - 保险计算日志

## 需要新建的视图

### 1. 缴费基数管理视图
- **view_employee_insurance_base_monthly** - 员工月度缴费基数视图
  - 整合employee_contribution_bases按月展示
  - 支持基数继承（当月无数据使用上月）
  
### 2. 保险费率配置视图
- **view_insurance_rate_config** - 保险费率配置视图
  - 整合insurance_types和social_insurance_policies
  - 按员工类别展示适用费率

### 3. 薪资组件分类视图
- **view_salary_component_categories** - 薪资组件分类汇总
  - 基于salary_components的category字段
  - 展示六大类统计

### 4. 薪资计算明细视图
- **view_payroll_detail_items** - 薪资明细视图
  - 整合payrolls和payroll_items
  - 关联salary_components展示分类

### 5. 薪资统计视图
- **view_payroll_period_statistics** - 期间薪资统计
- **view_department_payroll_statistics** - 部门薪资统计
- **view_payroll_cost_analysis** - 成本分析视图