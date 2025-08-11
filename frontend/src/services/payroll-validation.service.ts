import { supabase } from '@/lib/supabase';

export interface EmployeeValidationData {
  id: string;
  employee_name: string;
  id_number: string;
  employment_status: string;
  hire_date: string;
  termination_date?: string;
  last_payroll_date?: string;
  average_salary?: number;
  current_salary?: number;
  has_recent_changes: boolean;
  validation_status: 'valid' | 'warning' | 'error';
  validation_issues: string[];
}

export interface ValidationSummary {
  total_employees: number;
  valid_employees: number;
  warning_employees: number;
  error_employees: number;
  total_amount: number;
  estimated_amount: number;
  last_updated: string;
}

export interface ValidationIssue {
  type: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  employee_count: number;
  employees: EmployeeValidationData[];
}

export class PayrollValidationService {
  /**
   * 验证指定月份的员工薪资数据
   */
  static async validateEmployeesForPeriod(
    sourceMonth: string,
    targetPeriod: string,
    selectedEmployeeIds?: string[]
  ): Promise<{
    summary: ValidationSummary;
    issues: ValidationIssue[];
    employees: EmployeeValidationData[];
  }> {
    try {
      console.log('开始验证员工数据:', { sourceMonth, targetPeriod, selectedEmployeeIds });

      // 1. 获取源月份的薪资数据和员工信息
      const { data: sourcePayrollData, error: sourceError } = await supabase.rpc(
        'get_payroll_validation_data',
        {
          source_month: sourceMonth,
          selected_employee_ids: selectedEmployeeIds || null
        }
      );

      if (sourceError) {
        console.error('获取源薪资数据失败:', sourceError);
        throw new Error(`获取源薪资数据失败: ${sourceError.message}`);
      }

      if (!sourcePayrollData || sourcePayrollData.length === 0) {
        throw new Error('未找到源月份的薪资数据');
      }

      // 2. 获取员工当前状态
      const employeeIds = sourcePayrollData.map((item: any) => item.employee_id);
      const { data: currentEmployeeStatus, error: statusError } = await supabase
        .from('employees')
        .select('id, employee_name, id_number, employment_status, hire_date, termination_date, updated_at')
        .in('id', employeeIds);

      if (statusError) {
        console.error('获取员工状态失败:', statusError);
        throw new Error(`获取员工状态失败: ${statusError.message}`);
      }

      // 3. 分析员工数据并生成验证结果
      const employees = await this.analyzeEmployeeData(sourcePayrollData, currentEmployeeStatus);
      const summary = this.generateValidationSummary(employees);
      const issues = this.identifyValidationIssues(employees);

      console.log('验证完成:', { summary, issueCount: issues.length, employeeCount: employees.length });

      return {
        summary,
        issues,
        employees
      };
    } catch (error) {
      console.error('薪资验证过程失败:', error);
      throw error;
    }
  }

  /**
   * 分析员工数据
   */
  private static async analyzeEmployeeData(
    payrollData: any[],
    employeeStatus: any[]
  ): Promise<EmployeeValidationData[]> {
    const employeeMap = new Map(employeeStatus.map(emp => [emp.id, emp]));
    const payrollByEmployee = new Map();

    // 按员工分组薪资数据
    payrollData.forEach(item => {
      if (!payrollByEmployee.has(item.employee_id)) {
        payrollByEmployee.set(item.employee_id, []);
      }
      payrollByEmployee.get(item.employee_id).push(item);
    });

    const employees: EmployeeValidationData[] = [];

    for (const [employeeId, payrollItems] of payrollByEmployee) {
      const employee = employeeMap.get(employeeId);
      if (!employee) continue;

      const totalSalary = payrollItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const validationData = await this.validateSingleEmployee(employee, payrollItems, totalSalary);
      employees.push(validationData);
    }

    return employees;
  }

  /**
   * 验证单个员工
   */
  private static async validateSingleEmployee(
    employee: any,
    payrollItems: any[],
    totalSalary: number
  ): Promise<EmployeeValidationData> {
    const issues: string[] = [];
    let validationStatus: 'valid' | 'warning' | 'error' = 'valid';

    // 检查员工状态
    if (employee.employment_status !== 'active') {
      issues.push(`员工状态已变更为: ${employee.employment_status}`);
      validationStatus = 'warning';
    }

    // 检查是否已离职
    if (employee.termination_date) {
      const terminationDate = new Date(employee.termination_date);
      const now = new Date();
      if (terminationDate <= now) {
        issues.push(`员工已于 ${employee.termination_date} 离职`);
        validationStatus = 'error';
      }
    }

    // 检查薪资异常
    if (totalSalary < 500) {
      issues.push('薪资金额过低，可能存在异常');
      validationStatus = validationStatus === 'error' ? 'error' : 'warning';
    } else if (totalSalary > 100000) {
      issues.push('薪资金额过高，请核实');
      validationStatus = validationStatus === 'error' ? 'error' : 'warning';
    }

    // 检查是否有必需的薪资组件
    const hasBasicSalary = payrollItems.some(item => 
      item.component_category === 'basic_salary' && item.amount > 0
    );
    if (!hasBasicSalary) {
      issues.push('缺少基本薪资组件');
      validationStatus = 'warning';
    }

    // 检查最近是否有变更
    const hasRecentChanges = new Date(employee.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      id: employee.id,
      employee_name: employee.employee_name,
      id_number: employee.id_number,
      employment_status: employee.employment_status,
      hire_date: employee.hire_date,
      termination_date: employee.termination_date,
      current_salary: totalSalary,
      has_recent_changes: hasRecentChanges,
      validation_status: validationStatus,
      validation_issues: issues
    };
  }

  /**
   * 生成验证摘要
   */
  private static generateValidationSummary(employees: EmployeeValidationData[]): ValidationSummary {
    const validEmployees = employees.filter(emp => emp.validation_status === 'valid');
    const warningEmployees = employees.filter(emp => emp.validation_status === 'warning');
    const errorEmployees = employees.filter(emp => emp.validation_status === 'error');

    const totalAmount = employees.reduce((sum, emp) => sum + (emp.current_salary || 0), 0);
    const estimatedAmount = totalAmount * 1.02; // 预估2%的调整

    return {
      total_employees: employees.length,
      valid_employees: validEmployees.length,
      warning_employees: warningEmployees.length,
      error_employees: errorEmployees.length,
      total_amount: totalAmount,
      estimated_amount: estimatedAmount,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * 识别验证问题
   */
  private static identifyValidationIssues(employees: EmployeeValidationData[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 员工状态变更问题
    const statusChangedEmployees = employees.filter(emp => 
      emp.employment_status !== 'active' || emp.termination_date
    );
    if (statusChangedEmployees.length > 0) {
      issues.push({
        type: 'warning',
        title: '员工状态变更',
        description: `发现 ${statusChangedEmployees.length} 名员工状态已变更，请确认是否继续包含`,
        employee_count: statusChangedEmployees.length,
        employees: statusChangedEmployees
      });
    }

    // 薪资异常问题
    const abnormalSalaryEmployees = employees.filter(emp => 
      (emp.current_salary || 0) < 500 || (emp.current_salary || 0) > 100000
    );
    if (abnormalSalaryEmployees.length > 0) {
      issues.push({
        type: 'warning',
        title: '薪资异常',
        description: `发现 ${abnormalSalaryEmployees.length} 名员工薪资可能异常，建议核查`,
        employee_count: abnormalSalaryEmployees.length,
        employees: abnormalSalaryEmployees
      });
    }

    // 最近有变更的员工
    const recentChangedEmployees = employees.filter(emp => emp.has_recent_changes);
    if (recentChangedEmployees.length > 0) {
      issues.push({
        type: 'info',
        title: '最近有变更',
        description: `发现 ${recentChangedEmployees.length} 名员工信息在最近30天内有变更`,
        employee_count: recentChangedEmployees.length,
        employees: recentChangedEmployees
      });
    }

    // 错误状态员工
    const errorEmployees = employees.filter(emp => emp.validation_status === 'error');
    if (errorEmployees.length > 0) {
      issues.push({
        type: 'error',
        title: '验证失败',
        description: `发现 ${errorEmployees.length} 名员工存在严重问题，需要处理后才能创建薪资`,
        employee_count: errorEmployees.length,
        employees: errorEmployees
      });
    }

    return issues;
  }
}