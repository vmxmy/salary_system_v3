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

// 简化的用户接口
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// 认证状态接口
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super_admin': ['*'],
  'admin': ['employee.view', 'employee.create', 'payroll.view', 'system.settings'],
  'hr_manager': ['employee.view', 'employee.create', 'department.view'],
  'finance_admin': ['payroll.view', 'payroll.create', 'payroll.approve'],
  'manager': ['employee.view', 'department.view', 'payroll.view'],
  'employee': ['employee.view']
};

/**
 * 从Supabase用户构建AuthUser对象
 */
async function buildAuthUser(user: User): Promise<AuthUser> {
  // 获取用户角色
  let role = 'employee';
  try {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    if (roleData?.role) {
      role = roleData.role;
    }
  } catch (error) {
    console.warn('[Auth] Failed to get user role, using default:', error);
  }

  // 获取权限
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['employee'];

  return {
    id: user.id,
    email: user.email!,
    role,
    permissions
  };
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
   * 登出
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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