import { supabase } from '@/lib/supabase';
import { performanceMonitor } from '@/services/performance-monitor.service';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  permissions?: string[];
}

// Cache for user data to prevent unnecessary calls
class AuthCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
}

const authCache = new AuthCache();
const CACHE_DURATION = 60000; // 1 minute cache
const ROLE_CACHE_DURATION = 300000; // 5 minutes cache for roles

export class AuthService {
  private pendingGetUser: Promise<AuthUser | null> | null = null;
  private pendingGetPermissions: Promise<string[]> | null = null;
  private abortController: AbortController | null = null;
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    // Remove sensitive data from logs
    console.log('[AuthService] Attempting sign-in');
    const signInStart = Date.now();
    
    try {
      console.log('[AuthService] Calling supabase.auth.signInWithPassword...');
      
      // Add timeout protection to prevent hanging promises
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Sign-in timeout after 10 seconds'));
        }, 10000);
      });
      
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

      console.log('[AuthService] Sign-in response received in', Date.now() - signInStart, 'ms');

      if (error) {
        console.error('[AuthService] Supabase sign-in error:', error);
        throw error;
      }
      if (!data?.user) {
        console.error('[AuthService] No user returned from Supabase after sign-in.');
        throw new Error('No user returned');
      }

      console.log('[AuthService] Sign-in successful, user ID:', data.user.id);
      
      // Clear cache on login
      authCache.clear();
      
      // Ensure user_profiles record exists
      console.log('[AuthService] Ensuring user profile...');
      const profileStart = Date.now();
      await this.ensureUserProfile(data.user.id, data.user.email!);
      console.log('[AuthService] User profile ensured in', Date.now() - profileStart, 'ms');
      
      // Fetch user role and permissions
      console.log('[AuthService] Fetching permissions...');
      const permStart = Date.now();
      const permissions = await this.getUserPermissions();
      console.log('[AuthService] Permissions fetched in', Date.now() - permStart, 'ms');
      
      console.log('[AuthService] Fetching user role...');
      const roleStart = Date.now();
      const userRole = await this.getUserRole(data.user.id);
      console.log('[AuthService] Role fetched in', Date.now() - roleStart, 'ms');

      const authUser = {
        id: data.user.id,
        email: data.user.email!,
        role: userRole,
        permissions,
      };
      
      console.log('[AuthService] Sign-in complete, returning user with role:', userRole);
      console.log('[AuthService] Total sign-in time:', Date.now() - signInStart, 'ms');
      // Return user data with permissions
      return authUser;
    } catch (err) {
      console.error('[AuthService] Sign-in error:', err);
      throw err;
    }
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
    authCache.clear();
    
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
    authCache.clear();
  }

  /**
   * Get current user with request deduplication and proper timeout
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Request deduplication - return existing promise if one is in progress
    if (this.pendingGetUser) {
      return this.pendingGetUser;
    }
    
    this.pendingGetUser = this._getCurrentUserImpl();
    
    try {
      const result = await this.pendingGetUser;
      return result;
    } finally {
      this.pendingGetUser = null;
    }
  }
  
  private async _getCurrentUserImpl(): Promise<AuthUser | null> {
    try {
      // Check cache first
      const cachedUser = authCache.get<AuthUser>('current_user');
      if (cachedUser) {
        // Return cached user
        return cachedUser;
      }
      
      // Use getSession first (faster, local)
      // No timeout needed for getSession as it should be fast
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        // Only call getUser if no session
        const { data: { user }, error } = await this.getUserWithAbortController();
        
        if (error || !user) {
          console.log('[AuthService] No current user found');
          return null;
        }
        
        // Use the user from getUser
        // Build auth user from getUser
        return this.buildAuthUser(user);
      }
      
      // Use session.user (faster path)
      const user = session.user;
      console.log('[AuthService] User found from session');
      
      // Build auth user from session
      // Build the auth user object
      const authUser = await this.buildAuthUser(user);
      
      // Cache the result
      authCache.set('current_user', authUser, CACHE_DURATION);
      
      console.log('[AuthService] User data prepared');
      return authUser;
    } catch (err) {
      console.error('[AuthService] Error in getCurrentUser:', err);
      
      // Clean up abort controller
      if (this.abortController) {
        this.abortController = null;
      }
      
      // If it's a timeout/abort error, return cached data if available
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('timeout'))) {
        console.warn('[AuthService] Request timeout, using cached data if available');
        const cachedUser = authCache.get<AuthUser>('current_user');
        if (cachedUser) {
          return cachedUser;
        }
      }
      
      return null;
    }
  }
  
  /**
   * Get user with AbortController for proper timeout handling
   */
  private async getUserWithAbortController() {
    // Clean up any existing controller
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, 10000); // 10 second timeout
    
    try {
      // Note: Supabase doesn't support AbortController yet, so we use Promise.race as fallback
      const result = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) => {
          const listener = () => {
            reject(new Error('Request aborted'));
          };
          this.abortController?.signal.addEventListener('abort', listener);
        })
      ]);
      
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    } finally {
      this.abortController = null;
    }
  }
  
  /**
   * Build AuthUser object with role and permissions
   */
  private async buildAuthUser(user: any): Promise<AuthUser> {
    // Build auth user with role and permissions
    let userRole = 'employee';
    let permissions: string[] = [];
    
    try {
      // Get role with caching
      userRole = await this.getUserRole(user.id);
      permissions = this.getRolePermissions(userRole);
    } catch (err) {
      console.error('[AuthService] Error fetching role/permissions:', err);
      permissions = this.getDefaultPermissions();
    }
    
    const authUser = {
      id: user.id,
      email: user.email!,
      role: userRole,
      permissions,
    };
    
    return authUser;
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
    authCache.clear();
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
   * Get user permissions with request deduplication
   */
  async getUserPermissions(): Promise<string[]> {
    // Request deduplication
    if (this.pendingGetPermissions) {
      return this.pendingGetPermissions;
    }
    
    this.pendingGetPermissions = this._getUserPermissionsImpl();
    
    try {
      const result = await this.pendingGetPermissions;
      return result;
    } finally {
      this.pendingGetPermissions = null;
    }
  }
  
  private async _getUserPermissionsImpl(): Promise<string[]> {
    const monitor = performanceMonitor?.startOperation('getUserPermissions', 'auth');
    
    try {
      console.log('[AuthService] Getting user permissions...');
      
      // Check cache first
      const cachedPermissions = authCache.get<string[]>('user_permissions');
      if (cachedPermissions) {
        console.log('[AuthService] Returning cached permissions');
        monitor?.end();
        return cachedPermissions;
      }
      
      console.log('[AuthService] Fetching session for permissions...');
      // Use getSession (faster than getUser)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('[AuthService] No active session for permissions');
        monitor?.end();
        return [];
      }

      const user = session.user;
      
      // Get user role with caching
      const userRole = await this.getUserRole(user.id);
      const permissions = this.getRolePermissions(userRole);
      
      // Cache the permissions
      authCache.set('user_permissions', permissions, CACHE_DURATION);
      
      monitor?.end();
      return permissions;
    } catch (err: any) {
      console.error('[AuthService] Error getting permissions:', err);
      monitor?.end(err?.message);
      return this.getDefaultPermissions();
    }
  }

  /**
   * Ensure user profile exists
   */
  private async ensureUserProfile(userId: string, email: string): Promise<void> {
    try {
      console.log('[AuthService] Checking if user profile exists for:', userId);
      
      // Add timeout for the query
      const checkPromise = supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('ensureUserProfile timeout after 3 seconds')), 3000);
      });
      
      let existingProfile = null;
      let checkError = null;
      
      try {
        const result = await Promise.race([checkPromise, timeoutPromise]);
        existingProfile = result.data;
        checkError = result.error;
      } catch (timeoutErr) {
        console.warn('[AuthService] ensureUserProfile query timed out');
        return; // Skip profile creation on timeout
      }
      
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
    // Get user role with caching
    const monitor = performanceMonitor?.startOperation('getUserRole', 'user_roles');
    
    try {
      // Check cache first
      const cacheKey = `user_role_${userId}`;
      const cached = authCache.get<string>(cacheKey);
      if (cached) {
        // Return cached role
        monitor?.end();
        return cached;
      }
      
      // Query user_roles table
      // First try to get role from user_roles table
      // Add limit(1) for better performance
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (!roleError && roleData) {
        // Cache the result
        authCache.set(`user_role_${userId}`, roleData.role, ROLE_CACHE_DURATION);
        monitor?.end();
        return roleData.role;
      }
      
      // Simplified fallback - just return default role
      // Complex role derivation should be done server-side
      console.log('[AuthService] No user_roles found, using default');
      
      console.warn('[AuthService] Could not fetch user role, defaulting to employee');
      // Cache even the default to prevent repeated queries
      authCache.set(`user_role_${userId}`, 'employee', ROLE_CACHE_DURATION);
      monitor?.end();
      return 'employee';
    } catch (err) {
      console.error('[AuthService] Error fetching user role:', err);
      // Cache the error case to prevent repeated failures
      authCache.set(`user_role_${userId}`, 'employee', 60000); // Shorter cache for error cases
      monitor?.end((err as Error).message);
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
      authCache.clear();
      
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
    authCache.clear();
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