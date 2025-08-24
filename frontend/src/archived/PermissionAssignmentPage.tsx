/**
 * 权限分配管理页面
 * 
 * 提供完整的权限分配与批量操作功能界面
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { PermissionAssignmentMatrix } from '@/components/permission-assignment/PermissionAssignmentMatrix';
import { BatchOperationPanel } from '@/components/permission-assignment/BatchOperationPanel';
import { UserPermissionSummary } from '@/components/permission-assignment/UserPermissionSummary';
import { PermissionConflictResolver } from '@/components/permission-assignment/PermissionConflictResolver';
import { PermissionHistoryViewer } from '@/components/permission-assignment/PermissionHistoryViewer';
import { usePermissionAssignment } from '@/hooks/permissions/usePermissionAssignment';
import { useBatchPermissionOperations } from '@/hooks/permissions/useBatchPermissionOperations';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import { useTranslation } from '@/hooks/useTranslation';
import type { 
  PermissionAssignment,
  PermissionConflict,
  UserPermissionSummary as UserPermSummary,
  BatchOperationResult
} from '@/types/permission-assignment';
import type { UserWithDetails } from '@/types/user-management';

interface ViewMode {
  type: 'list' | 'matrix' | 'summary';
  title: string;
  icon: string;
}

export function PermissionAssignmentPage() {
  const { t } = useTranslation();
  const {
    assignments,
    userSummaries,
    conflicts,
    loading: assignmentLoading,
    refreshData,
    calculateUserPermissions
  } = usePermissionAssignment();
  
  const { resetResults } = useBatchPermissionOperations();
  
  const {
    users,
    loading: usersLoading,
    loadUsers
  } = useUserManagement();

  // 状态管理
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode['type']>('list');
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConflicts, setFilterConflicts] = useState<'all' | 'conflicts' | 'no_conflicts'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'permissions' | 'conflicts' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 视图模式配置
  const viewModes: ViewMode[] = [
    { type: 'list', title: t('admin.permissions.listView'), icon: '📋' },
    { type: 'matrix', title: t('admin.permissions.matrixView'), icon: '📊' },
    { type: 'summary', title: t('admin.permissions.summaryView'), icon: '📈' }
  ];

  // 初始化数据加载
  useEffect(() => {
    loadUsers();
    refreshData();
  }, [loadUsers, refreshData]);

  // 构建用户权限列表数据
  const userPermissionList = useMemo(() => {
    if (!users.length || !userSummaries.length) return [];

    return users.map(user => {
      const summary = userSummaries.find(s => s.userId === user.id);
      const userConflicts = conflicts.filter(c => c.userId === user.id);
      
      return {
        id: user.id,
        userName: user.employees?.employee_name || user.email,
        email: user.email,
        primaryRole: user.user_roles?.[0]?.role || t('admin.users.noRole'),
        totalPermissions: summary?.totalPermissions || 0,
        rolePermissions: summary?.rolePermissions || 0,
        directPermissions: summary?.directPermissions || 0,
        overridePermissions: summary?.overridePermissions || 0,
        conflictCount: userConflicts.length,
        lastUpdated: summary?.lastUpdated || new Date(),
        isActive: user.user_roles?.some(r => r.is_active) || false
      };
    });
  }, [users, userSummaries, conflicts, t]);

  // 过滤和排序用户列表
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = userPermissionList;

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.userName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.primaryRole.toLowerCase().includes(query)
      );
    }

    // 冲突过滤
    if (filterConflicts !== 'all') {
      filtered = filtered.filter(user => 
        filterConflicts === 'conflicts' ? user.conflictCount > 0 : user.conflictCount === 0
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.userName;
          bValue = b.userName;
          break;
        case 'permissions':
          aValue = a.totalPermissions;
          bValue = b.totalPermissions;
          break;
        case 'conflicts':
          aValue = a.conflictCount;
          bValue = b.conflictCount;
          break;
        case 'updated':
          aValue = a.lastUpdated;
          bValue = b.lastUpdated;
          break;
        default:
          aValue = a.userName;
          bValue = b.userName;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
          : (bValue < aValue ? -1 : bValue > aValue ? 1 : 0);
      }
    });

    return filtered;
  }, [userPermissionList, searchQuery, filterConflicts, sortBy, sortOrder]);

  // DataTable 列配置
  const tableColumns = [
    {
      accessorKey: 'userName',
      header: t('admin.users.userName'),
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-8">
              <span className="text-xs">{row.original.userName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-bold">{row.original.userName}</div>
            <div className="text-sm opacity-50">{row.original.email}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'primaryRole',
      header: t('admin.users.role'),
      cell: ({ row }: any) => (
        <div className="badge badge-outline">{row.original.primaryRole}</div>
      )
    },
    {
      accessorKey: 'totalPermissions',
      header: t('admin.permissions.totalPermissions'),
      cell: ({ row }: any) => (
        <div className="text-right">
          <div className="font-mono">{row.original.totalPermissions}</div>
          <div className="text-xs text-base-content/60">
            角色:{row.original.rolePermissions} | 直接:{row.original.directPermissions} | 覆盖:{row.original.overridePermissions}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'conflictCount',
      header: t('admin.permissions.conflicts'),
      cell: ({ row }: any) => {
        const count = row.original.conflictCount;
        return (
          <div className={`badge ${count > 0 ? 'badge-error' : 'badge-success'}`}>
            {count > 0 ? `${count} 冲突` : '无冲突'}
          </div>
        );
      }
    },
    {
      accessorKey: 'lastUpdated',
      header: t('common.lastUpdated'),
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.lastUpdated).toLocaleDateString()}
        </div>
      )
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleViewUser(row.original.id)}
            title={t('admin.permissions.viewPermissions')}
          >
            👁️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEditUser(row.original.id)}
            title={t('admin.permissions.editPermissions')}
          >
            ✏️
          </button>
          {row.original.conflictCount > 0 && (
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => handleResolveConflicts(row.original.id)}
              title={t('admin.permissions.resolveConflicts')}
            >
              ⚠️
            </button>
          )}
        </div>
      )
    }
  ];

  // 处理用户查看
  const handleViewUser = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    if (currentView === 'list') {
      setCurrentView('matrix');
    }
  }, [currentView]);

  // 处理用户编辑
  const handleEditUser = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    if (currentView === 'list') {
      setCurrentView('summary');
    }
  }, [currentView]);

  // 处理冲突解决
  const handleResolveConflicts = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setShowConflictResolver(true);
  }, []);

  // 处理批量操作
  const handleBatchOperation = useCallback(() => {
    if (selectedUserIds.length === 0) {
      alert(t('admin.permissions.selectUsersForBatch'));
      return;
    }
    setShowBatchPanel(true);
  }, [selectedUserIds, t]);

  // 处理批量操作完成
  const handleBatchOperationComplete = useCallback((results: BatchOperationResult[]) => {
    setShowBatchPanel(false);
    refreshData();
    
    // 显示结果摘要
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    if (errorCount === 0) {
      alert(t('admin.permissions.batchOperationSuccess', { count: successCount }));
    } else {
      alert(t('admin.permissions.batchOperationPartial', { 
        success: successCount, 
        error: errorCount 
      }));
    }
    
    setSelectedUserIds([]);
  }, [refreshData, t]);

  // 处理用户选择
  const handleUserSelection = useCallback((selectedRowIds: string[]) => {
    setSelectedUserIds(selectedRowIds);
  }, []);

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex flex-wrap gap-4 items-center justify-between">
      {/* 左侧：搜索和过滤 */}
      <div className="flex gap-4 items-center">
        <div className="form-control">
          <input
            type="text"
            placeholder={t('admin.permissions.searchUsers')}
            className="input input-bordered input-sm w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="form-control">
          <select
            className="select select-bordered select-sm"
            value={filterConflicts}
            onChange={(e) => setFilterConflicts(e.target.value as any)}
          >
            <option value="all">{t('admin.permissions.allUsers')}</option>
            <option value="conflicts">{t('admin.permissions.usersWithConflicts')}</option>
            <option value="no_conflicts">{t('admin.permissions.usersWithoutConflicts')}</option>
          </select>
        </div>

        <div className="form-control">
          <select
            className="select select-bordered select-sm"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split(':');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
          >
            <option value="name:asc">{t('admin.permissions.sortByNameAsc')}</option>
            <option value="name:desc">{t('admin.permissions.sortByNameDesc')}</option>
            <option value="permissions:desc">{t('admin.permissions.sortByPermissionsDesc')}</option>
            <option value="conflicts:desc">{t('admin.permissions.sortByConflictsDesc')}</option>
            <option value="updated:desc">{t('admin.permissions.sortByUpdatedDesc')}</option>
          </select>
        </div>
      </div>

      {/* 右侧：视图切换和操作按钮 */}
      <div className="flex gap-2 items-center">
        {/* 视图模式切换 */}
        <div className="btn-group">
          {viewModes.map(mode => (
            <button
              key={mode.type}
              className={`btn btn-sm ${currentView === mode.type ? 'btn-active' : 'btn-outline'}`}
              onClick={() => setCurrentView(mode.type)}
              title={mode.title}
            >
              {mode.icon}
            </button>
          ))}
        </div>

        <div className="divider divider-horizontal"></div>

        {/* 批量操作按钮 */}
        <button
          className="btn btn-primary btn-sm"
          onClick={handleBatchOperation}
          disabled={selectedUserIds.length === 0}
        >
          批量操作 ({selectedUserIds.length})
        </button>

        {/* 其他操作按钮 */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowHistoryViewer(true)}
        >
          权限历史
        </button>

        {conflicts.length > 0 && (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => setShowConflictResolver(true)}
          >
            解决冲突 ({conflicts.length})
          </button>
        )}
      </div>
    </div>
  );

  // 渲染主要内容
  const renderMainContent = () => {
    const loading = assignmentLoading || usersLoading;

    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-2">{t('common.loading')}</span>
        </div>
      );
    }

    switch (currentView) {
      case 'matrix':
        return (
          <div className="space-y-4">
            {selectedUserId && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h4 className="font-bold">权限矩阵视图</h4>
                  <p>显示用户 {users.find(u => u.id === selectedUserId)?.employees?.employee_name} 的权限分配矩阵</p>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setSelectedUserId(null)}
                >
                  返回列表
                </button>
              </div>
            )}
            <PermissionAssignmentMatrix
              userId={selectedUserId || undefined}
              onAssignmentChange={(userId, permissionId, isGranted) => {
                // 处理权限分配变更
                refreshData();
              }}
              showConflicts={true}
              className="bg-base-100 rounded-lg shadow-sm p-6"
            />
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            {selectedUserId ? (
              <div className="space-y-4">
                <div className="alert alert-info">
                  <div>
                    <h4 className="font-bold">用户权限摘要</h4>
                    <p>详细查看和管理用户权限</p>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => setSelectedUserId(null)}
                  >
                    返回列表
                  </button>
                </div>
                <UserPermissionSummary 
                  userId={selectedUserId}
                  onPermissionChange={() => refreshData()}
                />
              </div>
            ) : (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>请从用户列表中选择一个用户来查看详细的权限摘要</span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-base-100 rounded-lg shadow-sm">
            <DataTable
              data={filteredAndSortedUsers}
              columns={tableColumns}
              enableSelection={true}
              onSelectionChange={handleUserSelection}
              enableFiltering={false}
              enableSorting={false}
              pageSize={20}
            />
          </div>
        );
    }
  };

  return (
    <ManagementPageLayout
      title={t('admin.permissions.assignmentManagement')}
      subtitle={t('admin.permissions.assignmentManagementDesc')}
    >
      <div className="space-y-6">
        {/* 工具栏 */}
        <div className="bg-base-100 rounded-lg shadow-sm p-4">
          {renderToolbar()}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">总用户数</div>
            <div className="stat-value text-primary">{users.length}</div>
            <div className="stat-desc">包含所有注册用户</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">权限分配</div>
            <div className="stat-value text-secondary">{assignments.length}</div>
            <div className="stat-desc">活跃权限分配记录</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">权限冲突</div>
            <div className="stat-value text-error">{conflicts.length}</div>
            <div className="stat-desc">需要解决的冲突</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">选中用户</div>
            <div className="stat-value text-accent">{selectedUserIds.length}</div>
            <div className="stat-desc">可执行批量操作</div>
          </div>
        </div>

        {/* 主要内容 */}
        {renderMainContent()}
      </div>

      {/* 批量操作面板 */}
      {showBatchPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto m-4">
            <BatchOperationPanel
              selectedUserIds={selectedUserIds}
              onOperationComplete={handleBatchOperationComplete}
              onClose={() => setShowBatchPanel(false)}
            />
          </div>
        </div>
      )}

      {/* 冲突解决器 */}
      {showConflictResolver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-auto m-4">
            <PermissionConflictResolver
              userId={selectedUserId || undefined}
              onConflictResolved={() => {
                refreshData();
                setShowConflictResolver(false);
              }}
              onClose={() => setShowConflictResolver(false)}
            />
          </div>
        </div>
      )}

      {/* 权限历史查看器 */}
      {showHistoryViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-auto m-4">
            <PermissionHistoryViewer
              userId={selectedUserId || undefined}
              onClose={() => setShowHistoryViewer(false)}
            />
          </div>
        </div>
      )}
    </ManagementPageLayout>
  );
}

export default PermissionAssignmentPage;