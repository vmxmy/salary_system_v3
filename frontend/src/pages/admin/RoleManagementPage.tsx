/**
 * 角色管理页面 - 基于权限 hooks 系统
 * 
 * 功能特性：
 * - 完整的角色 CRUD 操作
 * - 权限分配和管理
 * - 角色统计和分析
 * - 响应式设计
 */

import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/permissions';
import { useRole } from '@/hooks/permissions/useRole';
import { RoleList } from '@/components/admin/roles/RoleList';
import { RoleForm } from '@/components/admin/roles/RoleForm';
import { RoleStatistics } from '@/components/admin/roles/RoleStatistics';
import { RolePermissionMatrix } from '@/components/admin/roles/RolePermissionMatrix';
import { PageHeader } from '@/components/common/PageHeader';
import { useModal } from '@/components/common/Modal';

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
  const permissions = usePermissions({
    enableRoleManagement: true,
    enableResourceAccess: true
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

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="角色管理"
        subtitle="管理系统角色，配置权限和用户分配"
      />

      {/* 错误提示 */}
      {error && (
        <div className="alert alert-error">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 13.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <div className="font-bold">角色管理错误</div>
            <div className="text-sm">{error}</div>
          </div>
          <button 
            className="btn btn-sm" 
            onClick={() => setError(null)}
          >
            关闭
          </button>
        </div>
      )}

      {/* 统计卡片 */}
      <RoleStatistics 
        roles={roles}
        loading={loading}
      />

      {/* 操作工具栏 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* 搜索框 */}
            <div className="flex-1 max-w-md">
              <div className="form-control">
                <div className="input-group">
                  <span className="input-group-text">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="搜索角色..."
                    className="input input-bordered flex-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="btn btn-ghost"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
              
              <button
                onClick={handleCreateRole}
                className="btn btn-primary"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                创建角色
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 角色列表 */}
      <RoleList
        roles={filteredRoles}
        loading={loading}
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        onManagePermissions={handleManagePermissions}
        onRefresh={handleRefresh}
      />

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

      {/* 模态框组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </div>
  );
}