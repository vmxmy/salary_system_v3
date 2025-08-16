import React, { useState } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { useExcelTemplate } from '@/hooks/payroll';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { InfoIcon, XCircleIcon } from '@/components/common/Icons';
import { MonthPicker } from '@/components/common/MonthPicker';
import { DataGroupSelector } from '@/components/common/DataGroupSelector';
import { DataGroupSelectAllController } from '@/components/common/DataGroupSelectAllController';
import { useAvailablePayrollMonths } from '@/hooks/payroll';

interface TemplateDownloaderProps {
  onClose?: () => void;
  defaultPeriod?: {
    year: number;
    month: number;
  };
}

export const TemplateDownloader: React.FC<TemplateDownloaderProps> = ({
  onClose,
  defaultPeriod
}) => {
  const { generating, error, downloadTemplate } = useExcelTemplate();
  const { messages, removeToast, toast } = useToast();
  
  // 状态管理
  const [selectedGroups, setSelectedGroups] = useState<ImportDataGroup[]>([]);
  const [includeExample, setIncludeExample] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (defaultPeriod) {
      return `${defaultPeriod.year}-${String(defaultPeriod.month).padStart(2, '0')}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // 获取可用的薪资月份数据
  const { data: availableMonths } = useAvailablePayrollMonths(true);

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
    const allGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    const isAllSelected = selectedGroups.length === allGroups.length && 
      allGroups.every(group => selectedGroups.includes(group));
    
    setSelectedGroups(isAllSelected ? [] : allGroups);
  };

  // 下载模板
  const handleDownload = async () => {
    if (selectedGroups.length === 0) {
      toast.warning('请至少选择一个数据组');
      return;
    }

    // 解析选中的月份
    const [year, month] = selectedMonth.split('-').map(Number);
    
    await downloadTemplate({
      groups: selectedGroups,
      includeExample,
      payPeriod: { year, month }
    });

    // 显示成功提示
    if (!error) {
      toast.success('模板下载成功！');
    }
  };

  return (
    <>
      <ToastContainer messages={messages} onClose={removeToast} />
      <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">
            下载薪资导入模板
            {onClose && (
              <button
                className="btn btn-sm btn-circle btn-ghost ml-auto"
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </h2>

        {/* 薪资期间选择 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">薪资期间</span>
            <span className="label-text-alt text-base-content/60">选择有薪资数据的月份</span>
          </label>
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            showDataIndicators={true}
            availableMonths={availableMonths}
            onlyShowMonthsWithData={true}
            className="w-full"
            placeholder="请选择有薪资数据的月份"
          />
        </div>

        {/* 数据组选择 */}
        <div className="mb-6">
          <div className="form-control mb-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="label-text font-semibold">选择要导入的数据类型</span>
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

        {/* 模板选项 */}
        <div className="form-control mb-6">
          <label className="label cursor-pointer">
            <span className="label-text">包含示例数据</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={includeExample}
              onChange={(e) => setIncludeExample(e.target.checked)}
            />
          </label>
          <p className="text-sm text-base-content/70 ml-2">
            在模板中包含3行示例数据，帮助理解数据格式
          </p>
        </div>

        {/* 选择摘要 */}
        {selectedGroups.length > 0 && (
          <div className="alert alert-info mb-4">
            <InfoIcon className="w-6 h-6" />
            <div>
              <div className="font-semibold">已选择 {selectedGroups.length} 个数据组</div>
              <div className="text-sm">
                模板将包含 {selectedGroups.length} 个工作表，每个数据组对应一个工作表
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
            onClick={handleDownload}
            disabled={generating || selectedGroups.length === 0}
          >
            {generating && <span className="loading loading-spinner"></span>}
            {generating ? '生成中...' : '下载模板'}
          </button>
        </div>

        {/* 使用提示 */}
        <div className="divider">使用提示</div>
        <div className="prose prose-sm max-w-none">
          <ul className="space-y-1">
            <li>下载模板后，请按照表头格式填写数据</li>
            <li>员工标识（编号/姓名/身份证号）至少填写一个</li>
            <li>日期格式请使用 YYYY-MM-DD</li>
            <li>数字直接填写，不要包含货币符号</li>
            <li>填写完成后，使用导入功能上传Excel文件</li>
          </ul>
        </div>
        </div>
      </div>
    </>
  );
};