# 数据库函数文档

## 函数分类概览

### 1. 保险计算相关函数 (Insurance Calculation)
- **核心计算函数**
  - `calculate_employee_social_insurance` - 计算员工社保
  - `calculate_monthly_insurance_with_eligibility` - 计算月度五险一金（带资格检查）
  - `batch_calculate_social_insurance` - 批量计算社保
  - `batch_recalculate_social_insurances` - 批量重新计算社保

- **分项计算函数**
  - `calculate_pension_insurance` - 养老保险计算
  - `calculate_medical_insurance` - 医疗保险计算
  - `calculate_unemployment_insurance` - 失业保险计算
  - `calculate_work_injury_insurance` - 工伤保险计算
  - `calculate_maternity_insurance` - 生育保险计算
  - `calculate_housing_fund` - 住房公积金计算
  - `calculate_occupational_pension` - 职业年金计算
  - `calculate_serious_illness_insurance` - 大病保险计算

- **基数和验证函数**
  - `adjust_insurance_base` - 调整保险基数
  - `validate_insurance_base` - 验证保险基数
  - `check_insurance_eligibility` - 检查保险资格
  - `get_employee_insurance_base_monthly` - 获取员工月度缴费基数

### 2. 薪资计算相关函数 (Payroll Calculation)
- **批量处理函数**
  - `create_payroll_batch` - 批量创建薪资记录
  - `copy_payroll_data_from_source` - 从源期间复制薪资数据
  - `validate_payroll_creation` - 验证薪资创建
  - `clear_payroll_data_by_period` - 按期间清空薪资数据

- **计算触发器函数**
  - `calculate_gross_pay` - 计算应发工资
  - `calculate_total_deductions` - 计算总扣除
  - `calculate_net_pay` - 计算实发工资

- **统计和查询函数**
  - `get_department_salary_stats` - 部门薪资统计
  - `get_employee_salary_history` - 员工薪资历史
  - `get_payroll_batch_summary` - 薪资批次摘要
  - `get_available_payroll_months` - 可用薪资月份

### 3. 税务计算相关函数 (Tax Calculation)
- `import_tax_brackets_config` - 导入税率配置
- `update_personal_income_tax_calculation_logs_updated_at` - 更新个税计算日志

### 4. 员工管理相关函数 (Employee Management)
- **员工信息查询**
  - `get_employee_details` - 获取员工完整信息
  - `get_employee_status_at_date` - 获取员工在指定日期的状态
  - `get_employee_category_at_date` - 获取员工在指定日期的身份类别
  - `search_employees` - 员工搜索

- **部门和职位**
  - `get_department_tree` - 获取部门树形结构
  - `get_department_ancestors` - 获取部门父级
  - `get_department_children` - 获取部门子级

### 5. 数据迁移相关函数 (Data Migration)
- `migrate_payroll_data_2025_02` - 2025年2月薪资数据迁移
- `atomic_migrate_2025_02_payroll` - 原子化迁移
- `import_from_postgresql_database` - 从PostgreSQL导入
- `execute_social_insurance_migration` - 执行社保数据迁移

### 6. 权限和安全相关函数 (Security & Permission)
- `can_access_all_data` - 检查用户是否可访问所有数据
- `can_view_sensitive_data` - 检查是否可查看敏感数据
- `is_super_admin` - 检查是否为超级管理员
- `is_hr_manager` - 检查是否为HR管理员
- `has_permission` - 检查权限

### 7. 工具函数 (Utility Functions)
- `encrypt_sensitive_data` - 加密敏感数据
- `decrypt_sensitive_data` - 解密敏感数据
- `mask_account_number` - 掩码账号
- `generate_employee_code` - 生成员工编号

## 关键函数详细说明

### calculate_employee_social_insurance
**用途**: 计算员工的完整社保信息
**参数**:
- `p_employee_id uuid` - 员工ID
- `p_period_id uuid` - 期间ID  
- `p_calculation_date date` - 计算日期

**返回**: `social_insurance_result` - 包含所有保险组件的计算结果

**特点**:
- 支持多种保险类型的统一计算
- 自动处理基数上下限
- 包含详细的计算步骤记录
- 支持规则条件判断

### create_payroll_batch
**用途**: 批量创建薪资记录
**参数**:
- `p_pay_period_start date` - 薪资期间开始
- `p_pay_period_end date` - 薪资期间结束
- `p_pay_date date` - 发薪日期
- `p_source_period_start date` - 源期间开始（可选）
- `p_source_period_end date` - 源期间结束（可选）
- `p_selected_employee_ids uuid[]` - 选定的员工ID列表

**返回**: 包含成功状态、错误信息和汇总信息的表

**特点**:
- 支持从历史期间复制数据
- 包含完整的验证流程
- 支持批量和单个创建
- 详细的调试日志

## 使用建议

1. **保险计算流程**:
   - 先调用 `check_insurance_eligibility` 检查资格
   - 使用 `calculate_employee_social_insurance` 进行完整计算
   - 或使用 `calculate_monthly_insurance_with_eligibility` 自动处理资格问题

2. **薪资创建流程**:
   - 调用 `validate_payroll_creation` 验证
   - 使用 `create_payroll_batch` 创建薪资记录
   - 自动触发器会计算 gross_pay, deductions, net_pay

3. **数据查询**:
   - 使用视图 `view_payroll_detail_items` 查看详细信息
   - 使用统计函数获取汇总数据

## 注意事项

1. 大部分函数都有 SECURITY DEFINER 属性，需要注意权限控制
2. 批量操作函数通常包含事务处理，失败会自动回滚
3. 计算函数依赖于配置表中的费率和基数设置
4. 触发器函数会自动执行，不需要手动调用