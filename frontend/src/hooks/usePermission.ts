import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/services/permission.service';

/**
 * Hook to check user permissions
 * 
 * @example
 * ```tsx
 * const { can, canAny, canAll } = usePermission();
 * 
 * if (can('employee.create')) {
 *   // User can create employees
 * }
 * 
 * if (canAny(['employee.update', 'employee.delete'])) {
 *   // User can update OR delete employees
 * }
 * 
 * if (canAll(['employee.update', 'employee.delete'])) {
 *   // User can update AND delete employees
 * }
 * ```
 */
export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const can = useCallback((permission: keyof typeof PERMISSIONS | string) => {
    const perm = typeof permission === 'string' && permission in PERMISSIONS 
      ? PERMISSIONS[permission as keyof typeof PERMISSIONS]
      : permission;
    return hasPermission(perm);
  }, [hasPermission]);

  const canAny = useCallback((permissions: (keyof typeof PERMISSIONS | string)[]) => {
    const perms = permissions.map(p => 
      typeof p === 'string' && p in PERMISSIONS 
        ? PERMISSIONS[p as keyof typeof PERMISSIONS]
        : p
    );
    return hasAnyPermission(perms);
  }, [hasAnyPermission]);

  const canAll = useCallback((permissions: (keyof typeof PERMISSIONS | string)[]) => {
    const perms = permissions.map(p => 
      typeof p === 'string' && p in PERMISSIONS 
        ? PERMISSIONS[p as keyof typeof PERMISSIONS]
        : p
    );
    return hasAllPermissions(perms);
  }, [hasAllPermissions]);

  return {
    can,
    canAny,
    canAll,
    PERMISSIONS,
  };
}