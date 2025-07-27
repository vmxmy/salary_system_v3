# 数据库视图层设计

## 功能概述
设计并实现薪资管理所需的所有数据库视图，为前端提供优化的数据访问层。

## 核心需求
1. 使用规范的命名格式：`view_[domain]_[entity]_[modifier]`
2. 所有视图都应考虑性能优化
3. 支持必要的过滤和排序功能
4. 提供完整的字段说明

## 视图清单

### 基础配置视图
- `view_employee_identity_types` - 人员身份类型配置
- `view_insurance_rate_config` - 五险一金费率配置
- `view_salary_component_categories` - 薪资组件分类

### 缴费基数管理视图
- `view_employee_insurance_base_monthly` - 月度缴费基数
- `view_insurance_base_history` - 基数变更历史
- `view_insurance_base_validation` - 基数合规性验证

### 员工薪资配置视图
- `view_employee_payroll_config` - 完整薪资配置
- `view_employee_salary_components` - 固定薪资项配置

### 薪资计算视图
- `view_payroll_summary` - 薪资汇总（六大类）
- `view_payroll_detail_items` - 薪资明细
- `view_insurance_calculation_monthly` - 五险一金计算明细

### 统计分析视图
- `view_payroll_period_statistics` - 期间统计
- `view_department_payroll_statistics` - 部门统计
- `view_payroll_cost_analysis` - 成本分析
- `view_insurance_cost_trends` - 社保趋势分析