/**
 * 临时权限调试页面 - 用于诊断权限加载问题
 */

import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

export default function PermissionDebugPage() {
  const { user, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useUnifiedAuth();

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">权限调试页面</h1>
      
      <div className="card bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">用户信息</h2>
          <div className="space-y-2">
            <p><strong>用户ID:</strong> {user?.id || '未加载'}</p>
            <p><strong>邮箱:</strong> {user?.email || '未加载'}</p>
            <p><strong>角色:</strong> {user?.role || '未加载'}</p>
            <p><strong>权限数量:</strong> {user?.permissions?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">权限列表</h2>
          <div className="max-h-60 overflow-y-auto">
            {user?.permissions && user.permissions.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {user.permissions.map((permission, index) => (
                  <li key={index} className="text-sm">{permission}</li>
                ))}
              </ul>
            ) : (
              <p className="text-base-content/70">无权限数据</p>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">权限检查测试</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 text-center">
                {hasPermission('manage_roles') ? '✅' : '❌'}
              </span>
              <span>manage_roles: {hasPermission('manage_roles') ? '有权限' : '无权限'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 text-center">
                {hasPermission('user_management.read') ? '✅' : '❌'}
              </span>
              <span>user_management.read: {hasPermission('user_management.read') ? '有权限' : '无权限'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 text-center">
                {hasAnyPermission(['manage_roles', 'admin:access']) ? '✅' : '❌'}
              </span>
              <span>hasAnyPermission(['manage_roles', 'admin:access']): {hasAnyPermission(['manage_roles', 'admin:access']) ? '有权限' : '无权限'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 text-center">
                {hasPermission('*') ? '✅' : '❌'}
              </span>
              <span>通配符权限 (*): {hasPermission('*') ? '有权限' : '无权限'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button 
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          重新加载页面
        </button>
      </div>
    </div>
  );
}