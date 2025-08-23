/**
 * 用户管理页面
 * 
 * 基于 DaisyUI 5 的现代化用户管理界面，支持响应式布局和完整的用户操作功能
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import { useEnhancedPermission } from '@/hooks/permissions/useEnhancedPermission';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Toast } from '@/components/common/Toast';
import { UserDetailModal, UserBatchOperationsModal, UserSearchFilters, UserStatisticsCards } from '@/components/admin';
import { createColumnHelper } from '@tanstack/react-table';
import type { UserWithDetails, BatchUserAction, UserSearchFilters as SearchFilters } from '@/types/user-management';

// 表格列配置
const columnHelper = createColumnHelper<UserWithDetails>();

export function UserManagementPage() {
  const { t } = useTranslation('admin');
  const { hasPermission, hasAnyPermission } = useEnhancedPermission();
  
  const {
    users,
    total,
    loading,
    error,
    pagination,
    filters,
    searchUsers,
    sortUsers,
    changePage,
    changePageSize,
    createUser,
    updateUser,
    deleteUser,
    performBatchOperation,
    refreshUsers
  } = useUserManagement({
    enableRealtime: true,
    pageSize: 25
  });

  // 页面状态管理
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [batchAction, setBatchAction] = useState<BatchUserAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Toast 状态
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showToast, setShowToast] = useState(false);

  // 显示 Toast 消息
  const showToastMessage = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  // 表格列定义
  const columns = useMemo(() => [
    // 选择列
    ...(hasPermission('user:batch_operation') ? [{
      id: 'select',
      header: ({ table }: any) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label={t('common.selectAll')}
        />
      ),
      cell: ({ row }: any) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={t('common.selectRow')}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 40
    }] : []),

    // 用户信息列
    columnHelper.accessor('email', {
      id: 'email',
      header: t('user.email'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8">
              <span className="text-xs font-bold">
                {row.original.employee_name?.[0] || row.original.email[0].toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm">{row.original.email}</div>
            {row.original.employee_name && (
              <div className="text-xs text-base-content/60">{row.original.employee_name}</div>
            )}
          </div>
        </div>
      ),
      size: 250
    }),

    // 部门和职位
    columnHelper.accessor('department_name', {
      id: 'department',
      header: t('user.department'),
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.department_name || '-'}</div>
          {row.original.position_name && (
            <div className="text-xs text-base-content/60">{row.original.position_name}</div>
          )}
        </div>
      ),
      size: 200
    }),

    // 角色列
    columnHelper.accessor('role_names', {
      id: 'roles',
      header: t('user.roles'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.role_names || []).map((role, index) => (
            <span key={index} className="badge badge-primary badge-sm">
              {t(`role.${role}`, role)}
            </span>
          ))}
        </div>
      ),
      enableSorting: false,
      size: 150
    }),

    // 状态列
    columnHelper.accessor('status', {
      id: 'status',
      header: t('user.status'),
      cell: ({ row }) => {
        const statusConfig = {
          active: { class: 'badge-success', text: t('user.status.active') },
          inactive: { class: 'badge-warning', text: t('user.status.inactive') },
          suspended: { class: 'badge-error', text: t('user.status.suspended') }
        };
        const config = statusConfig[row.original.status];
        
        return (
          <span className={`badge badge-sm ${config.class}`}>
            {config.text}
          </span>
        );
      },
      filterFn: 'equals',
      size: 100
    }),

    // 创建时间列
    columnHelper.accessor('created_at', {
      id: 'created_at',
      header: t('user.createdAt'),
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : '-';
      },
      size: 120
    }),

    // 操作列
    columnHelper.display({
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          {hasPermission('user:view') && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleViewUser(row.original)}
              title={t('common.view')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}

          {hasPermission('user:update') && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleEditUser(row.original)}
              title={t('common.edit')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {hasPermission('user:delete') && (
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => handleDeleteUser(row.original)}
              title={t('common.delete')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ),
      size: 120,
      enableSorting: false
    })
  ], [hasPermission, t]);

  // 事件处理函数
  const handleViewUser = useCallback((user: UserWithDetails) => {
    setEditingUser(user);
    setShowEditModal(true);
  }, []);

  const handleEditUser = useCallback((user: UserWithDetails) => {
    setEditingUser(user);
    setShowEditModal(true);
  }, []);

  const handleDeleteUser = useCallback((user: UserWithDetails) => {
    setConfirmMessage(t('user.confirmDelete', { email: user.email }));
    setConfirmAction(() => async () => {
      try {
        await deleteUser(user.id);
        showToastMessage(t('user.deleteSuccess'), 'success');
      } catch (err) {
        showToastMessage(t('user.deleteError'), 'error');
      }
    });
    setShowConfirmModal(true);
  }, [deleteUser, t, showToastMessage]);

  const handleCreateUser = useCallback(() => {
    setEditingUser(null);
    setShowCreateModal(true);
  }, []);

  const handleBatchAction = useCallback((action: BatchUserAction) => {
    if (selectedUsers.length === 0) {
      showToastMessage(t('user.noUsersSelected'), 'error');
      return;
    }
    setBatchAction(action);
    setShowBatchModal(true);
  }, [selectedUsers, t, showToastMessage]);

  const handleSearchChange = useCallback((newFilters: SearchFilters) => {
    searchUsers(newFilters);
  }, [searchUsers]);

  const handleRefresh = useCallback(() => {
    refreshUsers();
    showToastMessage(t('common.refreshed'), 'success');
  }, [refreshUsers, showToastMessage, t]);

  // 检查页面访问权限
  if (!hasAnyPermission(['user:list', 'user:view', 'user:manage'])) {
    return (
      <div className="page-compact">
        <div className="alert alert-error">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{t('common.accessDenied')}</span>
        </div>
      </div>
    );
  }

  // 加载状态
  if (loading && users.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-compact">
      {/* 页面标题 */}
      <PageHeader
        title={t('user.management')}
        subtitle={t('user.managementDescription')}
        breadcrumbs={[
          { label: t('nav.admin'), href: '/admin' },
          { label: t('nav.userManagement') }
        ]}
      />

      {/* 统计卡片 */}
      <UserStatisticsCards />

      {/* 搜索过滤器 */}
      <div className="card card-compact bg-base-100 shadow mb-6">
        <div className="card-body">
          <UserSearchFilters
            filters={filters}
            onFiltersChange={handleSearchChange}
          />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="card card-compact bg-base-100 shadow">
        {/* 工具栏 */}
        <div className="card-body toolbar-compact pb-2">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            {/* 左侧操作按钮 */}
            <div className="flex flex-wrap gap-2">
              {hasPermission('user:create') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateUser}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('user.create')}
                </button>
              )}

              {hasPermission('user:batch_operation') && selectedUsers.length > 0 && (
                <div className="dropdown">
                  <div tabIndex={0} role="button" className="btn btn-secondary btn-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('user.batchActions')} ({selectedUsers.length})
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => handleBatchAction('activate')}>{t('user.batchActivate')}</a></li>
                    <li><a onClick={() => handleBatchAction('deactivate')}>{t('user.batchDeactivate')}</a></li>
                    <li><a onClick={() => handleBatchAction('assign_role')}>{t('user.batchAssignRole')}</a></li>
                    <li><hr className="my-1" /></li>
                    <li><a onClick={() => handleBatchAction('delete')} className="text-error">{t('user.batchDelete')}</a></li>
                  </ul>
                </div>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('common.refresh')}
              </button>
            </div>

            {/* 右侧视图切换 */}
            <div className="join">
              <button
                className={`btn btn-sm join-item ${viewMode === 'table' ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setViewMode('table')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t('common.table')}
              </button>
              <button
                className={`btn btn-sm join-item ${viewMode === 'grid' ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {t('common.grid')}
              </button>
            </div>
          </div>
        </div>

        {/* 数据表格 */}
        {viewMode === 'table' ? (
          <div className="card-body pt-0">
            <DataTable
              columns={columns}
              data={users}
              totalRows={total}
              currentPage={pagination.page}
              pageCount={pagination.totalPages}
              onPaginationChange={({ pageIndex, pageSize }) => {
                changePage(pageIndex + 1);
                changePageSize(pageSize);
              }}
              onRowSelectionChange={setSelectedUsers}
              enableRowSelection={hasPermission('user:batch_operation')}
              loading={loading}
              emptyMessage={t('user.noUsersFound')}
              striped
              hover
              compact
            />
          </div>
        ) : (
          // 网格视图（简化版）
          <div className="card-body pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {users.map(user => (
                <div key={user.id} className="card card-compact bg-base-200 hover:bg-base-300 transition-colors">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                          <span className="font-bold">
                            {user.employee_name?.[0] || user.email[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{user.email}</div>
                        {user.employee_name && (
                          <div className="text-xs text-base-content/60 truncate">{user.employee_name}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(user.role_names || []).map((role, index) => (
                        <span key={index} className="badge badge-primary badge-xs">
                          {t(`role.${role}`, role)}
                        </span>
                      ))}
                    </div>
                    
                    <div className="card-actions justify-end">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleViewUser(user)}
                      >
                        {t('common.view')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showCreateModal && (
        <UserDetailModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={createUser}
          mode="create"
        />
      )}

      {showEditModal && editingUser && (
        <UserDetailModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={updateUser}
          user={editingUser}
          mode="edit"
        />
      )}

      {showBatchModal && batchAction && (
        <UserBatchOperationsModal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          onConfirm={performBatchOperation}
          action={batchAction}
          selectedUserIds={selectedUsers}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => {
            confirmAction?.();
            setShowConfirmModal(false);
          }}
          title={t('common.confirm')}
          message={confirmMessage}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          type="danger"
        />
      )}

      {/* Toast 通知 */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-top toast-end">
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}