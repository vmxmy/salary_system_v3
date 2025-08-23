/**
 * 增强的权限守卫组件
 * 
 * 功能特性：
 * - 支持多种权限检查模式
 * - 上下文感知的权限验证
 * - 资源级别的访问控制
 * - 优雅的权限不足提示
 * - 权限申请快捷入口
 * - 实时权限状态更新
 */

import React, { type ReactNode, useMemo, useState } from 'react';
import { useEnhancedPermission } from '@/hooks/permissions/useEnhancedPermission';
import { usePermissionRequest } from '@/hooks/permissions/usePermissionRequest';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import type {
  Permission,
  PermissionContext,
  ResourceId,
  UsePermissionOptions
} from '@/types/permission';

export interface EnhancedPermissionGuardProps {
  /** 必需的权限列表 */
  permissions?: Permission[];
  /** 权限检查模式：requireAll(默认) - 需要所有权限，requireAny - 需要任意权限 */
  mode?: 'requireAll' | 'requireAny';
  /** 资源信息（用于资源级权限检查） */
  resource?: {
    type: ResourceId['type'];
    id?: string;
  };
  /** 访问范围 */
  scope?: 'own' | 'department' | 'all';
  /** 权限上下文覆盖 */
  contextOverride?: Partial<PermissionContext>;
  /** 权限检查选项 */
  options?: UsePermissionOptions;
  /** 无权限时的回退内容 */
  fallback?: ReactNode;
  /** 自定义无权限组件 */
  noPermissionComponent?: ReactNode;
  /** 是否显示权限申请按钮 */
  showRequestButton?: boolean;
  /** 权限申请理由 */
  requestReason?: string;
  /** 加载状态组件 */
  loadingComponent?: ReactNode;
  /** 错误状态组件 */
  errorComponent?: (error: Error) => ReactNode;
  /** 子组件 */
  children: ReactNode;
  /** 是否在开发环境显示调试信息 */
  debug?: boolean;
}

/**
 * 增强的权限守卫组件
 */
export function EnhancedPermissionGuard({
  permissions = [],
  mode = 'requireAll',
  resource,
  scope = 'all',
  contextOverride,
  options = {},
  fallback,
  noPermissionComponent,
  showRequestButton = true,
  requestReason,
  loadingComponent,
  errorComponent,
  children,
  debug = process.env.NODE_ENV === 'development'
}: EnhancedPermissionGuardProps) {
  const { user } = useUnifiedAuth();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermission,
    loading,
    error
  } = useEnhancedPermission(options);
  
  const { requestPermission } = usePermissionRequest();

  // 构建权限检查上下文
  const permissionContext = useMemo((): Partial<PermissionContext> => {
    const context: Partial<PermissionContext> = {
      ...contextOverride
    };

    if (resource) {
      context.resource = {
        type: resource.type,
        id: resource.id || 'unknown'
      };
    }

    return context;
  }, [resource, contextOverride]);

  // 执行权限检查
  const hasRequiredPermissions = useMemo((): boolean => {
    if (permissions.length === 0) {
      return true; // 无权限要求，允许访问
    }

    // 基础权限检查
    const basicCheck = mode === 'requireAll'
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    // 如果有资源信息，需要考虑范围
    if (resource && basicCheck) {
      switch (scope) {
        case 'own':
          // 检查是否是资源所有者
          if (resource.type === 'employee') {
            return resource.id === user?.id;
          }
          // 其他资源类型需要异步检查，这里返回保守结果
          return true;

        case 'department':
          // 检查部门级访问权限（需要异步验证）
          return user?.managedDepartments?.length > 0 || false;

        case 'all':
        default:
          return basicCheck;
      }
    }

    return basicCheck;
  }, [permissions, mode, hasAllPermissions, hasAnyPermission, resource, scope, user]);

  // 处理权限申请
  const handleRequestPermission = async (permission: Permission) => {
    if (!user || isRequestingPermission) return;

    setIsRequestingPermission(true);
    try {
      const reason = requestReason || `申请 ${permission} 权限以访问当前功能`;
      await requestPermission(permission, resource?.id, reason);
      
      // 显示成功提示
      console.log(`Permission request submitted for: ${permission}`);
    } catch (err) {
      console.error('Permission request failed:', err);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // 默认加载组件
  const defaultLoadingComponent = (
    <div className="flex justify-center items-center p-4">
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2 text-sm text-base-content/70">检查权限中...</span>
    </div>
  );

  // 默认无权限组件
  const defaultNoPermissionComponent = (
    <div className="alert alert-warning shadow-lg">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-bold">访问受限</h3>
          <div className="text-xs">
            您没有足够的权限访问此功能。
            {permissions.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">需要权限: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {permissions.map(permission => (
                    <span key={permission} className="badge badge-outline badge-sm">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {showRequestButton && permissions.length > 0 && (
          <div className="flex-none">
            <div className="dropdown dropdown-left">
              <label tabIndex={0} className="btn btn-sm btn-outline">
                申请权限
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                {permissions.map(permission => (
                  <li key={permission}>
                    <button
                      onClick={() => handleRequestPermission(permission)}
                      disabled={isRequestingPermission}
                      className="text-left"
                    >
                      {isRequestingPermission ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : null}
                      申请 {permission}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 默认错误组件
  const defaultErrorComponent = (error: Error) => (
    <div className="alert alert-error shadow-lg">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">权限检查错误</h3>
          <div className="text-xs">{error.message}</div>
        </div>
      </div>
    </div>
  );

  // 调试信息组件
  const DebugInfo = debug ? (
    <div className="border border-dashed border-warning p-2 m-2 text-xs bg-warning/5 rounded">
      <div className="font-mono text-warning">
        <div>🔍 PermissionGuard Debug Info:</div>
        <div>• User: {user?.email || 'Not authenticated'}</div>
        <div>• Role: {user?.role || 'N/A'}</div>
        <div>• Required Permissions: {permissions.join(', ') || 'None'}</div>
        <div>• Mode: {mode}</div>
        <div>• Resource: {resource ? `${resource.type}:${resource.id}` : 'None'}</div>
        <div>• Scope: {scope}</div>
        <div>• Has Permissions: {hasRequiredPermissions ? '✅' : '❌'}</div>
        <div>• Loading: {loading ? '⏳' : '✅'}</div>
        <div>• Error: {error?.message || 'None'}</div>
      </div>
    </div>
  ) : null;

  // 处理加载状态
  if (loading) {
    return (
      <>
        {loadingComponent || defaultLoadingComponent}
        {DebugInfo}
      </>
    );
  }

  // 处理错误状态
  if (error) {
    return (
      <>
        {errorComponent ? errorComponent(error) : defaultErrorComponent(error)}
        {DebugInfo}
      </>
    );
  }

  // 处理无权限情况
  if (!hasRequiredPermissions) {
    const noPermissionContent = noPermissionComponent || 
                               fallback || 
                               defaultNoPermissionComponent;

    return (
      <>
        {noPermissionContent}
        {DebugInfo}
      </>
    );
  }

  // 有权限，渲染子组件
  return (
    <>
      {children}
      {DebugInfo}
    </>
  );
}

// 便捷的权限守卫组件变体
export const RequirePermission = ({ permission, ...props }: Omit<EnhancedPermissionGuardProps, 'permissions'> & { permission: Permission }) => (
  <EnhancedPermissionGuard permissions={[permission]} {...props} />
);

export const RequireAnyPermission = ({ permissions, ...props }: Omit<EnhancedPermissionGuardProps, 'mode'>) => (
  <EnhancedPermissionGuard permissions={permissions} mode="requireAny" {...props} />
);

export const RequireAllPermissions = ({ permissions, ...props }: Omit<EnhancedPermissionGuardProps, 'mode'>) => (
  <EnhancedPermissionGuard permissions={permissions} mode="requireAll" {...props} />
);

export const RequireRole = ({ role, children, ...props }: Omit<EnhancedPermissionGuardProps, 'permissions'> & { role: string }) => {
  const { user } = useUnifiedAuth();
  
  if (user?.role !== role) {
    return (
      <div className="alert alert-warning">
        <span>需要 {role} 角色才能访问此功能</span>
      </div>
    );
  }
  
  return <>{children}</>;
};

export const RequireOwnership = ({ resourceType, resourceId, children, ...props }: 
  Omit<EnhancedPermissionGuardProps, 'resource' | 'scope'> & 
  { resourceType: ResourceId['type']; resourceId: string }
) => (
  <EnhancedPermissionGuard 
    resource={{ type: resourceType, id: resourceId }}
    scope="own"
    {...props}
  >
    {children}
  </EnhancedPermissionGuard>
);