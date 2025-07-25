## 数据迁移进度报告

**日期：** 2025年7月24日 (更新)

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
*   `social_insurance_policy_applicable_categories` (险种和人员身份多联表)
    *   **数据导入详情：** 已将旧系统 `payroll.social_insurance_configs` 表中的 `insurance_type` 和 `applicable_personnel_categories` 字段数据导入新系统。
    *   **多对多关系详情：**
        *   **表结构：** `social_insurance_policy_applicable_categories` 表包含 `policy_id` (外键，引用 `social_insurance_policies.id`) 和 `employee_category_id` (外键，引用 `employee_categories.id`)。这两个字段共同构成复合主键，确保唯一性。
        *   **关系表示：**
            *   **一个社保政策适用于多个人员类别：** 在 `social_insurance_policy_applicable_categories` 表中，通过多条记录共享相同的 `policy_id` 但具有不同的 `employee_category_id` 来实现。
            *   **一个人员类别可被多个社保政策覆盖：** 在 `social_insurance_policy_applicable_categories` 表中，通过多条记录共享相同的 `employee_category_id` 但具有不同的 `policy_id` 来实现。
        *   **数据来源与映射：** 旧系统 `payroll.social_insurance_configs` 表中的 `insurance_type` 字段被映射到新系统 `social_insurance_policies` 表的 `policy_id` (UUID: `f2d0a61b-307d-4221-ba82-a8651929b54b`)。旧系统 `applicable_personnel_categories` 字段（JSON 数组，包含旧的人员类别数字 ID）中的每个数字 ID 都被映射到新系统 `employee_categories` 表中对应的 `employee_category_id` (UUID)。
        *   **具体映射关系列表：**
            *   **政策名称：** 成都高新区2025年度社保公积金政策
                *   **适用人员类别：**
                    *   事业工勤人员
                    *   事业管理人员
                    *   事业技术工人
                    *   公务员
                    *   机关工勤
                    *   参照公务员管理
                    *   事业编制
                    *   执业类专技人员
                    *   管理类专技人员
                    *   项目服务专员
                    *   项目经理
                    *   原投资服务局聘用人员
                    *   专技人员
                    *   专项人员
                    *   综合类
                    *   区聘人员
                    *   聘用

*   `policy_rules` (政策规则表)
    *   **数据导入详情：** 已将旧系统 `payroll.social_insurance_configs` 表中的 `insurance_type`、`employee_rate`、`employer_rate`、`min_base` 和 `max_base` 字段数据导入新系统。
    *   **映射关系：** 旧系统 `insurance_type` 映射到新系统 `insurance_types.id`，并与 `social_insurance_policies.id` (UUID: `f2d0a61b-307d-4221-ba82-a8651929b54b`) 关联。旧系统 `employee_rate` 和 `employer_rate` 直接映射到新表的 `employee_rate` 和 `employer_rate`。旧系统 `min_base` 和 `max_base` 为 `null` 的值，已使用通用默认值 `base_floor = 4000.00` 和 `base_ceiling = 30000.00` 进行填充。

*   `tax_jurisdictions` (税收管辖区表)
*   `tax_policies` (税收政策版本表)
*   `employees` (员工主表，**身份证号暂时明文存储，待后续加密**)
*   `employee_bank_accounts` (员工银行账户表，**敏感信息暂时明文存储，待后续加密**)
*   `employee_contacts` (员工联系方式表，**敏感信息暂时明文存储，待后续加密**)
*   `employee_education` (员工学历信息表)
*   `employee_category_assignments` (员工身份类别分配表) - **已完成**

**已创建的辅助映射表：**

*   `migration_employee_id_map` (旧员工ID到新UUID的映射)
*   `department_id_mapping` (旧部门ID到新UUID的映射)
*   `position_id_mapping` (旧职位ID到新UUID的映射)
*   `job_rank_id_mapping` (旧职级ID到新UUID的映射)

---

### 2. 当前任务状态：`employee_job_history` (员工职位历史表)

*   **目标：** 导入原系统 `hr.employee_job_history` 表的数据。
*   **遇到的问题：** 在导入过程中，发现原系统 `hr.employee_job_history` 表中的 `position_id` 混淆了“职务”和“职级”的概念，导致外键约束违反。
*   **当前决定：** **已解决。** 通过创建“未知职务”和“未知职级”占位符，并将其 UUID 用于导入，解决了 `position_id` 和 `rank_id` 的 `NOT NULL` 约束问题。

---

### 2.6 最新完成任务：`employee_job_history` (员工职位历史表)

*   **完成时间：** 2025年7月24日
*   **导入详情：** 成功从旧系统 `hr.employee_job_history` 表导入了员工的部门历史数据。
*   **数据来源：** 旧系统 `hr.employee_job_history` 表。
*   **导入记录数：** 82 条。
*   **特别说明：**
    *   `position_id` 字段统一映射为“未知职务”的 UUID。
    *   `rank_id` 字段统一映射为“未知职级”的 UUID。
    *   `employee_id` 和 `department_id` 字段通过 `employee_id_mapping` 和 `department_id_mapping` 映射为正确的 UUID。

---

### 3. 待完成的迁移任务

在解决职务和职级数据分类问题并完成 `employee_job_history` 导入后，以下表仍需进行数据迁移：

*   `payrolls` (工资单主表)
*   `payroll_items` (工资单明细表)
*   `employee_contribution_bases` (员工缴费基数表) - **部分完成：已导入2025年1-3月数据**
*   `tax_brackets` (累进税率表)
*   `special_deduction_types` (专项附加扣除类型表)
*   `employee_special_deductions` (员工个人专项附加扣除申报表)
*   `employee_documents` (员工文档表)
*   `user_roles` (用户角色表)

---

### 4. 重要注意事项

*   **敏感数据加密：** `employees` (身份证号)、`employee_bank_accounts` (银行信息) 和 `employee_contacts` (联系方式) 中的敏感数据目前是明文存储。在完成所有数据迁移和系统测试后，**强烈建议优先实施加密方案**。
*   **数据验证：** 每次导入后，都应进行数据验证，确保数据的完整性和准确性。