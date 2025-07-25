import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, type AuthUser } from '@/services/auth.service';

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const authUser = await authService.getCurrentUser();
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        authService.getCurrentUser().then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const authUser = await authService.signIn(email, password);
    setUser(authUser);
    return authUser;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user?.permissions) return false;
    return permissions.some(p => user.permissions!.includes(p));
  };

  const hasAllPermissions = (permissions: string[]) => {
    if (!user?.permissions) return false;
    return permissions.every(p => user.permissions!.includes(p));
  };

  const value = {
    session,
    user,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value as AuthContextType}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 