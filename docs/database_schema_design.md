# 数据库表结构设计

本文档详细描述了工资信息管理系统的数据库表结构，旨在提供一个清晰、规范的参考。

## 功能模块划分

数据库结构围绕以下核心功能模块进行设计：

1.  **核心人力资源 (Core HR)**: 管理员工的基本信息、组织架构和职位历史。
2.  **薪酬管理 (Payroll)**: 处理工资单的生成、计算和支付流程。
3.  **社保与税务 (Social Insurance & Tax)**: 管理社保、公积金及个人所得税的相关政策和数据。
4.  **系统与数据迁移 (System & Migration)**: 包含系统管理、安全以及数据迁移支持相关的表。

---

## 1. 核心人力资源 (Core HR)

| 表名 | 功能描述 |
| :--- | :--- |
| **`employees`** | 存储员工的核心信息，如姓名、身份证号、入职与离职日期等。 |
| **`departments`** | 存储组织部门信息，通过 `parent_department_id` 支持层级关系。 |
| **`positions`** | 定义员工的职务或头衔，如“科长”、“办事员”。 |
| **`job_ranks`** | 定义员工的职级信息，如“一级主任科员”、“事业管理岗九级”。 |
| **`employee_job_history`** | 记录员工的职务、职级和部门的每一次变动历史，实现时间片管理。 |
| **`employee_categories`** | 定义员工的身份类别（如“公务员”、“事业编”、“聘用人员”），支持层级结构。 |
| **`employee_category_assignments`** | 将员工分配到特定的身份类别，并记录其生效时间段。 |
| **`employee_contacts`** | 存储员工的多种联系方式，如电话、邮件、家庭住址等。 |
| **`employee_education`** | 存储员工的多条学历信息，包括学校、专业、学位等。 |
| **`employee_bank_accounts`** | 存储员工用于接收工资的银行账户信息，支持主副账户。 |
| **`employee_documents`** | 存储与员工相关的电子文档（例如劳动合同、学历证书扫描件）的路径。 |

---

## 2. 薪酬管理 (Payroll)

| 表名 | 功能描述 |
| :--- | :--- |
| **`payrolls`** | 记录每位员工每月的工资单主信息，包括应发、扣除及实发总额。 |
| **`payroll_items`** | 存储每张工资单的具体构成项目和金额，关联到 `payrolls` 和 `salary_components`。 |
| **`salary_components`** | 定义所有可能的工资构成项目，如基本工资、绩效、津贴、各项扣款等，并区分类型（应发/扣除）。 |

---

## 3. 社保与税务 (Social Insurance & Tax)

| 表名 | 功能描述 |
| :--- | :--- |
| **`social_insurance_policies`** | 存储不同地区、不同时期的社保公积金政策版本。 |
| **`insurance_types`** | 定义五险一金等社会保险的具体类型，如“养老保险”、“医疗保险”、“公积金”。 |
| **`policy_rules`** | 存储每项社保政策中各险种的具体规则，如企业与个人费率、缴费基数的上下限。 |
| **`employee_contribution_bases`** | 存储每个员工各项保险的个人缴费基数及其生效时间。 |
| **`insurance_type_category_rules`** | 定义不同员工类别适用于哪些保险类型的规则，例如某些类别的员工不缴纳年金。 |
| **`tax_policies`** | 定义不同时期和地区的个人所得税税收政策。 |
| **`tax_brackets`** | 存储与特定税收政策关联的年度累进税率等级表。 |
| **`special_deduction_types`** | 定义合法的专项附加扣除项目及其标准，如子女教育、住房贷款利息等。 |
| **`employee_special_deductions`** | 记录员工个人申报的专项附加扣除项目及金额。 |

---

## 4. 系统与数据迁移 (System & Migration)

| 表名 | 功能描述 |
| :--- | :--- |
| **`user_roles`** | 管理应用用户的角色和权限，关联到 `auth.users` 表。 |
| **`security_logs`** | 记录系统安全相关的事件日志，如登录失败、权限变更等。 |
| **`employee_id_mapping`** | 在数据迁移过程中，用于映射旧系统中的员工ID到新系统的UUID。 |
| **`department_id_mapping`** | 在数据迁移过程中，用于映射旧系统中的部门ID到新系统的UUID。 |
| **`position_id_mapping`** | 在数据迁移过程中，用于映射旧系统中的职位ID到新系统的UUID。 |
| **`job_rank_id_mapping`** | 在数据迁移过程中，用于映射旧系统中的职级ID到新系统的UUID。 |