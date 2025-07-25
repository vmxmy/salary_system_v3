# 银行账户导入指南：旧 Postgres 到新 Supabase

## 1. 目的

本指南旨在提供一个详细的步骤，用于将旧 Postgres 数据库中员工的银行账户信息 (`hr.employee_bank_accounts`) 导入到新 Supabase 数据库的 `employee_bank_accounts` 表中，确保数据一致性和可追溯性。

## 2. 核心假设

*   `employee_id_mapping` 表提供了旧系统 `employee_id` (BIGINT) 到新系统 `employee_id` (UUID) 的准确映射。
*   旧系统 `hr.employee_bank_accounts` 表中的 `employee_id` 字段存储的是旧系统的员工 ID。

## 3. 前提条件

在执行导入之前，请确保满足以下条件：

1.  **`employee_id_mapping` 表已正确填充**：确保旧系统员工 ID 到新系统 UUID 的映射关系是完整且准确的。
2.  **`employee_bank_accounts` 表已清空或准备好接收数据**：如果需要重新导入或更新数据，请确保该表处于可写入状态。在本次操作中，我们已清空该表。

## 4. 导入流程

整个导入过程分为两个主要阶段：**数据提取** 和 **数据转换与导入**。

### 阶段一：数据提取 (从旧 Postgres 数据库)

*   **目的**：从旧系统 `hr.employee_bank_accounts` 表中，提取所有员工的银行账户信息。
*   **工具**：`postgres query`
*   **操作步骤**：

    1.  执行以下 SQL 查询，提取银行账户数据：

    ```sql
    SELECT
        eba.employee_id AS old_employee_id,
        eba.bank_name,
        eba.account_number,
        eba.account_holder_name,
        eba.branch_name,
        eba.bank_code,
        eba.is_primary,
        eba.created_at,
        eba.updated_at
    FROM
        hr.employee_bank_accounts eba;
    ```
    *   **输出**：一个包含 `old_employee_id`, `bank_name`, `account_number`, `account_holder_name`, `branch_name`, `bank_code`, `is_primary`, `created_at`, `updated_at` 的 JSON 数据集。请复制此 JSON 数据，用于下一阶段的导入。

### 阶段二：数据转换与导入 (到新 Supabase 数据库)

*   **目的**：将从旧系统提取的银行账户数据，转换为新系统 `employee_bank_accounts` 表所需的格式，并进行导入。
*   **工具**：`supabase execute_sql`
*   **操作步骤**：

    1.  **构建并执行导入语句**：
        **请根据从旧系统提取的 JSON 数据，手动构建 `VALUES` 子句。**

        **导入 SQL 语句结构：**

        ```sql
        INSERT INTO employee_bank_accounts (employee_id, bank_name, account_number, account_holder_name, branch_name, is_primary, effective_start_date, created_at, updated_at)
        SELECT
            eim.new_id,
            eba_old.bank_name,
            eba_old.account_number,
            eba_old.account_holder_name,
            eba_old.branch_name,
            eba_old.is_primary,
            eba_old.created_at::date, -- 使用 created_at 作为 effective_start_date
            eba_old.created_at::timestamp with time zone,
            eba_old.updated_at::timestamp with time zone
        FROM (
            VALUES
            -- 在这里粘贴从旧系统提取的 JSON 数据，并转换为 VALUES 格式
            -- 格式为：(old_employee_id, bank_name, account_number, account_holder_name, branch_name, bank_code, is_primary, created_at, updated_at)
            -- 例如：(307, '成都银行股份有限公司高新支行', '6221532330003406489', '吕 果', NULL, NULL, TRUE, '2025-06-16T21:54:59.094Z', '2025-06-16T21:54:59.094Z')
            -- ... 更多数据
        ) AS eba_old(old_employee_id, bank_name, account_number, account_holder_name, branch_name, bank_code, is_primary, created_at, updated_at)
        JOIN
            employee_id_mapping eim ON eba_old.old_employee_id = eim.old_id
        ON CONFLICT DO NOTHING;
        ```

## 5. 验证步骤

导入完成后，请务必进行验证以确保数据正确性：

1.  **抽样查询**：从新系统中随机抽取员工，查询其银行账户信息，并与旧系统进行对比。

    ```sql
    -- 新系统查询示例
    SELECT bank_name, account_number, account_holder_name
    FROM employee_bank_accounts
    WHERE employee_id = '新系统UUID'
    AND is_primary = TRUE;
    ```

    ```sql
    -- 旧系统查询示例
    SELECT bank_name, account_number, account_holder_name
    FROM hr.employee_bank_accounts
    WHERE employee_id = 旧系统ID
    AND is_primary = TRUE;
    ```

2.  **数据量核对**：统计新系统中银行账户记录的数量，与旧系统中的相关记录数量进行大致对比。

    ```sql
    SELECT COUNT(*) FROM employee_bank_accounts;
    ```

## 6. 注意事项

*   **日期格式**：确保从旧系统提取的 `created_at` 和 `updated_at` 能够被新系统正确解析为 `timestamp with time zone` 类型。如果格式不匹配，可能需要进行额外的类型转换。
*   **数据量**：如果旧系统数据量巨大，可能需要分批次导入，或考虑使用 `COPY` 命令进行更高效的批量导入。
*   **幂等性**：`ON CONFLICT DO NOTHING` 子句确保了重复执行导入操作不会导致数据重复。
*   **`effective_start_date`**：在新系统中，`effective_start_date` 是一个重要字段。在导入时，我们使用旧系统的 `created_at` 字段作为 `effective_start_date`。如果旧系统有更精确的生效日期字段，请优先使用。
