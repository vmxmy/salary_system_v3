import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { ModernButton } from '@/components/common/ModernButton';
import { cn } from '@/lib/utils';
import { formatCurrency, formatMonth } from '@/lib/format';
import { PayrollCreationService } from '@/services/payroll-creation.service';
import { payrollStatisticsService } from '@/services/payroll-statistics.service';

enum CreationMode {
  COPY = 'copy',
  IMPORT = 'import', 
  MANUAL = 'manual',
  TEMPLATE = 'template'
}

interface ConfirmationStepProps {
  wizardState: any;
  onConfirm: (result?: { success: boolean; periodId?: string; error?: string }) => void;
}

export function ConfirmationStep({ wizardState, onConfirm }: ConfirmationStepProps) {
  const { t } = useTranslation(['payroll', 'common']);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    employeeCount: 0,
    totalAmount: 0,
    avgAmount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 处理最终确认
  const handleConfirm = useCallback(async () => {
    if (isCreating) return;
    
    const confirmationId = `confirmation_${Date.now()}`;
    
    setIsConfirmed(true);
    setIsCreating(true);
    setCreationError(null);

    try {
      console.group(`🎯 [${confirmationId}] 开始确认创建薪资记录`);
      console.log('📋 向导状态详情:', {
        mode: wizardState.mode,
        payrollPeriod: wizardState.payrollPeriod,
        payDate: wizardState.payDate,
        selectedEmployeeIds: wizardState.selectedEmployees,
        sourceData: wizardState.sourceData
      });
      
      // 步骤1: 解析薪资期间
      console.log('⚡ 步骤1: 解析薪资期间');
      const [year, month] = wizardState.payrollPeriod.split('-').map(Number);
      console.log('📅 解析结果:', { year, month });
      
      // 步骤2: 构建薪资期间日期范围
      console.log('⚡ 步骤2: 构建薪资期间日期范围');
      const payPeriodStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const payPeriodEnd = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      console.log('📆 目标期间:', { payPeriodStart, payPeriodEnd, lastDay });
      
      // 步骤3: 构建源期间日期（如果是复制模式）
      let sourcePeriodStart: string | undefined;
      let sourcePeriodEnd: string | undefined;
      
      if (wizardState.mode === CreationMode.COPY && wizardState.sourceData?.sourceMonth) {
        console.log('⚡ 步骤3: 构建源期间日期（复制模式）');
        const [srcYear, srcMonth] = wizardState.sourceData.sourceMonth.split('-').map(Number);
        sourcePeriodStart = `${srcYear}-${srcMonth.toString().padStart(2, '0')}-01`;
        const srcLastDay = new Date(srcYear, srcMonth, 0).getDate();
        sourcePeriodEnd = `${srcYear}-${srcMonth.toString().padStart(2, '0')}-${srcLastDay.toString().padStart(2, '0')}`;
        console.log('📆 源期间:', { 
          sourceYear: srcYear, 
          sourceMonth: srcMonth, 
          sourcePeriodStart, 
          sourcePeriodEnd, 
          srcLastDay 
        });
      } else {
        console.log('⚡ 步骤3: 跳过源期间构建（非复制模式）');
      }
      
      // 步骤4: 构建创建参数
      console.log('⚡ 步骤4: 构建创建参数');
      const createParams = {
        payPeriodStart,
        payPeriodEnd,
        payDate: wizardState.payDate,
        sourcePeriodStart,
        sourcePeriodEnd,
        selectedEmployeeIds: wizardState.selectedEmployees?.length > 0 
          ? wizardState.selectedEmployees 
          : undefined,
        createdBy: undefined // TODO: 从认证上下文获取当前用户ID
      };

      console.log('📤 最终创建参数:', {
        ...createParams,
        selectedEmployeeCount: createParams.selectedEmployeeIds?.length || '全部员工',
        isCopyMode: !!(sourcePeriodStart && sourcePeriodEnd)
      });

      // 步骤5: 调用创建服务
      console.log('⚡ 步骤5: 调用PayrollCreationService.createPayrollBatch');
      const result = await PayrollCreationService.createPayrollBatch(createParams);
      
      console.log('📊 服务调用完成，结果:', {
        success: result.success,
        error_code: result.error_code,
        error_message: result.error_message,
        hasSummary: !!result.summary
      });

      // 步骤6: 处理结果
      console.log('⚡ 步骤6: 处理创建结果');
      if (result.success) {
        console.log('🎉 薪资记录创建成功!');
        console.log('📈 成功摘要:', result.summary);
        
        onConfirm({
          success: true,
          periodId: `${payPeriodStart}_${payPeriodEnd}`, // 使用日期范围作为标识
        });
      } else {
        console.error('❌ 薪资记录创建失败');
        console.error('🔍 失败详情:', {
          error_code: result.error_code,
          error_message: result.error_message
        });
        
        setCreationError(result.error_message || '创建薪资记录失败');
        setIsCreating(false);
        setIsConfirmed(false);
        
        onConfirm({
          success: false,
          error: result.error_message || '创建薪资记录失败'
        });
      }
      
      console.groupEnd();
    } catch (error) {
      console.error(`💥 [${confirmationId}] 确认创建过程发生异常:`);
      console.error('🔍 异常详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.groupEnd();
      
      const errorMessage = error instanceof Error ? error.message : '网络错误，请重试';
      setCreationError(errorMessage);
      setIsCreating(false);
      setIsConfirmed(false);
      
      onConfirm({
        success: false,
        error: errorMessage
      });
    }
  }, [wizardState, onConfirm, isCreating]);

  // 加载统计信息
  useEffect(() => {
    const loadStatistics = async () => {
      console.log('🔍 ConfirmationStep 加载统计信息，wizardState:', {
        mode: wizardState.mode,
        selectedEmployees: wizardState.selectedEmployees,
        selectedEmployeesLength: wizardState.selectedEmployees?.length,
        sourceDataSelectedEmployeeIds: wizardState.sourceData?.selectedEmployeeIds,
        sourceDataSelectedLength: wizardState.sourceData?.selectedEmployeeIds?.length,
        sourceDataStatistics: wizardState.sourceData?.statistics
      });
      
      setLoadingStats(true);
      try {
        // 如果是复制模式且有源数据，使用源数据计算
        if (wizardState.mode === CreationMode.COPY && wizardState.sourceData) {
          // 获取选中的员工ID列表
          const selectedEmployeeIds = wizardState.selectedEmployees?.length > 0 
            ? wizardState.selectedEmployees 
            : wizardState.sourceData.selectedEmployeeIds || [];
          
          console.log('📋 复制模式统计计算:', {
            wizardStateSelectedEmployees: wizardState.selectedEmployees,
            sourceDataSelectedEmployeeIds: wizardState.sourceData.selectedEmployeeIds,
            finalSelectedEmployeeIds: selectedEmployeeIds,
            payrollDataLength: wizardState.sourceData.payrollData?.length
          });
          
          // 注意：payrollData中的字段是employee_id，不是id
          const selectedData = wizardState.sourceData.payrollData?.filter((emp: any) => 
            selectedEmployeeIds.includes(emp.employee_id)
          ) || [];
          
          console.log('📊 过滤后的选中数据:', {
            selectedDataLength: selectedData.length,
            sampleData: selectedData.slice(0, 2)
          });
          
          setStatistics({
            employeeCount: selectedData.length,
            totalAmount: selectedData.reduce((sum: number, emp: any) => sum + (emp.net_pay || 0), 0),
            avgAmount: selectedData.length > 0 
              ? selectedData.reduce((sum: number, emp: any) => sum + (emp.net_pay || 0), 0) / selectedData.length 
              : 0
          });
        } else {
          // 其他模式，从数据库获取预估数据
          // 首先检查是否有选中的员工
          const employeeIds = wizardState.selectedEmployees?.length > 0 
            ? wizardState.selectedEmployees 
            : wizardState.sourceData?.selectedEmployeeIds;
            
          if (employeeIds && employeeIds.length > 0) {
            const estimation = await payrollStatisticsService.getEmployeesPayrollEstimation(
              employeeIds
            );
            setStatistics({
              employeeCount: estimation.totalEmployees,
              totalAmount: estimation.totalEstimatedAmount,
              avgAmount: estimation.avgEstimatedAmount
            });
          } else {
            // 获取所有员工的预估
            const estimation = await payrollStatisticsService.getPayrollEstimation();
            setStatistics({
              employeeCount: estimation.totalEmployees,
              totalAmount: estimation.totalEstimatedAmount,
              avgAmount: estimation.avgEstimatedAmount
            });
          }
        }
      } catch (error) {
        console.error('Failed to load statistics:', error);
        // 如果加载失败，使用基础数据
        setStatistics({
          employeeCount: wizardState.selectedEmployees?.length || 0,
          totalAmount: 0,
          avgAmount: 0
        });
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatistics();
  }, [wizardState]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          确认创建薪资周期
        </h2>
        <p className="text-base-content/60">
          请仔细检查以下信息，确认无误后点击创建按钮
        </p>
      </div>

      {/* 创建摘要 */}
      <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <div className="card-body">
          <h3 className="card-title text-primary mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            创建摘要
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h4 className="font-bold text-base-content">基本信息</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">创建方式:</span>
                  <span className="font-medium">
                    {wizardState.mode === CreationMode.COPY && '复制上月数据'}
                    {wizardState.mode === CreationMode.IMPORT && 'Excel导入'}
                    {wizardState.mode === CreationMode.MANUAL && '手动创建'}
                    {wizardState.mode === CreationMode.TEMPLATE && '使用模板'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">薪资期间:</span>
                  <span className="font-medium">{formatMonth(wizardState.payrollPeriod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">支付日期:</span>
                  <span className="font-medium">{wizardState.payDate}</span>
                </div>
                {wizardState.mode === CreationMode.COPY && wizardState.sourceData && (
                  <div className="flex justify-between">
                    <span className="text-base-content/60">数据源:</span>
                    <span className="font-medium">{formatMonth(wizardState.sourceData.sourceMonth)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 统计信息 */}
            <div className="space-y-4">
              <h4 className="font-bold text-base-content">统计信息</h4>
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="ml-2 text-sm text-base-content/60">加载统计数据...</span>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">员工数量:</span>
                    <span className="font-medium text-primary">
                      {statistics.employeeCount} 人
                      {process.env.NODE_ENV === 'development' && (
                        <span className="text-xs text-gray-500 ml-2">
                          (调试: {statistics.employeeCount})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">预估总额:</span>
                    <span className="font-medium text-success">
                      {statistics.totalAmount > 0 ? formatCurrency(statistics.totalAmount) : '待计算'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">平均工资:</span>
                    <span className="font-medium text-info">
                      {statistics.avgAmount > 0 ? formatCurrency(statistics.avgAmount) : '待计算'}
                    </span>
                  </div>
                  {statistics.totalAmount === 0 && (
                    <div className="text-xs text-warning">
                      * 预估金额基于员工最近一次的薪资记录
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 操作清单 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            系统将执行的操作
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-base-content">创建新的薪资周期</p>
                <p className="text-sm text-base-content/60">
                  为 {formatMonth(wizardState.payrollPeriod)} 创建薪资周期记录
                </p>
              </div>
            </div>

            {wizardState.mode === CreationMode.COPY && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-base-content">复制员工薪资数据</p>
                  <p className="text-sm text-base-content/60">
                    从 {formatMonth(wizardState.sourceData?.sourceMonth)} 复制 {
                      wizardState.selectedEmployees?.length || 
                      wizardState.sourceData?.selectedEmployeeIds?.length || 
                      0
                    } 名员工的薪资结构
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {wizardState.mode === CreationMode.COPY ? '3' : '2'}
              </div>
              <div>
                <p className="font-medium text-base-content">初始化薪资计算</p>
                <p className="text-sm text-base-content/60">
                  根据最新的税率和社保基数更新薪资计算参数
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {wizardState.mode === CreationMode.COPY ? '4' : '3'}
              </div>
              <div>
                <p className="font-medium text-base-content">设置初始状态</p>
                <p className="text-sm text-base-content/60">
                  所有薪资记录将设置为"草稿"状态，等待进一步编辑和计算
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {creationError && (
        <div className="alert alert-error">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="font-bold">创建失败</h4>
            <p className="text-sm mt-1">{creationError}</p>
          </div>
        </div>
      )}

      {/* 重要提醒 */}
      <div className="alert alert-warning">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h4 className="font-bold">重要提醒</h4>
          <ul className="text-sm mt-2 space-y-1">
            <li>• 创建完成后，系统将生成初始薪资记录，您可以在薪资管理页面进行进一步编辑</li>
            <li>• 所有薪资数据将基于最新的税率和社保政策重新计算</li>
            <li>• 请确保所选员工信息和薪资期间正确，创建后修改会比较复杂</li>
            {wizardState.mode === CreationMode.COPY && (
              <li>• 复制的数据仅包含薪资结构，具体金额需要重新计算确认</li>
            )}
          </ul>
        </div>
      </div>

      {/* 最终确认 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-bold text-base-content mb-4">
                确认创建薪资周期
              </h3>
              <p className="text-base-content/60 mb-6">
                点击下方按钮将开始创建 <span className="font-medium text-primary">{formatMonth(wizardState.payrollPeriod)}</span> 的薪资周期，
                涉及 <span className="font-medium text-primary">{statistics.employeeCount}</span> 名员工。
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <ModernButton
                  variant="primary"
                  size="lg"
                  onClick={handleConfirm}
                  disabled={isCreating}
                  className="min-w-[160px]"
                >
                  {isCreating ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      创建中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {creationError ? '重试创建' : '确认创建'}
                    </>
                  )}
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}