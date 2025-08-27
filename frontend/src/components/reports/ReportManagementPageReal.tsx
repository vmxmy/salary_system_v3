import { useState } from 'react';
import { useReportManagement } from '@/hooks/reports';
import { supabase } from '@/lib/supabase';
import ReportTemplateModal from './ReportTemplateModal';

export default function ReportManagementPageReal() {
  const [activeTab, setActiveTab] = useState<'templates' | 'jobs' | 'history'>('templates');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    editingTemplate?: any;
  }>({
    isOpen: false,
    mode: 'create',
    editingTemplate: undefined
  });
  
  // 删除状态管理
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  
  // 使用真实的 Supabase hooks
  const reportManagement = useReportManagement({
    templateFilters: { isActive: true },
    jobFilters: { limit: 20 },
    historyFilters: { limit: 50 },
  });

  const {
    data: { templates, jobs, history, statistics },
    loading,
    actions: { generateReport, createTemplate, downloadReport },
    generation: { isGenerating, progress, currentStep }
  } = reportManagement;

  // Handle new template creation
  const handleCreateTemplate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      editingTemplate: undefined
    });
  };

  // Handle template editing
  const handleEditTemplate = (template: any) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      editingTemplate: template
    });
  };

  // Handle template save
  
  // Handle delete report history item
  const handleDeleteHistoryItem = async (item: any) => {
    if (!confirm(`确定要删除文件 "${item.report_name}" 吗？`)) {
      return;
    }
    
    const itemId = item.id;
    setDeletingItems(prev => new Set(prev).add(itemId));
    
    try {
      const { error } = await supabase
        .from('report_history')
        .delete()
        .eq('id', itemId);
      
      if (error) {
        throw error;
      }
      
      alert('文件删除成功');
      reportManagement.refetch.history();
      reportManagement.refetch.statistics();
    } catch (error) {
      console.error('删除文件失败:', error);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };
  const handleTemplateSave = async (templateConfig: any) => {
    try {
      if (modalState.mode === 'create') {
        await createTemplate(templateConfig);
        alert(`✅ 模板创建成功：${templateConfig.template_name}`);
      } else if (modalState.editingTemplate?.id) {
        // 实现模板更新功能
        const { updateTemplate } = reportManagement.actions;
        await updateTemplate({
          id: modalState.editingTemplate.id,
          ...templateConfig
        });
        alert(`✅ 模板更新成功：${templateConfig.template_name}`);
      }
      setModalState({ isOpen: false, mode: 'create', editingTemplate: undefined });
      // 刷新数据
      reportManagement.refetch.templates();
    } catch (error) {
      console.error('保存模板失败:', error);
      alert(`❌ 保存模板失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalState({ isOpen: false, mode: 'create', editingTemplate: undefined });
  };

  // Handle report generation with real data
  const handleGenerateReport = async (template: { id: string; template_name: string }) => {
    try {
      const result = await generateReport({
        templateId: template.id,
        format: 'xlsx',
        periodName: '当前周期',
        filters: {},
      });
      
      // 显示生成成功信息，并提供下载选项
      const downloadNow = confirm(`✅ 报表生成成功：${template.template_name}\n\n是否立即下载？`);
      if (downloadNow && result.filePath && result.filePath.includes('report_')) {
        const fileName = result.filePath.split('/').pop() || 'report.xlsx';
        await downloadReport(result.filePath, fileName);
      }
      
      // 刷新数据
      reportManagement.refetch.jobs();
      reportManagement.refetch.history();
      reportManagement.refetch.statistics();
      
    } catch (error) {
      console.error('生成报表失败:', error);
      alert(`❌ 生成报表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // Handle file download
  const handleDownload = async (historyItem: any) => {
    try {
      if (historyItem.file_path) {
        await downloadReport(historyItem.file_path, historyItem.report_name);
      } else {
        alert(`文件路径不存在：${historyItem.report_name}`);
      }
    } catch (error) {
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (loading.templates && loading.jobs && loading.history && loading.statistics) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">报表管理</h1>
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-2">正在加载数据...</span>
        </div>
      </div>
    );
  }

  const stats = statistics || {
    templateCount: 0,
    runningJobs: 0,
    completedToday: 0,
    historyCount: 0
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">报表管理</h1>
      
      {/* 生成进度提示 */}
      {isGenerating && (
        <div className="alert alert-info mb-6">
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold">正在生成报表</h3>
            <div className="text-sm opacity-75">{currentStep}</div>
            <progress className="progress progress-info w-full mt-2" value={progress} max="100"></progress>
            <div className="text-xs mt-1 opacity-60">{progress}% 完成</div>
          </div>
        </div>
      )}
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-base-100 shadow-xl">
          <div className="stat-figure text-primary">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="stat-title">报表模板</div>
          <div className="stat-value text-primary">{stats.templateCount}</div>
          <div className="stat-desc">可用模板数量</div>
        </div>

        <div className="stat bg-base-100 shadow-xl">
          <div className="stat-figure text-warning">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">运行中任务</div>
          <div className="stat-value text-warning">{stats.runningJobs}</div>
          <div className="stat-desc">正在执行的任务</div>
        </div>

        <div className="stat bg-base-100 shadow-xl">
          <div className="stat-figure text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">今日完成</div>
          <div className="stat-value text-success">{stats.completedToday}</div>
          <div className="stat-desc">今天完成的报表</div>
        </div>

        <div className="stat bg-base-100 shadow-xl">
          <div className="stat-figure text-info">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <div className="stat-title">历史记录</div>
          <div className="stat-value text-info">{stats.historyCount}</div>
          <div className="stat-desc">报表历史数量</div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6">
        <div className="tabs tabs-boxed w-fit">
          <button 
            className={`tab ${activeTab === 'templates' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            报表模板
          </button>
          <button 
            className={`tab ${activeTab === 'jobs' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            执行任务
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
        </div>
      </div>

      {/* 报表模板 */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* 操作栏 */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">报表模板管理</h2>
            <button 
              className="btn btn-primary"
              onClick={handleCreateTemplate}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建模板
            </button>
          </div>

          {/* 模板网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template: any) => (
              <div key={template.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">{template.template_name}</h2>
                  <p className="text-base-content/70">{template.description}</p>
                  <div className="flex justify-between items-center mt-2 text-sm text-base-content/50">
                    <span>创建于: {new Date(template.created_at).toLocaleDateString('zh-CN')}</span>
                    <div className={`badge ${template.is_active ? 'badge-success' : 'badge-error'} badge-sm`}>
                      {template.is_active ? '激活' : '禁用'}
                    </div>
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      编辑
                    </button>
                    <button 
                      className={`btn btn-primary btn-sm ${isGenerating ? 'loading' : ''}`}
                      onClick={() => handleGenerateReport(template)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '生成中...' : '生成报表'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading.templates && (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-2 text-base-content/70">正在加载模板...</p>
            </div>
          )}

          {templates.length === 0 && !loading.templates && (
            <div className="text-center py-12">
              <div className="text-base-content/50 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">暂无报表模板</p>
                <p className="text-sm text-base-content/60 mt-1">创建您的第一个报表模板来开始使用</p>
              </div>
              <button className="btn btn-primary" onClick={handleCreateTemplate}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                创建第一个模板
              </button>
            </div>
          )}
        </div>
      )}

      {/* 执行任务 */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">执行任务</h2>
          
          {loading.jobs && (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-2 text-base-content/70">正在加载任务...</p>
            </div>
          )}
          
          {jobs.map((job: any) => (
            <div key={job.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="card-title">{job.job_name}</h3>
                    <p className="text-sm text-base-content/70">
                      创建时间: {new Date(job.created_at).toLocaleString('zh-CN')}
                    </p>
                    <p className="text-sm text-base-content/70">
                      状态: {
                        job.status === 'completed' ? '已完成' :
                        job.status === 'running' ? '执行中' :
                        job.status === 'failed' ? '执行失败' :
                        '等待中'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`badge ${
                      job.status === 'completed' ? 'badge-success' :
                      job.status === 'running' ? 'badge-warning' :
                      job.status === 'failed' ? 'badge-error' :
                      'badge-neutral'
                    } mb-2`}>
                      {job.progress}%
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <progress 
                    className={`progress ${
                      job.status === 'completed' ? 'progress-success' :
                      job.status === 'running' ? 'progress-warning' :
                      job.status === 'failed' ? 'progress-error' :
                      'progress-neutral'
                    }`} 
                    value={job.progress} 
                    max="100"
                  ></progress>
                </div>

                <div className="card-actions justify-end">
                  {job.status === 'running' && (
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={async () => {
                        if (confirm(`确定要取消任务"${job.job_name}"吗？`)) {
                          try {
                            await reportManagement.actions.updateJobStatus({
                              id: job.id,
                              status: 'failed',
                              error_message: '用户主动取消'
                            });
                            alert('任务已取消');
                            reportManagement.refetch.jobs();
                          } catch (error) {
                            console.error('取消任务失败:', error);
                            alert('取消任务失败');
                          }
                        }
                      }}
                    >
                      取消
                    </button>
                  )}
                  {job.status === 'completed' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => alert(`查看结果：${job.job_name}`)}
                    >
                      查看结果
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={async () => {
                        try {
                          // 基于原任务配置重新创建任务
                          const newJobName = `${job.job_name} (重试) - ${new Date().toLocaleString('zh-CN')}`;
                          await reportManagement.actions.createJob({
                            template_id: job.template_id || '',
                            job_name: newJobName,
                            period_id: job.period_id,
                            data_filters: job.data_filters || {}
                          });
                          alert('任务已重新创建');
                          reportManagement.refetch.jobs();
                        } catch (error) {
                          console.error('重新执行失败:', error);
                          alert('重新执行失败');
                        }
                      }}
                    >
                      重新执行
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {jobs.length === 0 && !loading.jobs && (
            <div className="text-center py-12">
              <div className="text-base-content/50 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">暂无执行任务</p>
                <p className="text-sm text-base-content/60 mt-1">生成报表时会在这里显示执行进度</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 历史记录 */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold mb-4">历史记录</h2>
            <button 
              className="btn btn-outline btn-sm"
              onClick={async () => {
                if (confirm('确定要清理30天前的过期文件吗？此操作不可撤销。')) {
                  try {
                    // 计算30天前的日期
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    
                    const { data: expiredFiles, error: queryError } = await supabase
                      .from('report_history')
                      .select('id, report_name')
                      .lt('generated_at', thirtyDaysAgo.toISOString());
                    
                    if (queryError) {
                      throw queryError;
                    }
                    
                    if (expiredFiles && expiredFiles.length > 0) {
                      const { error: deleteError } = await supabase
                        .from('report_history')
                        .delete()
                        .lt('generated_at', thirtyDaysAgo.toISOString());
                      
                      if (deleteError) {
                        throw deleteError;
                      }
                      
                      alert(`✅ 已清理 ${expiredFiles.length} 个过期文件`);
                      reportManagement.refetch.history();
                      reportManagement.refetch.statistics();
                    } else {
                      alert('没有找到需要清理的过期文件');
                    }
                  } catch (error) {
                    console.error('清理过期文件失败:', error);
                    alert(`❌ 清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
                  }
                }
              }}
            >
              清理过期文件
            </button>
          </div>

          {loading.history && (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-2 text-base-content/70">正在加载历史记录...</p>
            </div>
          )}

          {history.length > 0 && !loading.history ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>期间</th>
                    <th>生成时间</th>
                    <th>格式</th>
                    <th>大小</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item: any) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.report_name}</td>
                      <td>{item.period_name}</td>
                      <td>{new Date(item.generated_at).toLocaleString('zh-CN')}</td>
                      <td>
                        <div className={`badge badge-outline ${
                          item.file_format === 'xlsx' ? 'badge-success' :
                          item.file_format === 'pdf' ? 'badge-error' :
                          'badge-info'
                        }`}>
                          {item.file_format?.toUpperCase()}
                        </div>
                      </td>
                      <td>{item.file_size ? Math.round(item.file_size / 1024) : 0}KB</td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleDownload(item)}
                            title="下载文件"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button 
                            className={`btn btn-ghost btn-xs text-error ${deletingItems.has(item.id) ? 'loading' : ''}`}
                            onClick={() => handleDeleteHistoryItem(item)}
                            disabled={deletingItems.has(item.id)}
                            title="删除文件"
                          >
                            {deletingItems.has(item.id) ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loading.history ? (
            <div className="text-center py-12">
              <div className="text-base-content/50 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <p className="text-lg font-medium">暂无历史记录</p>
                <p className="text-sm text-base-content/60 mt-1">生成的报表文件会在这里显示</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 报表模板创建/编辑模态框 */}
      <ReportTemplateModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        editingTemplate={modalState.editingTemplate}
        onClose={handleModalClose}
        onSave={handleTemplateSave}
      />
    </div>
  );
}