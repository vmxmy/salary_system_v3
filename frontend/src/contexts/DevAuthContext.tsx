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
  signUp: (email: string, password: string, userData?: any) => Promise<AuthUser>;
  signOut: () => Promise<void>;
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
  
  // Create a mock super admin user for development
  const [user] = useState<AuthUser>({
    id: '089b777e-0fa4-4238-adbc-066860cee037',
    email: 'blueyang@gmail.com',
    role: 'super_admin',
    permissions: ['*'] // All permissions
  });

  const session = null; // No real session in dev mode
  const isAuthenticated = true; // Always authenticated in dev mode

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    console.log(`[DevAuth] Mock sign-in for ${email}`);
    return user;
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<AuthUser> => {
    console.log(`[DevAuth] Mock sign-up for ${email}`);
    return user;
  };

  const signOut = async (): Promise<void> => {
    console.log('[DevAuth] Mock sign-out');
    // In real implementation, would clear user state
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
    signUp,
    signOut,
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