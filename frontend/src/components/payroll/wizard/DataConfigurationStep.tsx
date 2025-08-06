import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { MonthPicker } from '@/components/common/MonthPicker';
import { cn } from '@/lib/utils';
import { getCurrentYearMonth, getMonthDateRange, formatMonth } from '@/lib/dateUtils';
import { format } from 'date-fns';

enum CreationMode {
  COPY = 'copy',
  IMPORT = 'import', 
  MANUAL = 'manual',
  TEMPLATE = 'template'
}

interface DataConfigurationStepProps {
  mode: CreationMode;
  payrollPeriod: string;
  payDate: string;
  onPayrollPeriodChange: (period: string) => void;
  onPayDateChange: (date: string) => void;
  sourceData?: any;
}

export function DataConfigurationStep({ 
  mode, 
  payrollPeriod, 
  payDate, 
  onPayrollPeriodChange, 
  onPayDateChange,
  sourceData 
}: DataConfigurationStepProps) {
  const { t } = useTranslation(['payroll', 'common']);

  // 初始化默认值
  useEffect(() => {
    if (!payrollPeriod) {
      // 默认设置为当前月份
      onPayrollPeriodChange(getCurrentYearMonth());
    }
    if (!payDate) {
      // 默认设置为当前日期
      onPayDateChange(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [payrollPeriod, payDate, onPayrollPeriodChange, onPayDateChange]);

  // 根据薪资期间自动调整支付日期的最小值
  const getMinPayDate = useCallback(() => {
    if (!payrollPeriod) return '';
    const { startDate } = getMonthDateRange(payrollPeriod);
    return startDate;
  }, [payrollPeriod]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          配置薪资周期参数
        </h2>
        <p className="text-base-content/60">
          设置新薪资周期的基本信息和计算参数
        </p>
      </div>

      {/* 源数据信息 */}
      {sourceData && mode === CreationMode.COPY && (
        <div className="alert alert-info">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold">复制源信息</h4>
            <p className="text-sm">
              将基于 {formatMonth(sourceData.sourceMonth)} 的 {sourceData.statistics?.totalEmployees} 名员工薪资数据创建新周期
            </p>
          </div>
        </div>
      )}

      {/* 基本配置 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            基本信息
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 薪资期间 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">薪资期间</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <MonthPicker
                value={payrollPeriod}
                onChange={onPayrollPeriodChange}
                placeholder="选择薪资月份"
                size="md"
                showDataIndicators={true}
                disableMonthsWithData={true}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  选择此次薪资计算的月份
                </span>
              </label>
            </div>

            {/* 支付日期 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">支付日期</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => onPayDateChange(e.target.value)}
                min={getMinPayDate()}
                className={cn(
                  "input input-bordered w-full",
                  "focus:input-primary transition-colors"
                )}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  实际支付工资的日期
                </span>
              </label>
            </div>
          </div>

          {/* 期间详情 */}
          {payrollPeriod && (
            <div className="mt-6 p-4 bg-base-200/30 rounded-lg">
              <h4 className="font-medium mb-2">期间详情</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">薪资月份:</span>
                  <div className="font-medium">{formatMonth(payrollPeriod)}</div>
                </div>
                <div>
                  <span className="text-base-content/60">期间开始:</span>
                  <div className="font-medium">{getMonthDateRange(payrollPeriod).startDate}</div>
                </div>
                <div>
                  <span className="text-base-content/60">期间结束:</span>
                  <div className="font-medium">{getMonthDateRange(payrollPeriod).endDate}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 高级设置 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            高级设置
          </h3>
          
          <div className="space-y-4">
            {/* 计算选项 */}
            <div>
              <h4 className="font-medium mb-3">计算选项</h4>
              <div className="space-y-2">
                <label className="cursor-pointer label justify-start gap-3">
                  <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  <div>
                    <span className="label-text font-medium">自动计算五险一金</span>
                    <div className="label-text-alt text-base-content/60">根据最新费率和缴费基数自动计算</div>
                  </div>
                </label>
                
                <label className="cursor-pointer label justify-start gap-3">
                  <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  <div>
                    <span className="label-text font-medium">自动计算个人所得税</span>
                    <div className="label-text-alt text-base-content/60">根据最新税率表计算个税</div>
                  </div>
                </label>
                
                <label className="cursor-pointer label justify-start gap-3">
                  <input type="checkbox" className="checkbox checkbox-primary" />
                  <div>
                    <span className="label-text font-medium">包含年终奖计算</span>
                    <div className="label-text-alt text-base-content/60">如果本月有年终奖发放</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 数据处理选项 */}
            {mode === CreationMode.COPY && (
              <div>
                <h4 className="font-medium mb-3">数据处理选项</h4>
                <div className="space-y-2">
                  <label className="cursor-pointer label justify-start gap-3">
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                    <div>
                      <span className="label-text font-medium">保留员工基本信息</span>
                      <div className="label-text-alt text-base-content/60">复制员工的部门、职位等基本信息</div>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer label justify-start gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary" />
                    <div>
                      <span className="label-text font-medium">保留固定薪资项目</span>
                      <div className="label-text-alt text-base-content/60">复制基本工资、固定津贴等固定项目</div>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer label justify-start gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary" />
                    <div>
                      <span className="label-text font-medium">重置浮动薪资项目</span>
                      <div className="label-text-alt text-base-content/60">将奖金、加班费等浮动项目重置为0</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 通知设置 */}
            <div>
              <h4 className="font-medium mb-3">通知设置</h4>
              <div className="space-y-2">
                <label className="cursor-pointer label justify-start gap-3">
                  <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  <div>
                    <span className="label-text font-medium">创建完成通知</span>
                    <div className="label-text-alt text-base-content/60">薪资周期创建完成后发送通知</div>
                  </div>
                </label>
                
                <label className="cursor-pointer label justify-start gap-3">
                  <input type="checkbox" className="checkbox checkbox-primary" />
                  <div>
                    <span className="label-text font-medium">异常数据提醒</span>
                    <div className="label-text-alt text-base-content/60">发现异常薪资数据时发送提醒</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预览摘要 */}
      <div className="card bg-primary/5 border border-primary/20">
        <div className="card-body">
          <h3 className="card-title text-lg text-primary mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            配置摘要
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-base-content/60">创建方式:</span>
              <div className="font-medium">
                {mode === CreationMode.COPY && '复制上月数据'}
                {mode === CreationMode.IMPORT && 'Excel导入'}
                {mode === CreationMode.MANUAL && '手动创建'}
                {mode === CreationMode.TEMPLATE && '使用模板'}
              </div>
            </div>
            <div>
              <span className="text-base-content/60">薪资期间:</span>
              <div className="font-medium">{payrollPeriod ? formatMonth(payrollPeriod) : '未设置'}</div>
            </div>
            <div>
              <span className="text-base-content/60">支付日期:</span>
              <div className="font-medium">{payDate || '未设置'}</div>
            </div>
            {sourceData?.statistics && (
              <div>
                <span className="text-base-content/60">预计员工数:</span>
                <div className="font-medium">{sourceData.statistics.totalEmployees} 人</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}