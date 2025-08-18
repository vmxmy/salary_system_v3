import React, { useState, useEffect } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { usePayrollExport } from '@/hooks/payroll/usePayrollExport';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { InfoIcon, XCircleIcon, RefreshIcon } from '@/components/common/Icons';
import { MonthPicker } from '@/components/common/MonthPicker';
import { DataGroupSelectorWithControls } from '@/components/common/DataGroupSelectorWithControls';
import { useAvailablePayrollMonths, type AvailablePayrollMonth } from '@/hooks/payroll';

interface HistoryDataExporterProps {
  onClose?: () => void;
}

export const HistoryDataExporter: React.FC<HistoryDataExporterProps> = ({ onClose }) => {
  const { messages, removeToast, toast } = useToast();
  const { exportToExcel, loading } = usePayrollExport();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<ImportDataGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 获取可用的薪资月份数据
  const { data: availableMonths, isLoading } = useAvailablePayrollMonths(true);


  // 设置默认选中最近的月份
  useEffect(() => {
    if (availableMonths && availableMonths.length > 0) {
      // 选择最近的有数据的月份
      setSelectedMonth(availableMonths[0].month);
    }
  }, [availableMonths]);

  // 处理数据组选择
  const handleGroupToggle = (group: ImportDataGroup) => {
    setSelectedGroups(prev => {
      if (prev.includes(group)) {
        return prev.filter(g => g !== group);
      }
      return [...prev, group];
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const allBasicGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    if (selectedGroups.length === allBasicGroups.length && 
        allBasicGroups.every(group => selectedGroups.includes(group))) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(allBasicGroups);
    }
  };

  // 导出数据
  const handleExport = async () => {
    if (!selectedMonth) {
      toast.warning('请选择薪资月份');
      return;
    }
    
    if (selectedGroups.length === 0) {
      toast.warning('请至少选择一个数据类型');
      return;
    }

    setError(null);

    try {
      // 查找选中月份的数据
      const monthData = availableMonths?.find(m => m.month === selectedMonth);
      
      const exportConfig = {
        periodId: monthData?.periodId, // 使用实际的周期ID
        periodMonth: selectedMonth, // 传递选中的月份
        selectedDataGroups: selectedGroups, // 传递所有选中的数据组
        includeDetails: selectedGroups.includes(ImportDataGroup.EARNINGS) || 
                       selectedGroups.includes(ImportDataGroup.CONTRIBUTION_BASES),
        includeInsurance: selectedGroups.includes(ImportDataGroup.CONTRIBUTION_BASES),
        includeJobAssignments: selectedGroups.includes(ImportDataGroup.JOB_ASSIGNMENT),
        includeCategoryAssignments: selectedGroups.includes(ImportDataGroup.CATEGORY_ASSIGNMENT),
        filename: `薪资数据_${selectedMonth}.xlsx`
      };

      await exportToExcel(exportConfig);
      toast.success('数据导出成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
      toast.error(err instanceof Error ? err.message : '导出失败');
    }
  };


  return (
    <>
      <ToastContainer messages={messages} onClose={removeToast} />
      <div className="w-full">
        {/* 移除内部标题，因为外层已经有"导出配置"标题 */}

        {/* 薪资周期选择 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-base-content">薪资周期</h3>
                <p className="text-sm text-base-content/60">选择要导出数据的薪资周期</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-base-200/50 rounded-xl border border-base-300/30 mt-4">
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              showDataIndicators={true}
              availableMonths={availableMonths}
              onlyShowMonthsWithData={true}
              className="w-full"
              placeholder="请选择有薪资数据的月份"
              disabled={isLoading}
            />
          </div>
          
          {selectedMonth && availableMonths && (
            <div className="mt-2 text-sm text-base-content/70">
              {(() => {
                const monthData = availableMonths.find(m => m.month === selectedMonth);
                if (monthData) {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success badge-sm">
                        {monthData.payrollCount} 条薪资记录
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        {/* 数据类型选择 */}
        <DataGroupSelectorWithControls
          selectedGroups={selectedGroups}
          onGroupToggle={handleGroupToggle}
          onSelectAll={handleSelectAll}
          title="数据类型选择"
          subtitle="选择要导出的数据类型（可多选）"
          iconColor="accent"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />

        {/* 导出信息摘要 */}
        {selectedMonth && selectedGroups.length > 0 && (
          <div className="alert alert-info mb-4">
            <InfoIcon className="w-6 h-6" />
            <div>
              <div className="font-semibold">准备导出</div>
              <div className="text-sm">
                月份: {(() => {
                  const [year, month] = selectedMonth.split('-');
                  return `${year}年${month}月`;
                })()}
                <br />
                数据类型: {selectedGroups.length} 个
                {(() => {
                  if (availableMonths) {
                    const monthData = availableMonths.find(m => m.month === selectedMonth);
                    return monthData ? ` (${monthData.payrollCount} 条记录)` : '';
                  }
                  return '';
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-4">
            <XCircleIcon className="w-6 h-6" />
            <span>{error}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 mt-6">
          {onClose && (
            <button
              className="btn btn-ghost"
              onClick={onClose}
            >
              取消
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading.isExporting || !selectedMonth || selectedGroups.length === 0}
          >
            {loading.isExporting && <span className="loading loading-spinner"></span>}
            {loading.isExporting ? '导出中...' : '导出数据'}
          </button>
        </div>

        {/* 使用提示 */}
        <div className="divider">使用提示</div>
        <div className="prose prose-sm max-w-none">
          <ul className="space-y-1">
            <li>导出的数据格式与导入模板格式一致</li>
            <li>可以将导出的数据作为模板，修改后重新导入</li>
            <li>导出的Excel文件包含选中的多个数据类型工作表</li>
            <li>数据按照薪资周期自动筛选</li>
            <li>导出的文件可以直接用于数据备份或分析</li>
          </ul>
        </div>
      </div>
    </>
  );
};