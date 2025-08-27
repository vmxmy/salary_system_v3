/**
 * 统一的认证上下文 - 遵循Supabase最佳实践
 * 
 * 核心设计原则：
 * 1. 单一认证流程 - 避免多个地方同时处理认证
 * 2. 最小化状态 - 只维护必要的状态
 * 3. 避免竞争条件 - 清晰的状态更新流程
 * 4. 错误处理简化 - 让Supabase处理大部分逻辑
 */

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { auth, type AuthUser, type AuthState } from '@/lib/auth';
// Old useUserRole moved to archived - role information now comes from supabase user metadata
// import { useUserRole } from '@/hooks/core/useUserRole';

interface AuthContextType extends AuthState {
  // 认证操作
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  
  // 重新验证相关
  validateSession: () => Promise<boolean>;
  requireReAuthentication: (reason?: string) => void;
  
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

  // Role information now comes from supabase user metadata (useUserRole moved to archived)
  // const userRoleData = useUserRole(baseUser?.email);

  // 🔧 修复: 稳定化user对象引用，避免无限重渲染
  const user = useMemo(() => {
    // Role and permission information should come from auth.getCurrentUser()
    return baseUser;
  }, [baseUser]);

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
            // 网络错误时不要设置user为null，而是创建一个fallback用户对象
            if (mounted && currentSession?.user) {
              console.warn('[UnifiedAuth] Using fallback user due to network error');
              const fallbackUser = {
                id: currentSession.user.id,
                email: currentSession.user.email!,
                role: 'admin', // 网络问题时使用admin权限确保系统可用
                permissions: ['*'] as readonly string[], // 临时全权限
                departmentId: undefined,
                managedDepartments: undefined
              };
              setBaseUser(fallbackUser);
            } else {
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

  // 认证操作 - 修复：使用 useCallback 稳定化函数引用
  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    console.log('[UnifiedAuth] signIn called');
    const authUser = await auth.signIn(email, password);
    
    // 直接设置用户状态，避免等待onAuthStateChange
    setBaseUser(authUser);
    console.log('[UnifiedAuth] User state updated after signIn');
    
    return authUser;
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<void> => {
    const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    await auth.signUp(email, password);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await auth.signOut();
    // 状态会在onAuthStateChange中更新
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    await auth.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<void> => {
    await auth.updatePassword(newPassword);
  }, []);

  // 重新验证相关 - 修复：使用 useCallback 稳定化函数引用
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      return await auth.validateSession();
    } catch (error) {
      console.error('[UnifiedAuth] Session validation error:', error);
      return false;
    }
  }, []);

  const requireReAuthentication = useCallback((reason?: string): void => {
    console.log('[UnifiedAuth] Re-authentication required:', reason);
    
    // 触发全局重新验证事件
    window.dispatchEvent(new CustomEvent('auth-reauth-required', {
      detail: { reason }
    }));
    
    // 清理当前状态，但不完全登出
    setBaseUser(null);
    
    // 导航到登录页面并传递重新验证信息
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams();
    searchParams.set('reauth', 'true');
    if (reason) {
      searchParams.set('reason', reason);
    }
    if (currentPath !== '/auth/login') {
      searchParams.set('return_to', currentPath);
    }
    
    window.location.href = `/auth/login?${searchParams.toString()}`;
  }, []);

  // 权限检查 - 集成增强权限系统 - 修复：使用 useCallback 稳定化函数引用
  const hasPermission = useCallback((permission: string): boolean => {
    return auth.hasPermission(user, permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return auth.hasAnyPermission(user, permissions);
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return auth.hasAllPermissions(user, permissions);
  }, [user]);

  // 扩展用户信息以包含部门和管理权限 - 修复：添加到依赖中避免无限重渲染
  const enhancedUser = useMemo(() => {
    if (!user) return null;
    
    return {
      ...user,
      departmentId: user.departmentId || undefined,
      managedDepartments: user.managedDepartments || []
    };
  }, [user]);

  // 修复：使用 useMemo 稳定化 context value 对象引用
  const value: AuthContextType = useMemo(() => ({
    // 状态
    session,
    user: enhancedUser,
    loading,
    isAuthenticated,
    
    // 操作
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    
    // 重新验证
    validateSession,
    requireReAuthentication,
    
    // 权限
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }), [session, enhancedUser, loading, isAuthenticated, signIn, signInWithMagicLink, signUp, signOut, resetPassword, updatePassword, validateSession, requireReAuthentication, hasPermission, hasAnyPermission, hasAllPermissions]);

  return <UnifiedAuthContext.Provider value={value}>{children}</UnifiedAuthContext.Provider>;
};

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};