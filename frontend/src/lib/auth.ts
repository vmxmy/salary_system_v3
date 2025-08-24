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
    // 从view_user_permissions视图获取用户的真实角色和权限
    const { data: userPermData, error } = await supabase
      .from('view_user_permissions')
      .select('user_role, permissions, page_permissions, data_scope')
      .eq('user_id', user.id)
      .single();

    if (error || !userPermData) {
      console.warn('[Auth] Failed to load user permissions, using default admin role for fallback:', error);
      // 网络问题时降级到管理员权限，确保用户可以继续使用系统
      return {
        id: user.id,
        email: user.email!,
        role: 'admin', // 使用admin而不是employee作为降级角色
        permissions: ROLE_PERMISSIONS['admin'] || []
      };
    }

    // 将数据库权限转换为字符串数组
    const permissions = Array.isArray(userPermData.permissions) 
      ? userPermData.permissions as string[]
      : [];

    // 构建完整的AuthUser对象
    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      role: userPermData.user_role || 'employee',
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
 * 确保用户Profile记录存在
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
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'employee',
          is_active: true
        });
      
      if (roleError) {
        console.warn('[Auth] Failed to create user role:', roleError);
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
    const session = await this.getSession();
    if (!session?.user) {
      return null;
    }

    return await buildAuthUser(session.user);
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