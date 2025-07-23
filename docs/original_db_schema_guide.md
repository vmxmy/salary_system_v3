## Schema: `payroll` | Table: `personnel_category_social_insurance_rules`

| Column Name | Data Type | Is Nullable |
| :---------- | :-------- | :---------- |
| `id` | `bigint` | `NO` |
| `personnel_category_id` | `bigint` | `NO` |
| `social_insurance_config_id` | `bigint` | `NO` |
| `effective_date` | `date` | `NO` |
| `end_date` | `date` | `YES` |
| `is_active` | `boolean` | `NO` |
| `created_at` | `timestamp with time zone` | `YES` |
| `updated_at` | `timestamp with time zone` | `YES` |