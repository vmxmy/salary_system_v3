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

import React, { useState, useMemo, useEffect } from 'react';
import { 
  usePermission, 
  useRole, 
  usePermissionRequest,
  usePermissionApproval,
  useResourceAccess,
  usePermissions 
} from '@/hooks/permissions';
import { PERMISSIONS, PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from '@/constants/permissions';
import type { Permission } from '@/types/permission';

export default function PermissionHooksTestPage() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [selectedPermission, setSelectedPermission] = useState<string>('employee.view');
  const [selectedResource, setSelectedResource] = useState<string>('employee');
  const [testResourceId, setTestResourceId] = useState<string>('');
  const [allPermissionsResults, setAllPermissionsResults] = useState<any>(null);
  const [showAllPermissions, setShowAllPermissions] = useState(false);

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
    'system.admin',
    // 角色管理相关权限
    'manage_roles',
    'view_roles',
    'assign_roles',
    'view_role_permissions',
    'manage_role_permissions',
    'user_management.read',
    'user_management.write'
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

  // 测试角色管理专用权限 - 改进版本，解决缓存同步问题
  const testRoleManagementPermissions = async () => {
    try {
      const rolePermissions = [
        'manage_roles',
        'view_roles', 
        'assign_roles',
        'view_role_permissions',
        'manage_role_permissions',
        'user_management.read',
        'user_management.write'
      ];

      // 首先确保缓存已填充这些权限
      console.log('[PermissionTest] Pre-populating cache for consistent sync/async results');
      await permission.populateCache(rolePermissions as Permission[]);
      
      // 等待一点时间确保状态更新完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await Promise.all(
        rolePermissions.map(async (perm) => {
          const syncResult = permission.hasPermission(perm as Permission);
          const asyncResult = await permission.checkPermission(perm as Permission);
          return {
            permission: perm,
            hasPermission: syncResult,
            asyncResult,
            syncAsyncMatch: syncResult === asyncResult.allowed,
            description: getRolePermissionDescription(perm)
          };
        })
      );

      // 测试综合角色管理能力
      const syncResults = results.map(r => r.hasPermission);
      const asyncResults = results.map(r => r.asyncResult.allowed);
      
      const canManageRoleSystemSync = syncResults.every(r => r);
      const canManageRoleSystemAsync = asyncResults.every(r => r);
      const hasBasicRoleAccessSync = results.some(r => r.permission === 'view_roles' && r.hasPermission);
      const hasBasicRoleAccessAsync = results.some(r => r.permission === 'view_roles' && r.asyncResult.allowed);
      
      const syncPermissionCount = syncResults.filter(r => r).length;
      const asyncPermissionCount = asyncResults.filter(r => r).length;
      const syncAsyncConsistency = results.every(r => r.syncAsyncMatch);

      setTestResults(prev => ({
        ...prev,
        roleManagementPermissions: {
          permissions: results,
          canManageRoleSystemSync,
          canManageRoleSystemAsync,
          hasBasicRoleAccessSync,
          hasBasicRoleAccessAsync,
          syncPermissionCoverage: `${syncPermissionCount}/${rolePermissions.length}`,
          asyncPermissionCoverage: `${asyncPermissionCount}/${rolePermissions.length}`,
          syncAsyncConsistency,
          accessLevel: getAccessLevel(asyncPermissionCount, rolePermissions.length),
          cacheDebugInfo: {
            cacheSize: permission.debug?.cacheSize || 0,
            initialized: permission.initialized,
            userId: permission.debug?.userId
          },
          loading: permission.loading,
          error: permission.error?.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        roleManagementPermissions: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }
  };

  // 获取权限描述
  const getRolePermissionDescription = (permission: string): string => {
    const descriptions: Record<string, string> = {
      'manage_roles': '完整的角色管理权限',
      'view_roles': '查看系统角色',
      'assign_roles': '为用户分配角色',
      'view_role_permissions': '查看角色权限配置',
      'manage_role_permissions': '管理角色权限配置',
      'user_management.read': '查看用户管理页面',
      'user_management.write': '用户管理操作权限'
    };
    return descriptions[permission] || '未知权限';
  };

  // 获取访问级别
  const getAccessLevel = (current: number, total: number): string => {
    const ratio = current / total;
    if (ratio >= 1) return '完全访问';
    if (ratio >= 0.8) return '高级访问';
    if (ratio >= 0.5) return '中级访问';
    if (ratio > 0) return '基础访问';
    return '无访问权限';
  };

  // 测试所有权限 - 全面权限矩阵测试
  const testAllPermissions = async () => {
    setAllPermissionsResults(null);
    
    try {
      console.log('[PermissionTest] 🔍 开始全面权限测试...');
      
      // 获取所有权限常量
      const allPermissions = Object.values(PERMISSIONS) as Permission[];
      console.log(`[PermissionTest] 发现 ${allPermissions.length} 个预定义权限`);
      
      // 预加载所有权限到缓存以确保同步检查的准确性
      await permission.populateCache(allPermissions);
      
      // 等待缓存更新完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const results = {
        testStartTime: new Date().toLocaleString(),
        totalPermissions: allPermissions.length,
        byGroup: {} as Record<string, any>,
        byPermission: {} as Record<string, any>,
        summary: {
          total: 0,
          granted: 0,
          denied: 0,
          cached: 0,
          syncAsyncMismatches: 0,
          groups: Object.keys(PERMISSION_GROUPS).length
        },
        cacheState: {
          size: permission.debug?.cacheSize || 0,
          initialized: permission.initialized,
          loading: permission.loading,
          userId: permission.debug?.userId
        },
        inconsistencies: [] as any[]
      };
      
      // 按权限组进行测试
      for (const [groupName, groupPermissions] of Object.entries(PERMISSION_GROUPS)) {
        console.log(`[PermissionTest] 📋 测试权限组: ${groupName} (${groupPermissions.length} 个权限)`);
        
        const groupResults = {
          name: groupName,
          permissions: [] as any[],
          summary: {
            total: groupPermissions.length,
            granted: 0,
            denied: 0,
            cached: 0,
            syncAsyncMismatches: 0
          }
        };
        
        // 测试组内每个权限
        for (const permissionCode of groupPermissions) {
          try {
            // 同步检查（基于缓存）
            const syncResult = permission.hasPermission(permissionCode as Permission);
            
            // 异步检查（API调用）
            const asyncResult = await permission.checkPermission(permissionCode as Permission);
            
            // 检查缓存状态
            const isCached = permission.debug?.cacheContents?.[permissionCode] !== undefined;
            const syncAsyncMatch = syncResult === asyncResult.allowed;
            
            const permissionResult = {
              code: permissionCode,
              description: PERMISSION_DESCRIPTIONS[permissionCode as keyof typeof PERMISSION_DESCRIPTIONS] || '未定义描述',
              syncResult,
              asyncResult: asyncResult.allowed,
              isCached,
              syncAsyncMatch,
              cacheAge: asyncResult.context?.timestamp ? 
                Date.now() - asyncResult.context.timestamp.getTime() : null,
              reason: asyncResult.reason,
              source: asyncResult.context?.metadata?.source
            };
            
            groupResults.permissions.push(permissionResult);
            results.byPermission[permissionCode] = permissionResult;
            
            // 更新统计
            results.summary.total++;
            groupResults.summary.total = groupPermissions.length;
            
            if (asyncResult.allowed) {
              results.summary.granted++;
              groupResults.summary.granted++;
            } else {
              results.summary.denied++;
              groupResults.summary.denied++;
            }
            
            if (isCached) {
              results.summary.cached++;
              groupResults.summary.cached++;
            }
            
            if (!syncAsyncMatch) {
              results.summary.syncAsyncMismatches++;
              groupResults.summary.syncAsyncMismatches++;
              
              results.inconsistencies.push({
                permission: permissionCode,
                group: groupName,
                syncResult,
                asyncResult: asyncResult.allowed,
                reason: asyncResult.reason
              });
            }
            
          } catch (error) {
            console.error(`[PermissionTest] ❌ 权限 ${permissionCode} 测试失败:`, error);
            
            const errorResult = {
              code: permissionCode,
              description: PERMISSION_DESCRIPTIONS[permissionCode as keyof typeof PERMISSION_DESCRIPTIONS] || '未定义描述',
              syncResult: false,
              asyncResult: false,
              isCached: false,
              syncAsyncMatch: true,
              error: error instanceof Error ? error.message : '未知错误'
            };
            
            groupResults.permissions.push(errorResult);
            results.byPermission[permissionCode] = errorResult;
          }
        }
        
        results.byGroup[groupName] = groupResults;
      }
      
      // 计算权限覆盖率和一致性指标
      const consistencyRate = results.summary.total > 0 ? 
        ((results.summary.total - results.summary.syncAsyncMismatches) / results.summary.total * 100).toFixed(1) : 0;
      
      const cacheHitRate = results.summary.total > 0 ? 
        (results.summary.cached / results.summary.total * 100).toFixed(1) : 0;
      
      const grantedRate = results.summary.total > 0 ? 
        (results.summary.granted / results.summary.total * 100).toFixed(1) : 0;
      
      // 扩展summary对象，添加计算得出的指标
      (results.summary as any).consistencyRate = `${consistencyRate}%`;
      (results.summary as any).cacheHitRate = `${cacheHitRate}%`;
      (results.summary as any).grantedRate = `${grantedRate}%`;
      (results.summary as any).accessLevel = getAccessLevel(results.summary.granted, results.summary.total);
      
      console.log('[PermissionTest] ✅ 全面权限测试完成:', results.summary);
      setAllPermissionsResults(results);
      
    } catch (error) {
      console.error('[PermissionTest] ❌ 全面权限测试失败:', error);
      setAllPermissionsResults({
        error: error instanceof Error ? error.message : '未知错误',
        testStartTime: new Date().toLocaleString()
      });
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
      testUnifiedPermissions(),
      testRoleManagementPermissions()
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

          <div className="card-actions justify-center mt-4 gap-4">
            <button 
              className="btn btn-primary btn-lg"
              onClick={runAllTests}
            >
              🚀 运行所有测试
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.open('/admin/roles', '_blank')}
            >
              🔗 打开角色管理页面
            </button>
          </div>
        </div>
      </div>

      {/* 独立测试按钮 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
        <button className="btn btn-primary btn-sm" onClick={testRoleManagementPermissions}>
          🔑 角色权限测试
        </button>
      </div>

      {/* 全面权限测试按钮 */}
      <div className="card bg-gradient-to-r from-secondary to-accent text-secondary-content">
        <div className="card-body text-center py-6">
          <h3 className="card-title justify-center text-lg">🚀 全面权限矩阵测试</h3>
          <p className="text-secondary-content/80 mb-4">
            测试系统中定义的所有权限常量，验证权限缓存、同步异步一致性和权限分组
          </p>
          <div className="flex justify-center gap-4">
            <button 
              className="btn btn-primary btn-lg"
              onClick={testAllPermissions}
              disabled={!permission.initialized}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              开始全面权限测试
            </button>
            {allPermissionsResults && (
              <button 
                className="btn btn-outline"
                onClick={() => setShowAllPermissions(!showAllPermissions)}
              >
                {showAllPermissions ? '隐藏' : '显示'}详细结果
              </button>
            )}
          </div>
          {!permission.initialized && (
            <div className="alert alert-warning mt-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 13.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              权限系统初始化中...请等待初始化完成后再进行测试
            </div>
          )}
        </div>
      </div>

      {/* 全面权限测试结果展示 */}
      {allPermissionsResults && showAllPermissions && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-title text-2xl">📊 全面权限测试结果</h2>
              <div className="badge badge-info">
                测试时间: {allPermissionsResults.testStartTime}
              </div>
            </div>

            {allPermissionsResults.error ? (
              <div className="alert alert-error">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">测试执行失败</h3>
                  <div className="text-sm">{allPermissionsResults.error}</div>
                </div>
              </div>
            ) : (
              <>
                {/* 总览统计 */}
                <div className="stats shadow w-full mb-6">
                  <div className="stat">
                    <div className="stat-figure text-primary">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="stat-title">总权限数</div>
                    <div className="stat-value text-primary">{allPermissionsResults.summary?.total || 0}</div>
                    <div className="stat-desc">分 {allPermissionsResults.summary?.groups || 0} 个分组</div>
                  </div>
                  
                  <div className="stat">
                    <div className="stat-figure text-success">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="stat-title">授权权限</div>
                    <div className="stat-value text-success">{allPermissionsResults.summary?.granted || 0}</div>
                    <div className="stat-desc">授权率: {allPermissionsResults.summary?.grantedRate || '0%'}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-figure text-info">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <div className="stat-title">缓存命中</div>
                    <div className="stat-value text-info">{allPermissionsResults.summary?.cached || 0}</div>
                    <div className="stat-desc">命中率: {allPermissionsResults.summary?.cacheHitRate || '0%'}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-figure text-warning">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="stat-title">数据一致性</div>
                    <div className="stat-value text-warning">{allPermissionsResults.summary?.consistencyRate || '0%'}</div>
                    <div className="stat-desc">不一致: {allPermissionsResults.summary?.syncAsyncMismatches || 0} 项</div>
                  </div>
                </div>

                {/* 系统状态 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg">🔧 缓存状态</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>缓存大小:</span>
                          <span className="font-mono">{allPermissionsResults.cacheState?.size || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>初始化状态:</span>
                          <span className={`badge ${allPermissionsResults.cacheState?.initialized ? 'badge-success' : 'badge-warning'}`}>
                            {allPermissionsResults.cacheState?.initialized ? '已初始化' : '初始化中'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>加载状态:</span>
                          <span className={`badge ${allPermissionsResults.cacheState?.loading ? 'badge-warning' : 'badge-success'}`}>
                            {allPermissionsResults.cacheState?.loading ? '加载中' : '就绪'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>用户ID:</span>
                          <span className="font-mono text-sm">{allPermissionsResults.cacheState?.userId || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg">📈 访问级别评估</h3>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {allPermissionsResults.summary?.accessLevel || '未知'}
                        </div>
                        <div className="text-sm text-base-content/70">
                          基于权限授权率的综合评估
                        </div>
                        {allPermissionsResults.summary?.accessLevel === '完全访问' && (
                          <div className="alert alert-success mt-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            拥有系统的完全访问权限
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 数据不一致性报告 */}
                {allPermissionsResults.inconsistencies && allPermissionsResults.inconsistencies.length > 0 && (
                  <div className="alert alert-warning mb-6">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 13.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="font-bold">发现 {allPermissionsResults.inconsistencies.length} 个同步异步不一致项</h3>
                      <div className="text-sm">
                        这些权限的同步检查结果与异步检查结果不匹配，需要进一步检查权限缓存机制。
                      </div>
                    </div>
                  </div>
                )}

                {/* 分权限组详细结果 */}
                <div className="space-y-4">
                  {allPermissionsResults.byGroup && Object.entries(allPermissionsResults.byGroup).map(([groupName, groupData]: [string, any]) => (
                    <div key={groupName} className="collapse collapse-arrow bg-base-200">
                      <input type="checkbox" className="peer" />
                      <div className="collapse-title text-lg font-medium">
                        <div className="flex items-center justify-between">
                          <span>📁 {groupName}</span>
                          <div className="flex gap-2">
                            <div className="badge badge-outline">{groupData.summary?.total || 0} 个权限</div>
                            <div className={`badge ${(groupData.summary?.granted || 0) > 0 ? 'badge-success' : 'badge-error'}`}>
                              {groupData.summary?.granted || 0} 已授权
                            </div>
                            {(groupData.summary?.syncAsyncMismatches || 0) > 0 && (
                              <div className="badge badge-warning">
                                {groupData.summary.syncAsyncMismatches} 不一致
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="collapse-content">
                        <div className="overflow-x-auto">
                          <table className="table table-zebra w-full">
                            <thead>
                              <tr>
                                <th>权限代码</th>
                                <th>描述</th>
                                <th>同步检查</th>
                                <th>异步检查</th>
                                <th>缓存状态</th>
                                <th>一致性</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupData.permissions?.map((perm: any) => (
                                <tr key={perm.code} className={!perm.syncAsyncMatch ? 'bg-warning/10' : ''}>
                                  <td className="font-mono text-sm">{perm.code}</td>
                                  <td className="text-sm">{perm.description}</td>
                                  <td>
                                    <div className={`badge badge-sm ${perm.syncResult ? 'badge-success' : 'badge-error'}`}>
                                      {perm.syncResult ? '✅ 允许' : '❌ 拒绝'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className={`badge badge-sm ${perm.asyncResult ? 'badge-success' : 'badge-error'}`}>
                                      {perm.asyncResult ? '✅ 允许' : '❌ 拒绝'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className={`badge badge-sm ${perm.isCached ? 'badge-info' : 'badge-ghost'}`}>
                                      {perm.isCached ? '📋 已缓存' : '⌛ 未缓存'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className={`badge badge-sm ${perm.syncAsyncMatch ? 'badge-success' : 'badge-error'}`}>
                                      {perm.syncAsyncMatch ? '✅' : '❌'}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                  {testName === 'permissionApproval' && '✅权限审批'}
                  {testName === 'resourceAccess' && '🛡️ 资源访问控制'}
                  {testName === 'unifiedPermissions' && '🎯 统一权限管理'}
                  {testName === 'roleManagementPermissions' && '🔐 角色管理权限测试'}
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

              {/* 角色管理权限测试专用展示 */}
              {testName === 'roleManagementPermissions' && !result.error && (
                <div className="space-y-4">
                  {/* 同步一致性状态 */}
                  <div className={`alert ${result.syncAsyncConsistency ? 'alert-success' : 'alert-warning'}`}>
                    <div className="flex items-center gap-2">
                      {result.syncAsyncConsistency ? (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">同步/异步检查结果一致！缓存问题已修复。</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 13.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="font-medium">检测到同步/异步结果不一致，需要进一步调试。</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">同步检查覆盖</div>
                      <div className="stat-value text-lg">{result.syncPermissionCoverage}</div>
                      <div className="stat-desc">基于缓存的同步检查</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">异步检查覆盖</div>
                      <div className="stat-value text-lg">{result.asyncPermissionCoverage}</div>
                      <div className="stat-desc">基于API的异步检查</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">缓存状态</div>
                      <div className="stat-value text-lg">{result.cacheDebugInfo?.cacheSize || 0}</div>
                      <div className="stat-desc">
                        {result.cacheDebugInfo?.initialized ? '✅ 已初始化' : '⏳ 初始化中'}
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">数据一致性</div>
                      <div className={`stat-value text-lg ${result.syncAsyncConsistency ? 'text-success' : 'text-error'}`}>
                        {result.syncAsyncConsistency ? '✅ 一致' : '❌ 不一致'}
                      </div>
                      <div className="stat-desc">{result.accessLevel}</div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>权限代码</th>
                          <th>描述</th>
                          <th>同步检查</th>
                          <th>异步检查</th>
                          <th>一致性</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.permissions?.map((perm: any) => (
                          <tr key={perm.permission} className={!perm.syncAsyncMatch ? 'bg-warning/10' : ''}>
                            <td className="font-mono text-sm">{perm.permission}</td>
                            <td>{perm.description}</td>
                            <td>
                              <div className={`badge ${perm.hasPermission ? 'badge-success' : 'badge-error'}`}>
                                {perm.hasPermission ? '✅ 有权限' : '❌ 无权限'}
                              </div>
                            </td>
                            <td>
                              <div className={`badge ${perm.asyncResult?.allowed ? 'badge-success' : 'badge-error'}`}>
                                {perm.asyncResult?.allowed ? '✅ 有权限' : '❌ 无权限'}
                              </div>
                            </td>
                            <td>
                              <div className={`badge ${perm.syncAsyncMatch ? 'badge-success' : 'badge-error'}`}>
                                {perm.syncAsyncMatch ? '✅' : '❌'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 通用JSON展示（非角色管理权限测试） */}
              {testName !== 'roleManagementPermissions' && (
                <div className="bg-base-200 rounded-lg p-4 mt-2">
                  <pre className="text-sm overflow-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              {/* 角色管理权限测试错误时的展示 */}
              {testName === 'roleManagementPermissions' && result.error && (
                <div className="bg-base-200 rounded-lg p-4 mt-2">
                  <pre className="text-sm overflow-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
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