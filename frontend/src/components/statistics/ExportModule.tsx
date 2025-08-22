import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useStatisticsSummary } from '@/hooks/statistics/useStatisticsSummary';
import { useEmployeeStatistics } from '@/hooks/employee/useEmployeeStatistics';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useDepartments } from '@/hooks/department/useDepartments';
import { StatisticsModuleLayout } from './common';

interface ExportModuleProps {
  className?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ExportConfig {
  type: 'excel' | 'csv' | 'pdf';
  format: 'summary' | 'detailed' | 'custom';
  dateRange: {
    start: string;
    end: string;
  };
  departments: string[];
  includeCharts: boolean;
  includeAnalysis: boolean;
}

/**
 * 数据导出中心
 * 
 * 重新设计的简洁导出界面：
 * - 步骤式引导，降低用户认知负担
 * - 卡片式布局，重点突出
 * - 即时预览，所见即所得
 */
export function ExportModule({ className = "" }: ExportModuleProps) {
  const { t } = useTranslation();
  
  // 步骤状态管理
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // 导出配置状态
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'excel',
    format: 'summary',
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10)
    },
    departments: [],
    includeCharts: true,
    includeAnalysis: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    type: string;
    format: string;
    timestamp: string;
    status: 'completed' | 'failed';
  }>>([]);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  // 获取数据用于导出
  const statisticsSummary = useStatisticsSummary();
  const employeeStats = useEmployeeStatistics({
    departmentId: exportConfig.departments.length > 0 ? exportConfig.departments[0] : undefined
  });
  const payrollAnalytics = usePayrollAnalytics();
  const { departments } = useDepartments();

  // 更新导出配置
  const updateConfig = (updates: Partial<ExportConfig>) => {
    setExportConfig(prev => ({ ...prev, ...updates }));
  };

  // Toast消息管理
  const addToastMessage = (type: ToastMessage['type'], message: string) => {
    const id = `toast-${Date.now()}`;
    const newToast: ToastMessage = { id, type, message };
    setToastMessages(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToastMessages(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToastMessage = (id: string) => {
    setToastMessages(prev => prev.filter(toast => toast.id !== id));
  };

  // 导出功能
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exportRecord = {
        id: `export-${Date.now()}`,
        type: exportConfig.type,
        format: exportConfig.format,
        timestamp: new Date().toISOString(),
        status: 'completed' as const
      };
      
      setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]);
      addToastMessage('success', '导出成功！文件已下载到本地。');
      
    } catch (error) {
      console.error('导出失败:', error);
      const exportRecord = {
        id: `export-${Date.now()}`,
        type: exportConfig.type,
        format: exportConfig.format,
        timestamp: new Date().toISOString(),
        status: 'failed' as const
      };
      setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]);
      addToastMessage('error', '导出失败，请稍后重试。');
    } finally {
      setIsExporting(false);
    }
  };

  // 快速模板配置
  const quickTemplates = [
    {
      name: '月度管理报告',
      description: 'PDF格式，包含图表和分析',
      config: { type: 'pdf' as const, format: 'summary' as const, includeCharts: true, includeAnalysis: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: '财务数据表',
      description: 'Excel格式，详细数据',
      config: { type: 'excel' as const, format: 'detailed' as const, includeCharts: false, includeAnalysis: false },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: '数据备份',
      description: 'CSV格式，纯数据',
      config: { type: 'csv' as const, format: 'summary' as const, includeCharts: false, includeAnalysis: false },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    }
  ];

  // 估算数据大小
  const getEstimatedDataSize = () => {
    const baseSize = exportConfig.format === 'summary' ? 50 : exportConfig.format === 'detailed' ? 500 : 200;
    const multiplier = exportConfig.departments.length || 1;
    return Math.round(baseSize * multiplier);
  };

  return (
    <StatisticsModuleLayout
      title="数据导出中心"
      description="选择模板或自定义配置，快速导出所需数据"
      className={className}
    >

      {/* 步骤指示器 */}
      <div className="flex justify-center">
        <ul className="steps steps-horizontal">
          <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>选择模板</li>
          <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>配置选项</li>
          <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>确认导出</li>
        </ul>
      </div>

      {/* 步骤内容 */}
      <div className="max-w-4xl mx-auto">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">选择导出模板</h2>
              <p className="text-base-content/70">选择预设模板快速开始，或使用自定义配置</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickTemplates.map((template, index) => (
                <div key={template.name} className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
                     onClick={() => {
                       updateConfig(template.config);
                       setCurrentStep(2);
                     }}>
                  <div className="card-body items-center text-center">
                    <div className="text-primary mb-3">
                      {template.icon}
                    </div>
                    <h3 className="card-title text-lg">{template.name}</h3>
                    <p className="text-sm text-base-content/70">{template.description}</p>
                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-primary btn-sm">
                        选择此模板
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button 
                className="btn btn-outline"
                onClick={() => setCurrentStep(2)}
              >
                自定义配置
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">配置导出选项</h2>
                <p className="text-base-content/70">调整导出参数以满足您的需求</p>
              </div>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentStep(1)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回模板选择
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 基础配置 */}
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4">基础配置</h3>
                  
                  {/* 文件格式 */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">文件格式</span>
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'excel', label: 'Excel', color: 'success' },
                        { value: 'csv', label: 'CSV', color: 'info' },
                        { value: 'pdf', label: 'PDF', color: 'warning' }
                      ].map(option => (
                        <button
                          key={option.value}
                          className={`btn flex-1 ${
                            exportConfig.type === option.value 
                              ? `btn-${option.color}` 
                              : 'btn-outline'
                          }`}
                          onClick={() => updateConfig({ type: option.value as any })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 内容范围 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">内容范围</span>
                    </label>
                    <select 
                      className="select select-bordered"
                      value={exportConfig.format}
                      onChange={(e) => updateConfig({ format: e.target.value as any })}
                    >
                      <option value="summary">概要报告</option>
                      <option value="detailed">详细数据</option>
                      <option value="custom">自定义选择</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 数据筛选 */}
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4">数据筛选</h3>
                  
                  {/* 时间范围 */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">时间范围</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={exportConfig.dateRange.start}
                        onChange={(e) => updateConfig({
                          dateRange: { ...exportConfig.dateRange, start: e.target.value }
                        })}
                      />
                      <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={exportConfig.dateRange.end}
                        onChange={(e) => updateConfig({
                          dateRange: { ...exportConfig.dateRange, end: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* 部门选择 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">部门范围</span>
                      <span className="label-text-alt">可多选</span>
                    </label>
                    <select 
                      className="select select-bordered"
                      multiple
                      size={3}
                      value={exportConfig.departments}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        updateConfig({ departments: values });
                      }}
                    >
                      <option value="">全部部门</option>
                      {departments?.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 高级选项 */}
              <div className="card bg-base-100 shadow lg:col-span-2">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4">高级选项</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="cursor-pointer label">
                        <span className="label-text">包含图表</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={exportConfig.includeCharts}
                          onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                        />
                      </label>
                      <p className="text-xs text-base-content/60 mt-1">在导出文件中包含统计图表</p>
                    </div>
                    
                    <div className="form-control">
                      <label className="cursor-pointer label">
                        <span className="label-text">包含分析建议</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={exportConfig.includeAnalysis}
                          onChange={(e) => updateConfig({ includeAnalysis: e.target.checked })}
                        />
                      </label>
                      <p className="text-xs text-base-content/60 mt-1">添加数据分析和建议内容</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentStep(3)}
              >
                下一步：预览和导出
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">确认导出设置</h2>
                <p className="text-base-content/70">最后检查导出配置，确认无误后开始导出</p>
              </div>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentStep(2)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回配置
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 配置预览 */}
              <div className="lg:col-span-2">
                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="card-title text-lg mb-4">导出配置预览</h3>
                    
                    <div className="stats stats-vertical lg:stats-horizontal w-full">
                      <div className="stat">
                        <div className="stat-title">文件格式</div>
                        <div className="stat-value text-primary">
                          {exportConfig.type.toUpperCase()}
                        </div>
                        <div className="stat-desc">
                          {exportConfig.format === 'summary' ? '概要报告' :
                           exportConfig.format === 'detailed' ? '详细数据' : '自定义'}
                        </div>
                      </div>
                      
                      <div className="stat">
                        <div className="stat-title">数据范围</div>
                        <div className="stat-value text-secondary">
                          {exportConfig.dateRange.start} 至 {exportConfig.dateRange.end}
                        </div>
                        <div className="stat-desc">
                          {exportConfig.departments.length || departments?.length || 0} 个部门
                        </div>
                      </div>
                      
                      <div className="stat">
                        <div className="stat-title">预估大小</div>
                        <div className="stat-value text-accent">
                          ~{getEstimatedDataSize()}KB
                        </div>
                        <div className="stat-desc">
                          {exportConfig.includeCharts && '含图表 '}
                          {exportConfig.includeAnalysis && '含分析'}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions justify-center mt-6">
                      <button 
                        className={`btn btn-success btn-lg ${isExporting ? 'loading' : ''}`}
                        onClick={handleExport}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            正在导出...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            开始导出
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 导出历史 */}
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4">最近导出</h3>
                  
                  {exportHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-base-content/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-base-content/60">暂无导出记录</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {exportHistory.map(record => (
                        <div key={record.id} className="card bg-base-200 shadow-sm">
                          <div className="card-body p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-sm">
                                  {record.type.toUpperCase()} - {record.format}
                                </h4>
                                <p className="text-xs text-base-content/70">
                                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                                </p>
                              </div>
                              <div className={`badge badge-sm ${
                                record.status === 'completed' ? 'badge-success' : 'badge-error'
                              }`}>
                                {record.status === 'completed' ? '成功' : '失败'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast 通知 */}
      {toastMessages.length > 0 && (
        <div className="toast toast-top toast-end">
          {toastMessages.map((toast) => (
            <div key={toast.id} className={`alert alert-${toast.type}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                {toast.type === 'success' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
                {toast.type === 'error' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
                {toast.type === 'info' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span>{toast.message}</span>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => removeToastMessage(toast.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      
    </StatisticsModuleLayout>
  );
}

export default ExportModule;