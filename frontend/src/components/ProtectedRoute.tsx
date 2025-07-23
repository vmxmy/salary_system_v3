import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define user roles (matching database values)
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

// Role hierarchy (higher roles have access to lower role permissions)
const roleHierarchy = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.HR_MANAGER]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.EMPLOYEE]: 1
};

// Route permissions configuration
const routePermissions: Record<string, UserRole[]> = {
  '/payroll/insurance-config': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER],
  '/payroll/tax-config': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER],
  '/employees/create': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER],
  '/employees/:id/edit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER],
  '/employees': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER],
  '/': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE]
};

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ requiredRoles, requireAuth = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        // Fetch user role from user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // Log security event
          await logSecurityEvent('role_fetch_error', {
            user_id: user.id,
            error: error.message
          });
        } else if (data) {
          setUserRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('Error in role fetch:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Check if user has required role
  const hasRequiredRole = (userRole: UserRole | null, requiredRoles?: UserRole[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRole) return false;

    const userRoleLevel = roleHierarchy[userRole] || 0;
    return requiredRoles.some(role => {
      const requiredLevel = roleHierarchy[role] || 0;
      return userRoleLevel >= requiredLevel;
    });
  };

  // Get required roles for current route
  const getRequiredRolesForRoute = (): UserRole[] => {
    // First check exact match
    if (routePermissions[location.pathname]) {
      return routePermissions[location.pathname];
    }

    // Check pattern matches (e.g., /employees/:id/edit)
    for (const [pattern, roles] of Object.entries(routePermissions)) {
      if (pattern.includes(':')) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
        if (regex.test(location.pathname)) {
          return roles;
        }
      }
    }

    // Default to most restrictive if route not configured
    return [UserRole.SUPER_ADMIN];
  };

  // Log security event
  const logSecurityEvent = async (event: string, details: any) => {
    try {
      await supabase.from('security_logs').insert({
        event_type: event,
        user_id: user?.id,
        details,
        ip_address: window.location.hostname, // In production, get real IP from backend
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check authorization
  const effectiveRequiredRoles = requiredRoles || getRequiredRolesForRoute();
  if (user && !hasRequiredRole(userRole, effectiveRequiredRoles)) {
    // Log unauthorized access attempt
    logSecurityEvent('unauthorized_access_attempt', {
      user_id: user.id,
      user_role: userRole,
      required_roles: effectiveRequiredRoles,
      attempted_path: location.pathname
    });

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-error mb-4">403</h1>
          <p className="text-xl mb-4">访问被拒绝</p>
          <p className="text-base-content/70 mb-8">
            您没有权限访问此页面。需要以下角色之一：
            {effectiveRequiredRoles.map(role => (
              <span key={role} className="badge badge-outline mx-1">
                {role}
              </span>
            ))}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.history.back()}
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;