import React, { useState, useEffect } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { usePayrollExport } from '@/hooks/payroll/usePayrollExport';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { InfoIcon, XCircleIcon, RefreshIcon } from '@/components/common/Icons';
import { MonthPicker } from '@/components/common/MonthPicker';
import { DataGroupSelector } from '@/components/common/DataGroupSelector';
import { DataGroupSelectAllController } from '@/components/common/DataGroupSelectAllController';
import { useAvailablePayrollMonths, type AvailablePayrollMonth } from '@/hooks/useAvailablePayrollMonths';

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
        includeDetails: selectedGroups.includes(ImportDataGroup.EARNINGS) || 
                       selectedGroups.includes(ImportDataGroup.CONTRIBUTION_BASES),
        includeInsurance: selectedGroups.includes(ImportDataGroup.CONTRIBUTION_BASES),
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
      <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">
            导出历史薪资数据
            {onClose && (
              <button
                className="btn btn-sm btn-circle btn-ghost ml-auto"
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </h2>

        {/* 薪资周期选择 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">选择要导出的薪资月份</span>
            <span className="label-text-alt text-base-content/60">显示有薪资数据的月份</span>
          </label>
          
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
        <div className="mb-6">
          <div className="form-control mb-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="label-text font-semibold">选择数据类型</span>
              <DataGroupSelectAllController
                selectedGroups={selectedGroups}
                onSelectAll={handleSelectAll}
              />
            </div>
          </div>
          
          <DataGroupSelector
            selectedGroups={selectedGroups}
            onGroupToggle={handleGroupToggle}
            multiple={true}
            className="mt-0"
          />
        </div>

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
        <div className="card-actions justify-end">
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
      </div>
    </>
  );
};