# 视图体系维护和使用说明文档

## 📖 概述

本文档为高新区工资信息管理系统 v3 的数据库视图体系提供全面的维护和使用指南。该视图体系采用四层架构设计，旨在提供高效、可维护的数据查询解决方案。

## 🏗️ 视图架构设计

### 架构原则

**分层设计原则**
- **Layer 1 (Foundation)**: 基础数据整合，提供单表或简单关联查询
- **Layer 2 (Business Logic)**: 业务逻辑封装，满足前端组件直接需求
- **Layer 3 (Aggregation)**: 聚合分析层，提供统计和汇总数据
- **Layer 4 (Analytics)**: 专项分析层，支持复杂报表和趋势分析

**命名规范**
```
view_[domain]_[function]_[type]
```
- `domain`: 业务域 (employee, payroll, insurance, dashboard)
- `function`: 功能描述 (basic, trend, summary, statistics)
- `type`: 类型标识 (info, unified, monthly, latest)

## 📊 视图体系清单

### Layer 1 - Foundation Views (基础层)

#### view_employee_basic_info
**用途**: 员工基础信息视图，包含当前部门和职位
**数据量**: 82 条记录
**核心字段**:
```sql
- employee_id: 员工唯一标识
- employee_name: 员工姓名  
- id_number: 身份证号
- current_department_name: 当前部门
- current_position_name: 当前职位
- employment_status: 就业状态
```
**使用场景**: 员工列表、基础信息查询、表单选项

#### view_positions_with_details
**用途**: 职位详情视图，包含层级关系
**数据量**: 12 条记录
**核心字段**:
```sql
- position_id: 职位ID
- position_name: 职位名称
- position_level: 职位等级
- department_name: 所属部门
```
**使用场景**: 职位管理、组织架构展示

### Layer 2 - Business Logic Views (业务逻辑层)

#### view_department_payroll_statistics ⭐ (新增关键视图)
**用途**: 部门薪资统计视图，按月份和部门汇总薪资数据
**数据量**: 动态（按部门和月份聚合）
**核心字段**:
```sql
- pay_year: 薪资年份
- pay_month: 薪资月份  
- department_id: 部门ID
- department_name: 部门名称
- employee_count: 该部门该月份的员工数
- total_gross_pay: 应发工资总额
- total_net_pay: 实发工资总额
- avg_gross_pay: 平均应发工资
- avg_net_pay: 平均实发工资
- min_gross_pay: 最低应发工资
- max_gross_pay: 最高应发工资
```
**使用场景**: 部门薪资分析、部门绩效对比、财务报表

#### view_dashboard_stats ⭐ (关键视图)
**用途**: 仪表盘统计数据，解决前端 404 错误
**数据量**: 1 条汇总记录
**核心字段**:
```sql
- total_employees: 总员工数
- active_employees: 在职员工数
- terminated_employees: 离职员工数
- new_employees_this_month: 本月新员工
- total_departments: 部门总数
- last_payroll_total: 最近薪资总额
- next_payroll_date: 下次发薪日期
```
**使用场景**: 首页仪表盘、管理概览

#### view_recent_activities
**用途**: 最近活动记录，统一活动日志
**数据量**: 93 条记录
**核心字段**:
```sql
- activity_type: 活动类型 (new_employee, payroll_completed)
- entity_name: 实体名称
- activity_date: 活动时间
- additional_info: 附加信息
```
**使用场景**: 活动时间线、系统日志展示

#### view_payroll_trend_unified
**用途**: 薪资趋势统一视图
**数据量**: 12 条记录
**核心字段**:
```sql
- period_year: 薪资年份
- period_month: 薪资月份
- employee_count: 员工数量
- total_amount: 薪资总额
```
**使用场景**: 薪资趋势分析、财务报表

#### view_employee_insurance_base_unified
**用途**: 员工保险基数统一视图
**数据量**: 424 条记录
**核心字段**:
```sql
- employee_id: 员工ID
- insurance_type_name: 保险类型
- contribution_base: 缴费基数
- employee_rate: 个人费率
- employer_rate: 单位费率
```
**使用场景**: 保险管理、社保计算

### Layer 3 - Aggregation Views (聚合分析层)

#### view_monthly_payroll_trend
**用途**: 月度薪资趋势聚合分析
**数据量**: 12 条记录
**核心字段**:
```sql
- period_year: 年份
- period_month: 月份
- employee_count: 员工数量
- total_gross_pay: 总应发
- total_net_pay: 总实发
- avg_net_pay: 平均实发
- trend_direction: 趋势方向 (up/down/stable)
- yoy_growth_rate: 同比增长率
```
**使用场景**: 月度报表、趋势分析图表

#### view_payroll_period_estimation
**用途**: 薪资周期预估分析
**数据量**: 1 条汇总记录
**核心字段**:
```sql
- current_period: 当前周期
- estimated_total: 预估总额
- historical_avg: 历史平均
```
**使用场景**: 财务预算、成本预估

#### view_insurance_base_monthly_summary
**用途**: 保险基数月度汇总
**数据量**: 8 条汇总记录
**核心字段**:
```sql
- summary_month: 汇总月份
- insurance_type: 保险类型
- total_employees: 参保员工数
- total_base_amount: 基数总额
```
**使用场景**: 保险汇总报表、成本分析

### Layer 4 - Analytics Views (专项统计层)

#### view_salary_component_fields_statistics
**用途**: 薪资组件字段统计分析
**数据量**: 42 条统计记录
**核心字段**:
```sql
- component_name: 组件名称
- field_name: 字段名称
- usage_count: 使用次数
- avg_value: 平均值
- data_quality_score: 数据质量评分
```
**使用场景**: 薪资结构分析、数据质量监控

#### view_employee_insurance_base_monthly
**用途**: 员工保险基数月度详细分析
**数据量**: 424 条记录
**核心字段**:
```sql
- employee_id: 员工ID
- month_year: 月份年份
- insurance_type: 保险类型
- monthly_base: 月度基数
- calculation_details: 计算明细
```
**使用场景**: 详细保险分析、个人保险历史

#### view_employee_insurance_base_monthly_latest
**用途**: 最新保险基数视图，提供最新状态
**数据量**: 424 条记录
**核心字段**:
```sql
- employee_id: 员工ID
- latest_base: 最新基数
- effective_date: 生效日期
- data_freshness: 数据新鲜度
```
**使用场景**: 当前保险状态查询、实时数据展示

### Metadata Views (元数据管理)

#### view_metadata
**用途**: 系统元数据管理和监控
**数据量**: 17 条元数据记录
**核心字段**:
```sql
- metadata_category: 元数据类别
- metadata_key: 元数据键
- metadata_description: 描述
- total_count: 总数
- status: 状态
```
**使用场景**: 系统监控、数据库健康检查

## 🎯 前端 Hook 集成

### Hook 与视图映射关系

```typescript
// Dashboard Hook
useDashboard() -> view_dashboard_stats, view_recent_activities

// Employee Hook  
useEmployeeList() -> view_employee_basic_info

// Payroll Hook
usePayrolls() -> view_payroll_trend_unified
usePayrollStatistics() -> view_monthly_payroll_trend

// Insurance Hook
useInsuranceConfig() -> view_employee_insurance_base_unified
```

### 标准查询模式

```typescript
// 基础查询模式
const { data, error } = await supabase
  .from('view_dashboard_stats')
  .select('*')
  .single();

// 列表查询模式
const { data, error } = await supabase
  .from('view_recent_activities')
  .select('*')
  .order('activity_date', { ascending: false })
  .limit(10);

// 过滤查询模式
const { data, error } = await supabase
  .from('view_monthly_payroll_trend')
  .select('*')
  .eq('is_recent_12_months', true)
  .order('period_year DESC, period_month DESC');
```

## 🔧 维护指南

### 视图创建最佳实践

**1. 遵循命名规范**
```sql
-- ✅ 正确命名
CREATE VIEW view_employee_basic_info AS ...
CREATE VIEW view_payroll_monthly_summary AS ...

-- ❌ 错误命名  
CREATE VIEW emp_info AS ...
CREATE VIEW payroll_data AS ...
```

**2. 使用 CTE 优化复杂查询**
```sql
CREATE VIEW view_complex_analysis AS
WITH base_data AS (
  SELECT ... FROM table1
),
calculated_data AS (
  SELECT ..., 
    LAG(amount) OVER (ORDER BY date) as prev_amount
  FROM base_data
)
SELECT * FROM calculated_data;
```

**3. 添加适当的注释**
```sql
-- 创建员工薪资趋势视图
-- 用途: 为前端 usePayrollTrend Hook 提供数据
-- 更新: 2025-08-15
CREATE OR REPLACE VIEW view_payroll_trend AS ...
```

### 性能优化策略

**1. 选择性投影**
```sql
-- ✅ 只选择必要字段
SELECT employee_id, employee_name, department_name
FROM employees e
JOIN departments d ON e.department_id = d.id

-- ❌ 避免全字段查询
SELECT * FROM employees e JOIN departments d ON ...
```

**2. 合理使用索引**
```sql
-- 确保关联字段有索引
CREATE INDEX idx_employee_department ON employees(department_id);
CREATE INDEX idx_payroll_period ON payrolls(period_id);
```

**3. 避免不必要的聚合**
```sql
-- ✅ 在需要时才聚合
CREATE VIEW view_summary AS
SELECT 
  department_id,
  COUNT(*) as employee_count
FROM employees 
WHERE status = 'active'
GROUP BY department_id;
```

### 视图维护工作流

**1. 需求分析**
- 确定前端 Hook 需要的字段
- 分析查询性能要求
- 识别数据源表和关联关系

**2. 设计阶段**
- 选择合适的架构层级
- 确定视图命名
- 设计字段映射关系

**3. 实现阶段**
```bash
# 1. 创建迁移文件
cd supabase
supabase migration new create_view_name

# 2. 编写视图 SQL
# 3. 应用迁移
supabase db push

# 4. 验证视图
supabase sql --file test_view.sql
```

**4. 测试验证**
```sql
-- 数据完整性测试
SELECT COUNT(*) FROM view_name;

-- 性能测试
EXPLAIN ANALYZE SELECT * FROM view_name WHERE condition;

-- 字段类型验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'view_name';
```

**5. 前端集成**
```typescript
// 更新 Hook 以使用新视图
const useNewFeature = () => {
  return useQuery({
    queryKey: ['newFeature'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_new_feature')
        .select('*');
      return data;
    }
  });
};
```

## 🐛 故障排除

### 常见问题和解决方案

**1. 视图不存在错误**
```bash
# 症状: relation "view_name" does not exist
# 解决: 检查视图是否正确创建
SELECT viewname FROM pg_views WHERE schemaname = 'public';
```

**2. 字段不存在错误**
```bash
# 症状: column "field_name" does not exist
# 解决: 检查字段名拼写和数据类型
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'view_name';
```

**3. 性能问题**
```sql
-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM view_name;

-- 检查是否缺少索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'base_table_name';
```

**4. 数据不一致**
```sql
-- 检查数据源更新时间
SELECT MAX(updated_at) FROM source_table;

-- 刷新物化视图（如果使用）
REFRESH MATERIALIZED VIEW view_name;
```

### 监控和报警

**1. 视图健康检查**
```sql
-- 检查所有业务视图状态
SELECT 
  viewname,
  definition,
  'OK' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'view_%';
```

**2. 性能监控**
```sql
-- 监控视图查询性能
SELECT 
  schemaname,
  viewname,
  n_tup_ins + n_tup_upd + n_tup_del as total_operations
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
```

## 📈 扩展指南

### 添加新视图

**1. 评估需求**
- 确定所属架构层级
- 评估对现有视图的影响
- 考虑性能影响

**2. 设计方案**
```sql
-- 新视图设计模板
CREATE OR REPLACE VIEW view_[domain]_[function]_[type] AS
WITH base_cte AS (
  -- 基础数据查询
  SELECT ... FROM core_tables
),
enriched_cte AS (
  -- 数据丰富和计算
  SELECT ..., 
    calculated_field,
    aggregated_value
  FROM base_cte
)
SELECT 
  -- 最终字段选择，确保与前端期望一致
  field1,
  field2 as frontend_expected_name,
  field3
FROM enriched_cte
ORDER BY sort_field;
```

**3. 迁移策略**
```bash
# 渐进式迁移
1. 创建新视图
2. 前端双重查询（新旧并存）
3. 验证数据一致性
4. 切换到新视图
5. 删除旧视图
```

### 版本管理

**1. 视图版本控制**
```sql
-- 视图版本标记
COMMENT ON VIEW view_employee_basic_info IS 
'Version: 2.1.0, Created: 2025-08-15, Purpose: Employee basic info for frontend hooks';
```

**2. 向后兼容性**
```sql
-- 保持向后兼容的字段别名
CREATE VIEW view_legacy_compat AS
SELECT 
  employee_name as full_name,  -- 兼容旧字段名
  employee_id as id,
  department_name
FROM view_employee_basic_info;
```

## 📚 参考资料

### 相关文档
- [Hook 维护文档](./HOOK_MAINTENANCE_GUIDE.md)
- [字段映射指南](./field-mapping-guide.md)
- [视图API文档](./api/view-documentation.md)

### 最佳实践资源
- PostgreSQL 视图性能优化
- Supabase 视图管理最佳实践
- React Hook 与数据库视图集成模式

### 团队联系
- **维护团队**: 前端开发组
- **技术支持**: 数据库团队
- **最后更新**: 2025-08-15
- **文档版本**: 1.0.0

---

**注意**: 本文档将随着系统演进持续更新，请定期查看最新版本。