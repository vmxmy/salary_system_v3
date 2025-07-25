### 4.3 住房公积金和职业年金导入

*   **目的**：将旧系统 `payroll.employee_salary_configs` 表中的 `housing_fund_base` 和 `occupational_pension_base` 数据导入到新 Supabase 数据库的 `employee_contribution_bases` 表中。
*   **工具**：`postgres query` (数据提取), `supabase execute_sql` (数据导入)
*   **操作步骤**：

    1.  **数据提取 (从旧 Postgres 数据库)**：
        *   确定要导入的月份（例如 2025 年 1 月）。
        *   执行以下 SQL 查询，替换 `YYYY-MM-DD` 为该月份的任意一天（例如 `2025-01-15`）。

        ```sql
        SELECT
            pesc.employee_id AS old_employee_id,
            pesc.housing_fund_base,
            pesc.occupational_pension_base,
            pesc.effective_date,
            pesc.end_date
        FROM
            payroll.employee_salary_configs pesc
        WHERE
            'YYYY-MM-DD' BETWEEN pesc.effective_date AND COALESCE(pesc.end_date, 'infinity')
            AND (pesc.housing_fund_base IS NOT NULL OR pesc.occupational_pension_base IS NOT NULL);
        ```
        *   **输出**：一个包含 `old_employee_id`, `housing_fund_base`, `occupational_pension_base`, `effective_date`, `end_date` 的 JSON 数据集。请复制此 JSON 数据，用于下一阶段的导入。

    2.  **获取新系统险种 ID 映射**：
        在导入之前，需要从新系统的 `insurance_types` 表中获取 `住房公积金` (`housing_fund`) 和 `职业年金` (`occupational_pension`) 的 `id` (UUID) 和 `system_key`。

        ```sql
        SELECT id, system_key FROM insurance_types
        WHERE system_key IN ('housing_fund', 'occupational_pension');
        ```
        *   **记录下每个 `system_key` 对应的 `id`。例如：**
            *   `housing_fund`: `2e5493db-c43e-4bf9-9773-98514e231102`
            *   `occupational_pension`: `c48fb2fd-6fb5-4f1c-9781-00013f0e13c0`

    3.  **构建并执行导入语句 (住房公积金)**：
        **请根据从旧系统提取的 JSON 数据，手动构建 `VALUES` 子句。**

        ```sql
        INSERT INTO employee_contribution_bases (employee_id, insurance_type_id, contribution_base, effective_start_date, effective_end_date)
        SELECT
            eim.new_id,
            '<替换为住房公积金的UUID>'::uuid, -- 例如：'2e5493db-c43e-4bf9-9773-98514e231102'
            pesc.housing_fund_base::numeric,
            pesc.effective_date::date,
            pesc.end_date::date
        FROM (
            VALUES
            -- 在这里粘贴从旧系统提取的 JSON 数据，并转换为 VALUES 格式
            -- 格式为：(old_employee_id, housing_fund_base, occupational_pension_base, effective_date, end_date)
            -- 例如：(316, '21200.00', '15508.00', '2024-12-31T16:00:00.000Z', '2025-01-30T16:00:00.000Z')
            -- ... 更多数据
        ) AS pesc(old_employee_id, housing_fund_base, occupational_pension_base, effective_date, end_date)
        JOIN
            employee_id_mapping eim ON pesc.old_employee_id = eim.old_id
        WHERE
            pesc.housing_fund_base IS NOT NULL
        ON CONFLICT (employee_id, insurance_type_id, effective_start_date) DO UPDATE SET
            contribution_base = EXCLUDED.contribution_base,
            effective_end_date = EXCLUDED.effective_end_date;
        ```

    4.  **构建并执行导入语句 (职业年金)**：
        **请根据从旧系统提取的 JSON 数据，手动构建 `VALUES` 子句。**

        ```sql
        INSERT INTO employee_contribution_bases (employee_id, insurance_type_id, contribution_base, effective_start_date, effective_end_date)
        SELECT
            eim.new_id,
            '<替换为职业年金的UUID>'::uuid, -- 例如：'c48fb2fd-6fb5-4f1c-9781-00013f0e13c0'
            pesc.occupational_pension_base::numeric,
            pesc.effective_date::date,
            pesc.end_date::date
        FROM (
            VALUES
            -- 在这里粘贴从旧系统提取的 JSON 数据，并转换为 VALUES 格式
            -- 格式为：(old_employee_id, housing_fund_base, occupational_pension_base, effective_date, end_date)
            -- 例如：(316, '21200.00', '15508.00', '2024-12-31T16:00:00.000Z', '2025-01-30T16:00:00.000Z')
            -- ... 更多数据
        ) AS pesc(old_employee_id, housing_fund_base, occupational_pension_base, effective_date, end_date)
        JOIN
            employee_id_mapping eim ON pesc.old_employee_id = eim.old_id
        WHERE
            pesc.occupational_pension_base IS NOT NULL
        ON CONFLICT (employee_id, insurance_type_id, effective_start_date) DO UPDATE SET
            contribution_base = EXCLUDED.contribution_base,
            effective_end_date = EXCLUDED.effective_end_date;
        ```