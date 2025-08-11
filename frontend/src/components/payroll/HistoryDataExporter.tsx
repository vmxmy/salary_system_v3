import React, { useState, useEffect } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { PayrollExportService } from '@/services/payroll-export.service';
import type { PayrollPeriod, ExportConfig } from '@/services/payroll-export.service';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { InfoIcon, XCircleIcon, RefreshIcon, MoneyIcon, BankIcon, PeopleIcon, BriefcaseIcon } from '@/components/common/Icons';

interface HistoryDataExporterProps {
  onClose?: () => void;
}

export const HistoryDataExporter: React.FC<HistoryDataExporterProps> = ({ onClose }) => {
  const { messages, removeToast, toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<ImportDataGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  // 加载可用的薪资周期
  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const availablePeriods = await PayrollExportService.getAvailablePeriods();
      setPeriods(availablePeriods);
      
      // 默认选择最近的周期
      if (availablePeriods.length > 0) {
        setSelectedPeriod(availablePeriods[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载薪资周期失败');
    } finally {
      setLoading(false);
    }
  };

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
    if (!selectedPeriod) {
      toast.warning('请选择薪资周期');
      return;
    }
    
    if (selectedGroups.length === 0) {
      toast.warning('请至少选择一个数据类型');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const config: ExportConfig = {
        payPeriod: {
          start: new Date(selectedPeriod.pay_period_start),
          end: new Date(selectedPeriod.pay_period_end)
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

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
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
            <span className="label-text font-semibold">选择薪资周期</span>
            <button
              className="btn btn-xs btn-ghost"
              onClick={loadPeriods}
              disabled={loading}
            >
              <RefreshIcon className="w-4 h-4 mr-1" />
              刷新
            </button>
          </label>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : periods.length === 0 ? (
            <div className="alert">
              <InfoIcon className="w-6 h-6" />
              <span>暂无可用的薪资周期</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {periods.map(period => (
                <label
                  key={period.id}
                  className={`card bordered cursor-pointer transition-all ${
                    selectedPeriod?.id === period.id
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/50'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        className="radio radio-primary"
                        checked={selectedPeriod?.id === period.id}
                        onChange={() => setSelectedPeriod(period)}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">
                          {formatDate(period.pay_period_start)} - {formatDate(period.pay_period_end)}
                        </div>
                        <div className="text-sm text-base-content/70">
                          <span className="mr-4">员工数: {period.employee_count}</span>
                          <span>总金额: {formatAmount(period.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
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
        {selectedPeriod && selectedGroups.length > 0 && (
          <div className="alert alert-info mb-4">
            <InfoIcon className="w-6 h-6" />
            <div>
              <div className="font-semibold">准备导出</div>
              <div className="text-sm">
                周期: {formatDate(selectedPeriod.pay_period_start)} - {formatDate(selectedPeriod.pay_period_end)}
                <br />
                数据类型: {selectedGroups.length} 个 ({selectedPeriod.employee_count} 名员工)
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
            disabled={exporting || !selectedPeriod || selectedGroups.length === 0}
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