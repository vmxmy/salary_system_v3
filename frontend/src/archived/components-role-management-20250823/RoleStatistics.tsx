/**
 * 角色统计组件
 * 
 * 功能特性：
 * - 角色使用统计分析
 * - 权限分布可视化
 * - 角色变更历史统计
 * - 系统安全指标监控
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoleManagement, type RoleUsageStats, type RoleChangeHistory } from '@/hooks/role-management/useRoleManagement';
import { useRolePermissions, type PermissionConflict } from '@/hooks/role-management/useRolePermissions';

interface RoleStatisticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  showDetailedMetrics?: boolean;
  onRoleClick?: (roleId: string) => void;
}

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'danger';
  description: string;
}

export const RoleStatistics: React.FC<RoleStatisticsProps> = ({
  timeRange = '30d',
  showDetailedMetrics = true,
  onRoleClick = () => {}
}) => {
  const { 
    roles,
    getRoleUsageStats,
    getRoleChangeHistory,
    loading: roleLoading 
  } = useRoleManagement();
  
  const { 
    detectPermissionConflicts,
    permissionStats,
    loading: permissionLoading 
  } = useRolePermissions();

  const [usageStats, setUsageStats] = useState<RoleUsageStats[]>([]);
  const [changeHistory, setChangeHistory] = useState<RoleChangeHistory[]>([]);
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMetricTab, setActiveMetricTab] = useState<'overview' | 'security' | 'history'>('overview');

  // 加载统计数据
  const loadStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, history, conflictData] = await Promise.all([
        getRoleUsageStats(),
        getRoleChangeHistory(),
        detectPermissionConflicts()
      ]);
      
      setUsageStats(stats);
      setChangeHistory(history);
      setConflicts(conflictData);
    } catch (error) {
      console.error('加载角色统计失败:', error);
    } finally {
      setLoading(false);
    }
  }, [getRoleUsageStats, getRoleChangeHistory, detectPermissionConflicts]);

  // 计算安全指标
  const securityMetrics = useMemo((): SecurityMetric[] => {
    const totalRoles = roles.length;
    const activeRoles = roles.filter(r => r.is_active).length;
    const systemRoles = roles.filter(r => r.is_system_role).length;
    const customRoles = totalRoles - systemRoles;
    
    const totalUsers = usageStats.reduce((sum, stat) => sum + stat.total_users, 0);
    const usersWithMultipleRoles = usageStats.filter(stat => stat.total_users > 1).length;
    
    const highPrivilegeRoles = usageStats.filter(stat => 
      stat.permission_count > 20 && stat.active_users > 0
    ).length;

    return [
      {
        id: 'role_coverage',
        name: '角色覆盖率',
        value: totalUsers > 0 ? (activeRoles / totalUsers) * 100 : 0,
        threshold: 80,
        status: totalUsers > 0 && (activeRoles / totalUsers) > 0.8 ? 'good' : 'warning',
        description: '有角色分配的用户比例'
      },
      {
        id: 'permission_conflicts',
        name: '权限冲突',
        value: conflicts.length,
        threshold: 0,
        status: conflicts.length === 0 ? 'good' : conflicts.length < 5 ? 'warning' : 'danger',
        description: '检测到的权限冲突数量'
      },
      {
        id: 'custom_role_ratio',
        name: '自定义角色比例',
        value: totalRoles > 0 ? (customRoles / totalRoles) * 100 : 0,
        threshold: 30,
        status: totalRoles > 0 && (customRoles / totalRoles) < 0.3 ? 'good' : 'warning',
        description: '自定义角色占总角色的比例'
      },
      {
        id: 'high_privilege_usage',
        name: '高权限角色使用',
        value: highPrivilegeRoles,
        threshold: 3,
        status: highPrivilegeRoles <= 3 ? 'good' : highPrivilegeRoles <= 5 ? 'warning' : 'danger',
        description: '使用中的高权限角色数量'
      },
      {
        id: 'recent_changes',
        name: '近期变更',
        value: changeHistory.filter(change => {
          const changeDate = new Date(change.changed_at);
          const daysAgo = (Date.now() - changeDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7;
        }).length,
        threshold: 10,
        status: changeHistory.length <= 10 ? 'good' : changeHistory.length <= 20 ? 'warning' : 'danger',
        description: '过去7天的角色变更次数'
      }
    ];
  }, [roles, usageStats, conflicts, changeHistory]);

  // 获取状态颜色
  const getStatusColor = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'good': return 'text-success';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-error';
      default: return 'text-base-content';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'danger': return '🚨';
      default: return '📊';
    }
  };

  // 角色使用排行
  const topUsedRoles = useMemo(() => {
    return [...usageStats]
      .sort((a, b) => b.active_users - a.active_users)
      .slice(0, 5);
  }, [usageStats]);

  // 权限分布数据
  const permissionDistribution = useMemo(() => {
    const distribution = usageStats.map(stat => ({
      role_name: stat.role_name,
      permission_count: stat.permission_count,
      user_count: stat.active_users
    })).sort((a, b) => b.permission_count - a.permission_count);
    
    return distribution.slice(0, 8);
  }, [usageStats]);

  // 变更趋势数据
  const changeTrend = useMemo(() => {
    const now = new Date();
    const days = [];
    
    // 生成过去30天的数据
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayChanges = changeHistory.filter(change => {
        const changeDate = new Date(change.changed_at);
        return changeDate >= dayStart && changeDate <= dayEnd;
      }).length;
      
      days.push({
        date: dayStart.toISOString().split('T')[0],
        changes: dayChanges,
        dayName: dayStart.toLocaleDateString('zh-CN', { weekday: 'short' })
      });
    }
    
    return days;
  }, [changeHistory]);

  // 初始化加载
  useEffect(() => {
    if (roles.length > 0) {
      loadStatistics();
    }
  }, [roles, loadStatistics]);

  if (roleLoading || permissionLoading || loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-3">加载统计数据...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">总角色数</div>
          <div className="stat-value">{roles.length}</div>
          <div className="stat-desc">
            {roles.filter(r => r.is_active).length} 个活跃角色
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="stat-title">总权限数</div>
          <div className="stat-value">{permissionStats.totalPermissions}</div>
          <div className="stat-desc">
            {permissionStats.assignedPermissions} 个已分配
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="stat-title">总用户数</div>
          <div className="stat-value">
            {usageStats.reduce((sum, stat) => sum + stat.total_users, 0)}
          </div>
          <div className="stat-desc">
            {usageStats.reduce((sum, stat) => sum + stat.active_users, 0)} 个活跃用户
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="stat-title">权限冲突</div>
          <div className="stat-value text-error">{conflicts.length}</div>
          <div className="stat-desc">
            需要处理的冲突项
          </div>
        </div>
      </div>

      {/* 详细指标选项卡 */}
      {showDetailedMetrics && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="tabs tabs-bordered">
              <button 
                className={`tab ${activeMetricTab === 'overview' ? 'tab-active' : ''}`}
                onClick={() => setActiveMetricTab('overview')}
              >
                概览分析
              </button>
              <button 
                className={`tab ${activeMetricTab === 'security' ? 'tab-active' : ''}`}
                onClick={() => setActiveMetricTab('security')}
              >
                安全指标
              </button>
              <button 
                className={`tab ${activeMetricTab === 'history' ? 'tab-active' : ''}`}
                onClick={() => setActiveMetricTab('history')}
              >
                变更历史
              </button>
            </div>

            <div className="mt-6">
              {activeMetricTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 角色使用排行 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">角色使用排行</h3>
                    <div className="space-y-3">
                      {topUsedRoles.map((role, index) => (
                        <div 
                          key={role.role_id} 
                          className="flex items-center gap-4 p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                          onClick={() => onRoleClick(role.role_id)}
                        >
                          <div className="badge badge-primary">{index + 1}</div>
                          <div className="flex-1">
                            <div className="font-medium">{role.role_name}</div>
                            <div className="text-sm text-base-content/60">
                              {role.permission_count} 权限
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">{role.active_users}</div>
                            <div className="text-xs text-base-content/60">活跃用户</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 权限分布 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">权限分布</h3>
                    <div className="space-y-3">
                      {permissionDistribution.map((item, index) => {
                        const maxPermissions = Math.max(...permissionDistribution.map(d => d.permission_count));
                        const width = maxPermissions > 0 ? (item.permission_count / maxPermissions) * 100 : 0;
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{item.role_name}</span>
                              <span className="text-xs text-base-content/60">
                                {item.permission_count} 权限 / {item.user_count} 用户
                              </span>
                            </div>
                            <div className="w-full bg-base-300 rounded-full h-2">
                              <div 
                                className="bg-secondary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeMetricTab === 'security' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {securityMetrics.map(metric => (
                    <div key={metric.id} className="card bg-base-200 border">
                      <div className="card-body p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getStatusIcon(metric.status)}</span>
                          <div className="flex-1">
                            <h4 className="font-medium">{metric.name}</h4>
                            <div className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                              {metric.id.includes('ratio') || metric.id.includes('coverage') 
                                ? `${metric.value.toFixed(1)}%`
                                : metric.value
                              }
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-base-content/60 mt-2">
                          {metric.description}
                        </p>
                        <div className="mt-2">
                          <div className="text-xs text-base-content/50">
                            阈值: {metric.id.includes('ratio') || metric.id.includes('coverage')
                              ? `${metric.threshold}%`
                              : metric.threshold
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeMetricTab === 'history' && (
                <div className="space-y-6">
                  {/* 变更趋势图 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">变更趋势（过去30天）</h3>
                    <div className="flex items-end gap-1 h-32 bg-base-200 rounded-lg p-4">
                      {changeTrend.map((day, index) => {
                        const maxChanges = Math.max(...changeTrend.map(d => d.changes), 1);
                        const height = (day.changes / maxChanges) * 100;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div 
                              className={`w-full rounded-t transition-all duration-300 ${
                                day.changes > 0 ? 'bg-primary' : 'bg-base-300'
                              }`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${day.changes} 变更`}
                            />
                            <span className="text-xs text-base-content/60 rotate-45 origin-bottom-left">
                              {day.dayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 最近变更列表 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">最近变更</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {changeHistory.slice(0, 10).map(change => {
                        const changeDate = new Date(change.changed_at);
                        const changeTypeNames: Record<string, string> = {
                          created: '创建',
                          updated: '更新',
                          deleted: '删除',
                          permission_added: '添加权限',
                          permission_removed: '移除权限'
                        };

                        return (
                          <div key={change.id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                            <span className="text-lg">
                              {change.change_type === 'created' ? '➕' :
                               change.change_type === 'updated' ? '✏️' :
                               change.change_type === 'deleted' ? '🗑️' :
                               change.change_type === 'permission_added' ? '🔓' :
                               '🔒'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium">
                                {changeTypeNames[change.change_type] || change.change_type}
                              </div>
                              <div className="text-sm text-base-content/60">
                                {change.reason || '无备注'}
                              </div>
                            </div>
                            <div className="text-right text-xs text-base-content/50">
                              {changeDate.toLocaleString('zh-CN')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 权限冲突列表 */}
      {conflicts.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-header p-4 border-b border-base-300">
            <h3 className="text-lg font-semibold text-error">⚠️ 权限冲突提醒</h3>
          </div>
          <div className="card-body p-4">
            <div className="space-y-3">
              {conflicts.slice(0, 5).map((conflict, index) => (
                <div key={index} className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="font-medium">{conflict.role_name} - {conflict.permission_name}</h4>
                    <div className="text-sm">{conflict.description}</div>
                    <div className="text-xs mt-1 text-base-content/60">
                      严重程度: <span className={
                        conflict.severity === 'high' ? 'text-error' :
                        conflict.severity === 'medium' ? 'text-warning' : 'text-info'
                      }>{
                        conflict.severity === 'high' ? '高' :
                        conflict.severity === 'medium' ? '中' : '低'
                      }</span>
                    </div>
                  </div>
                </div>
              ))}
              {conflicts.length > 5 && (
                <div className="text-center">
                  <span className="text-sm text-base-content/60">
                    还有 {conflicts.length - 5} 个冲突未显示
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <button
          className="btn btn-outline btn-sm"
          onClick={loadStatistics}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner loading-sm mr-2"></span>}
          刷新数据
        </button>
      </div>
    </div>
  );
};