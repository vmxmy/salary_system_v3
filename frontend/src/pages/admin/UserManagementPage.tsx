/**
 * 用户管理页面 V2 - 基于新权限系统的完全重构版本
 * 
 * 核心特性：
 * - 基于修复后的 usePermission hook 进行权限控制
 * - 现代化的响应式UI设计
 * - 实时数据同步和缓存管理  
 * - 细粒度权限控制和资源访问管理
 * - 综合的错误处理和用户体验优化
 * 
 * 技术栈：
 * - React 19 + TypeScript 5.8
 * - DaisyUI 5 组件库
 * - TanStack Table v8 数据表格
 * - 统一权限管理系统
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { useResourceAccess } from '@/hooks/permissions/useResourceAccess';
import { useDynamicPermissions } from '@/hooks/permissions/useDynamicPermissions';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { DataTable } from '@/components/common/DataTable';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import type { ColumnDef, HeaderContext, CellContext } from '@tanstack/react-table';
import type { UserWithPermissions, UserManagementFilters } from '@/hooks/user-management/useUserManagement';
import type { Permission } from '@/types/permission';
import type { DynamicPermission } from '@/services/dynamicPermissionService';
import { cardEffects } from '@/lib/utils';

// 懒加载模态框组件
import { lazy } from 'react';
const UserDetailsModal = lazy(() => import('@/components/admin/UserDetailsModal'));
const UserEditModal = lazy(() => import('@/components/admin/UserEditModal'));
const UserCreateModal = lazy(() => import('@/components/admin/UserCreateModal'));
const UserBatchActionsModal = lazy(() => import('@/components/admin/UserBatchActionsModal'));

// Icons
import {
  UserIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

/**
 * 用户管理页面权限配置 - 基于动态权限系统
 */
import { PERMISSIONS } from '@/constants/permissions';

// 权限代码映射（与动态权限系统保持一致）
const USER_MANAGEMENT_PERMISSION_CODES = {
  READ_USERS: 'user_management.read',
  CREATE_USERS: 'user_management.write',
  UPDATE_USERS: 'user_management.write', 
  DELETE_USERS: 'user_management.write',
  ASSIGN_ROLES: 'assign_roles', // 角色分配使用独立权限
  MANAGE_PERMISSIONS: 'manage_role_permissions', // 权限管理使用独立权限
  EXPORT_USERS: 'user_management.read',
  BATCH_OPERATIONS: 'user_management.write'
} as const;

/**
 * 用户状态常量
 */
const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
} as const;

/**
 * 用户角色配置
 */
const USER_ROLES = {
  SUPER_ADMIN: { code: 'super_admin', name: '超级管理员', level: 1, color: 'badge-error' },
  ADMIN: { code: 'admin', name: '系统管理员', level: 2, color: 'badge-warning' },
  HR_MANAGER: { code: 'hr_manager', name: '人事经理', level: 3, color: 'badge-info' },
  MANAGER: { code: 'manager', name: '部门经理', level: 4, color: 'badge-success' },
  EMPLOYEE: { code: 'employee', name: '普通员工', level: 5, color: 'badge-neutral' }
} as const;

/**
 * 数据范围配置
 */
const DATA_SCOPES = {
  ALL: { code: 'all', name: '全部数据', color: 'badge-success', icon: '🌍' },
  DEPARTMENT: { code: 'department', name: '部门数据', color: 'badge-info', icon: '🏢' },
  TEAM: { code: 'team', name: '团队数据', color: 'badge-warning', icon: '👥' },
  SELF: { code: 'self', name: '个人数据', color: 'badge-neutral', icon: '👤' }
} as const;

/**
 * 用户管理页面主组件
 */
export default function UserManagementPage() {
  const { user: currentUser } = useUnifiedAuth();
  
  // 权限管理 hooks
  const permission = usePermission({
    enableCache: true,
    watchChanges: true,
    fallbackResult: false,
    throwOnError: false
  });

  const userResource = useResourceAccess({
    resourceType: 'employee',
    scope: 'all',
    checkOwnership: false
  });

  // 不再需要 useDynamicPermissions，使用统一的 usePermission Hook

  // 用户数据管理
  const userManagement = useUserManagement();

  // 页面状态
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<UserManagementFilters>({
    search: '',
    role: undefined,
    active: undefined,
    sortBy: 'email',
    sortOrder: 'asc'
  });
  const [searchInput, setSearchInput] = useState(''); // 分离输入状态用于防抖
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 模态框状态
  const [modals, setModals] = useState({
    userDetails: { open: false, userId: null as string | null },
    userEdit: { open: false, user: null as UserWithPermissions | null },
    userCreate: { open: false },
    batchActions: { open: false }
  });

  // 权限检查状态
  const [permissions, setPermissions] = useState({
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canAssignRoles: false,
    canManagePermissions: false,
    canExport: false,
    canBatchOperation: false
  });

  /**
   * 搜索防抖效果
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300); // 300ms 防抖延迟

    return () => clearTimeout(timer);
  }, [searchInput]);

  /**
   * 初始化权限检查 - 使用统一的 usePermission Hook (修复版本，避免无限循环)
   */
  useEffect(() => {
    // 等待权限系统初始化完成后直接进行权限检查
    if (currentUser?.id && permission.initialized) {
      try {
        setIsLoading(true);
        
        // 直接使用同步权限检查，避免异步状态更新循环
        const newPermissions = {
          canRead: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.READ_USERS),
          canCreate: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.CREATE_USERS),
          canUpdate: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.UPDATE_USERS),
          canDelete: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.DELETE_USERS),
          canAssignRoles: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.ASSIGN_ROLES),
          canManagePermissions: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.MANAGE_PERMISSIONS),
          canExport: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.EXPORT_USERS),
          canBatchOperation: permission.hasPermission(USER_MANAGEMENT_PERMISSION_CODES.BATCH_OPERATIONS)
        };
        
        setPermissions(newPermissions);
        setError(null);
        console.debug('[UserManagementPage] 权限检查完成:', newPermissions);

      } catch (err) {
        console.error('[UserManagementPage] 权限检查失败:', err);
        setError(err instanceof Error ? err : new Error('权限检查失败'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser?.id, permission.initialized]); // 移除不稳定的函数依赖

  /**
   * 数据表格列定义
   */
  const columnHelper = createDataTableColumnHelper<UserWithPermissions>();
  
  const columns = useMemo(() => {
    const cols: ColumnDef<UserWithPermissions, any>[] = [];
    
    // 选择列
    if (permissions.canBatchOperation) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <label className="label cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </label>
        ),
        cell: ({ row }) => (
          <label className="label cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      });
    }

    // 用户信息列
    cols.push(
      columnHelper.accessor('email', {
        id: 'user_info',
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <button
              className="flex items-center gap-1 hover:text-primary"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label="按用户信息排序"
              aria-sort={
                column.getIsSorted() === 'asc' ? 'ascending' : 
                column.getIsSorted() === 'desc' ? 'descending' : 'none'
              }
            >
              用户信息
              <BoltIcon className="w-3 h-3" />
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <UserInfoCell user={row.original} />
        ),
        enableSorting: true,
        sortingFn: 'alphanumeric',
      })
    );

    // 角色和权限列
    cols.push(
      columnHelper.accessor('user_role', {
        id: 'role_permissions',
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4" />
            <button
              className="flex items-center gap-1 hover:text-primary"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label="按角色权限排序"
              aria-sort={
                column.getIsSorted() === 'asc' ? 'ascending' : 
                column.getIsSorted() === 'desc' ? 'descending' : 'none'
              }
            >
              角色权限
              <BoltIcon className="w-3 h-3" />
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <RolePermissionsCell user={row.original} />
        ),
        enableSorting: true,
      })
    );

    // 部门职位列
    cols.push(
      columnHelper.accessor('department_name', {
        id: 'organization',
        header: '组织架构',
        cell: ({ row }) => (
          <OrganizationCell user={row.original} />
        ),
        enableSorting: true,
      })
    );

    // 状态列
    cols.push(
      columnHelper.display({
        id: 'status',
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            状态
          </div>
        ),
        cell: ({ row }) => (
          <StatusCell user={row.original} />
        ),
      })
    );

    // 最后活动时间列
    cols.push(
      columnHelper.accessor('last_sign_in_at', {
        id: 'last_activity',
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            <button
              className="flex items-center gap-1 hover:text-primary"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label="按最后活动时间排序"
              aria-sort={
                column.getIsSorted() === 'asc' ? 'ascending' : 
                column.getIsSorted() === 'desc' ? 'descending' : 'none'
              }
            >
              最后活动
              <BoltIcon className="w-3 h-3" />
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <LastActivityCell user={row.original} />
        ),
        enableSorting: true,
      })
    );

    // 操作列
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <ActionsCell 
            user={row.original} 
            permissions={permissions}
            onViewDetails={(userId) => setModals(prev => ({
              ...prev,
              userDetails: { open: true, userId }
            }))}
            onEditUser={(user) => setModals(prev => ({
              ...prev,
              userEdit: { open: true, user }
            }))}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 120,
      })
    );

    return cols;
  }, [permissions, columnHelper]);

  /**
   * 过滤后的用户数据 - 性能优化版本
   */
  const filteredData = useMemo(() => {
    const users = userManagement.users || [];
    if (!users.length) return [];

    // 预计算搜索条件以提高性能
    const searchQuery = filters.search?.trim()?.toLowerCase();
    const hasSearchFilter = Boolean(searchQuery);
    const hasRoleFilter = Boolean(filters.role);
    const hasActiveFilter = filters.active !== undefined;

    // 如果没有任何过滤条件，直接返回原数据
    if (!hasSearchFilter && !hasRoleFilter && !hasActiveFilter) {
      return users;
    }

    // 单次遍历应用所有过滤条件
    return users.filter(user => {
      // 搜索过滤
      if (hasSearchFilter && searchQuery) {
        const matchesSearch = 
          user.email?.toLowerCase().includes(searchQuery) ||
          user.employee_name?.toLowerCase().includes(searchQuery) ||
          user.department_name?.toLowerCase().includes(searchQuery) ||
          user.position_name?.toLowerCase().includes(searchQuery);
        if (!matchesSearch) return false;
      }

      // 角色过滤
      if (hasRoleFilter && filters.role) {
        if (user.user_role !== filters.role) return false;
      }

      // 状态过滤
      if (hasActiveFilter) {
        if (user.role_active !== filters.active) return false;
      }

      return true;
    });
  }, [userManagement.users, filters]);

  /**
   * 统计数据
   */
  const stats = useMemo(() => {
    const data = userManagement.users || [];
    return {
      total: data.length,
      active: data.filter(u => u.role_active && u.config_active).length,
      inactive: data.filter(u => !u.role_active || !u.config_active).length,
      byRole: Object.values(USER_ROLES).map(role => ({
        ...role,
        count: data.filter(u => u.user_role === role.code).length
      }))
    };
  }, [userManagement.users]);

  /**
   * 处理批量选择
   */
  const handleBatchSelection = useCallback((selection: Record<string, boolean>) => {
    const selected = new Set(
      Object.entries(selection)
        .filter(([, selected]) => selected)
        .map(([index]) => filteredData[parseInt(index)]?.user_id)
        .filter(Boolean) as string[]
    );
    setSelectedUsers(selected);
  }, [filteredData]);

  /**
   * 权限检查失败时的显示组件
   */
  if (!permissions.canRead && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-warning mb-4" />
          <h2 className="text-2xl font-bold mb-2">访问受限</h2>
          <p className="text-base-content/70 mb-6">
            您没有权限访问用户管理页面。请联系系统管理员申请相应权限。
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.history.back()}
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  /**
   * 加载状态 - 包括权限系统加载
   */
  if (isLoading || permission.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">
            {permission.loading ? '正在加载权限数据...' : '正在加载用户数据...'}
          </p>
        </div>
      </div>
    );
  }

  /**
   * 权限系统错误状态
   */
  if (permission.error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold mb-2">权限系统错误</h2>
          <p className="text-base-content/70 mb-6">
            权限数据加载失败: {permission.error.message}
          </p>
          <div className="flex justify-center gap-4">
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => window.history.back()}
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面头部 */}
      <PageHeader 
        stats={stats}
        permissions={permissions}
        onCreateUser={() => setModals(prev => ({ ...prev, userCreate: { open: true } }))}
        onBatchActions={() => setModals(prev => ({ ...prev, batchActions: { open: true } }))}
        selectedCount={selectedUsers.size}
      />

      {/* 搜索过滤器 */}
      <SearchFilters 
        filters={filters}
        searchInput={searchInput}
        onFiltersChange={setFilters}
        onSearchInputChange={setSearchInput}
        availableRoles={Object.values(USER_ROLES)}
      />

      {/* 批量操作提示 */}
      {selectedUsers.size > 0 && permissions.canBatchOperation && (
        <BatchSelectionAlert 
          selectedCount={selectedUsers.size}
          onBatchActions={() => setModals(prev => ({ ...prev, batchActions: { open: true } }))}
          onClearSelection={() => setSelectedUsers(new Set())}
        />
      )}

      {/* 数据表格 */}
      <div className={cardEffects.modern}>
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={filteredData}
            loading={userManagement.loading}
            enableRowSelection={permissions.canBatchOperation}
            onRowSelectionChange={handleBatchSelection}
            emptyMessage={getEmptyMessage(filters)}
            showToolbar={true}
            showGlobalFilter={false}
            showColumnToggle={true}
            striped={true}
            hover={true}
            initialPagination={{ pageIndex: 0, pageSize: 20 }}
          />
        </div>
      </div>

      {/* 模态框 */}
      <Suspense fallback={<div className="loading loading-spinner loading-sm"></div>}>
        {/* 用户详情模态框 */}
        {modals.userDetails.open && (
          <UserDetailsModal
            isOpen={modals.userDetails.open}
            userId={modals.userDetails.userId}
            user={userManagement.users.find(u => u.user_id === modals.userDetails.userId) || null}
            onClose={() => setModals(prev => ({ ...prev, userDetails: { open: false, userId: null } }))}
            permissions={permissions}
            onRefresh={() => userManagement.fetchUsers()}
          />
        )}

        {/* 用户编辑模态框 */}
        {modals.userEdit.open && (
          <UserEditModal
            isOpen={modals.userEdit.open}
            user={modals.userEdit.user}
            onClose={() => setModals(prev => ({ ...prev, userEdit: { open: false, user: null } }))}
            onSuccess={() => {
              userManagement.fetchUsers();
              setModals(prev => ({ ...prev, userEdit: { open: false, user: null } }));
            }}
            permissions={permissions}
          />
        )}

        {/* 用户创建模态框 */}
        {modals.userCreate.open && (
          <UserCreateModal
            isOpen={modals.userCreate.open}
            employees={[]} // TODO: 从 hook 获取员工列表
            availableRoles={Object.values(USER_ROLES)}
            onClose={() => setModals(prev => ({ ...prev, userCreate: { open: false } }))}
            onSuccess={() => {
              userManagement.fetchUsers();
              setModals(prev => ({ ...prev, userCreate: { open: false } }));
            }}
            onCreateUser={async (userData) => {
              await userManagement.createUserProfile(userData.email, userData.employee_id);
              if (userData.role) {
                // TODO: 分配角色
              }
            }}
          />
        )}

        {/* 批量操作模态框 */}
        {modals.batchActions.open && (
          <UserBatchActionsModal
            isOpen={modals.batchActions.open}
            selectedUserIds={Array.from(selectedUsers)}
            selectedUsers={Array.from(selectedUsers).map(userId => {
              const user = userManagement.users.find(u => u.user_id === userId);
              return {
                user_id: userId,
                email: user?.email || '',
                employee_name: user?.employee_name || undefined,
                current_role: user?.user_role || undefined,
                current_scope: user?.data_scope || undefined,
                is_active: (user?.role_active && user?.config_active) || false
              };
            })}
            availableRoles={Object.values(USER_ROLES)}
            onClose={() => setModals(prev => ({ ...prev, batchActions: { open: false } }))}
            onSuccess={() => {
              userManagement.fetchUsers();
              setSelectedUsers(new Set());
              setModals(prev => ({ ...prev, batchActions: { open: false } }));
            }}
            onBatchOperation={async (operation, userIds) => {
              if (operation.action === 'assign_role' && operation.parameters?.role) {
                await userManagement.batchAssignRole(userIds, operation.parameters.role);
              }
              // TODO: 实现其他批量操作
            }}
          />
        )}
      </Suspense>

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-end">
          <div className="alert alert-error">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 页面头部组件
 */
interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Array<{ code: string; name: string; level: number; color: string; count: number }>;
}

interface UserPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssignRoles: boolean;
  canManagePermissions: boolean;
  canExport: boolean;
  canBatchOperation: boolean;
}

interface PageHeaderProps {
  stats: UserStats;
  permissions: UserPermissions;
  onCreateUser: () => void;
  onBatchActions: () => void;
  selectedCount: number;
}

function PageHeader({ stats, permissions, onCreateUser, onBatchActions, selectedCount }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      {/* 标题和统计 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-primary" />
          用户管理
        </h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-base-content/70">
          <span className="flex items-center gap-1">
            <ChartBarSquareIcon className="w-4 h-4" />
            总计 {stats.total} 名用户
          </span>
          <span className="flex items-center gap-1">
            <CheckCircleIcon className="w-4 h-4 text-success" />
            {stats.active} 名活跃
          </span>
          <span className="flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4 text-warning" />
            {stats.inactive} 名停用
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        {selectedCount > 0 && permissions.canBatchOperation && (
          <button
            className="btn btn-outline btn-sm"
            onClick={onBatchActions}
            aria-label={`对已选择的${selectedCount}个用户执行批量操作`}
          >
            批量操作 ({selectedCount})
          </button>
        )}
        
        {permissions.canCreate && (
          <button
            className="btn btn-primary"
            onClick={onCreateUser}
            aria-label="创建新用户"
          >
            <UserPlusIcon className="w-4 h-4" />
            创建用户
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 搜索过滤器组件
 */
interface SearchFiltersProps {
  filters: UserManagementFilters;
  searchInput: string;
  onFiltersChange: (filters: UserManagementFilters) => void;
  onSearchInputChange: (search: string) => void;
  availableRoles: Array<{ code: string; name: string }>;
}

function SearchFilters({ filters, searchInput, onFiltersChange, onSearchInputChange, availableRoles }: SearchFiltersProps) {
  return (
    <div className={cardEffects.modern}>
      <div className="card-body">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="form-control">
              <div className="join w-full">
                <input
                  type="text"
                  placeholder="搜索用户邮箱、姓名、部门..."
                  className="input input-bordered join-item flex-1"
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                />
                <button className="btn btn-square join-item" aria-label="搜索用户">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 角色过滤 */}
          <div className="form-control">
            <select
              className="select select-bordered"
              value={filters.role || ''}
              onChange={(e) => onFiltersChange({ ...filters, role: e.target.value || undefined })}
            >
              <option value="">全部角色</option>
              {availableRoles.map(role => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* 状态过滤 */}
          <div className="form-control">
            <select
              className="select select-bordered"
              value={filters.active === undefined ? '' : filters.active.toString()}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                active: e.target.value === '' ? undefined : e.target.value === 'true' 
              })}
            >
              <option value="">全部状态</option>
              <option value="true">活跃</option>
              <option value="false">停用</option>
            </select>
          </div>

          {/* 清除过滤器 */}
          <button
            className="btn btn-ghost"
            onClick={() => {
              onFiltersChange({ search: '', role: undefined, active: undefined });
              onSearchInputChange('');
            }}
            aria-label="清除所有过滤条件"
          >
            <FunnelIcon className="w-4 h-4" />
            清除
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 批量选择提示组件
 */
interface BatchSelectionAlertProps {
  selectedCount: number;
  onBatchActions: () => void;
  onClearSelection: () => void;
}

function BatchSelectionAlert({ selectedCount, onBatchActions, onClearSelection }: BatchSelectionAlertProps) {
  return (
    <div className="alert alert-info">
      <div className="flex-1">
        <span>已选择 {selectedCount} 名用户</span>
      </div>
      <div className="flex gap-2">
        <button 
          className="btn btn-sm btn-primary" 
          onClick={onBatchActions}
          aria-label={`对已选择的${selectedCount}个用户执行批量操作`}
        >
          批量操作
        </button>
        <button 
          className="btn btn-sm btn-outline" 
          onClick={onClearSelection}
          aria-label="取消选择所有用户"
        >
          取消选择
        </button>
      </div>
    </div>
  );
}

/**
 * 表格单元格组件
 */
function UserInfoCell({ user }: { user: UserWithPermissions }) {
  return (
    <div className="flex items-center gap-3">
      <div className="avatar avatar-placeholder">
        <div className="bg-primary text-primary-content w-10 h-10 rounded-full">
          <span className="text-sm font-medium">
            {user.email?.charAt(0)?.toUpperCase() || user.employee_name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
      <div>
        <div className="font-medium text-sm">{user.email}</div>
        {user.employee_name && (
          <div className="text-xs text-base-content/70">{user.employee_name}</div>
        )}
      </div>
    </div>
  );
}

function RolePermissionsCell({ user }: { user: UserWithPermissions }) {
  const roleConfig = Object.values(USER_ROLES).find(r => r.code === user.user_role);
  const scopeConfig = Object.values(DATA_SCOPES).find(s => s.code === user.data_scope);
  
  return (
    <div className="space-y-1">
      <div className={`badge badge-sm ${roleConfig?.color || 'badge-neutral'}`}>
        {roleConfig?.name || user.user_role || 'N/A'}
      </div>
      {scopeConfig && (
        <div className={`badge badge-xs ${scopeConfig.color}`}>
          {scopeConfig.icon} {scopeConfig.name}
        </div>
      )}
      {user.permissions && (
        <div className="text-xs text-base-content/70">
          {user.permissions.length} 个权限
        </div>
      )}
    </div>
  );
}

function OrganizationCell({ user }: { user: UserWithPermissions }) {
  return (
    <div>
      {user.department_name && (
        <div className="font-medium text-sm">{user.department_name}</div>
      )}
      {user.position_name && (
        <div className="text-xs text-base-content/70">{user.position_name}</div>
      )}
    </div>
  );
}

function StatusCell({ user }: { user: UserWithPermissions }) {
  const isActive = user.role_active && user.config_active;
  
  return (
    <div className={`badge badge-sm ${isActive ? 'badge-success' : 'badge-error'}`}>
      {isActive ? '正常' : '停用'}
    </div>
  );
}

function LastActivityCell({ user }: { user: UserWithPermissions }) {
  // 优先使用最后登录时间，如果没有则使用用户更新时间或角色分配时间
  const activityTime = user.last_sign_in_at || user.user_updated_at || user.role_assigned_at;
  
  return (
    <div className="space-y-1">
      <div className="text-sm text-base-content/70">
        {activityTime ? new Date(activityTime).toLocaleDateString('zh-CN') : 'N/A'}
      </div>
      {user.last_sign_in_at && (
        <div className="text-xs text-success">
          最近登录
        </div>
      )}
    </div>
  );
}

interface ActionsCellProps {
  user: UserWithPermissions;
  permissions: UserPermissions;
  onViewDetails: (userId: string) => void;
  onEditUser: (user: UserWithPermissions) => void;
}

function ActionsCell({ user, permissions, onViewDetails, onEditUser }: ActionsCellProps) {
  return (
    <div className="dropdown dropdown-end">
      <label 
        tabIndex={0} 
        className="btn btn-ghost btn-sm" 
        aria-label={`${user.employee_name || user.email}的操作菜单`}
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </label>
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
        <li>
          <button onClick={() => user.user_id && onViewDetails(user.user_id)}>
            <EyeIcon className="w-4 h-4" />
            查看详情
          </button>
        </li>
        {permissions.canUpdate && (
          <li>
            <button onClick={() => onEditUser(user)}>
              <PencilSquareIcon className="w-4 h-4" />
              编辑用户
            </button>
          </li>
        )}
        {permissions.canDelete && (
          <li>
            <button className="text-error">
              <TrashIcon className="w-4 h-4" />
              删除用户
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * 工具函数
 */
function getEmptyMessage(filters: UserManagementFilters): string {
  const hasFilters = filters.search || filters.role || filters.active !== undefined;
  return hasFilters 
    ? "没有找到符合条件的用户"
    : "暂无用户数据，点击\"创建用户\"开始添加用户";
}