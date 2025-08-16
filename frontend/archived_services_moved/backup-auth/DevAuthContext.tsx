import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser } from '@/services/auth.service';

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const DevAuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Development-only Auth Provider that bypasses Supabase auth
 * This is used when Supabase auth endpoints are not accessible
 */
export const DevAuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  
  // Check if user was previously logged in (from localStorage)
  const getInitialUser = (): AuthUser | null => {
    try {
      const savedUser = localStorage.getItem('dev_auth_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.warn('[DevAuth] Failed to parse saved user:', error);
    }
    return null;
  };

  // Start with no user - require explicit login
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  const session = null; // No real session in dev mode
  const isAuthenticated = !!user; // Authenticated when user exists

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    console.log(`[DevAuth] Mock sign-in for ${email}`);
    const mockUser = {
      id: '089b777e-0fa4-4238-adbc-066860cee037',
      email: email,
      role: 'super_admin',
      permissions: ['*'] // All permissions
    };
    
    // Save to localStorage
    localStorage.setItem('dev_auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return mockUser;
  };

  const signInWithMagicLink = async (email: string): Promise<void> => {
    console.log(`[DevAuth] Mock magic link sent to ${email}`);
    // In dev mode, just log the action
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<AuthUser> => {
    console.log(`[DevAuth] Mock sign-up for ${email}`);
    const mockUser = {
      id: '089b777e-0fa4-4238-adbc-066860cee037',
      email: email,
      role: 'super_admin',
      permissions: ['*'] // All permissions
    };
    
    // Save to localStorage
    localStorage.setItem('dev_auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return mockUser;
  };

  const signOut = async (): Promise<void> => {
    console.log('[DevAuth] Mock sign-out - clearing user state');
    
    // Clear localStorage
    localStorage.removeItem('dev_auth_user');
    setUser(null);
    
    // Use setTimeout to ensure state update is processed
    setTimeout(() => {
      console.log('[DevAuth] Redirecting to login page...');
      window.location.href = '/auth/login';
    }, 100);
  };

  const resetPassword = async (email: string): Promise<void> => {
    console.log(`[DevAuth] Mock password reset sent to ${email}`);
    // In dev mode, just log the action
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    console.log('[DevAuth] Mock password update');
    // In dev mode, just log the action
  };

  const hasPermission = (permission: string): boolean => {
    // Super admin has all permissions
    return true;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    // Super admin has all permissions
    return true;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    // Super admin has all permissions
    return true;
  };

  const value = {
    session,
    user,
    loading,
    isLoading: loading,
    isAuthenticated,
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <DevAuthContext.Provider value={value}>{children}</DevAuthContext.Provider>;
};

export const useDevAuth = () => {
  const context = useContext(DevAuthContext);
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  return context;
};