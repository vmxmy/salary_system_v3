
-- Migration to create a temporary table for the January 2025 salary import.
-- This table structure is designed according to the salary_import_guide.md
CREATE TABLE public.temp_january_salary_import (
    id_number TEXT NOT NULL, -- Using id_number for matching, ensuring it's not null
    "职务/技术等级 工资" NUMERIC,
    "级别/岗位级别 工资" NUMERIC,
    "基础绩效奖" NUMERIC,
    "93年工改保留补贴" NUMERIC,
    "独生子女父母奖励金" NUMERIC,
    "公务员规范性津贴补贴" NUMERIC,
    "公务交通补贴" NUMERIC,
    "岗位工资" NUMERIC,
    "薪级工资" NUMERIC,
    "见习试用期工资" NUMERIC,
    "月基础绩效" NUMERIC,
    "月奖励绩效" NUMERIC,
    "岗位职务补贴" NUMERIC,
    "信访工作人员岗位津贴" NUMERIC,
    "补扣社保" NUMERIC,
    "一次性补扣发" NUMERIC,
    "绩效奖金补扣发" NUMERIC,
    "奖励绩效补扣发" NUMERIC
);

COMMENT ON TABLE public.temp_january_salary_import IS 'Temporary table for staging raw salary data from the January 2025 CSV file before transformation and insertion into the main payroll tables. Governed by salary_import_guide.md.';
