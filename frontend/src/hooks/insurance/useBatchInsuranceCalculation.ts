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

// 🚀 优化的计算函数：使用视图预加载数据，避免重复查询
const calculateInsuranceFromViewData = async ({
  employeeId,
  employeeName,
  periodId,
  insuranceData,
  includeOccupationalPension = true
}: {
  employeeId: string;
  employeeName: string;
  periodId: string;
  insuranceData: any[];
  includeOccupationalPension?: boolean;
}) => {
  const result = {
    success: true,
    totalEmployeeAmount: 0,
    totalEmployerAmount: 0,
    details: {} as Record<string, any>,
    errors: [] as string[]
  };

  try {
    // 过滤需要计算的保险类型
    const filteredData = includeOccupationalPension 
      ? insuranceData 
      : insuranceData.filter(item => item.insurance_type_key !== 'occupational_pension');

    // 直接基于视图数据计算每种保险
    for (const item of filteredData) {
      const { 
        insurance_type_key: insuranceKey,
        latest_contribution_base: contributionBase,
        employee_rate: employeeRate,
        employer_rate: employerRate,
        base_floor: baseFloor,
        base_ceiling: baseCeiling
      } = item;

      // 应用基数上下限
      const adjustedBase = Math.max(
        baseFloor || 0,
        Math.min(baseCeiling || 999999, contributionBase || 0)
      );

      // 计算个人和单位金额
      const employeeAmount = Math.round((adjustedBase * (employeeRate || 0)) * 100) / 100;
      const employerAmount = Math.round((adjustedBase * (employerRate || 0)) * 100) / 100;

      // 累加总额
      result.totalEmployeeAmount += employeeAmount;
      result.totalEmployerAmount += employerAmount;

      // 存储详细结果
      result.details[insuranceKey] = {
        employee: {
          success: true,
          amount: employeeAmount,
          contributionBase: adjustedBase,
          rate: employeeRate || 0
        },
        employer: {
          success: true,
          amount: employerAmount,
          contributionBase: adjustedBase,
          rate: employerRate || 0
        }
      };
    }

    // 四舍五入总金额
    result.totalEmployeeAmount = Math.round(result.totalEmployeeAmount * 100) / 100;
    result.totalEmployerAmount = Math.round(result.totalEmployerAmount * 100) / 100;

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Calculation failed');
    return result;
  }
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
    const startTime = performance.now();
    console.log(`🚀 开始批量五险一金计算 - 员工数: ${employeeIds?.length || '全部'}, 期间: ${periodId}`);
    
    setLoading(true);
    setError(null);
    
    const results: BatchInsuranceResult[] = [];

    try {
      // 确保配置已加载
      await loadStandardInsuranceConfigs();

      // Step 2: 🚀 使用优化视图一次性获取所有计算数据 - 大幅性能提升！
      let contributionData: any[] = [];
      
      if (employeeIds && employeeIds.length > 0) {
        // 🔥 对于指定员工列表，使用分批查询避免IN子句过长
        const QUERY_BATCH_SIZE = 50; // Supabase IN子句推荐限制
        
        for (let i = 0; i < employeeIds.length; i += QUERY_BATCH_SIZE) {
          const batch = employeeIds.slice(i, i + QUERY_BATCH_SIZE);
          
          const { data: batchData, error: batchError } = await supabase
            .from('view_employee_contribution_bases_by_period')
            .select(`
              employee_id,
              employee_name,
              insurance_type_key,
              insurance_type_name,
              period_id,
              latest_contribution_base,
              employee_rate,
              employer_rate,
              base_floor,
              base_ceiling
            `)
            .eq('period_id', periodId)
            .in('employee_id', batch)
            .abortSignal(AbortSignal.timeout(15000)); // 缩短单次查询超时
            
          if (batchError) {
            throw new Error(`Failed to fetch contribution data for batch: ${batchError.message}`);
          }
          
          if (batchData) {
            contributionData.push(...batchData);
          }
        }
      } else {
        // 🔥 对于全量查询，使用单次查询 + 优化字段选择
        const { data, error } = await supabase
          .from('view_employee_contribution_bases_by_period')
          .select(`
            employee_id,
            employee_name,
            insurance_type_key,
            insurance_type_name,
            period_id,
            latest_contribution_base,
            employee_rate,
            employer_rate,
            base_floor,
            base_ceiling
          `)
          .eq('period_id', periodId)
          .abortSignal(AbortSignal.timeout(30000));
          
        if (error) {
          throw new Error(`Failed to fetch contribution data: ${error.message}`);
        }
        
        contributionData = data || [];
      }

      if (!contributionData || contributionData.length === 0) {
        throw new Error('No contribution base data found for the specified period');
      }

      // 按员工分组数据，避免重复查询
      const employeeDataMap = new Map<string, any[]>();
      contributionData.forEach(item => {
        const employeeId = item.employee_id;
        if (!employeeDataMap.has(employeeId)) {
          employeeDataMap.set(employeeId, []);
        }
        employeeDataMap.get(employeeId)!.push(item);
      });

      const uniqueEmployees = Array.from(employeeDataMap.keys());
      setProgress({ current: 0, total: uniqueEmployees.length });

      // Step 3: 🚀 优化批量获取payroll_id映射（需要保存数据时使用）
      const payrollIdMap = new Map<string, string>();
      if (saveToDatabase) {
        // 使用批量查询，避免IN子句长度限制
        const targetEmployeeIds = employeeIds && employeeIds.length > 0 
          ? employeeIds 
          : uniqueEmployees;

        // 分批查询payroll映射，避免超过Supabase的IN子句限制
        const PAYROLL_BATCH_SIZE = 100; // Supabase推荐的IN子句最大长度
        
        for (let i = 0; i < targetEmployeeIds.length; i += PAYROLL_BATCH_SIZE) {
          const batch = targetEmployeeIds.slice(i, i + PAYROLL_BATCH_SIZE);
          
          const { data: payrollBatch } = await supabase
            .from('payrolls')
            .select('id, employee_id')
            .eq('period_id', periodId)
            .in('employee_id', batch);
            
          payrollBatch?.forEach(p => payrollIdMap.set(p.employee_id, p.id));
        }
      }

      // Step 4: 分批处理员工，避免一次处理太多导致超时
      const BATCH_SIZE = 5; // 每批处理5个员工
      const allPayrollItems: any[] = [];
      
      for (let batchStart = 0; batchStart < uniqueEmployees.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, uniqueEmployees.length);
        const batch = uniqueEmployees.slice(batchStart, batchEnd);
        
        // 并行计算当前批次的所有员工 (每批5个) - 使用预加载数据
        const batchPromises = batch.map(async (employeeId) => {
          const employeeInsuranceData = employeeDataMap.get(employeeId) || [];
          const employeeName = employeeInsuranceData[0]?.employee_name || 'Unknown';
          const payrollId = payrollIdMap.get(employeeId) || '';

          try {
            // 🚀 使用预加载数据进行本地计算，避免重复查询
            const insuranceResult = await calculateInsuranceFromViewData({
              employeeId,
              employeeName,
              periodId,
              insuranceData: employeeInsuranceData,
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
        setProgress({ current: batchEnd, total: uniqueEmployees.length });
      }

      // Step 5: 🚀 优化批量插入所有 payroll_items（仅在选择保存到数据库时）
      if (saveToDatabase && allPayrollItems.length > 0) {
        console.log(`准备批量插入 ${allPayrollItems.length} 条薪资项目记录`);
        
        // 🔥 优化策略：使用更小的批次 + 并行插入 + 错误重试
        const INSERT_BATCH_SIZE = 200; // 减少批次大小，提高成功率
        const insertPromises: Promise<any>[] = [];
        const maxConcurrentBatches = 3; // 最大并发批次数
        
        // 分组处理批次，限制并发数
        for (let i = 0; i < allPayrollItems.length; i += INSERT_BATCH_SIZE * maxConcurrentBatches) {
          const concurrentBatches: Promise<any>[] = [];
          
          // 创建并发批次
          for (let j = 0; j < maxConcurrentBatches && (i + j * INSERT_BATCH_SIZE) < allPayrollItems.length; j++) {
            const batchStart = i + j * INSERT_BATCH_SIZE;
            const batchEnd = Math.min(batchStart + INSERT_BATCH_SIZE, allPayrollItems.length);
            const insertBatch = allPayrollItems.slice(batchStart, batchEnd);
            
            // 添加重试机制的批量插入
            const insertWithRetry = async (batch: any[], retries = 2): Promise<void> => {
              try {
                const { error: insertError } = await supabase
                  .from('payroll_items')
                  .upsert(batch, {
                    onConflict: 'payroll_id,component_id',
                    ignoreDuplicates: false // 确保更新现有记录
                  });

                if (insertError) {
                  throw insertError;
                }
                
                console.log(`✅ 成功插入批次: ${batch.length} 条记录`);
              } catch (error) {
                console.error(`❌ 批次插入失败 (剩余重试: ${retries}):`, error);
                
                if (retries > 0) {
                  // 指数退避重试
                  await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
                  return insertWithRetry(batch, retries - 1);
                }
                
                // 最终失败，记录错误但不中断整个流程
                console.error('批次插入最终失败，跳过此批次:', error);
              }
            };
            
            concurrentBatches.push(insertWithRetry(insertBatch));
          }
          
          // 等待当前并发批次完成
          await Promise.all(concurrentBatches);
        }
        
        console.log(`🎉 批量插入完成，共处理 ${allPayrollItems.length} 条记录`);
      }

      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);
      const avgTimePerEmployee = uniqueEmployees.length > 0 ? Math.round(totalTime / uniqueEmployees.length) : 0;
      
      console.log(`🎉 批量五险一金计算完成！`);
      console.log(`📊 性能统计:`);
      console.log(`  - 总耗时: ${totalTime}ms`);
      console.log(`  - 处理员工数: ${uniqueEmployees.length}`);
      console.log(`  - 平均每员工: ${avgTimePerEmployee}ms`);
      console.log(`  - 成功率: ${results.filter(r => r.success).length}/${results.length}`);
      if (saveToDatabase) {
        console.log(`  - 插入记录数: ${allPayrollItems.length}`);
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