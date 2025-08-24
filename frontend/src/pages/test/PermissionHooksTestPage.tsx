/**
 * 权限Hook系统测试页面
 * 
 * 全面测试新重建的权限Hook系统功能：
 * - usePermission: 核心权限检查
 * - useRole: 角色管理
 * - usePermissionRequest: 权限申请
 * - usePermissionApproval: 权限审批
 * - useResourceAccess: 资源访问控制
 * - usePermissions: 统一权限管理
 */

import React, { useState, useMemo } from 'react';
import { 
  usePermission, 
  useRole, 
  usePermissionRequest,
  usePermissionApproval,
  useResourceAccess,
  usePermissions 
} from '@/hooks/permissions';
import type { Permission } from '@/types/permission';

export default function PermissionHooksTestPage() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [selectedPermission, setSelectedPermission] = useState<string>('employee.view');
  const [selectedResource, setSelectedResource] = useState<string>('employee');
  const [testResourceId, setTestResourceId] = useState<string>('');

  // 测试所有Hook
  const permission = usePermission({
    enableCache: true,
    watchChanges: true,
    fallbackResult: false
  });

  const role = useRole();
  
  const permissionRequest = usePermissionRequest();
  
  const permissionApproval = usePermissionApproval();
  
  const resourceAccessOptions = useMemo(() => ({
    resourceType: selectedResource as any,
    scope: 'all' as const,
    checkOwnership: false,
    fallbackResult: false
  }), [selectedResource]);
  
  const resourceAccess = useResourceAccess(resourceAccessOptions);

  const permissions = usePermissions({
    enableResourceAccess: true,
    enableRoleManagement: true,
    enablePermissionRequests: true,
    enableApprovalWorkflow: true
  });

  // 常用权限选项
  const commonPermissions = [
    'employee.view',
    'employee.create',
    'employee.update',
    'employee.delete',
    'payroll.view',
    'payroll.manage',
    'department.view',
    'department.manage',
    'system.admin'
  ];

  // 测试核心权限检查
  const testCorePermission = async () => {
    try {
      const result = await permission.checkPermission(selectedPermission as Permission);
      const hasPermSync = permission.hasPermission(selectedPermission as Permission);
      
      setTestResults(prev => ({
        ...prev,
        corePermission: {
          permission: selectedPermission,
          asyncResult: result,
          syncResult: hasPermSync,
          loading: permission.loading,
          error: permission.error?.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        corePermission: {
          permission: selectedPermission,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 测试角色功能
  const testRole = async () => {
    try {
      const canEscalate = role.canEscalate;
      const isAdmin = role.isRole(['admin', 'super_admin']);
      
      setTestResults(prev => ({
        ...prev,
        role: {
          currentRole: role.role,
          rolePermissions: role.rolePermissions,
          canEscalate,
          isAdmin,
          loading: role.loading,
          error: role.error?.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        role: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 测试权限申请
  const testPermissionRequest = async () => {
    try {
      // 获取我的申请记录
      const myRequests = await permissionRequest.fetchMyRequests();
      
      setTestResults(prev => ({
        ...prev,
        permissionRequest: {
          myRequestsCount: myRequests.length,
          myRequests: myRequests.slice(0, 3), // 只显示前3个
          loading: permissionRequest.loading,
          error: permissionRequest.error?.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        permissionRequest: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 测试权限审批
  const testPermissionApproval = async () => {
    try {
      const pendingRequests = await permissionApproval.fetchPendingRequests();
      const stats = await permissionApproval.getApprovalStats();
      
      setTestResults(prev => ({
        ...prev,
        permissionApproval: {
          pendingCount: pendingRequests.length,
          pendingRequests: pendingRequests.slice(0, 3), // 只显示前3个
          stats,
          canApprove: permissionApproval.canApprove,
          loading: permissionApproval.loading,
          error: permissionApproval.error?.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        permissionApproval: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 测试资源访问控制
  const testResourceAccess = async () => {
    try {
      const canView = await resourceAccess.canView(testResourceId || undefined);
      const canCreate = await resourceAccess.canCreate();
      const canUpdate = await resourceAccess.canUpdate(testResourceId || undefined);
      const canDelete = await resourceAccess.canDelete(testResourceId || undefined);
      
      setTestResults(prev => ({
        ...prev,
        resourceAccess: {
          resourceType: selectedResource,
          resourceId: testResourceId || 'none',
          permissions: {
            canView,
            canCreate,
            canUpdate,
            canDelete,
            canViewCached: resourceAccess.canViewCached,
            canCreateCached: resourceAccess.canCreateCached,
            canUpdateCached: resourceAccess.canUpdateCached,
            canDeleteCached: resourceAccess.canDeleteCached
          },
          loading: resourceAccess.loading,
          error: resourceAccess.error instanceof Error ? resourceAccess.error.message : undefined,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        resourceAccess: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 测试统一权限管理
  const testUnifiedPermissions = async () => {
    try {
      const canUsePermission = await permissions.can(selectedPermission as Permission);
      const hasMultiple = await permissions.hasAnyPermission(['employee.view', 'payroll.view']);
      
      setTestResults(prev => ({
        ...prev,
        unifiedPermissions: {
          canUseSelectedPermission: canUsePermission,
          hasAnyViewPermission: hasMultiple,
          config: permissions.config,
          loading: permissions.loading,
          error: permissions.error instanceof Error ? permissions.error.message : undefined,
          userInfo: {
            id: permissions.user?.id,
            email: permissions.user?.email,
            role: permissions.user?.role
          },
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        unifiedPermissions: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    setTestResults({});
    await Promise.all([
      testCorePermission(),
      testRole(),
      testPermissionRequest(),
      testPermissionApproval(),
      testResourceAccess(),
      testUnifiedPermissions()
    ]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">🔐 权限Hook系统测试</h1>
        <p className="text-base-content/70">
          全面测试重建后的权限Hook系统功能
        </p>
      </div>

      {/* 控制面板 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🎮 测试控制面板</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 权限选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">测试权限</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
              >
                {commonPermissions.map(perm => (
                  <option key={perm} value={perm}>{perm}</option>
                ))}
              </select>
            </div>

            {/* 资源类型选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">资源类型</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
              >
                <option value="employee">员工</option>
                <option value="department">部门</option>
                <option value="payroll">薪资</option>
                <option value="report">报表</option>
                <option value="system">系统</option>
              </select>
            </div>

            {/* 资源ID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">资源ID (可选)</span>
              </label>
              <input 
                type="text"
                className="input input-bordered"
                placeholder="输入特定资源ID"
                value={testResourceId}
                onChange={(e) => setTestResourceId(e.target.value)}
              />
            </div>
          </div>

          <div className="card-actions justify-center mt-4">
            <button 
              className="btn btn-primary btn-lg"
              onClick={runAllTests}
            >
              🚀 运行所有测试
            </button>
          </div>
        </div>
      </div>

      {/* 独立测试按钮 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button className="btn btn-outline btn-sm" onClick={testCorePermission}>
          测试核心权限
        </button>
        <button className="btn btn-outline btn-sm" onClick={testRole}>
          测试角色管理
        </button>
        <button className="btn btn-outline btn-sm" onClick={testPermissionRequest}>
          测试权限申请
        </button>
        <button className="btn btn-outline btn-sm" onClick={testPermissionApproval}>
          测试权限审批
        </button>
        <button className="btn btn-outline btn-sm" onClick={testResourceAccess}>
          测试资源访问
        </button>
        <button className="btn btn-outline btn-sm" onClick={testUnifiedPermissions}>
          测试统一管理
        </button>
      </div>

      {/* 测试结果展示 */}
      <div className="space-y-4">
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <h3 className="card-title capitalize">
                  {testName === 'corePermission' && '🔑 核心权限检查'}
                  {testName === 'role' && '👤 角色管理'}
                  {testName === 'permissionRequest' && '📝 权限申请'}
                  {testName === 'permissionApproval' && '✅ 权限审批'}
                  {testName === 'resourceAccess' && '🛡️ 资源访问控制'}
                  {testName === 'unifiedPermissions' && '🎯 统一权限管理'}
                </h3>
                <div className={`badge ${result.error ? 'badge-error' : 'badge-success'}`}>
                  {result.error ? '错误' : '成功'}
                </div>
              </div>
              
              {result.timestamp && (
                <p className="text-sm text-base-content/50">
                  测试时间: {result.timestamp}
                </p>
              )}

              <div className="bg-base-200 rounded-lg p-4 mt-2">
                <pre className="text-sm overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 系统状态总览 */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="card-body">
          <h2 className="card-title">📊 系统状态总览</h2>
          <div className="stats bg-base-100/20 text-primary-content">
            <div className="stat">
              <div className="stat-title text-primary-content/70">核心权限</div>
              <div className="stat-value text-sm">
                {permission.loading ? '加载中...' : '就绪'}
              </div>
              <div className="stat-desc text-primary-content/70">
                错误: {permission.error ? '是' : '否'}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title text-primary-content/70">用户角色</div>
              <div className="stat-value text-sm">{role.role || '未知'}</div>
              <div className="stat-desc text-primary-content/70">
                权限数: {role.rolePermissions?.length || 0}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title text-primary-content/70">申请状态</div>
              <div className="stat-value text-sm">
                {permissionRequest.loading ? '加载中...' : '就绪'}
              </div>
              <div className="stat-desc text-primary-content/70">
                我的申请: {permissionRequest.myRequests?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}