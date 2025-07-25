# 数据库视图层架构设计

## 1. 概述

本文档旨在为工资管理系统设计一套现代化、安全且可维护的数据库视图（Views）结构。视图层是连接底层数据表与上层应用（前端、后端API）的关键中间层，它能够显著提升系统的安全性、可维护性和开发效率。

## 2. 核心设计原则

在设计视图时，我们遵循以下核心原则：

| 原则 | 描述 |
| :--- | :--- |
| **数据访问简化 (Simplification)** | 将复杂的多表连接查询封装在视图中，为应用提供简洁、稳定的数据接口，隐藏底层表的复杂性。 |
| **行级安全 (Row-Level Security)** | 视图是实现 Supabase 行级安全（RLS）的最佳实践。安全策略（Policy）直接应用于视图，确保数据访问的强一致性与安全性。 |
| **逻辑封装 (Logic Encapsulation)** | 将业务逻辑（如计算字段、数据格式化、状态判断）封装在视图定义中，减少应用层代码的冗余和复杂度。 |
| **性能优化 (Performance)** | 对于计算密集型的报表和分析场景，使用**物化视图 (Materialized Views)** 预先计算并存储结果，以实现高性能查询。 |
| **解耦与兼容 (Decoupling & Compatibility)** | 应用代码仅与视图交互。未来若底层表结构变更，只需更新视图定义，无需修改应用代码，实现前后端解耦。 |

---

## 3. 建议的视图结构方案

基于上述原则，我们建议创建以下视图，按功能模块划分：

### 3.1. 核心人力资源视图 (Core HR Views)

这部分视图旨在提供员工当前状态的“快照”，处理复杂的时间片逻辑。

| 视图名称 | 目的与应用场景 | 核心表 | 关键逻辑与说明 | 建议的RLS策略 |
| :--- | :--- | :--- | :--- | :--- |
| **`view_employee_details`** | 提供员工所有**当前有效**的核心信息。作为员工详情页、员工列表等功能的主要数据源。 | `employees`, `employee_job_history`, `departments`, `positions`, `job_ranks`, `employee_category_assignments`, `employee_categories` | 1. 通过 `LEFT JOIN` 连接所有相关表。<br>2. 使用 `WHERE eca.effective_end_date IS NULL` 和 `ejh.effective_end_date IS NULL` 筛选出员工**当前**的身份类别、部门、职务和职级。<br>3. 可包含计算字段，如 `age`。 | - **员工**: 只能查看自己的记录 (`auth.uid() = user_id`)。<br>- **经理**: 可查看自己及直接/间接下属的记录。<br>- **HR/管理员**: 可查看所有记录。 |
| **`view_department_hierarchy`** | 以扁平化的方式展示完整的部门层级结构。用于前端生成组织树或部门筛选。 | `departments` | 使用递归公用表表达式 (Recursive CTE) 来构建每个部门的完整层级路径（如 "集团 -> 人力资源部 -> 招聘组"）。 | 公开给所有登录用户，或根据需要限制。 |

### 3.2. 薪酬与社保视图 (Payroll & Insurance Views)

这部分视图用于简化工资单查询和社保计算。

| 视图名称 | 目的与应用场景 | 核心表 | 关键逻辑与说明 | 建议的RLS策略 |
| :--- | :--- | :--- | :--- | :--- |
| **`view_payroll_summary`** | 提供清晰的工资单摘要列表，用于展示历史工资单、工资条查询或审批流程。 | `payrolls`, `employees` | 直接连接 `payrolls` 和 `employees`，展示每个员工在每个薪资周期的核心薪酬数据（应发、扣除、实发）。 | - **员工**: 只能查看自己的工资单。<br>- **薪酬/HR管理员**: 可查看所有记录。 |
| **`view_employee_current_contribution_bases`** | 获取每个员工**当前有效**的各项社保公积金缴费基数。是计算每月社保扣款的基础数据源。 | `employee_contribution_bases`, `insurance_types` | 1. 按 `employee_id` 和 `insurance_type_id` 分组。<br>2. 使用 `WHERE effective_end_date IS NULL` 筛选出当前有效的基数。 | 员工和其经理可查看，薪酬/HR 管理员可查看。 |
| **`view_calculated_monthly_insurance`** | **动态计算**每个员工当月的社保公积金扣款额。封装了复杂的政策匹配和计算逻辑。 | `view_employee_current_contribution_bases`, `social_insurance_policies`, `policy_rules` | 1. 获取员工当前身份类别和适用的社保政策。<br>2. 连接其当前的缴费基数。<br>3. 根据政策规则（费率、上下限）计算出每项保险的个人和单位缴费金额。 | 仅限薪酬/HR管理员访问。 |

### 3.3. 报表与分析视图 (Reporting & Analytics Views)

这部分视图主要服务于数据分析和管理决策，建议使用物化视图以提升性能。

| 视图名称 | 目的与应用场景 | 核心表 | 关键逻辑与说明 | 刷新策略 |
| :--- | :--- | :--- | :--- | :--- |
| **`materialized_view_department_payroll_summary`** | **(物化视图)** 按部门、按月统计薪酬总额，用于财务分析和预算制定。 | `payrolls`, `payroll_items`, `employees`, `employee_job_history` | 1. 按 `department_id` 和 `pay_date` 的月份进行 `GROUP BY`。<br>2. 计算总应发、总实发、总扣除等聚合指标。 | 每月或在每次工资单支付完成后刷新。 |
| **`materialized_view_headcount_report`** | **(物化视图)** 按部门、职级、身份类别等多维度统计在职人数，用于人力资源规划。 | `view_employee_details` | 对 `view_employee_details` 的结果按 `department_name`, `rank_name`, `category_name` 等维度进行 `COUNT` 聚合。 | 每日或每周定时刷新。 |

---

## 4. 下一步行动建议

1.  **方案确认**: 审阅并确认此视图设计方案。
2.  **优先实施**: 从最重要的视图 **`view_employee_details`** 开始创建，因为它将是整个系统中使用最频繁的视图之一。
3.  **迭代完善**: 在创建基础视图后，根据前端页面和后端API的具体需求，再逐步创建或完善其他视图，确保视图层能精准满足业务需求。
