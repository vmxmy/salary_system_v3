#!/usr/bin/env node

/**
 * 老系统薪资数据导出脚本 - 基于reports视图优化版本
 * 用途：从老系统PostgreSQL数据库导出指定期间的完整薪资数据
 * 特点：使用reports schema下的优化视图，包含所有收入字段
 * 使用方法：node export_old_system_data.js [period_name]
 * 示例：node export_old_system_data.js "2025年02月"
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 老系统数据库连接配置
const OLD_SYSTEM_DB_CONFIG = {
    connectionString: "postgresql://salary_system:caijing123!@8.137.160.207:5432/salary_system",
    ssl: false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
};

class OldSystemDataExporter {
    constructor() {
        this.client = new Client(OLD_SYSTEM_DB_CONFIG);
        this.connected = false;
    }

    async connect() {
        try {
            await this.client.connect();
            this.connected = true;
            console.log('✅ 成功连接到老系统数据库');
        } catch (error) {
            console.error('❌ 连接老系统数据库失败:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connected) {
            await this.client.end();
            this.connected = false;
            console.log('📤 已断开数据库连接');
        }
    }

    /**
     * 获取可用的薪资期间列表
     */
    async getAvailablePeriods() {
        const query = `
            SELECT pp.id, pp.name, pp.start_date, pp.end_date, pp.pay_date,
                   COUNT(pe.id) as payroll_entries_count
            FROM payroll.payroll_periods pp
            LEFT JOIN payroll.payroll_entries pe ON pe.payroll_period_id = pp.id
            GROUP BY pp.id, pp.name, pp.start_date, pp.end_date, pp.pay_date
            HAVING COUNT(pe.id) > 0
            ORDER BY pp.start_date DESC
        `;
        
        const result = await this.client.query(query);
        return result.rows;
    }

    /**
     * 获取期间数据汇总
     */
    async getPeriodSummary(periodName) {
        const query = `
            SELECT 
                pp.name as period_name,
                COUNT(DISTINCT pe.employee_id) as employee_count,
                COUNT(pe.id) as payroll_entries_count,
                ROUND(SUM(pe.gross_pay), 2) as total_gross_pay,
                ROUND(SUM(pe.total_deductions), 2) as total_deductions,
                ROUND(SUM(pe.net_pay), 2) as total_net_pay,
                ROUND(AVG(pe.gross_pay), 2) as avg_gross_pay
            FROM payroll.payroll_entries pe
            JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
            WHERE pp.name = $1
            GROUP BY pp.name
        `;
        
        const result = await this.client.query(query, [periodName]);
        return result.rows[0] || null;
    }

    /**
     * 导出完整的员工薪资数据（使用reports视图，包含所有收入字段）
     */
    async exportEmployeePayrollData(periodName) {
        const query = `
            -- 使用reports schema下的优化视图导出完整薪资数据
            WITH payroll_base AS (
                SELECT 
                    "员工id" as employee_id,
                    "姓名" as employee_name,
                    "员工编号" as employee_code,
                    "部门名称" as department_name,
                    "职位名称" as position_name,
                    "薪资期间名称" as period_name,
                    "应发合计" as gross_pay,
                    "扣除合计" as total_deductions,
                    "实发合计" as net_pay,
                    "薪资条目id" as payroll_entry_id
                FROM reports.v_comprehensive_employee_payroll
                WHERE "薪资期间名称" = $1
            ),
            full_earnings AS (
                SELECT 
                    "员工id" as employee_id,
                    -- 基础工资类
                    COALESCE("基本工资", 0) as basic_salary,
                    COALESCE("岗位工资", 0) as position_salary,
                    COALESCE("级别工资", 0) as level_salary,
                    COALESCE("薪级工资", 0) as grade_salary,
                    COALESCE("职务/技术等级工资", 0) as duty_tech_salary,
                    COALESCE("级别/岗位级别工资", 0) as level_position_salary,
                    COALESCE("试用期工资", 0) as probation_salary,
                    COALESCE("事业单位人员薪级工资", 0) as institution_grade_salary,
                    COALESCE("补发工资", 0) as back_pay_salary,
                    
                    -- 津贴补贴类
                    COALESCE("补助", 0) as allowance,
                    COALESCE("津贴", 0) as subsidy,
                    COALESCE("公务员规范后津补贴", 0) as civil_servant_allowance,
                    COALESCE("公务交通补贴", 0) as transport_allowance,
                    COALESCE("岗位职务补贴", 0) as position_duty_allowance,
                    COALESCE("住房补贴", 0) as housing_subsidy,
                    COALESCE("信访工作人员岗位工作津贴", 0) as petition_work_allowance,
                    COALESCE("九三年工改保留津补贴", 0) as old_reform_allowance,
                    COALESCE("乡镇工作补贴", 0) as township_work_allowance,
                    COALESCE("艰苦边远地区津贴", 0) as remote_area_allowance,
                    COALESCE("工作性津贴", 0) as work_allowance,
                    COALESCE("生活性津贴", 0) as living_allowance,
                    COALESCE("特殊岗位津贴", 0) as special_position_allowance,
                    COALESCE("老粮贴", 0) as old_grain_subsidy,
                    COALESCE("回民补贴", 0) as muslim_subsidy,
                    COALESCE("国家规定的其他津补贴项目", 0) as other_national_allowances,
                    
                    -- 专业津贴类
                    COALESCE("教龄津贴", 0) as teaching_age_allowance,
                    COALESCE("特级教师津贴", 0) as special_teacher_allowance,
                    COALESCE("护龄津贴", 0) as nursing_age_allowance,
                    COALESCE("援藏津贴", 0) as tibet_aid_allowance,
                    COALESCE("卫生援藏津贴", 0) as health_tibet_aid_allowance,
                    COALESCE("卫生九三年工改保留津补贴", 0) as health_old_reform_allowance,
                    COALESCE("卫生独生子女费", 0) as health_one_child_fee,
                    
                    -- 公安政法类
                    COALESCE("人民警察值勤岗位津贴", 0) as police_duty_allowance,
                    COALESCE("人民警察加班补贴", 0) as police_overtime_allowance,
                    COALESCE("公安岗位津贴", 0) as police_position_allowance,
                    COALESCE("公安执勤津贴", 0) as police_duty_subsidy,
                    COALESCE("公安法定工作日之外加班补贴", 0) as police_overtime_subsidy,
                    COALESCE("公检法艰苦边远地区津贴", 0) as justice_remote_allowance,
                    COALESCE("政法委机关工作津贴", 0) as politics_law_work_allowance,
                    COALESCE("法医毒物化验人员保健津贴", 0) as forensic_health_allowance,
                    COALESCE("法检基础性绩效津补贴", 0) as justice_basic_performance_allowance,
                    COALESCE("法院检察院工改保留津贴", 0) as court_reform_allowance,
                    COALESCE("法院检察院执勤津贴", 0) as court_duty_allowance,
                    COALESCE("法院检察院规范津补贴", 0) as court_standard_allowance,
                    COALESCE("纪检津贴", 0) as discipline_allowance,
                    COALESCE("纪委监委机构改革保留补贴", 0) as discipline_reform_allowance,
                    COALESCE("警衔津贴", 0) as police_rank_allowance,
                    
                    -- 绩效奖励类
                    COALESCE("基础绩效", 0) as basic_performance,
                    COALESCE("绩效工资", 0) as performance_salary,
                    COALESCE("奖励性绩效工资", 0) as reward_performance_salary,
                    COALESCE("基础性绩效工资", 0) as basic_performance_salary,
                    COALESCE("基础绩效奖", 0) as basic_performance_bonus,
                    COALESCE("绩效奖", 0) as performance_bonus,
                    COALESCE("月奖励绩效", 0) as monthly_reward_performance,
                    COALESCE("月奖励绩效津贴", 0) as monthly_reward_performance_allowance,
                    COALESCE("季度绩效考核薪酬", 0) as quarterly_performance_salary,
                    COALESCE("1季度绩效考核薪酬", 0) as first_quarter_performance_salary,
                    COALESCE("年度考核奖", 0) as annual_assessment_bonus,
                    COALESCE("公务员十三月奖励工资", 0) as civil_servant_13th_month_salary,
                    
                    -- 补发调整类
                    COALESCE("绩效工资补发", 0) as performance_salary_backpay,
                    COALESCE("奖励绩效补发", 0) as reward_performance_backpay,
                    COALESCE("奖励绩效补扣发", 0) as reward_performance_adjustment,
                    COALESCE("绩效奖金补扣发", 0) as performance_bonus_adjustment,
                    COALESCE("补发津贴", 0) as allowance_backpay,
                    COALESCE("一次性补扣发", 0) as one_time_adjustment,
                    COALESCE("补扣（退）款", 0) as adjustment_refund,
                    COALESCE("中小学教师或护士保留原额百分之十工资", 0) as teacher_nurse_retain_10pct,
                    COALESCE("中小学教师或护士提高百分之十", 0) as teacher_nurse_increase_10pct,
                    
                    -- 特殊项目
                    COALESCE("独生子女父母奖励金", 0) as one_child_parent_reward
                FROM reports.v_payroll_earnings
                WHERE "薪资条目id" IN (SELECT payroll_entry_id FROM payroll_base)
            ),
            full_deductions AS (
                SELECT 
                    "员工id" as employee_id,
                    COALESCE("个人所得税", 0) as personal_income_tax,
                    COALESCE("养老保险个人应缴费额", 0) as pension_personal,
                    COALESCE("医疗保险个人应缴费额", 0) as medical_personal,
                    COALESCE("失业保险个人应缴费额", 0) as unemployment_personal,
                    COALESCE("职业年金个人应缴费额", 0) as occupational_pension_personal,
                    COALESCE("住房公积金个人应缴费额", 0) as housing_fund_personal,
                    COALESCE("养老保险单位应缴费额", 0) as pension_employer,
                    COALESCE("医疗保险单位应缴费额", 0) as medical_employer,
                    COALESCE("失业保险单位应缴费额", 0) as unemployment_employer,
                    COALESCE("住房公积金单位应缴费额", 0) as housing_fund_employer
                FROM reports.v_payroll_deductions
                WHERE "薪资条目id" IN (SELECT payroll_entry_id FROM payroll_base)
            )
            SELECT 
                pb.*,
                -- 获取身份证号
                e.id_number,
                -- 所有收入明细
                fe.*,
                -- 所有扣除明细
                fd.*
            FROM payroll_base pb
            JOIN hr.employees e ON pb.employee_id = e.id
            LEFT JOIN full_earnings fe ON pb.employee_id = fe.employee_id
            LEFT JOIN full_deductions fd ON pb.employee_id = fd.employee_id
            ORDER BY pb.employee_code, pb.employee_name
        `;
        
        const result = await this.client.query(query, [periodName]);
        return result.rows;
    }

    /**
     * 从 earnings_details 提取收入项目
     */
    extractIncomeItems(earningsDetails) {
        const incomeItems = [];
        
        if (!earningsDetails || typeof earningsDetails !== 'object') {
            return incomeItems;
        }

        // 按照显示顺序定义收入项目映射
        const incomeMapping = {
            'BASIC_SALARY': { category: 'basic_salary', display_order: 1, is_taxable: true },
            'POSITION_SALARY_GENERAL': { category: 'allowance', display_order: 2, is_taxable: true },
            'ALLOWANCE_GENERAL': { category: 'allowance', display_order: 3, is_taxable: true },
            'BASIC_PERFORMANCE': { category: 'allowance', display_order: 4, is_taxable: true },
            'PERFORMANCE_SALARY': { category: 'allowance', display_order: 5, is_taxable: true },
            'OVERTIME_PAY': { category: 'overtime', display_order: 6, is_taxable: true },
            'TRANSPORT_SUBSIDY': { category: 'subsidy', display_order: 7, is_taxable: false },
            'COMMUNICATION_SUBSIDY': { category: 'subsidy', display_order: 8, is_taxable: false },
            'MEAL_SUBSIDY': { category: 'subsidy', display_order: 9, is_taxable: false },
            'PERFORMANCE_BONUS': { category: 'bonus', display_order: 10, is_taxable: true },
            'ANNUAL_BONUS': { category: 'bonus', display_order: 11, is_taxable: true },
        };

        Object.entries(earningsDetails).forEach(([code, details]) => {
            if (details && typeof details === 'object' && details.amount && details.amount > 0) {
                const mapping = incomeMapping[code] || { 
                    category: 'other_income', 
                    display_order: 99, 
                    is_taxable: true 
                };
                
                incomeItems.push({
                    component_code: code,
                    component_name: details.name || code,
                    amount: parseFloat(details.amount) || 0,
                    category: mapping.category,
                    is_taxable: mapping.is_taxable,
                    display_order: mapping.display_order
                });
            }
        });

        // 按显示顺序排序
        return incomeItems.sort((a, b) => a.display_order - b.display_order);
    }

    /**
     * 从 deductions_details 提取个人扣除项目（包含个税）
     */
    extractPersonalDeductions(deductionsDetails) {
        const personalDeductions = {
            personal_tax: 0,
            social_insurance_personal: 0,
            housing_fund_personal: 0,
            other_deductions: 0
        };

        if (!deductionsDetails || typeof deductionsDetails !== 'object') {
            return personalDeductions;
        }

        Object.entries(deductionsDetails).forEach(([code, details]) => {
            if (details && typeof details === 'object' && details.amount) {
                const amount = parseFloat(details.amount) || 0;
                
                if (code === 'PERSONAL_INCOME_TAX') {
                    personalDeductions.personal_tax = amount;
                } else if (code.includes('_PERSONAL_') && code.includes('_AMOUNT')) {
                    if (code.includes('HOUSING_FUND')) {
                        personalDeductions.housing_fund_personal += amount;
                    } else {
                        personalDeductions.social_insurance_personal += amount;
                    }
                } else if (code === 'REFUND_DEDUCTION_ADJUSTMENT') {
                    personalDeductions.other_deductions += amount;
                }
            }
        });

        return personalDeductions;
    }

    /**
     * 从 deductions_details 推算缴费基数
     */
    calculateInsuranceBases(deductionsDetails) {
        const bases = {
            social_insurance_base: 0,
            housing_fund_base: 0,
            occupational_pension_base: 0
        };

        if (!deductionsDetails || typeof deductionsDetails !== 'object') {
            return bases;
        }

        // 从个人养老保险推算社保基数（个人缴费比例8%）
        const pensionPersonal = deductionsDetails['PENSION_PERSONAL_AMOUNT'];
        if (pensionPersonal && pensionPersonal.amount && pensionPersonal.rate) {
            bases.social_insurance_base = Math.round(pensionPersonal.amount / pensionPersonal.rate);
        }

        // 从个人住房公积金推算公积金基数（个人缴费比例12%）
        const housingFundPersonal = deductionsDetails['HOUSING_FUND_PERSONAL'];
        if (housingFundPersonal && housingFundPersonal.amount && housingFundPersonal.rate) {
            bases.housing_fund_base = Math.round(housingFundPersonal.amount / housingFundPersonal.rate);
        }

        return bases;
    }

    /**
     * 整合员工数据（基于reports视图的新数据结构）
     */
    integrateEmployeeData(payrollData) {
        return payrollData.map(employee => {
            // 提取所有收入项目
            const incomeItems = this.extractAllIncomeItems(employee);
            
            // 计算缴费基数（从个人扣除项目推算）
            const insuranceBases = this.calculateInsuranceBasesFromDeductions(employee);

            return {
                employee_id: employee.employee_id,
                employee_name: employee.employee_name,
                employee_code: employee.employee_code || '',
                id_number: employee.id_number || '',
                department_name: employee.department_name || '',
                position_name: employee.position_name || '',
                period: employee.period_name,
                
                // 收入项目（包含所有非零字段）
                income_items: incomeItems,
                
                // 个人所得税数据
                personal_tax: {
                    taxable_income: parseFloat(employee.gross_pay) || 0,
                    tax_amount: parseFloat(employee.personal_income_tax) || 0,
                    deduction_amount: (parseFloat(employee.pension_personal) || 0) + 
                                    (parseFloat(employee.medical_personal) || 0) + 
                                    (parseFloat(employee.unemployment_personal) || 0) + 
                                    (parseFloat(employee.occupational_pension_personal) || 0) + 
                                    (parseFloat(employee.housing_fund_personal) || 0),
                    cumulative_taxable_income: 0, // 这些数据需要从个税记录中单独获取
                    cumulative_tax_amount: 0,
                    tax_rate: 0,
                    quick_deduction: 0,
                    special_deductions: 0,
                    other_deductions: 0
                },
                
                // 缴费基数
                insurance_base: insuranceBases,
                
                // 薪资汇总
                payroll_summary: {
                    gross_pay: parseFloat(employee.gross_pay) || 0,
                    total_deductions: parseFloat(employee.total_deductions) || 0,
                    net_pay: parseFloat(employee.net_pay) || 0
                },
                
                // 扣除明细
                deduction_details: {
                    personal_income_tax: parseFloat(employee.personal_income_tax) || 0,
                    pension_personal: parseFloat(employee.pension_personal) || 0,
                    medical_personal: parseFloat(employee.medical_personal) || 0,
                    unemployment_personal: parseFloat(employee.unemployment_personal) || 0,
                    occupational_pension_personal: parseFloat(employee.occupational_pension_personal) || 0,
                    housing_fund_personal: parseFloat(employee.housing_fund_personal) || 0
                }
            };
        });
    }

    /**
     * 从reports视图数据中提取所有收入项目
     */
    extractAllIncomeItems(employee) {
        const incomeItems = [];
        
        // 定义收入项目映射和分类
        const incomeMapping = [
            // 基础工资类
            { field: 'basic_salary', name: '基本工资', category: 'basic_salary', is_taxable: true, order: 1 },
            { field: 'position_salary', name: '岗位工资', category: 'basic_salary', is_taxable: true, order: 2 },
            { field: 'level_salary', name: '级别工资', category: 'basic_salary', is_taxable: true, order: 3 },
            { field: 'grade_salary', name: '薪级工资', category: 'basic_salary', is_taxable: true, order: 4 },
            { field: 'duty_tech_salary', name: '职务/技术等级工资', category: 'basic_salary', is_taxable: true, order: 5 },
            { field: 'level_position_salary', name: '级别/岗位级别工资', category: 'basic_salary', is_taxable: true, order: 6 },
            { field: 'probation_salary', name: '试用期工资', category: 'basic_salary', is_taxable: true, order: 7 },
            { field: 'institution_grade_salary', name: '事业单位人员薪级工资', category: 'basic_salary', is_taxable: true, order: 8 },
            
            // 津贴补贴类
            { field: 'allowance', name: '补助', category: 'allowance', is_taxable: true, order: 10 },
            { field: 'subsidy', name: '津贴', category: 'allowance', is_taxable: true, order: 11 },
            { field: 'civil_servant_allowance', name: '公务员规范后津补贴', category: 'allowance', is_taxable: true, order: 12 },
            { field: 'transport_allowance', name: '公务交通补贴', category: 'subsidy', is_taxable: false, order: 13 },
            { field: 'position_duty_allowance', name: '岗位职务补贴', category: 'allowance', is_taxable: true, order: 14 },
            { field: 'housing_subsidy', name: '住房补贴', category: 'subsidy', is_taxable: false, order: 15 },
            { field: 'township_work_allowance', name: '乡镇工作补贴', category: 'allowance', is_taxable: true, order: 16 },
            { field: 'remote_area_allowance', name: '艰苦边远地区津贴', category: 'allowance', is_taxable: true, order: 17 },
            { field: 'work_allowance', name: '工作性津贴', category: 'allowance', is_taxable: true, order: 18 },
            { field: 'living_allowance', name: '生活性津贴', category: 'allowance', is_taxable: true, order: 19 },
            { field: 'special_position_allowance', name: '特殊岗位津贴', category: 'allowance', is_taxable: true, order: 20 },
            
            // 绩效奖励类
            { field: 'basic_performance', name: '基础绩效', category: 'performance', is_taxable: true, order: 30 },
            { field: 'performance_salary', name: '绩效工资', category: 'performance', is_taxable: true, order: 31 },
            { field: 'reward_performance_salary', name: '奖励性绩效工资', category: 'performance', is_taxable: true, order: 32 },
            { field: 'basic_performance_salary', name: '基础性绩效工资', category: 'performance', is_taxable: true, order: 33 },
            { field: 'monthly_reward_performance', name: '月奖励绩效', category: 'performance', is_taxable: true, order: 34 },
            { field: 'quarterly_performance_salary', name: '季度绩效考核薪酬', category: 'performance', is_taxable: true, order: 35 },
            { field: 'annual_assessment_bonus', name: '年度考核奖', category: 'bonus', is_taxable: true, order: 36 },
            { field: 'civil_servant_13th_month_salary', name: '公务员十三月奖励工资', category: 'bonus', is_taxable: true, order: 37 },
            
            // 专业津贴类
            { field: 'teaching_age_allowance', name: '教龄津贴', category: 'professional_allowance', is_taxable: true, order: 40 },
            { field: 'special_teacher_allowance', name: '特级教师津贴', category: 'professional_allowance', is_taxable: true, order: 41 },
            { field: 'nursing_age_allowance', name: '护龄津贴', category: 'professional_allowance', is_taxable: true, order: 42 },
            { field: 'tibet_aid_allowance', name: '援藏津贴', category: 'professional_allowance', is_taxable: true, order: 43 },
            
            // 公安政法类
            { field: 'police_duty_allowance', name: '人民警察值勤岗位津贴', category: 'police_allowance', is_taxable: true, order: 50 },
            { field: 'police_overtime_allowance', name: '人民警察加班补贴', category: 'police_allowance', is_taxable: true, order: 51 },
            { field: 'police_position_allowance', name: '公安岗位津贴', category: 'police_allowance', is_taxable: true, order: 52 },
            { field: 'police_rank_allowance', name: '警衔津贴', category: 'police_allowance', is_taxable: true, order: 53 },
            
            // 调整类
            { field: 'back_pay_salary', name: '补发工资', category: 'adjustment', is_taxable: true, order: 90 },
            { field: 'one_time_adjustment', name: '一次性补扣发', category: 'adjustment', is_taxable: true, order: 91 },
            { field: 'adjustment_refund', name: '补扣（退）款', category: 'adjustment', is_taxable: true, order: 92 }
        ];
        
        // 遍历所有映射，提取非零值
        incomeMapping.forEach(mapping => {
            const amount = parseFloat(employee[mapping.field]) || 0;
            if (amount > 0) {
                incomeItems.push({
                    component_code: mapping.field.toUpperCase(),
                    component_name: mapping.name,
                    amount: amount,
                    category: mapping.category,
                    is_taxable: mapping.is_taxable,
                    display_order: mapping.order
                });
            }
        });
        
        // 按显示顺序排序
        return incomeItems.sort((a, b) => a.display_order - b.display_order);
    }

    /**
     * 从扣除数据推算缴费基数
     */
    calculateInsuranceBasesFromDeductions(employee) {
        const bases = {
            social_insurance_base: 0,
            housing_fund_base: 0,
            occupational_pension_base: 0
        };

        // 从个人养老保险推算社保基数（通常个人缴费比例8%）
        const pensionPersonal = parseFloat(employee.pension_personal) || 0;
        if (pensionPersonal > 0) {
            bases.social_insurance_base = Math.round(pensionPersonal / 0.08);
        }

        // 从个人住房公积金推算公积金基数（通常个人缴费比例12%）
        const housingFundPersonal = parseFloat(employee.housing_fund_personal) || 0;
        if (housingFundPersonal > 0) {
            bases.housing_fund_base = Math.round(housingFundPersonal / 0.12);
        }

        // 从个人职业年金推算职业年金基数（通常个人缴费比例4%）
        const occupationalPensionPersonal = parseFloat(employee.occupational_pension_personal) || 0;
        if (occupationalPensionPersonal > 0) {
            bases.occupational_pension_base = Math.round(occupationalPensionPersonal / 0.04);
        }

        return bases;
    }

    /**
     * 执行完整数据导出
     */
    async exportPeriodData(periodName) {
        console.log(`🚀 开始导出 "${periodName}" 期间的薪资数据...`);
        
        try {
            // 获取数据汇总
            const summary = await this.getPeriodSummary(periodName);
            if (!summary) {
                throw new Error(`期间 "${periodName}" 没有找到任何薪资数据`);
            }
            
            console.log(`📊 期间汇总: ${summary.employee_count} 个员工, 总收入 ¥${summary.total_gross_pay}`);
            
            // 导出薪资数据
            console.log('📥 正在导出薪资数据...');
            const payrollData = await this.exportEmployeePayrollData(periodName);
            
            console.log(`✅ 薪资记录: ${payrollData.length} 条`);
            
            // 整合员工数据
            console.log('🔄 正在整合员工数据...');
            const integratedData = this.integrateEmployeeData(payrollData);
            
            // 构建导出结果
            const exportResult = {
                status: 'success',
                export_info: {
                    period: periodName,
                    employee_count: integratedData.length,
                    export_timestamp: new Date().toISOString(),
                    source_system: 'old_postgresql_system',
                    summary: {
                        total_gross_pay: parseFloat(summary.total_gross_pay) || 0,
                        total_net_pay: parseFloat(summary.total_net_pay) || 0,
                        total_deductions: parseFloat(summary.total_deductions) || 0,
                        avg_gross_pay: parseFloat(summary.avg_gross_pay) || 0
                    }
                },
                data: integratedData
            };
            
            // 保存到文件
            const outputDir = path.join(__dirname, '../exports');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const safePeriodName = periodName.replace(/[年月\s]/g, '_').replace(/_{2,}/g, '_');
            const outputFile = path.join(outputDir, `payroll_export_${safePeriodName}.json`);
            fs.writeFileSync(outputFile, JSON.stringify(exportResult, null, 2), 'utf8');
            
            console.log(`💾 数据已保存到: ${outputFile}`);
            console.log(`🎉 导出完成! 共 ${integratedData.length} 个员工的数据`);
            
            return exportResult;
            
        } catch (error) {
            console.error(`❌ 导出失败:`, error.message);
            throw error;
        }
    }

    /**
     * 列出所有可用期间
     */
    async listAvailablePeriods() {
        console.log('📋 获取可用薪资期间...');
        const periods = await this.getAvailablePeriods();
        
        console.log('\n可用的薪资期间:');
        console.log('=' .repeat(60));
        periods.forEach((period, index) => {
            console.log(`${index + 1}. ${period.name} (${period.payroll_entries_count} 条记录)`);
            console.log(`   日期: ${period.start_date.toLocaleDateString()} - ${period.end_date.toLocaleDateString()}`);
            console.log(`   发薪日: ${period.pay_date.toLocaleDateString()}`);
            console.log('');
        });
        
        return periods;
    }
}

// 主函数
async function main() {
    const periodName = process.argv[2];
    
    console.log('🏛️  老系统薪资数据导出工具');
    console.log('=' .repeat(50));
    
    const exporter = new OldSystemDataExporter();
    
    try {
        await exporter.connect();
        
        if (!periodName) {
            // 如果没有指定期间，显示可用期间列表
            await exporter.listAvailablePeriods();
            console.log('💡 使用方法: node export_old_system_data.js "期间名称"');
            console.log('💡 示例: node export_old_system_data.js "2025年02月"');
            return;
        }
        
        console.log(`📅 导出期间: ${periodName}`);
        const result = await exporter.exportPeriodData(periodName);
        
        // 输出统计信息
        console.log('\n📈 导出统计:');
        console.log(`- 员工数量: ${result.export_info.employee_count}`);
        console.log(`- 总收入: ¥${result.export_info.summary.total_gross_pay.toLocaleString()}`);
        console.log(`- 总净额: ¥${result.export_info.summary.total_net_pay.toLocaleString()}`);
        console.log(`- 总扣除: ¥${result.export_info.summary.total_deductions.toLocaleString()}`);
        console.log(`- 平均收入: ¥${result.export_info.summary.avg_gross_pay.toLocaleString()}`);
        
        // 显示前3个员工的收入项目示例
        console.log('\n💰 收入项目示例 (前3个员工):');
        result.data.slice(0, 3).forEach((emp, index) => {
            console.log(`${index + 1}. ${emp.employee_name}:`);
            emp.income_items.forEach(item => {
                console.log(`   - ${item.component_name}: ¥${item.amount}`);
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('\n💥 程序执行失败:', error.message);
        process.exit(1);
    } finally {
        await exporter.disconnect();
    }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});

// 执行主函数
if (require.main === module) {
    main();
}

module.exports = { OldSystemDataExporter };