# 数据一致性检查指南：Supabase 与旧 Postgres 数据库员工信息对比

## 1. 目的

本指南旨在提供一个系统化的流程，用于抽样检查新 Supabase 数据库与旧 Postgres 数据库中员工关键信息的一致性。通过对比，可以发现数据迁移、同步或业务逻辑实现中可能存在的问题，确保数据准确性和系统可靠性。

## 2. 使用工具

*   **Supabase 工具 (`supabase execute_sql`)**: 用于查询新 Supabase 数据库中的数据。
*   **Postgres 工具 (`postgres query`)**: 用于查询旧 Postgres 数据库中的数据。

## 3. 抽样策略

1.  **从新 Supabase 数据库中随机抽取员工 ID (UUID)**：
    ```sql
    SELECT id FROM employees ORDER BY RANDOM() LIMIT 5;
    ```
    （将 `LIMIT` 值调整为所需的抽样数量）

2.  **获取旧系统对应的员工 ID (BIGINT)**：
    根据 `employee_id_mapping` 表，将新系统 UUID 映射回旧系统 ID。
    ```sql
    SELECT old_id FROM employee_id_mapping WHERE new_id = '新系统UUID';
    ```
    （在实际操作中，通常会一次性获取所有抽样员工的旧 ID）

## 4. 检查的数据点及查询示例

以下是针对每个数据点，在新旧数据库中使用的查询示例。请根据实际情况替换 `员工ID` (新系统为 UUID，旧系统为 BIGINT) 和 `日期`。

### 4.1 身份证 (ID Number)

*   **Supabase (新系统)**:
    ```sql
    SELECT id_number FROM employees WHERE id = '新系统UUID';
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT id_number FROM hr.employees WHERE id = 旧系统ID;
    ```

### 4.2 人员身份 (Personnel Category)

*   **Supabase (新系统)**:
    ```sql
    SELECT ec.name
    FROM employees e
    JOIN employee_category_assignments eca ON e.id = eca.employee_id
    JOIN employee_categories ec ON eca.employee_category_id = ec.id
    WHERE e.id = '新系统UUID'
    AND '当前日期' BETWEEN eca.effective_start_date AND COALESCE(eca.effective_end_date, 'infinity');
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT pc.name
    FROM hr.employees e
    JOIN hr.employee_job_history ejh ON e.id = ejh.employee_id
    JOIN hr.personnel_categories pc ON ejh.personnel_category_id = pc.id
    WHERE e.id = 旧系统ID
    AND '当前日期' BETWEEN ejh.effective_date AND COALESCE(ejh.end_date, 'infinity');
    ```

### 4.3 银行帐号 (Bank Account)

*   **Supabase (新系统)**:
    ```sql
    SELECT bank_name, account_number, account_holder_name
    FROM employee_bank_accounts
    WHERE employee_id = '新系统UUID'
    AND is_primary = TRUE
    AND '当前日期' BETWEEN effective_start_date AND COALESCE(effective_end_date, 'infinity');
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT bank_name, account_number, account_holder_name
    FROM hr.employee_bank_accounts
    WHERE employee_id = 旧系统ID
    AND is_primary = TRUE; -- 旧系统可能没有 effective_date/end_date 字段，请根据实际 schema 调整
    ```

### 4.4 手机号码 (Phone Number)

*   **Supabase (新系统)**:
    ```sql
    SELECT contact_details
    FROM employee_contacts
    WHERE employee_id = '新系统UUID'
    AND contact_type = 'mobile_phone'
    AND is_primary = TRUE;
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT phone_number FROM hr.employees WHERE id = 旧系统ID;
    ```

### 4.5 生效的保险类型 (Applicable Insurance Types)

*   **Supabase (新系统)**:
    ```sql
    SELECT it.name
    FROM employees e
    JOIN employee_category_assignments eca ON e.id = eca.employee_id
    JOIN employee_categories ec ON eca.employee_category_id = ec.id
    JOIN insurance_type_category_rules itcr ON ec.id = itcr.employee_category_id
    JOIN insurance_types it ON itcr.insurance_type_id = it.id
    WHERE e.id = '新系统UUID'
    AND '当前日期' BETWEEN eca.effective_start_date AND COALESCE(eca.effective_end_date, 'infinity')
    AND itcr.is_applicable = TRUE;
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT sic.insurance_type
    FROM hr.employees e
    JOIN hr.employee_job_history ejh ON e.id = ejh.employee_id
    JOIN payroll.personnel_category_social_insurance_rules pcsir ON ejh.personnel_category_id = pcsir.personnel_category_id
    JOIN payroll.social_insurance_configs sic ON pcsir.social_insurance_config_id = sic.id
    WHERE e.id = 旧系统ID
    AND '当前日期' BETWEEN ejh.effective_date AND COALESCE(ejh.end_date, 'infinity')
    AND pcsir.is_active = TRUE;
    ```

### 4.6 2025-03 的公积金基数 (Housing Fund Base for 2025-03)

*   **Supabase (新系统)**:
    ```sql
    SELECT ecb.contribution_base
    FROM employees e
    JOIN employee_contribution_bases ecb ON e.id = ecb.employee_id
    JOIN insurance_types it ON ecb.insurance_type_id = it.id
    WHERE e.id = '新系统UUID'
    AND it.system_key = 'housing_fund'
    AND '2025-03-01' BETWEEN ecb.effective_start_date AND COALESCE(ecb.effective_end_date, 'infinity');
    ```
*   **Postgres (旧系统)**:
    ```sql
    SELECT housing_fund_base
    FROM payroll.employee_salary_configs
    WHERE employee_id = 旧系统ID
    AND '2025-03-01' BETWEEN effective_date AND COALESCE(end_date, 'infinity');
    ```

## 5. 关键观察与潜在问题

在本次抽样检查中，我们发现以下情况：

*   **高度一致性**: 身份证、人员身份、银行账号（除姓名格式外）、手机号码在两个系统间基本一致。
*   **姓名格式差异**: 旧 Postgres 数据库中 `account_holder_name` 字段可能包含空格，例如 "吕 果" 而非 "吕果"。这通常是显示或数据录入习惯差异，不影响数据准确性，但需注意。
*   **显著不一致**:
    *   **生效的保险类型**: Supabase 返回了完整的保险类型列表，而旧 Postgres 数据库未返回任何结果。这可能表明旧系统数据存储方式或查询逻辑存在差异，或数据迁移未完全同步。
    *   **公积金基数**: Supabase 未返回公积金基数，而旧 Postgres 数据库返回了具体数值。这同样指向数据同步或查询逻辑的差异。

## 6. 后续步骤与复用指导

1.  **分析不一致原因**: 针对“生效的保险类型”和“公积金基数”的不一致，需要深入调查：
    *   检查相关表的结构和数据填充方式，了解数据在两个系统中的存储差异。
    *   审查数据迁移脚本，确认这些数据是否被正确迁移。
    *   调整查询逻辑，确保能够从两个系统中正确提取所需信息。
2.  **定期执行**: 将此指南作为数据质量检查的一部分，定期对关键数据进行抽样对比，确保数据一致性。
3.  **参数化查询**: 在实际自动化脚本中，可以将员工 ID 和日期等参数化，以便批量执行和灵活调整。
4.  **扩展检查范围**: 根据业务需求，可以扩展检查的数据点，例如工资明细、考勤记录等。
5.  **处理数据差异**: 根据不一致的严重程度和原因，制定相应的数据修正或同步策略。
