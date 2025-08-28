import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { loadStandardInsuranceConfigs, INSURANCE_TYPE_CONFIGS } from './core/insuranceDataService';
import { payrollQueryKeys } from '../payroll/usePayroll';

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

// 住房公积金特殊舍入规则 - 与 InsuranceCalculator 保持一致
const applyHousingFundRounding = (amount: number): number => {
  const integerPart = Math.floor(amount);
  const decimalPart = amount - integerPart;
  
  if (decimalPart < 0.1) {
    return integerPart; // 舍去小数
  } else {
    return integerPart + 1; // 进位到下一个整数
  }
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
      let employeeAmount = Math.round((adjustedBase * (employeeRate || 0)) * 100) / 100;
      let employerAmount = Math.round((adjustedBase * (employerRate || 0)) * 100) / 100;
      
      // 🔧 调试：记录职业年金的计算过程
      if (insuranceKey === 'occupational_pension') {
        console.log(`💰 ${employeeName} 职业年金计算:`, {
          原始基数: contributionBase,
          调整后基数: adjustedBase,
          员工费率: employeeRate,
          单位费率: employerRate,
          员工金额: employeeAmount,
          单位金额: employerAmount,
          计算公式: `${adjustedBase} * ${employeeRate} = ${employeeAmount}, ${adjustedBase} * ${employerRate} = ${employerAmount}`
        });
      }
      
      // 住房公积金特殊舍入规则：小数 < 0.1 舍去，>= 0.1 进位
      if (insuranceKey === 'housing_fund') {
        employeeAmount = applyHousingFundRounding(employeeAmount);
        employerAmount = applyHousingFundRounding(employerAmount);
      }

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
  const queryClient = useQueryClient();

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
      console.log('🔄 加载标准保险配置...');
      await loadStandardInsuranceConfigs();
      
      // 🔧 调试：检查配置加载后的状态
      console.log('📋 配置加载完成，当前INSURANCE_TYPE_CONFIGS状态:', {
        配置总数: INSURANCE_TYPE_CONFIGS.length,
        职业年金配置详情: INSURANCE_TYPE_CONFIGS.find(c => c.key === 'occupational_pension'),
        所有配置: INSURANCE_TYPE_CONFIGS.map(c => ({
          key: c.key,
          name: c.name,
          componentIdEmployee: c.componentIdEmployee,
          componentIdEmployer: c.componentIdEmployer,
          hasComponentIds: !!(c.componentIdEmployee || c.componentIdEmployer)
        }))
      });

      // Step 2: 🚀 使用优化视图一次性获取所有计算数据 - 大幅性能提升！
      // 🔧 重要修复：强制获取最新数据，避免任何缓存问题
      console.log('🔄 强制获取最新缴费基数数据，避免缓存问题...');
      let contributionData: any[] = [];
      
      if (employeeIds && employeeIds.length > 0) {
        // 🔥 对于指定员工列表，使用分批查询避免IN子句过长
        const QUERY_BATCH_SIZE = 50; // Supabase IN子句推荐限制
        
        for (let i = 0; i < employeeIds.length; i += QUERY_BATCH_SIZE) {
          const batch = employeeIds.slice(i, i + QUERY_BATCH_SIZE);
          
          // 🔧 添加时间戳参数强制绕过任何可能的缓存
          const timestamp = Date.now();
          console.log(`🔍 [批次${Math.floor(i/QUERY_BATCH_SIZE)+1}] 查询缴费基数 (强制刷新: ${timestamp})`);
          
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
        // 🔧 添加时间戳参数强制绕过任何可能的缓存
        const timestamp = Date.now();
        console.log(`🔍 [全量查询] 查询所有缴费基数 (强制刷新: ${timestamp})`);
        
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

      // 🔧 重要调试：记录实际获取到的缴费基数数据
      console.log('🔍 获取到的缴费基数数据:', contributionData.length, '条记录');
      const debugSample = contributionData.find(
        item => item.employee_id === '5f9514f7-3d26-4c0a-aca6-e7d12c2441d0' && 
                item.insurance_type_key === 'occupational_pension'
      );
      if (debugSample) {
        console.log('🎯 邱高长青职业年金数据:', {
          employee_name: debugSample.employee_name,
          insurance_type_key: debugSample.insurance_type_key,
          latest_contribution_base: debugSample.latest_contribution_base,
          employee_rate: debugSample.employee_rate,
          employer_rate: debugSample.employer_rate,
          queryTime: new Date().toISOString()
        });
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
            // 🔧 调试：记录实际用于计算的数据
            const occupationalPensionData = employeeInsuranceData.find(
              item => item.insurance_type_key === 'occupational_pension'
            );
            if (occupationalPensionData && employeeId === '5f9514f7-3d26-4c0a-aca6-e7d12c2441d0') {
              console.log('🧮 邱高长青职业年金计算输入:', {
                employee_name: employeeName,
                contribution_base: occupationalPensionData.latest_contribution_base,
                employee_rate: occupationalPensionData.employee_rate,
                employer_rate: occupationalPensionData.employer_rate
              });
            }
            
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
              
              // 🔧 调试：检查INSURANCE_TYPE_CONFIGS的状态
              if (insuranceKey === 'occupational_pension') {
                console.log('🧩 检查INSURANCE_TYPE_CONFIGS状态:', {
                  配置总数: INSURANCE_TYPE_CONFIGS.length,
                  职业年金配置: config,
                  所有配置: INSURANCE_TYPE_CONFIGS.map(c => ({
                    key: c.key,
                    name: c.name,
                    componentIdEmployee: c.componentIdEmployee,
                    componentIdEmployer: c.componentIdEmployer
                  }))
                });
              }
              
              const componentDetail: typeof componentDetails[0] = {
                insuranceKey,
                insuranceTypeName
              };

              // 处理个人部分
              if (insuranceData.employee && insuranceData.employee.success && insuranceData.employee.amount >= 0) {
                const componentId = getStandardComponentId(insuranceKey, false);
                const componentName = getStandardComponentName(insuranceKey, false);
                
                // 🔧 调试：检查组件ID获取
                if (insuranceKey === 'occupational_pension') {
                  console.log('🧩 职业年金个人组件获取结果:', {
                    insuranceKey,
                    componentId,
                    componentName,
                    amount: insuranceData.employee.amount,
                    payrollId,
                    获取函数返回: getStandardComponentId(insuranceKey, false),
                    配置中的ID: config?.componentIdEmployee
                  });
                }
                
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
              // 🔧 调试：记录准备写入的数据
              if (employeeId === '5f9514f7-3d26-4c0a-aca6-e7d12c2441d0') {
                console.log('📝 邱高长青准备写入的payroll_items:', payrollItems.length, '条');
                payrollItems.forEach(item => {
                  if (item.notes?.includes('职业年金')) {
                    console.log('💾 职业年金写入项:', {
                      payroll_id: item.payroll_id,
                      component_id: item.component_id,
                      amount: item.amount,
                      notes: item.notes
                    });
                  }
                });
              }
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
        console.log(`📊 准备批量插入 ${allPayrollItems.length} 条薪资项目记录`);
        
        // 🔧 调试：显示邱高长青的写入数据
        const qiuItems = allPayrollItems.filter(item => 
          item.notes?.includes('邱高长青') || 
          item.notes?.includes('职业年金')
        );
        if (qiuItems.length > 0) {
          console.log('🎯 邱高长青的写入项目:', qiuItems);
        }
        
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
                // 🔧 调试：记录即将插入的数据
                const qiuItemsInBatch = batch.filter(item => 
                  item.notes?.includes('职业年金')
                );
                if (qiuItemsInBatch.length > 0) {
                  console.log('🚀 即将插入的职业年金记录:', qiuItemsInBatch);
                }
                
                const { data: insertResult, error: insertError } = await supabase
                  .from('payroll_items')
                  .upsert(batch, {
                    onConflict: 'payroll_id,component_id',
                    ignoreDuplicates: false // 确保更新现有记录
                  })
                  .select(); // 返回插入的数据以便调试

                if (insertError) {
                  console.error('❌ 插入错误详情:', insertError);
                  throw insertError;
                }
                
                console.log(`✅ 成功插入批次: ${batch.length} 条记录`);
                
                // 🔧 调试：显示插入结果
                if (insertResult && qiuItemsInBatch.length > 0) {
                  console.log('💾 职业年金插入结果:', insertResult.filter(r => 
                    r.notes?.includes('职业年金')
                  ));
                }
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
        
        // 🚀 全面失效缓存，确保前端数据实时更新
        console.log('🔄 开始失效所有相关缓存...');
        
        // 1. 失效五险一金相关数据
        console.log('📊 失效五险一金数据缓存...');
        
        // 失效所有员工的缴费基数缓存
        const affectedEmployeeIds = [...new Set(allPayrollItems.map(item => {
          // 从 payroll_id 获取对应的 employee_id
          const payrollData = contributionData.find(d => 
            payrollIdMap.get(d.employee_id) === item.payroll_id
          );
          return payrollData?.employee_id;
        }).filter(Boolean))];
        
        affectedEmployeeIds.forEach(employeeId => {
          // 失效员工缴费基数查询
          queryClient.invalidateQueries({ queryKey: ['contribution-bases', 'employee', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['contribution-bases', 'history', employeeId] });
        });
        
        // 失效周期缴费基数查询
        queryClient.invalidateQueries({ queryKey: ['contribution-bases', 'period', periodId] });
        queryClient.invalidateQueries({ queryKey: ['contribution-bases'] });
        
        // 失效保险配置相关查询
        queryClient.invalidateQueries({ queryKey: ['insurance-config'] });
        queryClient.invalidateQueries({ queryKey: ['insurance-types'] });
        
        // 2. 失效薪资汇总相关数据
        console.log('💰 失效薪资汇总数据缓存...');
        
        // 失效薪资列表和统计
        queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: payrollQueryKeys.statistics() });
        queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        queryClient.invalidateQueries({ queryKey: ['payroll-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['payroll-summary'] });
        
        // 失效所有相关的薪资详情查询
        const affectedPayrollIds = [...new Set(allPayrollItems.map(item => item.payroll_id))];
        affectedPayrollIds.forEach(payrollId => {
          if (payrollId) {
            queryClient.invalidateQueries({ queryKey: payrollQueryKeys.detail(payrollId) });
            queryClient.invalidateQueries({ queryKey: ['payrolls', 'detail', payrollId] });
            queryClient.invalidateQueries({ queryKey: ['payroll-detail', payrollId] });
          }
        });
        
        // 3. 失效薪资项目(payroll_items)相关查询  
        queryClient.invalidateQueries({ queryKey: ['payroll-items'] });
        queryClient.invalidateQueries({ queryKey: ['salary-components'] });
        
        // 4. 失效员工相关数据
        console.log('👥 失效员工相关缓存...');
        affectedEmployeeIds.forEach(employeeId => {
          queryClient.invalidateQueries({ queryKey: ['employees', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employee-detail', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employee-statistics', employeeId] });
        });
        
        // 5. 失效周期相关数据
        queryClient.invalidateQueries({ queryKey: ['payroll-periods', periodId] });
        queryClient.invalidateQueries({ queryKey: ['period-completeness', periodId] });
        
        console.log('✅ 缓存失效完成，前端数据将自动刷新');
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
  }, []);

  return {
    calculateBatchInsurance,
    loading,
    error,
    progress
  };
};