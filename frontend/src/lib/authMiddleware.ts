import { supabase } from './supabaseClient';
import { UserRole } from '../components/ProtectedRoute';

// Audit log types
export interface AuditLog {
  id?: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// Session management
export class SessionManager {
  private static instance: SessionManager;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.startSessionMonitoring();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private startSessionMonitoring() {
    // Check session validity periodically
    this.sessionCheckInterval = setInterval(async () => {
      await this.checkSession();
    }, this.SESSION_CHECK_INTERVAL);

    // Also check on user activity
    window.addEventListener('focus', () => this.checkSession());
  }

  async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        await this.handleSessionExpired();
        return;
      }

      // Check if session is about to expire
      const expiresAt = new Date(session.expires_at || 0).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
        // Attempt to refresh session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          await this.handleSessionExpired();
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  }

  private async handleSessionExpired() {
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login?session_expired=true';
  }

  cleanup() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }
}

// Audit logging helper
export async function createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user for audit log');
      return;
    }

    const auditEntry: AuditLog = {
      ...log,
      user_id: user.id,
      ip_address: window.location.hostname, // In production, get from backend
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Auth middleware for API operations
export function withAuth<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  requiredRoles?: UserRole[]
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('未授权访问');
      }

      // Check authorization if roles specified
      if (requiredRoles && requiredRoles.length > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (profileError || !profile) {
          throw new Error('无法验证用户权限');
        }

        const userRole = profile.role as UserRole;
        const hasPermission = requiredRoles.includes(userRole);

        if (!hasPermission) {
          // Log unauthorized attempt
          await createAuditLog({
            user_id: user.id,
            action: 'unauthorized_api_call',
            resource_type: 'api',
            resource_id: fn.name,
            changes: { required_roles: requiredRoles, user_role: userRole }
          });

          throw new Error('权限不足');
        }
      }

      // Execute the original function
      return await fn(...args);
    } catch (error) {
      // Log the error
      console.error('Auth middleware error:', error);
      throw error;
    }
  }) as T;
}

// Helper to check if user has required role
export async function checkUserRole(requiredRoles: UserRole[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data: profile } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!profile) return false;

    return requiredRoles.includes(profile.role as UserRole);
  } catch (error) {
    console.error('Role check error:', error);
    return false;
  }
}

// Logout helper with cleanup
export async function secureLogout() {
  try {
    // Create logout audit log
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await createAuditLog({
        user_id: user.id,
        action: 'logout',
        resource_type: 'auth',
        resource_id: 'session'
      });
    }

    // Clear all auth data
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();

    // Cleanup session monitoring
    SessionManager.getInstance().cleanup();

    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Secure logout error:', error);
    // Force redirect even on error
    window.location.href = '/login';
  }
}

// Initialize session manager
SessionManager.getInstance();