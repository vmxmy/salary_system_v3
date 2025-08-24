/**
 * 权限历史查看器组件
 * 
 * 显示权限变更历史、审计日志和合规性报告
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  PermissionHistoryEntry,
  PermissionAuditLog,
  HistoryFilters,
  HistoryActionType,
  ComplianceReport
} from '@/types/permission-assignment';
import { usePermissionHistory } from '@/hooks/permissions/usePermissionHistory';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable } from '@/components/common/DataTable/DataTable';

interface PermissionHistoryViewerProps {
  userId?: string; // 如果指定，只显示该用户的历史
  onClose?: () => void;
  className?: string;
}

type ViewTab = 'history' | 'audit' | 'compliance' | 'analytics';

interface HistoryFiltersForm extends HistoryFilters {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  quickFilter: 'all' | 'permissions' | 'roles' | 'overrides' | 'security';
}

export function PermissionHistoryViewer({
  userId,
  onClose,
  className = ''
}: PermissionHistoryViewerProps) {
  const { t } = useTranslation();
  const {
    history,
    auditLogs,
    getUserHistory,
    getAuditLogs,
    searchAuditLogs,
    generateComplianceReport,
    analyzePermissionTrends,
    exportAuditReport,
    loading
  } = usePermissionHistory();

  const [activeTab, setActiveTab] = useState<ViewTab>('history');
  const [historyData, setHistoryData] = useState<PermissionHistoryEntry[]>([]);
  const [auditData, setAuditData] = useState<PermissionAuditLog[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const [filters, setFilters] = useState<HistoryFiltersForm>({
    dateRange: 'month',
    quickFilter: 'all',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
    endDate: new Date(),
    userId,
    limit: 100
  });

  // 加载历史数据
  const loadHistoryData = useCallback(async () => {
    try {
      const historyFilters: HistoryFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        actionTypes: filters.quickFilter !== 'all' ? getActionTypesByFilter(filters.quickFilter) : undefined,
        limit: filters.limit
      };

      let historyResults: PermissionHistoryEntry[] = [];
      
      if (userId) {
        historyResults = await getUserHistory(userId, historyFilters);
      } else {
        // 获取全局历史（需要相应的API支持）
        historyResults = history; // 暂时使用现有数据
      }

      setHistoryData(historyResults);

      // 加载审计日志
      const auditResults = await getAuditLogs({
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        limit: filters.limit
      });
      
      setAuditData(auditResults);

    } catch (error) {
      console.error('Failed to load history data:', error);
    }
  }, [filters, userId, getUserHistory, getAuditLogs, history]);

  // 根据快速过滤器获取动作类型
  const getActionTypesByFilter = (quickFilter: string): HistoryActionType[] | undefined => {
    switch (quickFilter) {
      case 'permissions':
        return ['permission_granted', 'permission_revoked'];
      case 'roles':
        return ['role_assigned', 'role_removed'];
      case 'overrides':
        return ['override_created', 'override_removed', 'override_updated'];
      case 'security':
        return ['access_denied', 'login_attempt'];
      default:
        return undefined;
    }
  };

  // 生成合规报告
  const generateReport = useCallback(async () => {
    try {
      const report = await generateComplianceReport(
        filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        filters.endDate || new Date()
      );
      setComplianceData(report);
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
    }
  }, [generateComplianceReport, filters.startDate, filters.endDate]);

  // 导出报告
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const downloadUrl = await exportAuditReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId
      });
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `audit-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  }, [exportAuditReport, filters]);

  // 处理搜索
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      const searchResults = await searchAuditLogs(searchQuery, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        limit: filters.limit
      });
      
      setAuditData(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [searchQuery, searchAuditLogs, filters]);

  // 处理过滤器变更
  const handleFilterChange = useCallback(<K extends keyof HistoryFiltersForm>(
    field: K,
    value: HistoryFiltersForm[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // 处理日期范围快捷选择
      if (field === 'dateRange') {
        const now = new Date();
        switch (value) {
          case 'today':
            newFilters.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            newFilters.endDate = now;
            break;
          case 'week':
            newFilters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            newFilters.endDate = now;
            break;
          case 'month':
            newFilters.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            newFilters.endDate = now;
            break;
          case 'quarter':
            newFilters.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            newFilters.endDate = now;
            break;
          case 'year':
            newFilters.startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            newFilters.endDate = now;
            break;
        }
      }
      
      return newFilters;
    });
  }, []);

  // 初始化数据加载
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // 当切换到合规标签时生成报告
  useEffect(() => {
    if (activeTab === 'compliance' && !complianceData) {
      generateReport();
    }
  }, [activeTab, complianceData, generateReport]);

  // 历史记录表格列配置
  const historyColumns = [
    {
      accessorKey: 'performedAt',
      header: '时间',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.performedAt).toLocaleString()}
        </div>
      )
    },
    {
      accessorKey: 'userName',
      header: '用户',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.userName}</div>
          <div className="text-xs text-base-content/70">{row.original.userEmail}</div>
        </div>
      )
    },
    {
      accessorKey: 'actionType',
      header: '操作',
      cell: ({ row }: any) => (
        <div className="badge badge-outline">
          {getActionTypeLabel(row.original.actionType)}
        </div>
      )
    },
    {
      accessorKey: 'actionDescription',
      header: '描述',
      cell: ({ row }: any) => (
        <div className="max-w-xs">
          <div className="font-medium">{row.original.actionDescription}</div>
          {row.original.reason && (
            <div className="text-xs text-base-content/70 mt-1">
              原因: {row.original.reason}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'performedByName',
      header: '操作人',
      cell: ({ row }: any) => (
        <div className="text-sm">{row.original.performedByName}</div>
      )
    }
  ];

  // 审计日志表格列配置
  const auditColumns = [
    {
      accessorKey: 'timestamp',
      header: '时间',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.timestamp).toLocaleString()}
        </div>
      )
    },
    {
      accessorKey: 'userName',
      header: '用户',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {row.original.userName || '系统'}
        </div>
      )
    },
    {
      accessorKey: 'actionType',
      header: '类型',
      cell: ({ row }: any) => (
        <div className="badge badge-outline">
          {row.original.actionType}
        </div>
      )
    },
    {
      accessorKey: 'result',
      header: '结果',
      cell: ({ row }: any) => (
        <div className={`badge ${
          row.original.result === 'success' ? 'badge-success' :
          row.original.result === 'failure' ? 'badge-error' :
          'badge-warning'
        }`}>
          {row.original.result}
        </div>
      )
    },
    {
      accessorKey: 'riskLevel',
      header: '风险级别',
      cell: ({ row }: any) => (
        <div className={`badge badge-sm ${
          row.original.riskLevel === 'critical' ? 'badge-error' :
          row.original.riskLevel === 'high' ? 'badge-warning' :
          row.original.riskLevel === 'medium' ? 'badge-info' :
          'badge-success'
        }`}>
          {row.original.riskLevel}
        </div>
      )
    },
    {
      accessorKey: 'actionDescription',
      header: '描述',
      cell: ({ row }: any) => (
        <div className="max-w-xs text-sm">
          {row.original.actionDescription}
        </div>
      )
    }
  ];

  // 获取操作类型标签
  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      permission_granted: '权限授予',
      permission_revoked: '权限撤销',
      role_assigned: '角色分配',
      role_removed: '角色移除',
      override_created: '覆盖创建',
      override_removed: '覆盖移除',
      override_updated: '覆盖更新',
      permission_expired: '权限过期',
      login_attempt: '登录尝试',
      access_denied: '访问拒绝',
      system_change: '系统变更'
    };
    return labels[actionType] || actionType;
  };

  return (
    <div className={`permission-history-viewer ${className}`}>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 标题和关闭按钮 */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="card-title text-2xl">
              权限历史查看器
              {userId && (
                <div className="badge badge-primary">用户专用</div>
              )}
            </h3>
            {onClose && (
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                ✕
              </button>
            )}
          </div>

          {/* 过滤器工具栏 */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex gap-4 items-center">
              {/* 日期范围 */}
              <div className="form-control">
                <select
                  className="select select-bordered select-sm"
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value as any)}
                >
                  <option value="today">今天</option>
                  <option value="week">最近一周</option>
                  <option value="month">最近一月</option>
                  <option value="quarter">最近三月</option>
                  <option value="year">最近一年</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {/* 自定义日期范围 */}
              {filters.dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={filters.startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                  />
                  <span>至</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={filters.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </>
              )}

              {/* 快速过滤器 */}
              <div className="form-control">
                <select
                  className="select select-bordered select-sm"
                  value={filters.quickFilter}
                  onChange={(e) => handleFilterChange('quickFilter', e.target.value as any)}
                >
                  <option value="all">所有操作</option>
                  <option value="permissions">权限操作</option>
                  <option value="roles">角色操作</option>
                  <option value="overrides">覆盖操作</option>
                  <option value="security">安全事件</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              {/* 搜索 */}
              <div className="form-control">
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    placeholder="搜索审计日志..."
                    className="input input-bordered input-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    className="btn btn-square btn-sm"
                    onClick={handleSearch}
                  >
                    🔍
                  </button>
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={loadHistoryData}
                disabled={loading}
              >
                {loading ? '加载中...' : '刷新'}
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? '导出中...' : '导出Excel'}
              </button>
            </div>
          </div>

          {/* 标签页 */}
          <div className="tabs tabs-boxed mb-6">
            <a 
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              历史记录 ({historyData.length})
            </a>
            <a 
              className={`tab ${activeTab === 'audit' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              审计日志 ({auditData.length})
            </a>
            <a 
              className={`tab ${activeTab === 'compliance' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('compliance')}
            >
              合规报告
            </a>
            <a 
              className={`tab ${activeTab === 'analytics' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              分析统计
            </a>
          </div>

          {/* 标签页内容 */}
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <span className="loading loading-spinner loading-lg"></span>
              <span className="ml-2">加载中...</span>
            </div>
          ) : (
            <>
              {activeTab === 'history' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">权限变更历史</h4>
                  <DataTable
                    data={historyData}
                    columns={historyColumns}
                    initialPagination={{ pageIndex: 0, pageSize: 50 }}
                    showGlobalFilter={true}
                    showPagination={true}
                  />
                </div>
              )}

              {activeTab === 'audit' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">系统审计日志</h4>
                  <DataTable
                    data={auditData}
                    columns={auditColumns}
                    initialPagination={{ pageIndex: 0, pageSize: 50 }}
                    showGlobalFilter={true}
                    showPagination={true}
                  />
                </div>
              )}

              {activeTab === 'compliance' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">合规性报告</h4>
                  {complianceData ? (
                    <div className="space-y-6">
                      {/* 总体合规评分 */}
                      <div className="card border border-base-300 bg-base-50">
                        <div className="card-body">
                          <h5 className="card-title">总体合规评分</h5>
                          <div className="flex items-center gap-4">
                            <div className={`radial-progress ${
                              complianceData.overallComplianceScore >= 80 ? 'text-success' :
                              complianceData.overallComplianceScore >= 60 ? 'text-warning' :
                              'text-error'
                            }`} style={{"--value": complianceData.overallComplianceScore} as any}>
                              {complianceData.overallComplianceScore}%
                            </div>
                            <div className="stats">
                              <div className="stat">
                                <div className="stat-title">用户数</div>
                                <div className="stat-value text-sm">{complianceData.summary.totalUsers}</div>
                              </div>
                              <div className="stat">
                                <div className="stat-title">权限数</div>
                                <div className="stat-value text-sm">{complianceData.summary.totalPermissions}</div>
                              </div>
                              <div className="stat">
                                <div className="stat-title">冲突数</div>
                                <div className="stat-value text-sm text-error">{complianceData.summary.conflicts}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 合规检查结果 */}
                      <div>
                        <h5 className="font-semibold mb-3">合规检查结果</h5>
                        <div className="grid gap-4">
                          {complianceData.sections.map((section, index) => (
                            <div key={index} className="card border border-base-300">
                              <div className="card-body">
                                <div className="flex items-center justify-between">
                                  <h6 className="font-medium">{section.sectionName}</h6>
                                  <div className="flex items-center gap-2">
                                    <div className={`badge ${
                                      section.status === 'compliant' ? 'badge-success' :
                                      section.status === 'warning' ? 'badge-warning' :
                                      'badge-error'
                                    }`}>
                                      {section.status}
                                    </div>
                                    <div className="text-sm">{section.score}分</div>
                                  </div>
                                </div>
                                {section.findings.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-sm text-base-content/70">发现的问题:</div>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {section.findings.slice(0, 3).map((finding, fIndex) => (
                                        <li key={fIndex} className={`${
                                          finding.severity === 'critical' ? 'text-error' :
                                          finding.severity === 'high' ? 'text-warning' :
                                          'text-base-content'
                                        }`}>
                                          {finding.title}
                                        </li>
                                      ))}
                                    </ul>
                                    {section.findings.length > 3 && (
                                      <div className="text-sm text-base-content/50 mt-1">
                                        还有 {section.findings.length - 3} 个问题...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 改进建议 */}
                      {complianceData.recommendations.length > 0 && (
                        <div>
                          <h5 className="font-semibold mb-3">改进建议</h5>
                          <div className="grid gap-3">
                            {complianceData.recommendations.slice(0, 5).map((recommendation, index) => (
                              <div key={index} className="alert alert-info">
                                <div className="w-full">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-medium">{recommendation.title}</h6>
                                    <div className="flex gap-2">
                                      <div className={`badge badge-sm ${
                                        recommendation.priority === 'urgent' ? 'badge-error' :
                                        recommendation.priority === 'high' ? 'badge-warning' :
                                        'badge-info'
                                      }`}>
                                        {recommendation.priority}
                                      </div>
                                      <div className="badge badge-sm badge-outline">
                                        {recommendation.estimatedEffort} 工作量
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-sm mt-1">{recommendation.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center p-8">
                      <button 
                        className="btn btn-primary"
                        onClick={generateReport}
                        disabled={loading}
                      >
                        生成合规报告
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">统计分析</h4>
                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>统计分析功能正在开发中，将包含权限使用趋势、用户行为分析等内容。</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}