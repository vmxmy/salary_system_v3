import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import { usePermissions } from '@/hooks/permissions';
import type { UserWithPermissions } from '@/hooks/user-management/useUserManagement';
import { DataTable } from '@/components/common/DataTable';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  UserDetailModal,
  UserStatisticsCards,
  UserSearchFilters,
  UserBatchOperationsModal
} from '@/components/admin';
import { 
  UserPlusIcon, 
  UserCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * 用户管理页面
 * 
 * 功能特性：
 * - 基于 useUserManagement Hook 进行数据管理
 * - 集成权限系统进行访问控制
 * - 支持用户CRUD操作和批量管理
 * - 提供角色分配和权限管理界面
 */
export default function UserManagementPage() {
  const {
    // 数据
    users,
    selectedUsers,
    userStats,
    loading,
    error,
    filters,
    
    // 权限检查
    canManageUsers,
    canAssignRoles,
    canViewUserDetails,
    canDeactivateUsers,
    
    // 数据操作
    fetchUsers,
    getUserById,
    
    // 用户管理操作
    createUserProfile,
    updateUserProfile,
    deactivateUser,
    reactivateUser,
    
    // 角色管理操作
    assignUserRole,
    revokeUserRole,
    
    // 批量操作
    batchAssignRole,
    
    // 选择管理
    setSelectedUsers,
    selectAllUsers,
    clearSelection,
    toggleUserSelection,
    
    // 过滤和搜索
    applyFilters,
    clearFilters
  } = useUserManagement();

  // 页面状态
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isBatchOperationsOpen, setIsBatchOperationsOpen] = useState(false);

  // 权限系统集成
  const permissions = usePermissions({
    enableRoleManagement: true,
    enableResourceAccess: true
  });

  // 数据表格列定义
  const columnHelper = createDataTableColumnHelper<UserWithPermissions>();
  
  const columns = useMemo<ColumnDef<UserWithPermissions, any>[]>(() => [
    // 选择列
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    }),

    // 用户信息列
    columnHelper.accessor('email' as any, {
      header: '用户邮箱',
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-8 h-8 rounded-full">
              <span className="text-xs">
                {getValue()?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium">{getValue() || 'N/A'}</div>
            {row.original.employee_name && (
              <div className="text-sm text-base-content/70">
                {row.original.employee_name}
              </div>
            )}
          </div>
        </div>
      ),
    }),

    // 部门职位列
    columnHelper.accessor('department_name' as any, {
      header: '部门职位',
      cell: ({ row }) => (
        <div>
          {row.original.department_name && (
            <div className="font-medium text-sm">{row.original.department_name}</div>
          )}
          {row.original.position_name && (
            <div className="text-xs text-base-content/70">{row.original.position_name}</div>
          )}
        </div>
      ),
    }),

    // 角色列
    columnHelper.accessor('user_role' as any, {
      header: '用户角色',
      cell: ({ getValue, row }) => {
        const role = getValue();
        const metadata = row.original.role_metadata;
        const isActive = row.original.role_active;
        
        return (
          <div className="flex items-center gap-2">
            <div className={`badge badge-sm ${getRoleBadgeColor(role || '')}`}>
              {metadata?.role_name || role || 'N/A'}
            </div>
            {isActive === false && (
              <div className="badge badge-error badge-xs">
                未激活
              </div>
            )}
          </div>
        );
      },
    }),

    // 权限数量列
    columnHelper.accessor('permissions' as any, {
      header: '权限数量',
      cell: ({ getValue }) => {
        const permissions = getValue() || [];
        return (
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{permissions.length}</span>
            <span className="text-xs text-base-content/70">个权限</span>
          </div>
        );
      },
    }),

    // 数据范围列
    columnHelper.accessor('data_scope' as any, {
      header: '数据范围',
      cell: ({ getValue }) => {
        const scope = getValue();
        const scopeMap: Record<string, { label: string; color: string }> = {
          'self': { label: '仅自己', color: 'badge-neutral' },
          'department': { label: '部门', color: 'badge-info' },
          'all': { label: '全部', color: 'badge-success' }
        };
        const config = scopeMap[scope || ''] || { label: scope || 'N/A', color: 'badge-neutral' };
        
        return (
          <div className={`badge badge-sm ${config.color}`}>
            {config.label}
          </div>
        );
      },
    }),

    // 状态列
    columnHelper.display({
      id: 'status',
      header: '状态',
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.role_active && user.config_active;
        
        return (
          <div className={`badge badge-sm ${isActive ? 'badge-success' : 'badge-error'}`}>
            {isActive ? '正常' : '停用'}
          </div>
        );
      },
    }),

    // 操作列
    columnHelper.display({
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const user = row.original;
        
        return (
          <div className="flex items-center gap-2">
            {canViewUserDetails && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewUser(user);
                }}
                title="查看详情"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}
            
            {canManageUsers && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditUser(user);
                }}
                title="编辑用户"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            
            {canAssignRoles && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignRole(user);
                }}
                title="分配角色"
              >
                <UserCircleIcon className="w-4 h-4" />
              </button>
            )}
            
            {canDeactivateUsers && (
              <button
                className={`btn btn-ghost btn-xs ${user.role_active ? 'text-error' : 'text-success'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleUserStatus(user);
                }}
                title={user.role_active ? '停用用户' : '激活用户'}
              >
                {user.role_active ? (
                  <XMarkIcon className="w-4 h-4" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 150,
    }),
  ], [canViewUserDetails, canManageUsers, canAssignRoles, canDeactivateUsers]);

  // 事件处理函数
  const handleViewUser = useCallback((user: UserWithPermissions) => {
    setSelectedUser(user);
    setModalMode('view');
    setIsModalOpen(true);
  }, []);

  const handleEditUser = useCallback((user: UserWithPermissions) => {
    setSelectedUser(user);
    setModalMode('edit');
    setIsModalOpen(true);
  }, []);

  const handleAssignRole = useCallback((user: UserWithPermissions) => {
    setSelectedUser(user);
    setModalMode('edit'); // Use edit mode for role assignment
    setIsModalOpen(true);
  }, []);

  const handleToggleUserStatus = useCallback(async (user: UserWithPermissions) => {
    if (!user.user_id) return;
    
    try {
      if (user.role_active) {
        await deactivateUser(user.user_id);
      } else {
        await reactivateUser(user.user_id);
      }
    } catch (error) {
      console.error('切换用户状态失败:', error);
    }
  }, [deactivateUser, reactivateUser]);

  const handleCreateUser = useCallback(() => {
    setSelectedUser(null);
    setModalMode('create');
    setIsModalOpen(true);
  }, []);

  // 搜索和过滤处理
  const filteredData = useMemo(() => {
    let filtered = [...users];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.employee_name?.toLowerCase().includes(query) ||
        user.department_name?.toLowerCase().includes(query) ||
        user.position_name?.toLowerCase().includes(query) ||
        user.user_role?.toLowerCase().includes(query)
      );
    }

    // 角色过滤
    if (roleFilter) {
      filtered = filtered.filter(user => user.user_role === roleFilter);
    }

    // 状态过滤
    if (activeFilter !== undefined) {
      filtered = filtered.filter(user => user.role_active === activeFilter);
    }

    return filtered;
  }, [users, searchQuery, roleFilter, activeFilter]);

  // 获取所有角色列表（用于过滤）
  const availableRoles = useMemo(() => {
    const roles = new Set(users.map(user => user.user_role).filter(Boolean));
    return Array.from(roles) as string[];
  }, [users]);

  // 初始化数据加载
  useEffect(() => {
    if (canViewUserDetails) {
      fetchUsers();
    }
  }, [canViewUserDetails, fetchUsers]);

  // 权限检查 - 如果没有查看权限，显示无权限页面
  if (!canViewUserDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldCheckIcon className="w-16 h-16 text-base-content/30" />
        <h2 className="text-xl font-semibold text-base-content/70">权限不足</h2>
        <p className="text-base-content/50">您没有权限查看用户管理页面</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-base-content/70 mt-1">
            管理系统用户账户、角色和权限
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {canManageUsers && (
            <button
              className="btn btn-primary"
              onClick={handleCreateUser}
            >
              <UserPlusIcon className="w-4 h-4" />
              创建用户
            </button>
          )}
        </div>
      </div>

      {/* 用户统计卡片 */}
      <UserStatisticsCards />

      {/* 搜索和过滤器 */}
      <UserSearchFilters
        filters={{
          search: searchQuery,
          role: roleFilter,
          active: activeFilter
        }}
        onFiltersChange={(newFilters) => {
          if (newFilters.search !== undefined) setSearchQuery(newFilters.search);
          if (newFilters.role !== undefined) setRoleFilter(newFilters.role);
          if (newFilters.active !== undefined) setActiveFilter(newFilters.active);
        }}
        roles={availableRoles.map(role => ({ role_code: role, role_name: role }))}
        departments={[]} // 将通过Hook获取部门数据
      />

      {/* 批量操作栏 */}
      {selectedUsers.length > 0 && canManageUsers && (
        <div className="alert alert-info mb-4">
          <div className="flex-1">
            <span>已选择 {selectedUsers.length} 个用户</span>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setIsBatchOperationsOpen(true)}
            >
              批量操作
            </button>
            
            <button
              className="btn btn-sm btn-outline"
              onClick={clearSelection}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={filteredData}
            loading={loading}
            enableRowSelection={canManageUsers}
            onRowSelectionChange={(selection) => {
              const selectedUserIds = Object.keys(selection).filter(
                (key) => selection[key] && filteredData[parseInt(key)]
              ).map(key => filteredData[parseInt(key)].user_id).filter(Boolean) as string[];
              setSelectedUsers(selectedUserIds);
            }}
            emptyMessage={
              searchQuery || roleFilter || activeFilter !== undefined
                ? "没有找到符合条件的用户"
                : "暂无用户数据"
            }
            showToolbar={true}
            showGlobalFilter={false}
            showColumnToggle={true}
            striped={true}
            hover={true}
          />
        </div>
      </div>

      {/* 用户详情/编辑模态框 */}
      <UserDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser as any} // 类型转换可能需要调整
        mode={modalMode}
        onSave={async (userData) => {
          try {
            if (modalMode === 'create') {
              await createUserProfile(userData.email, userData.employee_id);
            } else if (modalMode === 'edit' && selectedUser?.user_id) {
              await updateUserProfile(selectedUser.user_id, userData);
            }
            setIsModalOpen(false);
            await fetchUsers(); // 刷新数据
          } catch (error) {
            console.error('保存用户信息失败:', error);
            throw error;
          }
        }}
      />

      {/* 批量操作模态框 */}
      <UserBatchOperationsModal
        isOpen={isBatchOperationsOpen}
        onClose={() => setIsBatchOperationsOpen(false)}
        selectedUserIds={selectedUsers}
        action="assign_role"
        selectedUsers={selectedUsers.map(userId => {
          const user = filteredData.find(u => u.user_id === userId);
          return user ? {
            id: user.user_id || '',
            email: user.email || '',
            employee_name: user.employee_name || undefined,
            role_names: user.user_role ? [user.user_role] : []
          } : {
            id: userId,
            email: `user-${userId}`,
            employee_name: undefined,
            role_names: []
          };
        })}
        availableRoles={availableRoles.map(role => ({ role_code: role, role_name: role }))}
        onConfirm={async (operation) => {
          try {
            if (operation.action === 'assign_role' && (operation.role || operation.parameters?.role)) {
              const roleToAssign = operation.role || operation.parameters?.role || '';
              await batchAssignRole(selectedUsers, roleToAssign);
            }
            setIsBatchOperationsOpen(false);
            clearSelection();
            await fetchUsers();
          } catch (error) {
            console.error('批量操作失败:', error);
            throw error;
          }
        }}
      />

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-end">
          <div className="alert alert-error">
            <span>{error.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 辅助函数：获取角色徽章颜色
function getRoleBadgeColor(role: string): string {
  const colorMap: Record<string, string> = {
    'super_admin': 'badge-error',
    'admin': 'badge-warning',
    'hr_manager': 'badge-info',
    'manager': 'badge-success',
    'employee': 'badge-neutral'
  };
  return colorMap[role] || 'badge-neutral';
}