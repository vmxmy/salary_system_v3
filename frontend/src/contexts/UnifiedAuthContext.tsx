/**
 * 统一的认证上下文 - 遵循Supabase最佳实践
 * 
 * 核心设计原则：
 * 1. 单一认证流程 - 避免多个地方同时处理认证
 * 2. 最小化状态 - 只维护必要的状态
 * 3. 避免竞争条件 - 清晰的状态更新流程
 * 4. 错误处理简化 - 让Supabase处理大部分逻辑
 */

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { auth, type AuthUser, type AuthState } from '@/lib/auth';
import { useUserRole } from '@/hooks/core/useUserRole';

interface AuthContextType extends AuthState {
  // 认证操作
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  
  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const UnifiedAuthContext = createContext<AuthContextType | undefined>(undefined);

export const UnifiedAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [baseUser, setBaseUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 使用useUserRole hook获取角色信息
  const userRoleData = useUserRole(baseUser?.email);

  // 🔧 修复: 稳定化user对象引用，避免无限重渲染
  const user = useMemo(() => {
    if (!baseUser || userRoleData.loading) {
      return baseUser;
    }
    
    return {
      ...baseUser,
      role: userRoleData.role,
      permissions: userRoleData.permissions
    };
  }, [baseUser, userRoleData.loading, userRoleData.role, userRoleData.permissions]);

  const isAuthenticated = !!user;

  useEffect(() => {
    let mounted = true;

    // 初始化认证状态
    const initializeAuth = async () => {
      try {
        console.log('[UnifiedAuth] Initializing authentication...');
        
        // 获取当前会话
        const currentSession = await auth.getSession();
        
        if (!mounted) return;

        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log('[UnifiedAuth] Session found, building user...');
          try {
            const currentUser = await auth.getCurrentUser();
            if (mounted) {
              setBaseUser(currentUser);
            }
          } catch (error) {
            console.error('[UnifiedAuth] Error building user:', error);
            if (mounted) {
              setBaseUser(null);
            }
          }
        } else {
          console.log('[UnifiedAuth] No session found');
          setBaseUser(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[UnifiedAuth] Initialization error:', error);
        if (mounted) {
          setSession(null);
          setBaseUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('[UnifiedAuth] Auth state changed:', event);
      
      if (!mounted) return;

      setSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        // 登录成功 - 但不在这里处理用户构建，让signIn方法处理
        console.log('[UnifiedAuth] SIGNED_IN event - user will be set by signIn method');
      } else if (event === 'SIGNED_OUT') {
        // 登出
        console.log('[UnifiedAuth] User signed out');
        setBaseUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // 令牌刷新 - 重新构建用户信息
        console.log('[UnifiedAuth] Token refreshed, rebuilding user...');
        try {
          const currentUser = await auth.getCurrentUser();
          if (mounted) {
            setBaseUser(currentUser);
          }
        } catch (error) {
          console.error('[UnifiedAuth] Error rebuilding user after token refresh:', error);
          if (mounted) {
            setBaseUser(null);
          }
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        // 用户信息更新
        console.log('[UnifiedAuth] User updated, rebuilding user...');
        try {
          const currentUser = await auth.getCurrentUser();
          if (mounted) {
            setBaseUser(currentUser);
          }
        } catch (error) {
          console.error('[UnifiedAuth] Error rebuilding user after update:', error);
          if (mounted) {
            setBaseUser(null);
          }
        }
      }
    });

    // 监听手动登出事件（用于核心清理情况）
    const handleManualSignOut = () => {
      console.log('[UnifiedAuth] Manual sign-out event received');
      if (mounted) {
        setSession(null);
        setBaseUser(null);
      }
    };

    window.addEventListener('auth-sign-out', handleManualSignOut);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('auth-sign-out', handleManualSignOut);
    };
  }, []);

  // 认证操作
  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    console.log('[UnifiedAuth] signIn called');
    const authUser = await auth.signIn(email, password);
    
    // 直接设置用户状态，避免等待onAuthStateChange
    setBaseUser(authUser);
    console.log('[UnifiedAuth] User state updated after signIn');
    
    return authUser;
  };

  const signInWithMagicLink = async (email: string): Promise<void> => {
    const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    await auth.signUp(email, password);
  };

  const signOut = async (): Promise<void> => {
    await auth.signOut();
    // 状态会在onAuthStateChange中更新
  };

  const resetPassword = async (email: string): Promise<void> => {
    await auth.resetPassword(email);
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    await auth.updatePassword(newPassword);
  };

  // 权限检查
  const hasPermission = (permission: string): boolean => {
    return auth.hasPermission(user, permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return auth.hasAnyPermission(user, permissions);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return auth.hasAllPermissions(user, permissions);
  };

  const value: AuthContextType = {
    // 状态
    session,
    user,
    loading,
    isAuthenticated,
    
    // 操作
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    
    // 权限
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <UnifiedAuthContext.Provider value={value}>{children}</UnifiedAuthContext.Provider>;
};

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};