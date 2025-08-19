import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAllInsuranceCalculation } from './useAllInsuranceCalculation';

export interface BatchInsuranceResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  message: string;
  totalEmployeeAmount: number;
  totalEmployerAmount: number;
  itemsInserted: number;
}

interface BatchInsuranceParams {
  periodId: string;
  employeeIds?: string[];
  includeOccupationalPension?: boolean;
}

// 组件名称映射规则
const getComponentName = (insuranceTypeName: string, isEmployer: boolean): string => {
  // 使用9月的简化命名规则
  if (isEmployer) {
    return `${insuranceTypeName}(单位)`;
  }
  return insuranceTypeName;
};

/**
 * 批量保险计算 Hook
 * 基于核心组件重构
 */
export const useBatchInsuranceCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { calculateAllInsurance } = useAllInsuranceCalculation();

  const calculateBatchInsurance = useCallback(async ({
    periodId,
    employeeIds,
    includeOccupationalPension = true
  }: BatchInsuranceParams): Promise<BatchInsuranceResult[]> => {
    setLoading(true);
    setError(null);
    
    const results: BatchInsuranceResult[] = [];

    try {
      // Step 1: 预加载所有 salary_components 避免重复查询
      const { data: components, error: componentError } = await supabase
        .from('salary_components')
        .select('id, name, category')
        .in('category', ['personal_insurance', 'employer_insurance']);

      if (componentError) {
        throw new Error(`Failed to fetch salary components: ${componentError.message}`);
      }

      // 创建组件名称到ID的映射
      const componentMap = new Map<string, string>();
      components?.forEach(comp => {
        componentMap.set(`${comp.category}:${comp.name}`, comp.id);
      });

      // Step 2: 获取需要计算的员工列表 - 添加超时控制
      let query = supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          employees (
            id,
            employee_name
          )
        `)
        .eq('period_id', periodId)
        .abortSignal(AbortSignal.timeout(30000)); // 30秒超时

      if (employeeIds && employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      }

      const { data: payrolls, error: payrollError } = await query;

      if (payrollError) {
        throw new Error(`Failed to fetch payrolls: ${payrollError.message}`);
      }

      if (!payrolls || payrolls.length === 0) {
        throw new Error('No payroll records found for the specified period');
      }

      setProgress({ current: 0, total: payrolls.length });

      // Step 3: 分批处理员工，避免一次处理太多导致超时
      const BATCH_SIZE = 10; // 每批处理10个员工
      const allPayrollItems: any[] = [];
      
      for (let batchStart = 0; batchStart < payrolls.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, payrolls.length);
        const batch = payrolls.slice(batchStart, batchEnd);
        
        // 并行计算当前批次的所有员工
        const batchPromises = batch.map(async (payroll) => {
          const employeeId = payroll.employee_id;
          const employeeName = payroll.employees?.employee_name || 'Unknown';
          const payrollId = payroll.id;

          try {
            // 使用优化后的综合计算
            const insuranceResult = await calculateAllInsurance({
              employeeId,
              periodId,
              includeOccupationalPension
            });

            if (!insuranceResult.success) {
              return {
                employeeId,
                employeeName,
                success: false,
                message: insuranceResult.errors.join('; '),
                totalEmployeeAmount: 0,
                totalEmployerAmount: 0,
                itemsInserted: 0
              };
            }

            // 收集此员工的所有 payroll_items
            const payrollItems: any[] = [];
            
            // 处理每种保险类型
            for (const [insuranceKey, insuranceData] of Object.entries(insuranceResult.details)) {
              // 处理个人部分
              if (insuranceData.employee && insuranceData.employee.success && insuranceData.employee.amount > 0) {
                const componentName = getComponentName(
                  insuranceData.employee.details?.insuranceTypeName || insuranceKey,
                  false
                );
                
                const componentId = componentMap.get(`personal_insurance:${componentName}`);
                if (componentId) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: insuranceData.employee.amount,
                    notes: `自动计算 - ${componentName}(个人)`,
                    period_id: periodId
                  });
                }
              }

              // 处理单位部分
              if (insuranceData.employer && insuranceData.employer.success && insuranceData.employer.amount > 0) {
                const componentName = getComponentName(
                  insuranceData.employer.details?.insuranceTypeName || insuranceKey,
                  true
                );
                
                const componentId = componentMap.get(`employer_insurance:${componentName}`);
                if (componentId) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: insuranceData.employer.amount,
                    notes: `自动计算 - ${componentName}(单位)`,
                    period_id: periodId
                  });
                }
              }
            }

            // 将此员工的 items 添加到批次中
            allPayrollItems.push(...payrollItems);

            return {
              employeeId,
              employeeName,
              success: true,
              message: 'Insurance calculated successfully',
              totalEmployeeAmount: insuranceResult.totalEmployeeAmount,
              totalEmployerAmount: insuranceResult.totalEmployerAmount,
              itemsInserted: payrollItems.length
            };

          } catch (calcError) {
            const errorMessage = calcError instanceof Error ? calcError.message : 'Unknown error';
            return {
              employeeId,
              employeeName,
              success: false,
              message: errorMessage,
              totalEmployeeAmount: 0,
              totalEmployerAmount: 0,
              itemsInserted: 0
            };
          }
        });

        // 等待当前批次完成
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 更新进度
        setProgress({ current: batchEnd, total: payrolls.length });
      }

      // Step 4: 批量插入所有 payroll_items
      if (allPayrollItems.length > 0) {
        // 分批插入，每批最多500条记录
        const INSERT_BATCH_SIZE = 500;
        for (let i = 0; i < allPayrollItems.length; i += INSERT_BATCH_SIZE) {
          const insertBatch = allPayrollItems.slice(i, i + INSERT_BATCH_SIZE);
          
          const { error: insertError } = await supabase
            .from('payroll_items')
            .upsert(insertBatch, {
              onConflict: 'payroll_id,component_id'
            });

          if (insertError) {
            console.error('Batch insert error:', insertError);
            // 继续处理，不中断整个流程
          }
        }
      }

      setLoading(false);
      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [calculateAllInsurance]);

  return {
    calculateBatchInsurance,
    loading,
    error,
    progress
  };
};