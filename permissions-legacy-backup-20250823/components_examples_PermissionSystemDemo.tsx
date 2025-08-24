/**
 * 权限系统演示组件
 * 
 * 展示如何使用新的权限验证 Hook 系统的各种功能
 */

import React, { useState } from 'react';
import { 
  usePermissions,
  useRole,
  useResource,
  usePermissionRequest,
  PERMISSIONS,
  EnhancedPermissionGuard,
  RequirePermission,
  RequireOwnership
} from '@/hooks/permissions';
import type { Permission, Role } from '@/types/permission';

export function PermissionSystemDemo() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('emp_123');
  const [demoMode, setDemoMode] = useState<'basic' | 'advanced' | 'request' | 'guard'>('basic');

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="hero bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">🔐 权限系统演示</h1>
            <p className="py-6">
              展示企业级权限管理系统的各种功能，包括基础权限检查、角色管理、
              资源访问控制、权限申请等功能。
            </p>
          </div>
        </div>
      </div>

      {/* 演示模式切换 */}
      <div className="flex justify-center">
        <div className="tabs tabs-boxed">
          <button 
            className={`tab ${demoMode === 'basic' ? 'tab-active' : ''}`}
            onClick={() => setDemoMode('basic')}
          >
            基础权限
          </button>
          <button 
            className={`tab ${demoMode === 'advanced' ? 'tab-active' : ''}`}
            onClick={() => setDemoMode('advanced')}
          >
            高级功能
          </button>
          <button 
            className={`tab ${demoMode === 'request' ? 'tab-active' : ''}`}
            onClick={() => setDemoMode('request')}
          >
            权限申请
          </button>
          <button 
            className={`tab ${demoMode === 'guard' ? 'tab-active' : ''}`}
            onClick={() => setDemoMode('guard')}
          >
            权限守卫
          </button>
        </div>
      </div>

      {/* 基础权限演示 */}
      {demoMode === 'basic' && <BasicPermissionDemo />}
      
      {/* 高级功能演示 */}
      {demoMode === 'advanced' && <AdvancedPermissionDemo selectedEmployeeId={selectedEmployeeId} />}
      
      {/* 权限申请演示 */}
      {demoMode === 'request' && <PermissionRequestDemo />}
      
      {/* 权限守卫演示 */}
      {demoMode === 'guard' && <PermissionGuardDemo selectedEmployeeId={selectedEmployeeId} />}

      {/* 员工ID选择器 */}
      {(demoMode === 'advanced' || demoMode === 'guard') && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">测试参数</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择员工ID (用于资源权限测试)</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="emp_123">emp_123 (当前用户)</option>
                <option value="emp_456">emp_456 (其他用户)</option>
                <option value="emp_789">emp_789 (同部门用户)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 基础权限演示组件
function BasicPermissionDemo() {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role,
    isRole,
    hasRoleLevel,
    loading,
    error
  } = usePermissions();

  const testPermissions = [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.SYSTEM_CONFIG
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-4">检查权限中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>权限检查错误: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 角色信息卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">👤 角色信息</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>当前角色:</span>
              <span className="badge badge-primary">{role}</span>
            </div>
            
            <div className="divider"></div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>是员工:</span>
                <span className={`badge ${isRole('employee') ? 'badge-success' : 'badge-ghost'}`}>
                  {isRole('employee') ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>是经理:</span>
                <span className={`badge ${isRole(['manager', 'hr_manager']) ? 'badge-success' : 'badge-ghost'}`}>
                  {isRole(['manager', 'hr_manager']) ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>是管理员:</span>
                <span className={`badge ${isRole(['admin', 'super_admin']) ? 'badge-success' : 'badge-ghost'}`}>
                  {isRole(['admin', 'super_admin']) ? '是' : '否'}
                </span>
              </div>
            </div>

            <div className="divider"></div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>经理级别及以上:</span>
                <span className={`badge ${hasRoleLevel('manager') ? 'badge-success' : 'badge-ghost'}`}>
                  {hasRoleLevel('manager') ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>HR经理级别及以上:</span>
                <span className={`badge ${hasRoleLevel('hr_manager') ? 'badge-success' : 'badge-ghost'}`}>
                  {hasRoleLevel('hr_manager') ? '是' : '否'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 权限检查卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🔑 权限检查</h2>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">单个权限检查:</h4>
              <div className="space-y-1">
                {testPermissions.map(permission => (
                  <div key={permission} className="flex justify-between items-center">
                    <span className="text-sm font-mono">{permission}</span>
                    <span className={`badge ${hasPermission(permission) ? 'badge-success' : 'badge-error'}`}>
                      {hasPermission(permission) ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divider"></div>

            <div>
              <h4 className="font-semibold mb-2">组合权限检查:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">任意员工权限:</span>
                  <span className={`badge ${hasAnyPermission([PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE]) ? 'badge-success' : 'badge-error'}`}>
                    {hasAnyPermission([PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE]) ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">所有薪资权限:</span>
                  <span className={`badge ${hasAllPermissions([PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_CREATE]) ? 'badge-success' : 'badge-error'}`}>
                    {hasAllPermissions([PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_CREATE]) ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 高级功能演示组件
function AdvancedPermissionDemo({ selectedEmployeeId }: { selectedEmployeeId: string }) {
  const { role, switchRole, loading: roleLoading } = useRole();
  
  const employeeResource = useResource({
    resourceType: 'employee',
    resourceId: selectedEmployeeId,
    scope: 'own',
    checkOwnership: true
  });

  const payrollResource = useResource({
    resourceType: 'payroll',
    resourceId: 'payroll_456',
    scope: 'department'
  });

  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (newRole: Role) => {
    if (switching) return;
    
    setSwitching(true);
    try {
      const success = await switchRole(newRole);
      if (success) {
        console.log(`Role switched to: ${newRole}`);
      }
    } catch (error) {
      console.error('Role switch failed:', error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 角色管理卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🔄 角色管理</h2>
          
          <div className="space-y-4">
            <div>
              <span className="text-sm text-base-content/70">当前角色:</span>
              <div className="badge badge-lg badge-primary ml-2">{role}</div>
            </div>

            <div className="divider"></div>

            <div>
              <h4 className="font-semibold mb-2">角色切换 (仅降级):</h4>
              <div className="flex flex-wrap gap-2">
                {(['employee', 'manager'] as Role[]).map(targetRole => (
                  <button
                    key={targetRole}
                    className={`btn btn-sm ${role === targetRole ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleRoleSwitch(targetRole)}
                    disabled={switching || roleLoading || role === targetRole}
                  >
                    {switching ? <span className="loading loading-spinner loading-xs"></span> : null}
                    {targetRole}
                  </button>
                ))}
              </div>
            </div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm">只能切换到相同或更低级别的角色</span>
            </div>
          </div>
        </div>
      </div>

      {/* 资源权限卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">📄 资源权限</h2>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">员工资源 ({selectedEmployeeId}):</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className={`badge ${employeeResource.canView ? 'badge-success' : 'badge-error'}`}>
                  查看 {employeeResource.canView ? '✓' : '✗'}
                </div>
                <div className={`badge ${employeeResource.canUpdate ? 'badge-success' : 'badge-error'}`}>
                  修改 {employeeResource.canUpdate ? '✓' : '✗'}
                </div>
                <div className={`badge ${employeeResource.canDelete ? 'badge-success' : 'badge-error'}`}>
                  删除 {employeeResource.canDelete ? '✓' : '✗'}
                </div>
                <div className={`badge ${employeeResource.canExport ? 'badge-success' : 'badge-error'}`}>
                  导出 {employeeResource.canExport ? '✓' : '✗'}
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div>
              <h4 className="font-semibold">薪资资源 (部门级):</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className={`badge ${payrollResource.canView ? 'badge-success' : 'badge-error'}`}>
                  查看 {payrollResource.canView ? '✓' : '✗'}
                </div>
                <div className={`badge ${payrollResource.canUpdate ? 'badge-success' : 'badge-error'}`}>
                  修改 {payrollResource.canUpdate ? '✓' : '✗'}
                </div>
                <div className={`badge ${payrollResource.can('approve') ? 'badge-success' : 'badge-error'}`}>
                  审批 {payrollResource.can('approve') ? '✓' : '✗'}
                </div>
                <div className={`badge ${payrollResource.can('clear') ? 'badge-success' : 'badge-error'}`}>
                  清空 {payrollResource.can('clear') ? '✓' : '✗'}
                </div>
              </div>
            </div>

            {(employeeResource.loading || payrollResource.loading) && (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="ml-2 text-sm">检查资源权限中...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 权限申请演示组件
function PermissionRequestDemo() {
  const {
    requestPermission,
    requestTemporaryPermission,
    myRequests,
    pendingRequests,
    approveRequest,
    rejectRequest,
    loading
  } = usePermissionRequest();

  const [requestingPermission, setRequestingPermission] = useState<Permission | null>(null);

  const handleRequestPermission = async (permission: Permission) => {
    setRequestingPermission(permission);
    try {
      const requestId = await requestPermission(
        permission,
        undefined,
        `申请 ${permission} 权限以访问相关功能`
      );
      console.log(`权限申请已提交: ${requestId}`);
    } catch (error) {
      console.error('权限申请失败:', error);
    } finally {
      setRequestingPermission(null);
    }
  };

  const handleRequestTempPermission = async (permission: Permission) => {
    setRequestingPermission(permission);
    try {
      const requestId = await requestTemporaryPermission(
        permission,
        2 * 60 * 60 * 1000, // 2小时
        `申请临时 ${permission} 权限处理紧急事务`
      );
      console.log(`临时权限申请已提交: ${requestId}`);
    } catch (error) {
      console.error('临时权限申请失败:', error);
    } finally {
      setRequestingPermission(null);
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'pending': { text: '待审批', class: 'badge-warning' },
      'approved': { text: '已批准', class: 'badge-success' },
      'rejected': { text: '已拒绝', class: 'badge-error' },
      'expired': { text: '已过期', class: 'badge-neutral' }
    };
    return statusMap[status] || { text: status, class: 'badge-ghost' };
  };

  return (
    <div className="space-y-6">
      {/* 权限申请操作 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">📝 申请权限</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">常规权限申请:</h4>
              <div className="space-y-2">
                {[
                  PERMISSIONS.EMPLOYEE_DELETE,
                  PERMISSIONS.PAYROLL_APPROVE,
                  PERMISSIONS.SYSTEM_CONFIG
                ].map(permission => (
                  <button
                    key={permission}
                    className="btn btn-sm btn-outline w-full"
                    onClick={() => handleRequestPermission(permission)}
                    disabled={loading || requestingPermission === permission}
                  >
                    {requestingPermission === permission ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : null}
                    申请 {permission}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">临时权限申请 (2小时):</h4>
              <div className="space-y-2">
                {[
                  PERMISSIONS.SYSTEM_BACKUP,
                  PERMISSIONS.USER_MANAGEMENT,
                  PERMISSIONS.PAYROLL_CLEAR
                ].map(permission => (
                  <button
                    key={permission}
                    className="btn btn-sm btn-secondary w-full"
                    onClick={() => handleRequestTempPermission(permission)}
                    disabled={loading || requestingPermission === permission}
                  >
                    {requestingPermission === permission ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : null}
                    临时申请 {permission}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 我的申请 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">📋 我的申请 ({myRequests.length})</h2>
          
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              暂无权限申请记录
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(request => {
                const statusInfo = formatStatus(request.status);
                return (
                  <div key={request.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold">{request.permission}</h5>
                          <p className="text-sm text-base-content/70">{request.reason}</p>
                          <p className="text-xs text-base-content/50 mt-1">
                            申请时间: {request.requestedAt.toLocaleString()}
                          </p>
                        </div>
                        <div className={`badge ${statusInfo.class}`}>
                          {statusInfo.text}
                        </div>
                      </div>
                      {request.metadata?.request_type === 'temporary' && (
                        <div className="badge badge-info badge-sm mt-2">
                          临时权限
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 待审批申请 (仅管理员可见) */}
      {pendingRequests.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">⏰ 待审批申请 ({pendingRequests.length})</h2>
            
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="card bg-warning/10 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold">{request.permission}</h5>
                        <p className="text-sm text-base-content/70">
                          申请人: {request.metadata?.user_email}
                        </p>
                        <p className="text-sm text-base-content/70">{request.reason}</p>
                        <p className="text-xs text-base-content/50 mt-1">
                          申请时间: {request.requestedAt.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => approveRequest(request.id)}
                          disabled={loading}
                        >
                          批准
                        </button>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => rejectRequest(request.id)}
                          disabled={loading}
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      )}
    </div>
  );
}

// 权限守卫演示组件
function PermissionGuardDemo({ selectedEmployeeId }: { selectedEmployeeId: string }) {
  return (
    <div className="space-y-6">
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>
          以下演示展示了权限守卫组件的各种使用方式。
          根据您的当前权限，某些内容可能会被隐藏或显示权限申请选项。
        </span>
      </div>

      {/* 基础权限守卫 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🛡️ 基础权限守卫</h2>
          
          <div className="space-y-4">
            <EnhancedPermissionGuard permissions={[PERMISSIONS.EMPLOYEE_VIEW]}>
              <div className="alert alert-success">
                ✅ 您有查看员工的权限！这个内容只有具备 employee.view 权限的用户才能看到。
              </div>
            </EnhancedPermissionGuard>

            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.EMPLOYEE_DELETE]}
              showRequestButton={true}
              requestReason="需要删除权限以清理测试数据"
            >
              <div className="alert alert-success">
                ✅ 您有删除员工的权限！这是一个高级权限。
              </div>
            </EnhancedPermissionGuard>

            <RequirePermission permission={PERMISSIONS.SYSTEM_CONFIG}>
              <div className="alert alert-success">
                ✅ 您有系统配置权限！这通常只有管理员才有。
              </div>
            </RequirePermission>
          </div>
        </div>
      </div>

      {/* 组合权限守卫 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🔗 组合权限守卫</h2>
          
          <div className="space-y-4">
            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_CREATE]}
              mode="requireAll"
            >
              <div className="alert alert-success">
                ✅ 您同时拥有薪资查看和创建权限！
              </div>
            </EnhancedPermissionGuard>

            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.PAYROLL_APPROVE, PERMISSIONS.PAYROLL_CLEAR]}
              mode="requireAny"
              showRequestButton={true}
            >
              <div className="alert alert-success">
                ✅ 您拥有薪资审批或清空权限之一！
              </div>
            </EnhancedPermissionGuard>
          </div>
        </div>
      </div>

      {/* 资源级权限守卫 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">📂 资源级权限守卫</h2>
          
          <div className="space-y-4">
            <RequireOwnership 
              resourceType="employee" 
              resourceId={selectedEmployeeId}
              showRequestButton={true}
            >
              <div className="alert alert-success">
                ✅ 您可以访问员工 {selectedEmployeeId} 的信息（所有权检查通过）
              </div>
            </RequireOwnership>

            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.PAYROLL_VIEW]}
              resource={{ type: 'payroll', id: selectedEmployeeId }}
              scope="department"
              showRequestButton={true}
            >
              <div className="alert alert-success">
                ✅ 您可以查看部门内的薪资信息
              </div>
            </EnhancedPermissionGuard>
          </div>
        </div>
      </div>

      {/* 自定义回退内容 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">🎨 自定义回退内容</h2>
          
          <div className="space-y-4">
            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.USER_MANAGEMENT]}
              fallback={
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h4 className="font-bold">用户管理功能</h4>
                    <div className="text-sm">此功能需要用户管理权限。请联系管理员开通权限。</div>
                  </div>
                </div>
              }
            >
              <div className="alert alert-success">
                ✅ 欢迎来到用户管理界面！
              </div>
            </EnhancedPermissionGuard>

            <EnhancedPermissionGuard 
              permissions={[PERMISSIONS.SYSTEM_BACKUP]}
              noPermissionComponent={
                <div className="hero bg-base-200 rounded-lg">
                  <div className="hero-content text-center">
                    <div className="max-w-md">
                      <div className="text-6xl mb-4">🔒</div>
                      <h1 className="text-3xl font-bold">系统备份</h1>
                      <p className="py-6">
                        此功能需要系统备份权限。这是一个高安全级别的操作，
                        需要特殊授权才能访问。
                      </p>
                      <button className="btn btn-primary">
                        申请备份权限
                      </button>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="alert alert-success">
                ✅ 系统备份功能已就绪！
              </div>
            </EnhancedPermissionGuard>
          </div>
        </div>
      </div>
    </div>
  );
}