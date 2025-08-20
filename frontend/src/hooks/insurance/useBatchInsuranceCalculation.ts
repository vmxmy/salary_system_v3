import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAllInsuranceCalculation } from './useAllInsuranceCalculation';
import { loadStandardInsuranceConfigs, INSURANCE_TYPE_CONFIGS } from './core/insuranceDataService';

export interface BatchInsuranceResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  message: string;
  totalEmployeeAmount: number;
  totalEmployerAmount: number;
  itemsInserted: number;
  componentDetails?: {
    insuranceKey: string;
    insuranceTypeName: string;
    employeeComponent?: {
      componentId: string;
      componentName: string;
      amount: number;
    };
    employerComponent?: {
      componentId: string;
      componentName: string;
      amount: number;
    };
  }[];
}

interface BatchInsuranceParams {
  periodId: string;
  employeeIds?: string[];
  includeOccupationalPension?: boolean;
  saveToDatabase?: boolean; // 新增：是否将计算结果保存到数据库
}

// 获取标准组件名称 - 使用数据库中的标准格式
const getStandardComponentName = (insuranceKey: string, isEmployer: boolean): string | null => {
  const config = INSURANCE_TYPE_CONFIGS.find(c => c.key === insuranceKey);
  if (!config) return null;
  
  // 优先使用从数据库加载的标准名称
  if (isEmployer) {
    return config.standardNameEmployer || `${config.name}单位应缴费额`;
  }
  return config.standardNameEmployee || `${config.name}个人应缴费额`;
};

// 获取标准组件ID - 直接使用数据库中的组件ID
const getStandardComponentId = (insuranceKey: string, isEmployer: boolean): string | null => {
  const config = INSURANCE_TYPE_CONFIGS.find(c => c.key === insuranceKey);
  if (!config) return null;
  
  return isEmployer ? config.componentIdEmployer || null : config.componentIdEmployee || null;
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

  // 初始化时加载标准配置（只执行一次）
  useEffect(() => {
    loadStandardInsuranceConfigs().catch(err => {
      console.error('Failed to initialize insurance configs:', err);
    });
  }, []); // 空依赖数组，只执行一次

  const calculateBatchInsurance = useCallback(async ({
    periodId,
    employeeIds,
    includeOccupationalPension = true,
    saveToDatabase = false
  }: BatchInsuranceParams): Promise<BatchInsuranceResult[]> => {
    setLoading(true);
    setError(null);
    
    const results: BatchInsuranceResult[] = [];

    try {
      // 确保配置已加载
      await loadStandardInsuranceConfigs();

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
              includeOccupationalPension,
              saveToDatabase: saveToDatabase
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

            // 收集此员工的所有 payroll_items 和组件详情
            const payrollItems: any[] = [];
            const componentDetails: {
              insuranceKey: string;
              insuranceTypeName: string;
              employeeComponent?: {
                componentId: string;
                componentName: string;
                amount: number;
              };
              employerComponent?: {
                componentId: string;
                componentName: string;
                amount: number;
              };
            }[] = [];
            
            // 处理每种保险类型
            for (const [insuranceKey, insuranceData] of Object.entries(insuranceResult.details)) {
              const config = INSURANCE_TYPE_CONFIGS.find(c => c.key === insuranceKey);
              const insuranceTypeName = config?.name || insuranceKey;
              
              const componentDetail: typeof componentDetails[0] = {
                insuranceKey,
                insuranceTypeName
              };

              // 处理个人部分
              if (insuranceData.employee && insuranceData.employee.success && insuranceData.employee.amount >= 0) {
                const componentId = getStandardComponentId(insuranceKey, false);
                const componentName = getStandardComponentName(insuranceKey, false);
                
                if (componentId && componentName) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: insuranceData.employee.amount,
                    notes: `自动计算 - ${componentName}`,
                    period_id: periodId
                  });

                  componentDetail.employeeComponent = {
                    componentId,
                    componentName,
                    amount: insuranceData.employee.amount
                  };
                }
              }

              // 处理单位部分
              if (insuranceData.employer && insuranceData.employer.success && insuranceData.employer.amount >= 0) {
                const componentId = getStandardComponentId(insuranceKey, true);
                const componentName = getStandardComponentName(insuranceKey, true);
                
                if (componentId && componentName) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: insuranceData.employer.amount,
                    notes: `自动计算 - ${componentName}`,
                    period_id: periodId
                  });

                  componentDetail.employerComponent = {
                    componentId,
                    componentName,
                    amount: insuranceData.employer.amount
                  };
                }
              }

              // 只有在有组件时才添加到详情中
              if (componentDetail.employeeComponent || componentDetail.employerComponent) {
                componentDetails.push(componentDetail);
              }
            }

            // 如果选择保存到数据库，将此员工的 items 添加到批次中
            if (saveToDatabase) {
              allPayrollItems.push(...payrollItems);
            }

            return {
              employeeId,
              employeeName,
              success: true,
              message: 'Insurance calculated successfully',
              totalEmployeeAmount: insuranceResult.totalEmployeeAmount,
              totalEmployerAmount: insuranceResult.totalEmployerAmount,
              itemsInserted: payrollItems.length,
              componentDetails
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

      // Step 4: 批量插入所有 payroll_items（仅在选择保存到数据库时）
      if (saveToDatabase && allPayrollItems.length > 0) {
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