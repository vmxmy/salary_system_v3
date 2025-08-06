import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrolls } from '@/hooks/payroll';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ModernButton } from '@/components/common/ModernButton';
import { MonthPicker } from '@/components/common/MonthPicker';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { getMonthDateRange, getPreviousMonth } from '@/lib/dateUtils';

enum CreationMode {
  COPY = 'copy',
  IMPORT = 'import', 
  MANUAL = 'manual',
  TEMPLATE = 'template'
}

interface DataSourceStepProps {
  mode: CreationMode;
  sourceData: any;
  onSourceDataChange: (sourceData: any) => void;
}

export function DataSourceStep({ mode, sourceData, onSourceDataChange }: DataSourceStepProps) {
  const { t } = useTranslation(['payroll', 'common']);

  switch (mode) {
    case CreationMode.COPY:
      return (
        <CopyModeStep 
          sourceData={sourceData}
          onSourceDataChange={onSourceDataChange}
        />
      );
    case CreationMode.IMPORT:
      return (
        <ImportModeStep
          sourceData={sourceData}
          onSourceDataChange={onSourceDataChange}
        />
      );
    case CreationMode.MANUAL:
      return (
        <ManualModeStep
          sourceData={sourceData}
          onSourceDataChange={onSourceDataChange}
        />
      );
    case CreationMode.TEMPLATE:
      return (
        <TemplateModeStep
          sourceData={sourceData}
          onSourceDataChange={onSourceDataChange}
        />
      );
    default:
      return null;
  }
}

// 复制模式步骤
function CopyModeStep({ sourceData, onSourceDataChange }: { sourceData: any; onSourceDataChange: (data: any) => void }) {
  const { t } = useTranslation(['payroll', 'common']);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // 默认选择上个月
    return getPreviousMonth();
  });

  // 获取选中月份的薪资数据
  const monthDateRange = getMonthDateRange(selectedMonth);
  const { data: payrollData, isLoading } = usePayrolls({
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
    page: 1,
    pageSize: 1000 // 获取所有数据
  });

  // 当数据加载完成时，更新源数据
  useEffect(() => {
    if (payrollData?.data && payrollData.data.length > 0) {
      onSourceDataChange({
        type: 'copy',
        sourceMonth: selectedMonth,
        totalRecords: payrollData.total,
        payrollData: payrollData.data,
        statistics: {
          totalEmployees: payrollData.data.length,
          totalGrossPay: payrollData.data.reduce((sum, item) => sum + (item.gross_pay || 0), 0),
          totalNetPay: payrollData.data.reduce((sum, item) => sum + (item.net_pay || 0), 0),
          avgSalary: payrollData.data.length > 0 
            ? payrollData.data.reduce((sum, item) => sum + (item.net_pay || 0), 0) / payrollData.data.length 
            : 0
        }
      });
    } else if (!isLoading) {
      onSourceDataChange(null);
    }
  }, [payrollData, selectedMonth, onSourceDataChange, isLoading]);

  const handleMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t('payroll:modes.copy.title')}
        </h2>
        <p className="text-base-content/60">
          选择要复制的源薪资周期，系统将基于该周期的数据创建新的薪资记录
        </p>
      </div>

      {/* 月份选择 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            选择源薪资周期
          </h3>
          
          <div className="max-w-md">
            <label className="label">
              <span className="label-text font-medium">薪资月份</span>
            </label>
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              placeholder="选择要复制的月份"
              size="md"
              showDataIndicators={true}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                建议选择最近的已完成薪资周期
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 数据预览 */}
      {isLoading && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <LoadingScreen message="正在加载薪资数据..." />
          </div>
        </div>
      )}

      {!isLoading && payrollData?.data && payrollData.data.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              数据预览 - {formatMonth(selectedMonth)}
            </h3>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat bg-primary/5 rounded-lg border border-primary/20">
                <div className="stat-title text-primary">员工总数</div>
                <div className="stat-value text-primary">{sourceData?.statistics?.totalEmployees || 0}</div>
                <div className="stat-desc">条薪资记录</div>
              </div>
              <div className="stat bg-success/5 rounded-lg border border-success/20">
                <div className="stat-title text-success">应发总额</div>
                <div className="stat-value text-success text-lg">
                  {formatCurrency(sourceData?.statistics?.totalGrossPay || 0)}
                </div>
                <div className="stat-desc">含所有收入项</div>
              </div>
              <div className="stat bg-info/5 rounded-lg border border-info/20">
                <div className="stat-title text-info">实发总额</div>
                <div className="stat-value text-info text-lg">
                  {formatCurrency(sourceData?.statistics?.totalNetPay || 0)}
                </div>
                <div className="stat-desc">扣除后金额</div>
              </div>
              <div className="stat bg-warning/5 rounded-lg border border-warning/20">
                <div className="stat-title text-warning">平均实发</div>
                <div className="stat-value text-warning text-lg">
                  {formatCurrency(sourceData?.statistics?.avgSalary || 0)}
                </div>
                <div className="stat-desc">每人平均</div>
              </div>
            </div>

            {/* 数据样例 */}
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>员工姓名</th>
                    <th>身份证号</th>
                    <th>应发工资</th>
                    <th>实发工资</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.data.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee?.full_name || '未知'}</td>
                      <td className="font-mono text-xs">{item.employee?.id_number || '-'}</td>
                      <td className="font-mono text-success">{formatCurrency(item.gross_pay)}</td>
                      <td className="font-mono text-primary">{formatCurrency(item.net_pay)}</td>
                      <td>
                        <div className={cn(
                          "badge badge-sm",
                          item.status === 'paid' ? "badge-success" : "badge-warning"
                        )}>
                          {item.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payrollData.data.length > 5 && (
                <div className="text-center py-2 text-sm text-base-content/60">
                  ... 还有 {payrollData.data.length - 5} 条记录
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div className="alert alert-info">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-bold">复制说明</h4>
                <p className="text-sm">
                  将复制员工的基本薪资结构和组件配置，但金额会根据最新的薪资标准重新计算。
                  复制完成后，您可以在下一步调整具体的薪资参数。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (!payrollData?.data || payrollData.data.length === 0) && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-base-content mb-2">
              选中月份暂无薪资数据
            </h3>
            <p className="text-base-content/60 mb-4">
              {formatMonth(selectedMonth)} 还没有薪资记录，请选择其他月份或改用其他创建方式。
            </p>
            <div className="flex justify-center gap-3">
              <ModernButton
                variant="secondary"
                size="sm"
                onClick={() => setSelectedMonth(getPreviousMonth())}
              >
                选择上月
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 导入模式步骤 - 占位符
function ImportModeStep({ sourceData, onSourceDataChange }: { sourceData: any; onSourceDataChange: (data: any) => void }) {
  const { t } = useTranslation(['payroll', 'common']);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t('payroll:modes.import.title')}
        </h2>
        <p className="text-base-content/60">
          从Excel文件导入薪资数据 - 开发中
        </p>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-medium">功能开发中</h3>
          <p className="text-base-content/60">Excel导入功能正在开发中，敬请期待</p>
        </div>
      </div>
    </div>
  );
}

// 手动模式步骤 - 占位符
function ManualModeStep({ sourceData, onSourceDataChange }: { sourceData: any; onSourceDataChange: (data: any) => void }) {
  const { t } = useTranslation(['payroll', 'common']);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t('payroll:modes.manual.title')}
        </h2>
        <p className="text-base-content/60">
          手动创建薪资记录 - 开发中
        </p>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-medium">功能开发中</h3>
          <p className="text-base-content/60">手动创建功能正在开发中，敬请期待</p>
        </div>
      </div>
    </div>
  );
}

// 模板模式步骤 - 占位符
function TemplateModeStep({ sourceData, onSourceDataChange }: { sourceData: any; onSourceDataChange: (data: any) => void }) {
  const { t } = useTranslation(['payroll', 'common']);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t('payroll:modes.template.title')}
        </h2>
        <p className="text-base-content/60">
          使用薪资模板创建 - 开发中
        </p>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-medium">功能开发中</h3>
          <p className="text-base-content/60">模板功能正在开发中，敬请期待</p>
        </div>
      </div>
    </div>
  );
}