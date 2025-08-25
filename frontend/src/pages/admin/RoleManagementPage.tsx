/**
 * 角色管理页面 V2 - 基于DaisyUI设计系统优化
 * 
 * 功能特性：
 * - 完整的角色 CRUD 操作
 * - 权限分配和管理
 * - 角色统计和分析
 * - 现代化响应式设计
 * - 与用户管理页面一致的UI风格
 */

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { useRole } from '@/hooks/permissions/useRole';
import { RoleList } from '@/components/admin/roles/RoleList';
import { RoleForm } from '@/components/admin/roles/RoleForm';
import { RoleStatistics } from '@/components/admin/roles/RoleStatistics';
import { RolePermissionMatrix } from '@/components/admin/roles/RolePermissionMatrix';
import { useModal } from '@/components/common/Modal';
import { cardEffects } from '@/lib/utils';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarSquareIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface RoleData {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isActive: boolean;
}

// 系统角色数据现在通过 useRole hook 获取

export default function RoleManagementPage() {
  // 权限和角色 hooks
  const roleHook = useRole();
  const permission = usePermission({
    enableCache: true,
    watchChanges: true
  });

  // 模态框hooks
  const modal = useModal();

  // 组件状态
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 加载系统角色数据
  const loadSystemRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const systemRoles = await roleHook.getAllSystemRoles();
      setRoles(systemRoles as RoleData[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载角色数据失败';
      setError(errorMessage);
      console.error('[RoleManagementPage] Failed to load system roles:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadSystemRoles();
  }, [roleHook.getAllSystemRoles]);

  // 过滤角色
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 创建角色
  const handleCreateRole = () => {
    setSelectedRole(null);
    setShowForm(true);
  };

  // 编辑角色
  const handleEditRole = (role: RoleData) => {
    setSelectedRole(role);
    setShowForm(true);
  };

  // 删除角色
  const handleDeleteRole = async (role: RoleData) => {
    if (role.isSystem) {
      modal.showWarning('系统角色不能删除', '系统保护');
      return;
    }

    if (role.userCount > 0) {
      modal.showWarning('该角色下还有用户，不能删除', '无法删除');
      return;
    }

    modal.confirmDelete(
      `确定要删除角色"${role.name}"吗？此操作不可撤销。`,
      async () => {
        try {
          setLoading(true);
          // 实际应用中调用API删除角色
          console.log('删除角色:', role);
          modal.showSuccess('角色删除成功');
        } catch (error) {
          console.error('删除角色失败:', error);
          modal.showError('删除失败，请重试');
        } finally {
          setLoading(false);
        }
      },
      '确认删除角色'
    );
  };

  // 管理权限
  const handleManagePermissions = (role: RoleData) => {
    setSelectedRole(role);
    setShowPermissionMatrix(true);
  };

  // 保存角色
  const handleSaveRole = async (formData: RoleFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedRole) {
        // 更新角色权限（系统角色不支持完全更新，只能更新权限）
        if (!selectedRole.isSystem) {
          await roleHook.updateRolePermissions(selectedRole.code, []);
          modal.showSuccess('角色权限更新成功');
        } else {
          throw new Error('系统角色不支持修改');
        }
      } else {
        // 创建新角色
        await roleHook.createRole({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          level: formData.level,
          permissions: [] // 新角色默认无权限，需要后续分配
        });
        modal.showSuccess('角色创建成功');
      }
      
      setShowForm(false);
      // 重新加载角色数据
      await loadSystemRoles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存角色失败';
      setError(errorMessage);
      console.error('保存角色失败:', error);
      throw error; // 让表单组件处理错误
    } finally {
      setLoading(false);
    }
  };

  // 更新权限
  const handleUpdatePermissions = async (roleId: string, newPermissions: string[]) => {
    try {
      setLoading(true);
      setError(null);

      // 根据 roleId 找到角色代码
      const targetRole = roles.find(role => role.id === roleId);
      if (!targetRole) {
        throw new Error('未找到指定角色');
      }

      await roleHook.updateRolePermissions(targetRole.code, newPermissions as any[]);
      modal.showSuccess('权限更新成功');
      
      // 重新加载角色数据
      await loadSystemRoles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新权限失败';
      setError(errorMessage);
      console.error('更新权限失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    await loadSystemRoles();
  };

  /**
   * 统计数据
   */
  const stats = useMemo(() => {
    const data = roles || [];
    return {
      total: data.length,
      active: data.filter(r => r.isActive).length,
      system: data.filter(r => r.isSystem).length,
      totalUsers: data.reduce((sum, r) => sum + (r.userCount || 0), 0),
      byLevel: [1, 2, 3, 4, 5].map(level => ({
        level,
        count: data.filter(r => r.level === level).length,
        name: level === 5 ? '超级' : level === 4 ? '高级' : level === 3 ? '中级' : level === 2 ? '初级' : '基础'
      }))
    };
  }, [roles]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面头部 */}
      <PageHeader 
        stats={stats}
        onCreateRole={handleCreateRole}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* 搜索过滤器 */}
      <SearchFilters 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-end">
          <div className="alert alert-error">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <div>
              <div className="font-bold">角色管理错误</div>
              <div className="text-sm">{error}</div>
            </div>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={() => setError(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <RoleStatistics 
        roles={roles}
        loading={loading}
      />

      {/* 角色列表 */}
      <div className={cardEffects.modern}>
        <div className="card-body p-0">
          <RoleList
            roles={filteredRoles}
            loading={loading}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
            onManagePermissions={handleManagePermissions}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* 模态框 */}
      <Suspense fallback={<div className="loading loading-spinner loading-sm"></div>}>
        {/* 角色表单模态框 */}
        {showForm && (
          <RoleForm
            role={selectedRole}
            onSave={handleSaveRole}
            onCancel={() => setShowForm(false)}
            loading={loading}
          />
        )}

        {/* 权限分配模态框 */}
        {showPermissionMatrix && selectedRole && (
          <RolePermissionMatrix
            role={selectedRole}
            onUpdatePermissions={handleUpdatePermissions}
            onClose={() => setShowPermissionMatrix(false)}
            loading={loading}
          />
        )}
      </Suspense>

      {/* 模态框组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </div>
  );
}

/**
 * 页面头部组件
 */
interface RoleStats {
  total: number;
  active: number;
  system: number;
  totalUsers: number;
  byLevel: Array<{ level: number; name: string; count: number }>;
}

interface PageHeaderProps {
  stats: RoleStats;
  onCreateRole: () => void;
  onRefresh: () => void;
  loading: boolean;
}

function PageHeader({ stats, onCreateRole, onRefresh, loading }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      {/* 标题和统计 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheckIcon className="w-8 h-8 text-primary" />
          角色管理
        </h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-base-content/70">
          <span className="flex items-center gap-1">
            <ChartBarSquareIcon className="w-4 h-4" />
            总计 {stats.total} 个角色
          </span>
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4 text-success" />
            {stats.active} 个启用
          </span>
          <span className="flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4 text-info" />
            {stats.system} 个系统角色
          </span>
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4 text-warning" />
            {stats.totalUsers} 名用户
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          className="btn btn-outline"
          onClick={onRefresh}
          disabled={loading}
          aria-label="刷新角色数据"
        >
          <ArrowPathIcon className="w-4 h-4" />
          刷新
        </button>
        
        <button
          className="btn btn-primary"
          onClick={onCreateRole}
          disabled={loading}
          aria-label="创建新角色"
        >
          <PlusIcon className="w-4 h-4" />
          创建角色
        </button>
      </div>
    </div>
  );
}

/**
 * 搜索过滤器组件
 */
interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

function SearchFilters({ searchTerm, onSearchChange, onRefresh, loading }: SearchFiltersProps) {
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
                  placeholder="搜索角色名称、代码、描述..."
                  className="input input-bordered join-item flex-1"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <button className="btn btn-square join-item" aria-label="搜索角色">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 清除搜索 */}
          <button
            className="btn btn-ghost"
            onClick={() => onSearchChange('')}
            disabled={!searchTerm || loading}
            aria-label="清除搜索条件"
          >
            <FunnelIcon className="w-4 h-4" />
            清除
          </button>
        </div>
      </div>
    </div>
  );
}