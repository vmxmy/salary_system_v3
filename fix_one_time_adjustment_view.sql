-- ================================================================
-- 修复薪资明细导出视图中"一次性补扣发"字段映射错误
-- 
-- 问题描述：
-- 视图 v_comprehensive_employee_payroll_optimized 中的"一次性补扣发"字段
-- 错误地从 deductions_details 中提取，而实际数据存储在 earnings_details 中
-- 
-- 修复日期：2025-08-24
-- 影响范围：export_payroll_details.py 脚本导出结果
-- ================================================================

-- 删除旧视图
DROP VIEW IF EXISTS reports.v_comprehensive_employee_payroll_optimized;

-- 重新创建修正后的视图
CREATE OR REPLACE VIEW reports.v_comprehensive_employee_payroll_optimized AS
SELECT 
    pe.id AS "薪资条目ID",
    pe.employee_id AS "员工ID",
    pe.payroll_period_id AS "薪资期间ID",
    pe.payroll_run_id AS "薪资运行ID",
    e.employee_code AS "员工编号",
    e.first_name AS "名",
    e.last_name AS "姓",
    COALESCE(((e.last_name)::text || (e.first_name)::text), (e.first_name)::text, (e.last_name)::text, '未知姓名'::text) AS "姓名",
    e.id_number AS "身份证号",
    e.phone_number AS "电话",
    e.email AS "邮箱",
    e.hire_date AS "入职日期",
    COALESCE(e.is_active, false) AS "员工状态",
    COALESCE(d.name, '未分配部门'::character varying) AS "部门名称",
    COALESCE(pos.name, '未分配职位'::character varying) AS "职位名称",
    COALESCE(pc.name, '未分类'::character varying) AS "人员类别",
    COALESCE(ph.root_name, '未分类'::character varying) AS "根人员类别",
    COALESCE(pp.name, '未知期间'::character varying) AS "薪资期间名称",
    pp.start_date AS "薪资期间开始日期",
    pp.end_date AS "薪资期间结束日期",
    pp.pay_date AS "薪资发放日期",
    pr.run_date AS "薪资运行日期",
    COALESCE(pe.gross_pay, 0.00) AS "应发合计",
    COALESCE(pe.total_deductions, 0.00) AS "扣除合计",
    COALESCE(pe.net_pay, 0.00) AS "实发合计",
    
    -- 应发项目（从 earnings_details 提取）
    COALESCE((((pe.earnings_details -> 'MONTHLY_PERFORMANCE_BONUS'::text) ->> 'amount'::text))::numeric, 0.00) AS "月奖励绩效",
    COALESCE((((pe.earnings_details -> 'BASIC_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "基本工资",
    COALESCE((((pe.earnings_details -> 'ONLY_CHILD_PARENT_BONUS'::text) ->> 'amount'::text))::numeric, 0.00) AS "独生子女父母奖励金",
    COALESCE((((pe.earnings_details -> 'TRAFFIC_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "公务交通补贴",
    COALESCE((((pe.earnings_details -> 'POSITION_TECH_GRADE_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "职务/技术等级工资",
    COALESCE((((pe.earnings_details -> 'PERFORMANCE_BONUS'::text) ->> 'amount'::text))::numeric, 0.00) AS "奖励性绩效工资",
    COALESCE((((pe.earnings_details -> 'GRADE_POSITION_LEVEL_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "级别/岗位级别工资",
    COALESCE((((pe.earnings_details -> 'BASIC_PERFORMANCE_AWARD'::text) ->> 'amount'::text))::numeric, 0.00) AS "基础绩效奖",
    COALESCE((((pe.earnings_details -> 'POSITION_SALARY_GENERAL'::text) ->> 'amount'::text))::numeric, 0.00) AS "岗位工资",
    COALESCE((((pe.earnings_details -> 'BASIC_PERFORMANCE_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "基础性绩效工资",
    COALESCE((((pe.earnings_details -> 'BACK_PAY'::text) ->> 'amount'::text))::numeric, 0.00) AS "补发工资",
    COALESCE((((pe.earnings_details -> 'POSITION_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "岗位职务补贴",
    COALESCE((((pe.earnings_details -> 'GRADE_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "级别工资",
    COALESCE((((pe.earnings_details -> 'PERFORMANCE_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "绩效工资",
    COALESCE((((pe.earnings_details -> 'SALARY_GRADE'::text) ->> 'amount'::text))::numeric, 0.00) AS "薪级工资",
    COALESCE((((pe.earnings_details -> 'ALLOWANCE_GENERAL'::text) ->> 'amount'::text))::numeric, 0.00) AS "补助",
    COALESCE((((pe.earnings_details -> 'BASIC_PERFORMANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "月基础绩效",
    COALESCE((((pe.earnings_details -> 'PETITION_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "信访工作人员岗位工作津贴",
    COALESCE((((pe.earnings_details -> 'GENERAL_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "津贴",
    COALESCE((((pe.earnings_details -> 'QUARTERLY_PERFORMANCE_ASSESSMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "季度绩效考核薪酬",
    COALESCE((((pe.earnings_details -> 'REFORM_ALLOWANCE_1993'::text) ->> 'amount'::text))::numeric, 0.00) AS "九三年工改保留津补贴",
    COALESCE((((pe.earnings_details -> 'PERFORMANCE_BONUS_BACK_PAY'::text) ->> 'amount'::text))::numeric, 0.00) AS "奖励绩效补发",
    COALESCE((((pe.earnings_details -> 'CIVIL_STANDARD_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "公务员规范后津补贴",
    COALESCE((((pe.earnings_details -> 'PROBATION_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "试用期工资",
    COALESCE((((pe.earnings_details -> 'STAFF_SALARY_GRADE'::text) ->> 'amount'::text))::numeric, 0.00) AS "事业单位人员薪级工资",
    COALESCE((((pe.earnings_details -> 'TOWNSHIP_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "乡镇工作补贴",
    COALESCE((((pe.earnings_details -> 'TEACHER_NURSE_10PCT_RETAINED_SALARY'::text) ->> 'amount'::text))::numeric, 0.00) AS "中小学教师或护士保留原额百分之十工资",
    COALESCE((((pe.earnings_details -> 'TEACHER_NURSE_10PCT_INCREASE'::text) ->> 'amount'::text))::numeric, 0.00) AS "中小学教师或护士提高百分之十",
    COALESCE((((pe.earnings_details -> 'POLICE_DUTY_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "人民警察值勤岗位津贴",
    COALESCE((((pe.earnings_details -> 'POLICE_OVERTIME_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "人民警察加班补贴",
    COALESCE((((pe.earnings_details -> 'HOUSING_SUBSIDY'::text) ->> 'amount'::text))::numeric, 0.00) AS "住房补贴",
    COALESCE((((pe.earnings_details -> 'CIVIL_SERVANT_13TH_MONTH_BONUS'::text) ->> 'amount'::text))::numeric, 0.00) AS "公务员十三月奖励工资",
    COALESCE((((pe.earnings_details -> 'POLICE_POSITION_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "公安岗位津贴",
    COALESCE((((pe.earnings_details -> 'POLICE_DUTY_SUBSIDY'::text) ->> 'amount'::text))::numeric, 0.00) AS "公安执勤津贴",
    COALESCE((((pe.earnings_details -> 'POLICE_HOLIDAY_OVERTIME_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "公安法定工作日之外加班补贴",
    COALESCE((((pe.earnings_details -> 'POLICE_COURT_REMOTE_AREA_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "公检法艰苦边远地区津贴",
    COALESCE((((pe.earnings_details -> 'HEALTH_1993_REFORM_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "卫生九三年工改保留津补贴",
    COALESCE((((pe.earnings_details -> 'HEALTH_TIBET_AID_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "卫生援藏津贴",
    COALESCE((((pe.earnings_details -> 'HEALTH_ONLY_CHILD_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "卫生独生子女费",
    COALESCE((((pe.earnings_details -> 'MINORITY_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "回民补贴",
    COALESCE((((pe.earnings_details -> 'NATIONAL_OTHER_ALLOWANCES'::text) ->> 'amount'::text))::numeric, 0.00) AS "国家规定的其他津补贴项目",
    COALESCE((((pe.earnings_details -> 'WORK_NATURE_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "工作性津贴",
    COALESCE((((pe.earnings_details -> 'ANNUAL_ASSESSMENT_BONUS'::text) ->> 'amount'::text))::numeric, 0.00) AS "年度考核奖",
    COALESCE((((pe.earnings_details -> 'NURSING_YEARS_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "护龄津贴",
    COALESCE((((pe.earnings_details -> 'TIBET_AID_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "援藏津贴",
    COALESCE((((pe.earnings_details -> 'POLITICS_LAW_COMMITTEE_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "政法委机关工作津贴",
    COALESCE((((pe.earnings_details -> 'TEACHING_YEARS_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "教龄津贴",
    COALESCE((((pe.earnings_details -> 'MONTHLY_REWARD_PERFORMANCE_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "月奖励绩效津贴",
    COALESCE((((pe.earnings_details -> 'FORENSIC_TOXICOLOGY_HEALTH_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "法医毒物化验人员保健津贴",
    COALESCE((((pe.earnings_details -> 'COURT_PROSECUTOR_BASIC_PERFORMANCE_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "法检基础性绩效津补贴",
    COALESCE((((pe.earnings_details -> 'COURT_PROSECUTOR_REFORM_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "法院检察院工改保留津贴",
    COALESCE((((pe.earnings_details -> 'COURT_PROSECUTOR_DUTY_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "法院检察院执勤津贴",
    COALESCE((((pe.earnings_details -> 'COURT_PROSECUTOR_STANDARD_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "法院检察院规范津补贴",
    COALESCE((((pe.earnings_details -> 'SPECIAL_GRADE_TEACHER_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "特级教师津贴",
    COALESCE((((pe.earnings_details -> 'SPECIAL_POSITION_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "特殊岗位津贴",
    COALESCE((((pe.earnings_details -> 'LIVING_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "生活性津贴",
    COALESCE((((pe.earnings_details -> 'OLD_GRAIN_SUBSIDY'::text) ->> 'amount'::text))::numeric, 0.00) AS "老粮贴",
    COALESCE((((pe.earnings_details -> 'DISCIPLINE_INSPECTION_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "纪检津贴",
    COALESCE((((pe.earnings_details -> 'DISCIPLINE_COMMITTEE_REFORM_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "纪委监委机构改革保留补贴",
    COALESCE((((pe.earnings_details -> 'PERFORMANCE_AWARD'::text) ->> 'amount'::text))::numeric, 0.00) AS "绩效奖",
    COALESCE((((pe.earnings_details -> 'PERFORMANCE_SALARY_BACKPAY'::text) ->> 'amount'::text))::numeric, 0.00) AS "绩效工资补发",
    COALESCE((((pe.earnings_details -> 'ALLOWANCE_BACKPAY'::text) ->> 'amount'::text))::numeric, 0.00) AS "补发津贴",
    COALESCE((((pe.earnings_details -> 'POLICE_RANK_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "警衔津贴",
    COALESCE((((pe.earnings_details -> 'REMOTE_AREA_ALLOWANCE'::text) ->> 'amount'::text))::numeric, 0.00) AS "艰苦边远地区津贴",
    COALESCE((((pe.earnings_details -> 'QUARTERLY_PERFORMANCE_Q1'::text) ->> 'amount'::text))::numeric, 0.00) AS "1季度绩效考核薪酬",

    -- 扣除项目（从 deductions_details 提取）
    COALESCE((((pe.deductions_details -> 'PERSONAL_INCOME_TAX'::text) ->> 'amount'::text))::numeric, 0.00) AS "个人所得税",
    COALESCE((((pe.deductions_details -> 'PENSION_PERSONAL_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "养老保险个人应缴金额",
    COALESCE((((pe.deductions_details -> 'MEDICAL_INS_PERSONAL_TOTAL'::text) ->> 'amount'::text))::numeric, 0.00) AS "医疗保险个人应缴总额",
    COALESCE((((pe.deductions_details -> 'MEDICAL_INS_PERSONAL_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "医疗保险个人缴纳金额",
    COALESCE((((pe.deductions_details -> 'UNEMPLOYMENT_PERSONAL_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "失业保险个人应缴金额",
    COALESCE((((pe.deductions_details -> 'OCCUPATIONAL_PENSION_PERSONAL_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "职业年金个人应缴费额",
    COALESCE((((pe.deductions_details -> 'HOUSING_FUND_PERSONAL'::text) ->> 'amount'::text))::numeric, 0.00) AS "个人缴住房公积金",
    COALESCE((((pe.deductions_details -> 'REWARD_PERFORMANCE_ADJUSTMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "奖励绩效补扣发",
    COALESCE((((pe.deductions_details -> 'PERFORMANCE_BONUS_DEDUCTION_ADJUSTMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "绩效奖金补扣发",
    COALESCE((((pe.deductions_details -> 'SOCIAL_INSURANCE_ADJUSTMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "补扣社保",
    COALESCE((((pe.deductions_details -> 'REFUND_DEDUCTION_ADJUSTMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "补扣（退）款",
    COALESCE((((pe.deductions_details -> 'MEDICAL_2022_DEDUCTION_ADJUSTMENT'::text) ->> 'amount'::text))::numeric, 0.00) AS "补扣2022年医保款",
    COALESCE((((pe.deductions_details -> 'PENSION_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "养老保险单位应缴金额",
    COALESCE((((pe.deductions_details -> 'MEDICAL_INS_EMPLOYER_TOTAL'::text) ->> 'amount'::text))::numeric, 0.00) AS "医疗保险单位应缴总额",
    COALESCE((((pe.deductions_details -> 'MEDICAL_INS_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "医疗保险单位缴纳金额",
    COALESCE((((pe.deductions_details -> 'SERIOUS_ILLNESS_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "大病医疗单位缴纳",
    COALESCE((((pe.deductions_details -> 'UNEMPLOYMENT_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "失业保险单位应缴金额",
    COALESCE((((pe.deductions_details -> 'INJURY_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "工伤单位应缴金额",
    COALESCE((((pe.deductions_details -> 'OCCUPATIONAL_PENSION_EMPLOYER_AMOUNT'::text) ->> 'amount'::text))::numeric, 0.00) AS "职业年金单位应缴费额",
    COALESCE((((pe.deductions_details -> 'HOUSING_FUND_EMPLOYER'::text) ->> 'amount'::text))::numeric, 0.00) AS "单位缴住房公积金",

    -- *** 修复重点：修正"一次性补扣发"字段映射 ***
    -- 原有错误：只从 deductions_details 中查找
    -- 修正方案：优先从 earnings_details 查找，备选 deductions_details
    COALESCE(
        (((pe.earnings_details -> 'ONE_TIME_ADJUSTMENT'::text) ->> 'amount'::text))::numeric,
        (((pe.deductions_details -> 'ONE_TIME_ADJUSTMENT'::text) ->> 'amount'::text))::numeric,
        0.00
    ) AS "一次性补扣发",

    -- 元数据字段
    COALESCE(pe.status_lookup_value_id, (1)::bigint) AS "状态ID",
    COALESCE(pe.remarks, ''::text) AS "备注",
    pe.audit_status AS "审计状态",
    pe.audit_timestamp AS "审计时间",
    pe.auditor_id AS "审计员ID",
    pe.audit_notes AS "审计备注",
    pe.version AS "版本号",
    COALESCE(pe.calculated_at, pe.updated_at, now()) AS "计算时间",
    pe.updated_at AS "更新时间",
    pe.earnings_details AS "原始应发明细",
    pe.deductions_details AS "原始扣除明细",
    pe.calculation_inputs AS "原始计算输入",
    pe.calculation_log AS "原始计算日志"

FROM payroll.payroll_entries pe
LEFT JOIN hr.employees e ON pe.employee_id = e.id
LEFT JOIN hr.departments d ON e.department_id = d.id
LEFT JOIN hr.positions pos ON e.actual_position_id = pos.id
LEFT JOIN hr.personnel_categories pc ON e.personnel_category_id = pc.id
LEFT JOIN reports.v_personnel_hierarchy_simple ph ON pc.id = ph.category_id
LEFT JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
LEFT JOIN payroll.payroll_runs pr ON pe.payroll_run_id = pr.id;

-- 验证修复结果的测试查询
-- 检查黄明2025年02月的"一次性补扣发"字段是否正确显示
-- 预期结果：应显示 7831.00 而不是 0.00

-- SELECT 
--   "姓名",
--   "薪资期间名称",
--   "一次性补扣发",
--   "应发合计",
--   "实发合计"
-- FROM reports.v_comprehensive_employee_payroll_optimized
-- WHERE "薪资期间名称" LIKE '%2025年02月%'
-- AND "姓名" = '黄明';