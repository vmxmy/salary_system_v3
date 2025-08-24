/**
 * 权限资源管理页面
 * 
 * 提供完整的权限资源和权限定义管理界面
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEnhancedPermission } from '@/hooks/permissions/useEnhancedPermission';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import {
  PermissionResourceList,
  PermissionDefinitionEditor,
  ResourceManagementModal
} from '@/components/permission-resource';
import { PERMISSIONS } from '@/constants/permissions';
import type { 
  PermissionResourceWithChildren, 
  PermissionResource,
  PermissionWithResource 
} from '@/types/permission-resource';

export function PermissionResourceManagementPage() {
  const { t } = useTranslation();
  const { hasPermission } = useEnhancedPermission();

  // 状态管理
  const [selectedResource, setSelectedResource] = useState<PermissionResourceWithChildren | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalMode, setResourceModalMode] = useState<'create' | 'edit'>('create');
  const [editingResource, setEditingResource] = useState<PermissionResourceWithChildren | null>(null);
  const [parentResource, setParentResource] = useState<PermissionResource | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'tree'>('split');

  // 权限检查
  const canManagePermissions = hasPermission(PERMISSIONS.PERMISSION_MANAGE);
  const canViewPermissions = hasPermission(PERMISSIONS.ROLE_PERMISSION_VIEW);

  // 处理资源选择
  const handleResourceSelect = useCallback((resource: PermissionResourceWithChildren) => {
    setSelectedResource(resource);
  }, []);

  // 处理资源创建
  const handleCreateResource = useCallback((parent?: PermissionResource) => {
    if (!canManagePermissions) return;
    
    setParentResource(parent || null);
    setEditingResource(null);
    setResourceModalMode('create');
    setShowResourceModal(true);
  }, [canManagePermissions]);

  // 处理资源编辑
  const handleEditResource = useCallback((resource: PermissionResourceWithChildren) => {
    if (!canManagePermissions) return;
    
    setEditingResource(resource);
    setParentResource(null);
    setResourceModalMode('edit');
    setShowResourceModal(true);
  }, [canManagePermissions]);

  // 处理资源删除
  const handleDeleteResource = useCallback((resource: PermissionResourceWithChildren) => {
    if (!canManagePermissions) return;
    
    // 如果删除的是当前选中的资源，清除选择
    if (selectedResource?.id === resource.id) {
      setSelectedResource(null);
    }
  }, [canManagePermissions, selectedResource]);

  // 处理资源保存
  const handleResourceSave = useCallback((resource: PermissionResource) => {
    setShowResourceModal(false);
    setEditingResource(null);
    setParentResource(null);
    
    // 如果保存的是当前选中的资源，更新选择
    if (selectedResource?.id === resource.id) {
      setSelectedResource(resource as PermissionResourceWithChildren);
    }
  }, [selectedResource]);

  // 处理权限更新
  const handlePermissionUpdate = useCallback((permission: PermissionWithResource) => {
    // 这里可以添加权限更新后的处理逻辑
    console.log('权限已更新:', permission);
  }, []);

  // 处理权限创建
  const handlePermissionCreate = useCallback((permission: PermissionResource) => {
    // 这里可以添加权限创建后的处理逻辑
    console.log('权限已创建:', permission);
  }, []);

  // 处理权限删除
  const handlePermissionDelete = useCallback((permissionId: string) => {
    // 这里可以添加权限删除后的处理逻辑
    console.log('权限已删除:', permissionId);
  }, []);

  // 页面头部操作
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* 视图模式切换 */}
      <div className="join">
        <button
          className={`btn btn-sm join-item ${viewMode === 'split' ? 'btn-active' : 'btn-outline'}`}
          onClick={() => setViewMode('split')}
          title="分栏视图"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M9 4v16M9 4h10a2 2 0 012 2v12a2 2 0 01-2 2H9" />
          </svg>
        </button>
        <button
          className={`btn btn-sm join-item ${viewMode === 'list' ? 'btn-active' : 'btn-outline'}`}
          onClick={() => setViewMode('list')}
          title="列表视图"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button
          className={`btn btn-sm join-item ${viewMode === 'tree' ? 'btn-active' : 'btn-outline'}`}
          onClick={() => setViewMode('tree')}
          title="树形视图"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        </button>
      </div>

      {/* 创建资源按钮 */}
      {canManagePermissions && (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleCreateResource()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建资源
        </button>
      )}
    </div>
  );

  // 权限检查 - 如果没有查看权限，显示无权限页面
  if (!canViewPermissions) {
    return (
      <ManagementPageLayout
        title="权限资源管理"
        breadcrumbs={[
          { label: '管理后台', href: '/admin' },
          { label: '权限资源管理' }
        ]}
      >
        <div className="hero min-h-96 bg-base-200">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-3xl font-bold">访问受限</h1>
              <p className="py-6">
                您没有访问权限资源管理页面的权限。如需访问，请联系管理员申请相应权限。
              </p>
            </div>
          </div>
        </div>
      </ManagementPageLayout>
    );
  }

  // 渲染不同的视图模式
  const renderContent = () => {
    switch (viewMode) {
      case 'split':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* 左侧：资源列表 */}
            <div className="lg:col-span-5">
              <div className="card bg-base-100 shadow h-full">
                <div className="card-header p-4 border-b border-base-200">
                  <h2 className="card-title">权限资源</h2>
                  {canManagePermissions && selectedResource && (
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleCreateResource(selectedResource)}
                        title="创建子资源"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        子资源
                      </button>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleEditResource(selectedResource)}
                        title="编辑资源"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        编辑
                      </button>
                    </div>
                  )}
                </div>
                <div className="card-body p-0 overflow-hidden">
                  <PermissionResourceList
                    onResourceSelect={handleResourceSelect}
                    onResourceEdit={handleEditResource}
                    onResourceDelete={handleDeleteResource}
                    selectedResourceId={selectedResource?.id}
                    className="h-full"
                  />
                </div>
              </div>
            </div>

            {/* 右侧：权限定义编辑器 */}
            <div className="lg:col-span-7">
              <div className="card bg-base-100 shadow h-full">
                <div className="card-header p-4 border-b border-base-200">
                  <h2 className="card-title">
                    {selectedResource ? `权限定义 - ${selectedResource.resource_name}` : '权限定义'}
                  </h2>
                </div>
                <div className="card-body p-0 overflow-hidden">
                  {selectedResource ? (
                    <PermissionDefinitionEditor
                      resourceId={selectedResource.id}
                      onPermissionUpdate={handlePermissionUpdate}
                      onPermissionCreate={handlePermissionCreate}
                      onPermissionDelete={handlePermissionDelete}
                      readonly={!canManagePermissions}
                      className="h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/60">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">请选择一个资源</p>
                        <p className="text-sm">从左侧选择一个资源来管理其权限定义</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="card bg-base-100 shadow h-full">
            <div className="card-body p-0 overflow-hidden">
              <PermissionResourceList
                onResourceSelect={handleResourceSelect}
                onResourceEdit={handleEditResource}
                onResourceDelete={handleDeleteResource}
                selectedResourceId={selectedResource?.id}
                className="h-full"
              />
            </div>
          </div>
        );

      case 'tree':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
            <div className="card bg-base-100 shadow h-full">
              <div className="card-header p-4 border-b border-base-200">
                <h2 className="card-title">资源树</h2>
              </div>
              <div className="card-body p-0 overflow-hidden">
                <PermissionResourceList
                  onResourceSelect={handleResourceSelect}
                  onResourceEdit={handleEditResource}
                  onResourceDelete={handleDeleteResource}
                  selectedResourceId={selectedResource?.id}
                  className="h-full"
                />
              </div>
            </div>
            
            <div className="card bg-base-100 shadow h-full">
              <div className="card-header p-4 border-b border-base-200">
                <h2 className="card-title">权限详情</h2>
              </div>
              <div className="card-body p-0 overflow-hidden">
                {selectedResource ? (
                  <PermissionDefinitionEditor
                    resourceId={selectedResource.id}
                    onPermissionUpdate={handlePermissionUpdate}
                    onPermissionCreate={handlePermissionCreate}
                    onPermissionDelete={handlePermissionDelete}
                    readonly={!canManagePermissions}
                    className="h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-base-content/60">
                    <p>请选择一个资源查看权限详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <ManagementPageLayout
        title="权限资源管理"
        description="管理系统权限资源和权限定义，支持分层权限控制"
        breadcrumbs={[
          { label: '管理后台', href: '/admin' },
          { label: '权限资源管理' }
        ]}
        headerActions={headerActions}
        className="h-full"
      >
        <div className="h-full">
          {renderContent()}
        </div>
      </ManagementPageLayout>

      {/* 资源管理模态框 */}
      <ResourceManagementModal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        resource={editingResource}
        parentResource={parentResource}
        onSave={handleResourceSave}
        mode={resourceModalMode}
      />
    </>
  );
}

export default PermissionResourceManagementPage;