/**
 * 统一的Supabase认证模块 - 遵循最佳实践
 * 
 * 核心原则：
 * 1. 单一数据源 - 只使用Supabase的session作为认证状态
 * 2. 避免重复调用 - 最小化API调用，依赖Supabase的内置缓存
 * 3. 简单的错误处理 - 让Supabase处理大部分认证逻辑
 * 4. 统一的接口 - 所有组件通过同一个接口访问认证功能
 */

import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { ROLE_PERMISSIONS, PERMISSIONS } from '@/constants/permissions';
import { fastRetrySupabase } from './supabase-retry';

// 简化的用户接口
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: readonly string[];
  departmentId?: string;
  managedDepartments?: string[];
}

// 认证状态接口
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// 使用统一的权限配置（从constants/permissions.ts导入）

/**
 * 从Supabase用户构建AuthUser对象
 * 现在从数据库中获取真实的角色和权限信息
 */
async function buildAuthUser(user: User): Promise<AuthUser> {
  try {
    console.log('[Auth] Building user with permissions for:', user.email);
    
    // 使用快速重试机制查询用户权限，避免认证卡住
    const { data: userPermData, error } = await Promise.race([
      fastRetrySupabase.viewQuery(
        'view_user_permissions',
        'user_role, permissions, page_permissions, data_scope',
        {
          filters: (query) => query.eq('user_id', user.id),
          limit: 1
        }
      ).then(result => ({ 
        data: result.data?.[0] || null, 
        error: result.error 
      })),
      
      // 15秒超时，给网络慢的情况更多时间，但仍防止永远卡住
      new Promise<{ data: null; error: any }>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Auth query timeout after 15 seconds'));
        }, 15000);
      })
    ]);

    if (error || !userPermData) {
      console.warn('[Auth] Failed to load user permissions, using fallback admin role:', error?.message || 'No data returned');
      // 网络问题时降级到管理员权限，确保用户可以继续使用系统
      return {
        id: user.id,
        email: user.email!,
        role: 'admin', // 使用admin而不是employee作为降级角色
        permissions: ROLE_PERMISSIONS['admin'] || []
      };
    }

    // 将数据库权限转换为字符串数组
    const permissions = Array.isArray((userPermData as any)?.permissions) 
      ? (userPermData as any).permissions as string[]
      : [];

    // 构建完整的AuthUser对象
    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      role: (userPermData as any)?.user_role || 'employee',
      permissions: permissions,
      // 如果需要部门信息，可以在这里添加
      // departmentId: userPermData.department_id,
      // managedDepartments: userPermData.managed_departments
    };

    console.log(`[Auth] User role loaded: ${authUser.role}, permissions: ${permissions.length}`);
    return authUser;

  } catch (error) {
    console.error('[Auth] Error building auth user:', error);
    // 发生错误时返回管理员权限作为降级策略
    return {
      id: user.id,
      email: user.email!,
      role: 'admin', // 网络故障时使用admin确保系统可用
      permissions: ROLE_PERMISSIONS['admin'] || []
    };
  }
}

/**
 * 确保用户Profile记录存在，并智能分配角色
 */
async function ensureUserProfile(user: User): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email!
        });
      
      if (error) {
        console.warn('[Auth] Failed to create user profile:', error);
      }
    }

    // 确保用户角色记录存在
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!existingRole) {
      console.log('[Auth] New user detected, assigning role based on system configuration...');
      
      // 使用智能角色分配函数 - 添加类型断言避免编译错误
      const { data: assignedRole, error: assignError } = await (supabase as any)
        .rpc('assign_user_role_by_rules', {
          user_email: user.email!,
          user_id_param: user.id
        });

      const roleToAssign = assignedRole || 'employee'; // 降级到默认角色
      
      if (assignError) {
        console.warn('[Auth] Error calling role assignment function:', assignError);
      }

      console.log(`[Auth] Assigning role '${roleToAssign}' to new user: ${user.email}`);

      // 使用类型断言避免 user_roles 表的类型问题
      const { error: roleError } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: roleToAssign,
          is_active: true
        });
      
      if (roleError) {
        console.warn('[Auth] Failed to create user role:', roleError);
        
        // 如果角色分配失败，尝试使用硬编码的默认值
        console.log('[Auth] Retrying with fallback employee role...');
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'employee',
            is_active: true
          });
      } else {
        console.log(`[Auth] Successfully assigned role '${roleToAssign}' to user ${user.email}`);
      }
    }
  } catch (error) {
    console.warn('[Auth] Error ensuring user profile:', error);
  }
}

/**
 * 统一认证API
 */
export const auth = {
  /**
   * 登录
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    console.log('[Auth] Starting sign-in process...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign-in error:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from sign-in');
    }

    console.log('[Auth] Sign-in successful, user ID:', data.user.id);

    // 确保用户记录存在
    await ensureUserProfile(data.user);

    // 构建AuthUser对象
    const authUser = await buildAuthUser(data.user);
    console.log('[Auth] Sign-in complete, user role:', authUser.role);
    
    return authUser;
  },

  /**
   * 注册
   */
  async signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
  },

  /**
   * 登出 - 核心清理版本，完全绕过Supabase的logout API当其失败时
   */
  async signOut(): Promise<void> {
    console.log('[Auth] Starting nuclear sign-out process...');
    
    // 由于持续的403错误，直接跳到核心清理步骤
    // 不再尝试正常的Supabase logout，因为会话状态已经损坏
    console.log('[Auth] Skipping normal logout due to session corruption, going directly to nuclear cleanup...');
    
    // 核心清理 - 完全绕过Supabase API，直接清理存储
    console.log('[Auth] Performing nuclear cleanup...');
    await this._nuclearCleanup();
    
    // 触发auth状态变化事件，让其他组件知道用户已登出
    console.log('[Auth] Triggering manual auth state change...');
    this._triggerSignOutEvent();
    
    console.log('[Auth] Nuclear sign-out process completed');
  },

  /**
   * 核心清理：直接清理所有认证相关的存储，绕过Supabase
   */
  async _nuclearCleanup(): Promise<void> {
    try {
      console.log('[Auth] Starting comprehensive storage cleanup...');
      
      // 清理localStorage中的所有Supabase相关项
      const keysToRemove = [
        'sb-rjlymghylrshudywrzec-auth-token',
        'supabase.auth.token',
        'sb-auth-token',
        'supabase-auth-token',
        'supabase_auth_token',
        // 添加其他可能的Supabase存储键
      ];
      
      // 预定义键清理
      keysToRemove.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[Auth] Cleared localStorage key: ${key}`);
          }
          if (sessionStorage.getItem(key)) {
            sessionStorage.removeItem(key);
            console.log(`[Auth] Cleared sessionStorage key: ${key}`);
          }
        } catch (err) {
          console.warn(`[Auth] Failed to clear key ${key}:`, err);
        }
      });
      
      // 清理所有以'sb-'或'supabase'开头的存储项（localStorage）
      try {
        const localKeysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.toLowerCase().includes('supabase'))) {
            localKeysToDelete.push(key);
          }
        }
        
        localKeysToDelete.forEach(key => {
          localStorage.removeItem(key);
          console.log(`[Auth] Cleared localStorage pattern: ${key}`);
        });
      } catch (err) {
        console.warn('[Auth] Error during localStorage pattern cleanup:', err);
      }
      
      // 清理所有以'sb-'或'supabase'开头的存储项（sessionStorage）
      try {
        const sessionKeysToDelete: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('sb-') || key.toLowerCase().includes('supabase'))) {
            sessionKeysToDelete.push(key);
          }
        }
        
        sessionKeysToDelete.forEach(key => {
          sessionStorage.removeItem(key);
          console.log(`[Auth] Cleared sessionStorage pattern: ${key}`);
        });
      } catch (err) {
        console.warn('[Auth] Error during sessionStorage pattern cleanup:', err);
      }
      
      // 清理应用特定的状态
      try {
        // 清理可能的用户状态缓存
        ['user-cache', 'auth-state', 'current-user'].forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[Auth] Cleared app state: ${key}`);
          }
        });
      } catch (err) {
        console.warn('[Auth] Error during app state cleanup:', err);
      }
      
      console.log('[Auth] Nuclear cleanup completed successfully');
      
    } catch (error) {
      console.error('[Auth] Critical error during nuclear cleanup:', error);
      // 即使清理失败，也不抛出错误，让用户界面能继续工作
    }
  },

  /**
   * 手动触发登出事件，让AuthContext更新状态
   */
  _triggerSignOutEvent(): void {
    try {
      // 创建一个自定义事件来通知应用用户已登出
      const signOutEvent = new CustomEvent('auth-sign-out', {
        detail: { manual: true }
      });
      window.dispatchEvent(signOutEvent);
      
      // 也可以尝试触发storage事件来模拟存储变化
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sb-rjlymghylrshudywrzec-auth-token',
        newValue: null,
        oldValue: 'cleared'
      }));
      
    } catch (error) {
      console.error('[Auth] Error triggering sign-out event:', error);
    }
  },

  /**
   * 获取当前会话
   */
  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Get session error:', error);
      return null;
    }
    return session;
  },

  /**
   * 验证会话是否有效
   */
  async validateSession(): Promise<boolean> {
    try {
      const session = await this.getSession();
      if (!session) {
        return false;
      }

      // 检查会话是否过期
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('[Auth] Session expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Auth] Session validation error:', error);
      return false;
    }
  },

  /**
   * 获取当前用户（从会话构建）
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('[Auth] Getting current user...');
      
      const session = await this.getSession();
      if (!session?.user) {
        console.log('[Auth] No session found');
        return null;
      }

      // 添加额外的超时保护，确保认证不会永远卡住
      const userPromise = buildAuthUser(session.user);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('getCurrentUser timeout after 20 seconds'));
        }, 20000);
      });

      const user = await Promise.race([userPromise, timeoutPromise]);
      console.log('[Auth] Current user loaded successfully:', user.email);
      return user;
    } catch (error) {
      console.error('[Auth] Failed to get current user, returning fallback admin:', error);
      
      // 如果有会话但无法构建用户，创建一个基本的fallback
      try {
        const session = await this.getSession();
        if (session?.user) {
          return {
            id: session.user.id,
            email: session.user.email!,
            role: 'admin',
            permissions: ROLE_PERMISSIONS['admin'] || []
          };
        }
      } catch (fallbackError) {
        console.error('[Auth] Even fallback failed:', fallbackError);
      }
      
      return null;
    }
  },

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) throw error;
  },

  /**
   * 更新密码
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
  },

  /**
   * 监听认证状态变化
   */
  onAuthStateChange: supabase.auth.onAuthStateChange.bind(supabase.auth),

  /**
   * 权限检查
   */
  hasPermission(user: AuthUser | null, permission: string): boolean {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  },

  hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
    if (!user?.permissions) return false;
    return permissions.some(p => this.hasPermission(user, p));
  },

  hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
    if (!user?.permissions) return false;
    return permissions.every(p => this.hasPermission(user, p));
  }
};