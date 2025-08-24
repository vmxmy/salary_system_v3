import { type ReactNode } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

interface PermissionGuardProps {
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component to conditionally render children based on user permissions
 * 
 * @example
 * ```tsx
 * <PermissionGuard permissions={['employee.create']}>
 *   <button>Add Employee</button>
 * </PermissionGuard>
 * 
 * <PermissionGuard 
 *   permissions={['employee.update', 'employee.delete']} 
 *   requireAll={true}
 * >
 *   <button>Edit Employee</button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permissions = [],
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasAllPermissions, hasAnyPermission } = useUnifiedAuth();

  // If no permissions specified, render children
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  const hasPermission = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}