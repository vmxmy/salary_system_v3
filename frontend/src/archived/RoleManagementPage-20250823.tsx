/**
 * 角色管理页面
 * 
 * 完整的角色管理系统主页面，整合所有角色管理功能：
 * - 角色层级树视图
 * - 权限矩阵管理
 * - 角色创建和编辑
 * - 角色统计分析
 * - 角色模板管理
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { RoleHierarchyTree } from '@/components/role-management/RoleHierarchyTree';
import { PermissionMatrix } from '@/components/role-management/PermissionMatrix';
import { RoleManagementModal } from '@/components/role-management/RoleManagementModal';
import { RoleStatistics } from '@/components/role-management/RoleStatistics';
import { useRoleManagement, type RoleInfo } from '@/hooks/role-management/useRoleManagement';
import { ConfirmModal } from '@/components/common/ConfirmModal';

type ViewMode = 'hierarchy' | 'matrix' | 'statistics';

export const RoleManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { deleteRole } = useRoleManagement();

  // 视图状态
  const [activeView, setActiveView] = useState<ViewMode>('hierarchy');
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);
  
  // 模态框状态
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleInfo | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleInfo | null>(null);

  // 侧边栏状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 处理角色选择
  const handleRoleSelect = useCallback((role: RoleInfo) => {
    setSelectedRole(role);
  }, []);

  // 处理角色编辑
  const handleRoleEdit = useCallback((role: RoleInfo) => {
    setEditingRole(role);
    setIsEditModalOpen(true);
  }, []);

  // 处理角色删除
  const handleRoleDelete = useCallback((role: RoleInfo) => {
    setDeletingRole(role);
    setIsDeleteConfirmOpen(true);
  }, []);

  // 确认删除角色
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingRole) return;

    try {
      const success = await deleteRole(deletingRole.id);
      if (success) {
        setIsDeleteConfirmOpen(false);
        setDeletingRole(null);
        
        // 如果删除的是当前选中的角色，清除选择
        if (selectedRole?.id === deletingRole.id) {
          setSelectedRole(null);
        }
      }
    } catch (error) {
      console.error('删除角色失败:', error);
    }
  }, [deletingRole, deleteRole, selectedRole]);

  // 权限变更处理
  const handlePermissionChange = useCallback((roleId: string, permissionId: string, granted: boolean) => {
    console.log(`角色 ${roleId} ${granted ? '获得' : '失去'} 权限 ${permissionId}`);
  }, []);

  // 角色操作成功处理
  const handleRoleOperationSuccess = useCallback((role: RoleInfo) => {
    console.log(`角色操作成功: ${role.role_name}`);
    // 可以在这里添加成功提示
  }, []);

  // 工具栏操作
  const toolbarActions = [
    {
      label: '创建角色',
      icon: '➕',
      onClick: () => setIsCreateModalOpen(true),
      type: 'primary' as const,
      permission: 'manage_roles'
    },
    {
      label: '导出配置',
      icon: '📤',
      onClick: () => {
        // TODO: 实现角色配置导出
        console.log('导出角色配置');
      },
      type: 'outline' as const
    },
    {
      label: '导入配置',
      icon: '📥',
      onClick: () => {
        // TODO: 实现角色配置导入
        console.log('导入角色配置');
      },
      type: 'outline' as const
    }
  ];

  // 视图选项卡
  const viewTabs = [
    {
      id: 'hierarchy' as ViewMode,
      label: '角色层级',
      icon: '🌳',
      description: '树形展示角色继承关系'
    },
    {
      id: 'matrix' as ViewMode,
      label: '权限矩阵',
      icon: '📊',
      description: '矩阵视图管理角色权限'
    },
    {
      id: 'statistics' as ViewMode,
      label: '统计分析',
      icon: '📈',
      description: '角色使用情况分析'
    }
  ];

  const pageTitle = '角色管理';
  const breadcrumbs = [
    { label: '管理控制台', href: '/admin' },
    { label: pageTitle, href: '/admin/roles' }
  ];

  return (
    <PermissionGuard permissions={["view_roles" as any]}>
      <ManagementPageLayout
        title={pageTitle}
        breadcrumbs={breadcrumbs}
        actions={toolbarActions as any}
      >
        <div className="flex flex-col h-full">
          {/* 视图切换选项卡 */}
          <div className="flex items-center justify-between mb-6">
            <div className="tabs tabs-boxed">
              {viewTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeView === tab.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveView(tab.id)}
                  title={tab.description}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 视图配置 */}
            <div className="flex items-center gap-2">
              {activeView === 'hierarchy' && (
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                  >
                    {sidebarCollapsed ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              )}
              
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                  ⚙️ 设置
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>显示权限数量</a></li>
                  <li><a>显示用户数量</a></li>
                  <li><a>启用拖拽排序</a></li>
                  <li><hr /></li>
                  <li><a>重置视图设置</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1 flex gap-6 min-h-0">
            {/* 左侧内容 */}
            <div className="flex-1 flex flex-col min-w-0">
              {activeView === 'hierarchy' && (
                <div className="card bg-base-100 shadow-lg flex-1">
                  <div className="card-header p-4 border-b border-base-300">
                    <h2 className="card-title">角色继承层级</h2>
                  </div>
                  <div className="card-body p-0 flex-1">
                    <RoleHierarchyTree
                      onRoleSelect={handleRoleSelect}
                      onRoleEdit={handleRoleEdit}
                      onRoleDelete={handleRoleDelete}
                      selectedRoleId={selectedRole?.id}
                      enableDragDrop={true}
                      showPermissionCount={true}
                      showUserCount={true}
                    />
                  </div>
                </div>
              )}

              {activeView === 'matrix' && (
                <div className="card bg-base-100 shadow-lg flex-1">
                  <div className="card-header p-4 border-b border-base-300">
                    <h2 className="card-title">权限分配矩阵</h2>
                  </div>
                  <div className="card-body p-0 flex-1">
                    <PermissionMatrix
                      onPermissionChange={handlePermissionChange}
                      enableBatchOperations={true}
                      showInheritedPermissions={true}
                      maxVisibleRoles={10}
                      maxVisiblePermissions={20}
                    />
                  </div>
                </div>
              )}

              {activeView === 'statistics' && (
                <div className="flex-1 overflow-y-auto">
                  <RoleStatistics
                    timeRange="30d"
                    showDetailedMetrics={true}
                    onRoleClick={(roleId) => {
                      // 切换到层级视图并选中角色
                      setActiveView('hierarchy');
                      // TODO: 根据 roleId 找到角色并选中
                    }}
                  />
                </div>
              )}
            </div>

            {/* 右侧角色详情面板 */}
            {!sidebarCollapsed && selectedRole && activeView === 'hierarchy' && (
              <div className="w-80 flex flex-col">
                <div className="card bg-base-100 shadow-lg flex-1">
                  <div className="card-header p-4 border-b border-base-300">
                    <div className="flex items-center justify-between">
                      <h3 className="card-title">角色详情</h3>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setSidebarCollapsed(true)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-4 space-y-4">
                    {/* 角色基本信息 */}
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">
                          {selectedRole.role_code === 'super_admin' ? '👑' :
                           selectedRole.role_code === 'admin' ? '🛡️' :
                           selectedRole.role_code === 'hr_manager' ? '👨‍💼' :
                           selectedRole.role_code === 'manager' ? '👔' : '👤'}
                        </span>
                        <div>
                          <h4 className="font-semibold">{selectedRole.role_name}</h4>
                          <div className="text-sm text-base-content/60">{selectedRole.role_code}</div>
                        </div>
                      </div>
                      
                      {selectedRole.description && (
                        <p className="text-sm text-base-content/80 mb-3">
                          {selectedRole.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {selectedRole.is_system_role && (
                          <span className="badge badge-primary badge-sm">系统角色</span>
                        )}
                        <span className="badge badge-outline badge-sm">L{selectedRole.level}</span>
                        <span className="badge badge-ghost badge-sm">
                          {selectedRole.permissions?.length || 0} 权限
                        </span>
                        <span className="badge badge-ghost badge-sm">
                          {selectedRole.user_count || 0} 用户
                        </span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm btn-primary flex-1"
                        onClick={() => handleRoleEdit(selectedRole)}
                      >
                        编辑角色
                      </button>
                      {!selectedRole.is_system_role && (
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleRoleDelete(selectedRole)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* 权限列表 */}
                    {selectedRole.permissions && selectedRole.permissions.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">权限列表</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedRole.permissions.slice(0, 10).map(permission => (
                            <div key={permission.id} className="flex items-center gap-2 text-sm p-2 bg-base-200 rounded">
                              <span className="text-success">✓</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{permission.permission_name}</div>
                                <div className="text-xs text-base-content/60 truncate">
                                  {permission.action_type}
                                </div>
                              </div>
                            </div>
                          ))}
                          {selectedRole.permissions.length > 10 && (
                            <div className="text-center text-xs text-base-content/60">
                              还有 {selectedRole.permissions.length - 10} 个权限...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 统计信息 */}
                    <div className="stats stats-vertical bg-base-200">
                      <div className="stat py-2 px-3">
                        <div className="stat-title text-xs">创建时间</div>
                        <div className="stat-value text-sm">
                          {new Date(selectedRole.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      {selectedRole.updated_at !== selectedRole.created_at && (
                        <div className="stat py-2 px-3">
                          <div className="stat-title text-xs">最后更新</div>
                          <div className="stat-value text-sm">
                            {new Date(selectedRole.updated_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 创建角色模态框 */}
        <RoleManagementModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleRoleOperationSuccess}
        />

        {/* 编辑角色模态框 */}
        <RoleManagementModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRole(null);
          }}
          role={editingRole}
          onSuccess={handleRoleOperationSuccess}
        />

        {/* 删除确认模态框 */}
        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingRole(null);
          }}
          onConfirm={handleConfirmDelete}
          title="确认删除角色"
          message={`您确定要删除角色 "${deletingRole?.role_name}" 吗？此操作不可撤销。如果有用户正在使用此角色，删除操作将会失败。`}
          confirmText="删除"
          confirmButtonClass="btn-error"
        />
      </ManagementPageLayout>
    </PermissionGuard>
  );
};

export default RoleManagementPage;