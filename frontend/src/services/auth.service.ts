import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  permissions?: string[];
}

// Cache for user data to prevent unnecessary calls
let userCache: AuthUser | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    console.log(`[AuthService] Attempting sign-in for ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AuthService] Supabase sign-in error:', error);
      throw error;
    }
    if (!data.user) {
      console.error('[AuthService] No user returned from Supabase after sign-in.');
      throw new Error('No user returned');
    }

    console.log(`[AuthService] Sign-in successful for ${email}, user ID: ${data.user.id}`);
    // Clear cache on login
    userCache = null;
    cacheExpiry = 0;
    
    // Fetch user permissions
    const permissions = await this.getUserPermissions();

    // Return user data with permissions
    return {
      id: data.user.id,
      email: data.user.email!,
      role: 'employee', // This should also be fetched, but for now, we focus on permissions
      permissions,
    };
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: {
    full_name?: string;
    employee_id?: string;
  }): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    // Create default user role
    await supabase.from('user_roles').insert({
      user_id: data.user.id,
      role: 'employee',
      is_active: true
    });

    // Clear cache on signup
    userCache = null;
    cacheExpiry = 0;
    
    // Return basic user data
    return {
      id: data.user.id,
      email: data.user.email!,
      role: 'employee',
      permissions: []
    };
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear cache on logout
    userCache = null;
    cacheExpiry = 0;
  }

  /**
   * Get current user - simplified version without enrichment
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('[AuthService] Getting current user from Supabase...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('[AuthService] No current user found');
        return null;
      }
      
      // Fetch user permissions
      const permissions = await this.getUserPermissions();

      // Return user data with permissions
      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        role: 'employee', // Default role
        permissions,
      };
      
      console.log('[AuthService] Returning user data with permissions:', user.email);
      return authUser;
    } catch (err) {
      console.error('[AuthService] getCurrentUser: Error:', err);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    
    // Clear cache after password update
    userCache = null;
    cacheExpiry = 0;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    // For now, use role-based permissions from frontend
    // TODO: Implement database-based permission checking
    const permissions = await this.getUserPermissions();
    return permissions.includes(permission);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(): Promise<string[]> {
    // Don't call getCurrentUser here to avoid circular dependency
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user role and map to permissions
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !roleData) return [];
    
    // Import permission mappings from permission service
    const { ROLE_PERMISSIONS } = await import('./permission.service');
    return ROLE_PERMISSIONS[roleData.role] || [];
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      // Clear cache on auth state changes
      userCache = null;
      cacheExpiry = 0;
      
      if (session?.user) {
        // Return basic user data without enrichment
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          role: 'employee', // Default role
          permissions: [] // Empty permissions
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }
  
  /**
   * Clear the user cache (useful for forcing refresh)
   */
  clearCache(): void {
    userCache = null;
    cacheExpiry = 0;
  }
}

// Export singleton instance
export const authService = new AuthService();