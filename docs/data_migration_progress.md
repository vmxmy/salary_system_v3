## 数据迁移进度报告

**日期：** 2025年7月23日

**目标：** 将原系统 PostgreSQL 数据库数据迁移至新的 Supabase 数据库，使其结构与 `docs/database_schema_design.md` 文档一致。

---

### 1. 已完成的迁移任务

以下表的数据已成功迁移至 Supabase 数据库：

*   `departments` (部门表)
*   `employee_categories` (员工身份表，已保留层级关系)
*   `job_ranks` (员工职级表)
*   `positions` (职务表)
*   `insurance_types` (险种定义表)
*   `social_insurance_policies` (社保政策表)
*   `tax_jurisdictions` (税收管辖区表)
*   `tax_policies` (税收政策版本表)
*   `employees` (员工主表，**身份证号暂时明文存储，待后续加密**)
*   `employee_bank_accounts` (员工银行账户表，**敏感信息暂时明文存储，待后续加密**)
*   `employee_contacts` (员工联系方式表，**敏感信息暂时明文存储，待后续加密**)
*   `employee_education` (员工学历信息表)

**已创建的辅助映射表：**

*   `migration_employee_id_map` (旧员工ID到新UUID的映射)
*   `department_id_mapping` (旧部门ID到新UUID的映射)
*   `position_id_mapping` (旧职位ID到新UUID的映射)
*   `job_rank_id_mapping` (旧职级ID到新UUID的映射)

---

### 2. 当前任务状态：`employee_job_history` (员工职位历史表)

*   **目标：** 导入原系统 `hr.employee_job_history` 表的数据。
*   **遇到的问题：** 在导入过程中，发现原系统 `hr.employee_job_history` 表中的 `position_id` 字段混淆了“职务”和“职级”的概念，导致外键约束违反。
*   **当前决定：** **暂时不导入 `employee_job_history` 表。** 我们需要先对原系统中的职务和职级数据进行更详细的整理和分类，以确保其在新系统中的正确映射。
*   **下一步行动：** 专注于整理和分类原系统中的职务和职级数据。

---

### 3. 待完成的迁移任务

在解决职务和职级数据分类问题并完成 `employee_job_history` 导入后，以下表仍需进行数据迁移：

*   `payrolls` (工资单主表)
*   `payroll_items` (工资单明细表)
*   `employee_contribution_bases` (员工缴费基数表)
*   `tax_brackets` (累进税率表)
*   `special_deduction_types` (专项附加扣除类型表)
*   `employee_special_deductions` (员工个人专项附加扣除申报表)
*   `employee_documents` (员工文档表)
*   `user_roles` (用户角色表)

---

### 4. 重要注意事项

*   **敏感数据加密：** `employees` (身份证号)、`employee_bank_accounts` (银行信息) 和 `employee_contacts` (联系方式) 中的敏感数据目前是明文存储。在完成所有数据迁移和系统测试后，**强烈建议优先实施加密方案**。
*   **数据验证：** 每次导入后，都应进行数据验证，确保数据的完整性和准确性。
