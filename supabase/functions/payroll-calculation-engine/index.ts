/**
 * 薪资计算引擎 Edge Function
 * 
 * 提供统一的薪资计算API接口，整合：
 * 1. 社保计算服务
 * 2. 个税处理服务  
 * 3. 薪资汇总服务
 * 4. 数据库函数适配器
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 请求类型定义
interface PayrollCalculationRequest {
  action: 'calculate_social_insurance' | 'batch_calculate_social_insurance' | 
          'import_tax_data' | 'generate_summary' | 'compare_periods' |
          'validate_base' | 'recalculate_period';
  data: any;
  options?: {
    useCache?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
    includeBreakdown?: boolean;
  };
}

// 响应类型定义
interface PayrollCalculationResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
  };
}

// 初始化Supabase客户端
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 社保计算处理器
 */
class SocialInsuranceHandler {
  async calculateSingle(employeeId: string, periodId: string, calculationDate?: string) {
    try {
      const { data, error } = await supabase
        .rpc('calculate_employee_social_insurance', {
          p_employee_id: employeeId,
          p_period_id: periodId,
          p_calculation_date: calculationDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      
      return {
        employeeId,
        periodId,
        calculationDate: calculationDate || new Date().toISOString().split('T')[0],
        result: data,
        calculationMethod: 'database_function'
      };
    } catch (error) {
      console.error('社保计算失败:', error);
      throw new Error(`社保计算失败: ${error.message}`);
    }
  }

  async calculateBatch(employeeIds: string[], periodId: string, calculationDate?: string) {
    try {
      const { data, error } = await supabase
        .rpc('batch_calculate_social_insurance', {
          p_employee_ids: employeeIds,
          p_period_id: periodId,
          p_calculation_date: calculationDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      return {
        batchId: `batch_${Date.now()}`,
        periodId,
        results: data || [],
        summary: {
          totalProcessed: employeeIds.length,
          successCount: (data || []).filter((r: any) => r.status === 'success').length,
          errorCount: (data || []).filter((r: any) => r.status === 'error').length
        }
      };
    } catch (error) {
      console.error('批量社保计算失败:', error);
      throw new Error(`批量社保计算失败: ${error.message}`);
    }
  }

  async validateBase(region: string, insuranceType: string, baseAmount: number, effectiveDate?: string) {
    try {
      const { data, error } = await supabase
        .rpc('validate_insurance_base', {
          p_region: region,
          p_insurance_type: insuranceType,
          p_base: baseAmount,
          p_effective_date: effectiveDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      return {
        isValid: data.valid,
        originalBase: data.base,
        adjustedBase: data.adjusted_base,
        adjustmentReason: data.adjustment_reason,
        limits: {
          minBase: data.min_base,
          maxBase: data.max_base
        }
      };
    } catch (error) {
      console.error('基数验证失败:', error);
      throw new Error(`基数验证失败: ${error.message}`);
    }
  }
}

/**
 * 个税处理器
 */
class PersonalTaxHandler {
  async importTaxData(periodId: string, taxData: any[]) {
    try {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const item of taxData) {
        try {
          // 验证员工存在
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('employee_code', item.employeeCode)
            .single();

          if (empError || !employee) {
            throw new Error(`员工代码不存在: ${item.employeeCode}`);
          }

          // 保存个税数据（这里需要根据实际表结构调整）
          const { error: insertError } = await supabase
            .from('personal_income_tax_calculation_logs')
            .upsert({
              employee_id: employee.id,
              period: periodId,
              taxable_income: item.taxableIncome,
              tax_amount: item.taxAmount,
              deduction_amount: item.deductionAmount || 0,
              calculation_date: new Date().toISOString(),
              calculation_method: 'imported'
            }, {
              onConflict: 'employee_id,period'
            });

          if (insertError) throw insertError;

          results.push({
            employeeId: employee.id,
            employeeName: item.employeeName,
            status: 'success',
            taxAmount: item.taxAmount
          });
          successCount++;

        } catch (error) {
          results.push({
            employeeId: '',
            employeeName: item.employeeName,
            status: 'error',
            message: error.message
          });
          errorCount++;
        }
      }

      return {
        results,
        summary: {
          totalRecords: taxData.length,
          successCount,
          errorCount,
          totalTaxAmount: results
            .filter(r => r.status === 'success')
            .reduce((sum, r) => sum + (r.taxAmount || 0), 0)
        }
      };
    } catch (error) {
      console.error('个税数据导入失败:', error);
      throw new Error(`个税数据导入失败: ${error.message}`);
    }
  }

  async getPeriodTaxSummary(periodId: string) {
    try {
      const { data, error } = await supabase
        .from('personal_income_tax_calculation_logs')
        .select('*')
        .eq('period', periodId);

      if (error) throw error;

      const taxRecords = data || [];
      const totalEmployees = taxRecords.length;
      const totalTaxAmount = taxRecords.reduce((sum, record) => sum + (record.tax_amount || 0), 0);

      return {
        periodId,
        totalEmployees,
        totalTaxAmount,
        avgTaxAmount: totalEmployees > 0 ? Math.round(totalTaxAmount / totalEmployees) : 0,
        maxTaxAmount: taxRecords.length > 0 ? Math.max(...taxRecords.map(r => r.tax_amount || 0)) : 0,
        minTaxAmount: taxRecords.length > 0 ? Math.min(...taxRecords.map(r => r.tax_amount || 0)) : 0
      };
    } catch (error) {
      console.error('获取个税汇总失败:', error);
      throw new Error(`获取个税汇总失败: ${error.message}`);
    }
  }
}

/**
 * 薪资汇总处理器
 */
class PayrollSummaryHandler {
  async generateSummary(periodId: string, options: any = {}) {
    try {
      // 尝试使用数据库汇总函数
      let basicSummary;
      try {
        const { data, error } = await supabase
          .rpc('get_payroll_batch_summary', {
            p_batch_id: periodId
          });

        if (error) throw error;
        basicSummary = data;
      } catch (error) {
        console.warn('数据库汇总函数不可用，使用查询方式:', error.message);
        basicSummary = await this.calculateSummaryFromQuery(periodId);
      }

      // 获取期间信息
      const { data: period } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      // 构建汇总结果
      const summary = {
        periodId,
        periodName: period?.name || `Period ${periodId}`,
        totalEmployees: basicSummary.total_employees || 0,
        totalGrossPay: basicSummary.total_amount || 0,
        totalDeductions: basicSummary.total_deductions || 0,
        totalNetPay: basicSummary.total_net_pay || 0,
        averages: {
          grossPay: basicSummary.total_employees > 0 
            ? Math.round((basicSummary.total_amount || 0) / basicSummary.total_employees) 
            : 0,
          netPay: basicSummary.total_employees > 0 
            ? Math.round((basicSummary.total_net_pay || 0) / basicSummary.total_employees) 
            : 0
        },
        generatedAt: new Date().toISOString(),
        dataSource: 'database_function'
      };

      // 如果需要部门分解
      if (options.includeDepartmentBreakdown) {
        summary.departmentBreakdown = await this.getDepartmentBreakdown(periodId);
      }

      return summary;
    } catch (error) {
      console.error('生成薪资汇总失败:', error);
      throw new Error(`生成薪资汇总失败: ${error.message}`);
    }
  }

  private async calculateSummaryFromQuery(periodId: string) {
    const { data: payrolls, error } = await supabase
      .from('payrolls')
      .select('gross_pay, total_deductions, net_pay')
      .eq('period_id', periodId);

    if (error) throw error;

    const records = payrolls || [];
    return {
      total_employees: records.length,
      total_amount: records.reduce((sum, p) => sum + (p.gross_pay || 0), 0),
      total_deductions: records.reduce((sum, p) => sum + (p.total_deductions || 0), 0),
      total_net_pay: records.reduce((sum, p) => sum + (p.net_pay || 0), 0)
    };
  }

  private async getDepartmentBreakdown(periodId: string) {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          gross_pay,
          net_pay,
          employees!inner(
            departments!inner(id, name)
          )
        `)
        .eq('period_id', periodId);

      if (error) throw error;

      // 按部门分组汇总
      const departmentMap = new Map();
      
      (data || []).forEach(payroll => {
        const dept = payroll.employees?.departments;
        if (dept) {
          const key = dept.id;
          if (!departmentMap.has(key)) {
            departmentMap.set(key, {
              departmentId: dept.id,
              departmentName: dept.name,
              employeeCount: 0,
              totalGrossPay: 0,
              totalNetPay: 0
            });
          }
          
          const summary = departmentMap.get(key);
          summary.employeeCount += 1;
          summary.totalGrossPay += payroll.gross_pay || 0;
          summary.totalNetPay += payroll.net_pay || 0;
        }
      });

      return Array.from(departmentMap.values()).map(dept => ({
        ...dept,
        avgNetPay: dept.employeeCount > 0 ? Math.round(dept.totalNetPay / dept.employeeCount) : 0
      }));
    } catch (error) {
      console.error('获取部门分解失败:', error);
      return [];
    }
  }

  async comparePeriods(currentPeriodId: string, previousPeriodId?: string) {
    try {
      const currentSummary = await this.generateSummary(currentPeriodId);
      
      let previousSummary = null;
      let comparison = null;

      if (previousPeriodId) {
        previousSummary = await this.generateSummary(previousPeriodId);
        
        comparison = {
          employeeChange: {
            value: currentSummary.totalEmployees - previousSummary.totalEmployees,
            percentage: previousSummary.totalEmployees > 0 
              ? ((currentSummary.totalEmployees - previousSummary.totalEmployees) / previousSummary.totalEmployees) * 100
              : 0
          },
          grossPayChange: {
            value: currentSummary.totalGrossPay - previousSummary.totalGrossPay,
            percentage: previousSummary.totalGrossPay > 0 
              ? ((currentSummary.totalGrossPay - previousSummary.totalGrossPay) / previousSummary.totalGrossPay) * 100
              : 0
          },
          netPayChange: {
            value: currentSummary.totalNetPay - previousSummary.totalNetPay,
            percentage: previousSummary.totalNetPay > 0 
              ? ((currentSummary.totalNetPay - previousSummary.totalNetPay) / previousSummary.totalNetPay) * 100
              : 0
          }
        };
      }

      return {
        current: currentSummary,
        previous: previousSummary,
        comparison
      };
    } catch (error) {
      console.error('期间对比失败:', error);
      throw new Error(`期间对比失败: ${error.message}`);
    }
  }
}

/**
 * 主处理函数
 */
Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 只允许POST请求
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only POST method is allowed' 
        }),
        { 
          status: 405, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 解析请求体
    const requestData: PayrollCalculationRequest = await req.json();
    const { action, data, options = {} } = requestData;

    console.log(`[${requestId}] 处理薪资计算请求:`, { action, dataKeys: Object.keys(data || {}) });

    let result: any = null;

    // 根据操作类型分发处理
    switch (action) {
      case 'calculate_social_insurance': {
        const handler = new SocialInsuranceHandler();
        result = await handler.calculateSingle(
          data.employeeId,
          data.periodId,
          data.calculationDate
        );
        break;
      }

      case 'batch_calculate_social_insurance': {
        const handler = new SocialInsuranceHandler();
        result = await handler.calculateBatch(
          data.employeeIds,
          data.periodId,
          data.calculationDate
        );
        break;
      }

      case 'import_tax_data': {
        const handler = new PersonalTaxHandler();
        result = await handler.importTaxData(
          data.periodId,
          data.taxData
        );
        break;
      }

      case 'generate_summary': {
        const handler = new PayrollSummaryHandler();
        result = await handler.generateSummary(
          data.periodId,
          options
        );
        break;
      }

      case 'compare_periods': {
        const handler = new PayrollSummaryHandler();
        result = await handler.comparePeriods(
          data.currentPeriodId,
          data.previousPeriodId
        );
        break;
      }

      case 'validate_base': {
        const handler = new SocialInsuranceHandler();
        result = await handler.validateBase(
          data.region,
          data.insuranceType,
          data.baseAmount,
          data.effectiveDate
        );
        break;
      }

      case 'recalculate_period': {
        // 调用批量重算函数
        const { data: recalcData, error } = await supabase
          .rpc('batch_recalculate_social_insurances', {
            p_pay_period_start: data.periodStart,
            p_pay_period_end: data.periodEnd,
            p_employee_ids: data.employeeIds || null
          });

        if (error) throw error;

        result = {
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          results: recalcData || [],
          summary: {
            totalProcessed: (recalcData || []).length,
            successCount: (recalcData || []).filter((r: any) => r.calculation_status === 'SUCCESS').length,
            errorCount: (recalcData || []).filter((r: any) => r.calculation_status === 'ERROR').length
          }
        };
        break;
      }

      default:
        throw new Error(`不支持的操作类型: ${action}`);
    }

    // 构建响应
    const response: PayrollCalculationResponse = {
      success: true,
      data: result,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version: '2.0'
      }
    };

    console.log(`[${requestId}] 薪资计算完成:`, {
      action,
      duration: response.metadata.duration,
      success: true
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] 薪资计算失败:`, error);

    const errorResponse: PayrollCalculationResponse = {
      success: false,
      error: error.message,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version: '2.0'
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  }
});