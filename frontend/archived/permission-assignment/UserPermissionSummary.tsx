/**
 * 用户权限摘要组件
 * 
 * 展示用户的完整权限摘要，包括角色权限、直接权限、覆盖权限等
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  UserPermissionSummary as UserPermSummary,
  PermissionDetail,
  PermissionSource,
  PermissionConflict
} from '@/types/permission-assignment';
import { usePermissionAssignment } from '@/hooks/permissions/usePermissionAssignment';
import { usePermissionOverride } from '@/hooks/permissions/usePermissionOverride';
import { useTranslation } from '@/hooks/useTranslation';
import { ConfirmModal } from '@/components/common/ConfirmModal';

interface UserPermissionSummaryProps {
  userId: string;
  onPermissionChange?: () => void;
  readOnly?: boolean;
  className?: string;
}

interface PermissionGroup {
  category: string;
  permissions: PermissionDetail[];
  rolePermissions: PermissionDetail[];
  directPermissions: PermissionDetail[];
  overridePermissions: PermissionDetail[];
}

export function UserPermissionSummary({
  userId,
  onPermissionChange,
  readOnly = false,
  className = ''
}: UserPermissionSummaryProps) {
  const { t } = useTranslation();
  const {
    calculateUserPermissions,
    getEffectivePermissions,
    checkPermissionConflicts,
    assignPermission,
    revokePermission,
    loading: assignmentLoading
  } = usePermissionAssignment();

  const {
    createOverride,
    removeOverride,
    getUserOverrides,
    loading: overrideLoading
  } = usePermissionOverride();

  const [summary, setSummary] = useState<UserPermSummary | null>(null);
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'conflicts' | 'history'>('overview');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<PermissionDetail | null>(null);
  const [operationType, setOperationType] = useState<'assign' | 'revoke' | 'override'>('assign');
  const [operationReason, setOperationReason] = useState('');

  const loading = assignmentLoading || overrideLoading;

  // 加载用户权限摘要
  const loadUserSummary = useCallback(async () => {
    try {
      const [summaryData, conflictData] = await Promise.all([
        calculateUserPermissions(userId),
        checkPermissionConflicts(userId)
      ]);

      setSummary(summaryData);
      setConflicts(conflictData);
    } catch (error) {
      console.error('Failed to load user permission summary:', error);
    }
  }, [userId, calculateUserPermissions, checkPermissionConflicts]);

  useEffect(() => {
    loadUserSummary();
  }, [loadUserSummary]);

  // 构建权限分组
  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    if (!summary) return [];

    const groups: Record<string, PermissionGroup> = {};

    summary.permissionsByCategory.forEach(category => {
      groups[category.category] = {
        category: category.category,
        permissions: category.details,
        rolePermissions: category.details.filter(p => p.source.type === 'role'),
        directPermissions: category.details.filter(p => p.source.type === 'direct'),
        overridePermissions: category.details.filter(p => p.source.type === 'override')
      };
    });

    return Object.values(groups);
  }, [summary]);

  // 切换分组展开状态
  const toggleGroupExpansion = useCallback((category: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // 处理权限操作
  const handlePermissionOperation = useCallback(async (
    permission: PermissionDetail,
    operation: 'assign' | 'revoke' | 'override'
  ) => {
    setSelectedPermission(permission);
    setOperationType(operation);
    setShowPermissionModal(true);
  }, []);

  // 执行权限操作
  const executePermissionOperation = useCallback(async () => {
    if (!selectedPermission || !operationReason.trim()) return;

    try {
      switch (operationType) {
        case 'assign':
          await assignPermission(userId, selectedPermission.permissionId, { reason: operationReason });
          break;
        case 'revoke':
          await revokePermission(userId, selectedPermission.permissionId, operationReason);
          break;
        case 'override':
          await createOverride({
            userId,
            permissionId: selectedPermission.permissionId,
            overrideType: selectedPermission.isActive ? 'deny' : 'grant',
            reason: operationReason
          });
          break;
      }

      await loadUserSummary();
      onPermissionChange?.();
      setShowPermissionModal(false);
      setOperationReason('');
    } catch (error) {
      console.error('Permission operation failed:', error);
    }
  }, [
    selectedPermission,
    operationType,
    operationReason,
    userId,
    assignPermission,
    revokePermission,
    createOverride,
    loadUserSummary,
    onPermissionChange
  ]);

  // 获取权限状态样式
  const getPermissionStatusClass = (permission: PermissionDetail) => {
    if (!permission.isActive) {
      return 'text-base-content/50';
    }

    switch (permission.source.type) {
      case 'role':
        return 'text-primary';
      case 'direct':
        return 'text-secondary';
      case 'override':
        return 'text-accent';
      default:
        return 'text-base-content';
    }
  };

  // 获取权限源标识
  const getPermissionSourceBadge = (source: PermissionSource) => {
    const badgeClasses = {
      role: 'badge-primary',
      direct: 'badge-secondary',
      override: 'badge-accent'
    };

    const labels = {
      role: '角色',
      direct: '直接',
      override: '覆盖'
    };

    return (
      <div className={`badge badge-sm ${badgeClasses[source.type]}`}>
        {labels[source.type]}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>无法加载用户权限摘要</span>
      </div>
    );
  }

  return (
    <div className={`user-permission-summary ${className}`}>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 用户基本信息 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-12">
                  <span className="text-lg">{summary.userName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">{summary.userName}</h3>
                <p className="text-base-content/70">{summary.userEmail}</p>
                <div className="flex gap-2 mt-1">
                  {summary.primaryRole && (
                    <div className="badge badge-primary">{summary.primaryRole}</div>
                  )}
                  {summary.additionalRoles.map(role => (
                    <div key={role} className="badge badge-outline">{role}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-base-content/70">最后更新</div>
              <div className="text-sm">{new Date(summary.lastUpdated).toLocaleString()}</div>
            </div>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">总权限</div>
              <div className="stat-value text-primary">{summary.totalPermissions}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">角色权限</div>
              <div className="stat-value text-primary">{summary.rolePermissions}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">直接权限</div>
              <div className="stat-value text-secondary">{summary.directPermissions}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">覆盖权限</div>
              <div className="stat-value text-accent">{summary.overridePermissions}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">冲突</div>
              <div className={`stat-value ${summary.conflictCount > 0 ? 'text-error' : 'text-success'}`}>
                {summary.conflictCount}
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="tabs tabs-boxed mb-6">
            <a 
              className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              概览
            </a>
            <a 
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              详细权限
            </a>
            {conflicts.length > 0 && (
              <a 
                className={`tab ${activeTab === 'conflicts' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('conflicts')}
              >
                冲突 ({conflicts.length})
              </a>
            )}
            <a 
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              历史记录
            </a>
          </div>

          {/* 标签页内容 */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">权限分类概览</h4>
              {permissionGroups.map(group => (
                <div key={group.category} className="collapse collapse-arrow border border-base-300">
                  <input 
                    type="checkbox" 
                    checked={expandedGroups.has(group.category)}
                    onChange={() => toggleGroupExpansion(group.category)}
                  />
                  <div className="collapse-title font-medium">
                    <div className="flex items-center justify-between">
                      <span>{group.category}</span>
                      <div className="flex gap-2">
                        <div className="badge badge-sm">{group.permissions.length} 权限</div>
                        {group.rolePermissions.length > 0 && (
                          <div className="badge badge-primary badge-sm">{group.rolePermissions.length} 角色</div>
                        )}
                        {group.directPermissions.length > 0 && (
                          <div className="badge badge-secondary badge-sm">{group.directPermissions.length} 直接</div>
                        )}
                        {group.overridePermissions.length > 0 && (
                          <div className="badge badge-accent badge-sm">{group.overridePermissions.length} 覆盖</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="collapse-content">
                    <div className="grid gap-2">
                      {group.permissions.map(permission => (
                        <div
                          key={permission.permissionId}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              permission.isActive ? 'bg-success' : 'bg-base-300'
                            }`}></div>
                            <div className={getPermissionStatusClass(permission)}>
                              <div className="font-medium">{permission.permissionName}</div>
                              <div className="text-xs">{permission.resourceType}.{permission.actionType}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPermissionSourceBadge(permission.source)}
                            {permission.source.sourceName && (
                              <div className="text-xs text-base-content/70">
                                来自: {permission.source.sourceName}
                              </div>
                            )}
                            {permission.expiresAt && (
                              <div className="text-xs text-warning">
                                {new Date(permission.expiresAt) < new Date() ? '已过期' : '有效期至'}
                                {new Date(permission.expiresAt).toLocaleDateString()}
                              </div>
                            )}
                            {!readOnly && (
                              <div className="dropdown dropdown-end">
                                <label tabIndex={0} className="btn btn-ghost btn-sm">⚙️</label>
                                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                                  <li>
                                    <a onClick={() => handlePermissionOperation(permission, 'assign')}>
                                      直接分配
                                    </a>
                                  </li>
                                  <li>
                                    <a onClick={() => handlePermissionOperation(permission, 'revoke')}>
                                      撤销权限
                                    </a>
                                  </li>
                                  <li>
                                    <a onClick={() => handlePermissionOperation(permission, 'override')}>
                                      创建覆盖
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">详细权限列表</h4>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>权限名称</th>
                      <th>资源类型</th>
                      <th>操作类型</th>
                      <th>来源</th>
                      <th>状态</th>
                      <th>过期时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionGroups.flatMap(group => 
                      group.permissions.map(permission => (
                        <tr key={permission.permissionId}>
                          <td>{permission.permissionName}</td>
                          <td>{permission.resourceType}</td>
                          <td>{permission.actionType}</td>
                          <td>{getPermissionSourceBadge(permission.source)}</td>
                          <td>
                            <div className={`badge ${permission.isActive ? 'badge-success' : 'badge-error'}`}>
                              {permission.isActive ? '活跃' : '非活跃'}
                            </div>
                          </td>
                          <td>
                            {permission.expiresAt ? new Date(permission.expiresAt).toLocaleString() : '永久'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">权限冲突</h4>
              {conflicts.length === 0 ? (
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>没有检测到权限冲突</span>
                </div>
              ) : (
                conflicts.map(conflict => (
                  <div key={conflict.id} className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="w-full">
                      <h4 className="font-bold">{conflict.title}</h4>
                      <p>{conflict.description}</p>
                      {conflict.suggestedResolution && (
                        <p className="text-sm mt-1">建议: {conflict.suggestedResolution}</p>
                      )}
                      <div className="mt-2">
                        <div className="badge badge-sm badge-outline mr-2">{conflict.conflictType}</div>
                        <div className={`badge badge-sm ${
                          conflict.severity === 'critical' ? 'badge-error' :
                          conflict.severity === 'high' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {conflict.severity}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">权限变更历史</h4>
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>权限历史记录功能正在开发中...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 权限操作确认模态框 */}
      {showPermissionModal && selectedPermission && (
        <ConfirmModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setOperationReason('');
          }}
          onConfirm={executePermissionOperation}
          title={`${operationType === 'assign' ? '分配' : operationType === 'revoke' ? '撤销' : '覆盖'}权限`}
          confirmText={`确认${operationType === 'assign' ? '分配' : operationType === 'revoke' ? '撤销' : '覆盖'}`}
        >
          <div className="space-y-4">
            <p>
              您即将对权限 <strong>{selectedPermission.permissionName}</strong> 执行 
              <strong>{operationType === 'assign' ? '分配' : operationType === 'revoke' ? '撤销' : '覆盖'}</strong> 操作。
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">操作原因</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="请输入操作原因..."
                value={operationReason}
                onChange={(e) => setOperationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}