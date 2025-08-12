import React, { useState, useEffect } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { PayrollExportService } from '@/services/payroll-export.service';
import type { PayrollPeriod, ExportConfig } from '@/services/payroll-export.service';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { InfoIcon, XCircleIcon, RefreshIcon, MoneyIcon, BankIcon, PeopleIcon, BriefcaseIcon } from '@/components/common/Icons';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useAvailablePayrollMonths, type AvailablePayrollMonth } from '@/hooks/useAvailablePayrollMonths';

interface HistoryDataExporterProps {
  onClose?: () => void;
}

export const HistoryDataExporter: React.FC<HistoryDataExporterProps> = ({ onClose }) => {
  const { messages, removeToast, toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<ImportDataGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 获取可用的薪资月份数据
  const { data: availableMonths, isLoading } = useAvailablePayrollMonths(true);

  // 数据组选项
  const dataGroupOptions = [
    {
      value: ImportDataGroup.EARNINGS,
      label: '收入数据',
      description: '所有收入项目的历史数据',
      icon: MoneyIcon
    },
    {
      value: ImportDataGroup.CONTRIBUTION_BASES,
      label: '缴费基数',
      description: '各类保险和公积金基数',
      icon: BankIcon
    },
    {
      value: ImportDataGroup.CATEGORY_ASSIGNMENT,
      label: '人员类别',
      description: '员工类别分配历史',
      icon: PeopleIcon
    },
    {
      value: ImportDataGroup.JOB_ASSIGNMENT,
      label: '职务信息',
      description: '部门和职位分配历史',
      icon: BriefcaseIcon
    }
  ];

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
    if (selectedGroups.length === dataGroupOptions.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(dataGroupOptions.map(opt => opt.value));
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

    setExporting(true);
    setError(null);

    try {
      // 解析选中的月份
      const [year, month] = selectedMonth.split('-').map(Number);
      
      // 获取该月份的第一天和最后一天
      // 注意：JavaScript Date构造函数中月份是从0开始的
      const startDate = new Date(year, month - 1, 1); // month-1 因为JS月份从0开始
      const endDate = new Date(year, month, 0); // 下个月的第0天 = 本月最后一天
      
      const config: ExportConfig = {
        payPeriod: {
          start: startDate,
          end: endDate
        },
        dataGroups: selectedGroups,
        includeHeaders: true
      };

      await PayrollExportService.exportPayrollData(config);
      toast.success('数据导出成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
      toast.error(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
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
            className="w-full"
            placeholder="请选择要导出的月份"
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
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">选择要导出的数据类型</span>
            <button
              className="btn btn-xs btn-ghost"
              onClick={handleSelectAll}
            >
              {selectedGroups.length === dataGroupOptions.length ? '取消全选' : '全选'}
            </button>
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataGroupOptions.map(option => (
              <div
                key={option.value}
                className={`card bordered cursor-pointer transition-all ${
                  selectedGroups.includes(option.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-base-300 hover:border-primary/50'
                }`}
                onClick={() => handleGroupToggle(option.value)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mt-1"
                      checked={selectedGroups.includes(option.value)}
                      onChange={() => {}}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <option.icon className="text-2xl" />
                        <h3 className="font-semibold">{option.label}</h3>
                      </div>
                      <p className="text-sm text-base-content/70 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            disabled={exporting || !selectedMonth || selectedGroups.length === 0}
          >
            {exporting && <span className="loading loading-spinner"></span>}
            {exporting ? '导出中...' : '导出数据'}
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