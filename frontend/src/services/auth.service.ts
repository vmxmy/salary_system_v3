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

// Cache for user roles to prevent repeated DB queries
const roleCache = new Map<string, { role: string; expiry: number }>();
const ROLE_CACHE_DURATION = 300000; // 5 minutes cache for roles

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
    roleCache.clear();
    
    // Ensure user_profiles record exists
    await this.ensureUserProfile(data.user.id, data.user.email!);
    
    // Fetch user role and permissions
    const permissions = await this.getUserPermissions();
    const userRole = await this.getUserRole(data.user.id);

    // Return user data with permissions
    return {
      id: data.user.id,
      email: data.user.email!,
      role: userRole,
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
    roleCache.clear();
  }

  /**
   * Get current user - simplified version without enrichment
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('[AuthService] Getting current user from Supabase...');
      
      // Add timeout protection for the getUser call
      const getUserWithTimeout = async () => {
        return Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getUser timeout after 5 seconds')), 5000)
          )
        ]);
      };
      
      const { data: { user }, error } = await getUserWithTimeout();
      
      if (error || !user) {
        console.log('[AuthService] No current user found');
        return null;
      }
      
      console.log('[AuthService] User found, fetching role and permissions...', user.email);
      
      // Fetch user role and permissions with timeout to prevent hanging
      let permissions: string[] = [];
      let userRole = 'employee';
      
      try {
        // Fetch role first (with caching), then get permissions based on that role
        userRole = await Promise.race([
          this.getUserRole(user.id),
          new Promise<string>((resolve) => 
            setTimeout(() => {
              console.warn('[AuthService] Role fetch timeout after 5s, using default');
              resolve('employee');
            }, 5000)
          )
        ]);
        
        // Get permissions based on the role (no additional DB query needed)
        permissions = this.getRolePermissions(userRole);
      } catch (err) {
        console.error('[AuthService] Error fetching role/permissions, using defaults:', err);
        permissions = this.getDefaultPermissions();
        userRole = 'employee';
      }

      // Return user data with permissions
      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        role: userRole,
        permissions,
      };
      
      console.log('[AuthService] Returning user data with permissions:', user.email, permissions);
      return authUser;
    } catch (err) {
      console.error('[AuthService] getCurrentUser: Error:', err);
      
      // If it's a timeout error, try clearing corrupted auth state
      if (err instanceof Error && err.message.includes('timeout')) {
        console.warn('[AuthService] Timeout detected, clearing corrupted auth state and retrying...');
        this.clearCorruptedAuthState();
        
        // Trigger page reload to restart auth flow with clean state
        setTimeout(() => {
          console.log('[AuthService] Reloading page to reset auth state...');
          window.location.reload();
        }, 1000);
      }
      
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
   * Get user permissions - simplified version to avoid hanging
   */
  async getUserPermissions(): Promise<string[]> {
    try {
      console.log('[AuthService] Getting user permissions...');
      
      // First check session and user state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[AuthService] Session state:', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userEmail: session?.user?.email
      });
      
      if (sessionError || !session?.user) {
        console.log('[AuthService] No active session found for permissions check');
        return [];
      }

      const user = session.user;
      console.log('[AuthService] Fetching user role from database for user:', user.email);
      
      // Get user role with better error handling
      try {
        console.log('[AuthService] Fetching user role for permissions...');
        
        // Use the getUserRole method which handles fallbacks
        const userRole = await this.getUserRole(user.id);
        console.log('[AuthService] User role determined:', userRole);
        
        const permissions = this.getRolePermissions(userRole);
        console.log('[AuthService] Permissions loaded:', permissions);
        return permissions;
        
      } catch (timeoutOrError) {
        console.error('[AuthService] Role query failed:', timeoutOrError);
        return this.getDefaultPermissions();
      }
    } catch (err) {
      console.error('[AuthService] Error getting permissions:', err);
      return this.getDefaultPermissions();
    }
  }

  /**
   * Ensure user profile exists
   */
  private async ensureUserProfile(userId: string, email: string): Promise<void> {
    try {
      // Check if user_profiles record exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[AuthService] Error checking user profile:', checkError);
        return;
      }
      
      // If profile doesn't exist, create it
      if (!existingProfile) {
        console.log('[AuthService] Creating user profile for new user');
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email
          });
        
        if (insertError) {
          console.error('[AuthService] Error creating user profile:', insertError);
        }
      }
      
      // Also ensure user_roles record exists
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!existingRole && !roleCheckError) {
        console.log('[AuthService] Creating default user role');
        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'employee',
            is_active: true
          });
        
        if (roleInsertError) {
          console.error('[AuthService] Error creating user role:', roleInsertError);
        }
      }
    } catch (err) {
      console.error('[AuthService] Error ensuring user profile:', err);
    }
  }

  /**
   * Get user role from database with caching
   */
  private async getUserRole(userId: string): Promise<string> {
    try {
      // Check cache first
      const cached = roleCache.get(userId);
      if (cached && cached.expiry > Date.now()) {
        console.log('[AuthService] Using cached role for user:', userId);
        return cached.role;
      }
      
      // First try to get role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!roleError && roleData) {
        // Cache the result
        roleCache.set(userId, { 
          role: roleData.role, 
          expiry: Date.now() + ROLE_CACHE_DURATION 
        });
        return roleData.role;
      }
      
      // Fallback: derive role from employee assignment via user_profiles
      console.log('[AuthService] No user_roles found, checking employee assignment...');
      
      // First get the user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('employee_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profileError && profileData?.employee_id) {
        // Then get the employee's position from job history
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('employee_job_history')
          .select(`
            position_id,
            positions(name)
          `)
          .eq('employee_id', profileData.employee_id)
          .or('effective_end_date.is.null,effective_end_date.gte.now()')
          .order('effective_start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!assignmentError && assignmentData?.positions?.name) {
          const positionName = assignmentData.positions.name;
          // Map position names to roles
          const roleMapping: Record<string, string> = {
            '总经理': 'admin',
            '人事经理': 'hr_manager', 
            '财务经理': 'finance_admin',
            '部门经理': 'manager',
            '主管': 'manager'
          };
          
          const mappedRole = roleMapping[positionName] || 'employee';
          // Cache the result
          roleCache.set(userId, { 
            role: mappedRole, 
            expiry: Date.now() + ROLE_CACHE_DURATION 
          });
          return mappedRole;
        }
      }
      
      console.warn('[AuthService] Could not fetch user role, defaulting to employee');
      // Cache even the default to prevent repeated queries
      roleCache.set(userId, { 
        role: 'employee', 
        expiry: Date.now() + ROLE_CACHE_DURATION 
      });
      return 'employee';
    } catch (err) {
      console.error('[AuthService] Error fetching user role:', err);
      // Cache the error case to prevent repeated failures
      roleCache.set(userId, { 
        role: 'employee', 
        expiry: Date.now() + 60000 // Shorter cache for error cases (1 minute)
      });
      return 'employee';
    }
  }

  /**
   * Get permissions for a specific role
   */
  private getRolePermissions(role: string): string[] {
    const ROLE_PERMISSIONS: Record<string, string[]> = {
      'super_admin': ['*'], // All permissions
      'admin': ['employee.view', 'employee.create', 'payroll.view', 'system.settings'],
      'hr_manager': ['employee.view', 'employee.create', 'department.view'],
      'finance_admin': ['payroll.view', 'payroll.create', 'payroll.approve'],
      'manager': ['employee.view', 'department.view', 'payroll.view'],
      'employee': ['employee.view'] // Limited permissions
    };
    
    return ROLE_PERMISSIONS[role] || this.getDefaultPermissions();
  }

  /**
   * Get default permissions for users without specific roles
   */
  private getDefaultPermissions(): string[] {
    return ['employee.view']; // Basic view permissions
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

  /**
   * Clear corrupted auth state from localStorage
   */
  clearCorruptedAuthState(): void {
    console.log('[AuthService] Clearing potentially corrupted auth state...');
    try {
      // Clear Supabase-related localStorage entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('[AuthService] Removed localStorage key:', key);
      });
      
      // Clear sessionStorage as well
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log('[AuthService] Removed sessionStorage key:', key);
      });
      
      console.log('[AuthService] Auth state cleared successfully');
    } catch (error) {
      console.error('[AuthService] Error clearing auth state:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();