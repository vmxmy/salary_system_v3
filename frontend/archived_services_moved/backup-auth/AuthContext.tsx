import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, type AuthUser } from '@/services/auth.service';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    let mounted = true;
    let initialized = false;
    
    const getSession = async () => {
      // Prevent multiple initialization
      if (initialized) return;
      initialized = true;
      
      console.log('[AuthContext] Getting initial session...');
      try {
        // Don't wait for session restoration, set loading to false quickly
        setLoading(false);
        
        // Get session in background
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('[AuthContext] Session error:', error);
          setUser(null);
          return;
        }
        
        setSession(session);
        if (session?.user) {
          console.log('[AuthContext] Session found, getting user details...');
          // Get user details asynchronously
          authService.getCurrentUser().then(authUser => {
            if (mounted) {
              setUser(authUser);
            }
          }).catch(err => {
            console.error('[AuthContext] Error getting user:', err);
            if (mounted) {
              setUser(null);
            }
          });
        } else {
          console.log('[AuthContext] No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Auth error:', error);
        if (mounted) {
          setUser(null);
        }
      }
    };

    getSession();

    // Debounce function to prevent rapid updates
    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdateUser = async (session: any) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(async () => {
        if (session?.user) {
          try {
            const authUser = await authService.getCurrentUser();
            setUser(authUser);
          } catch (error) {
            console.error('[AuthContext] Error getting user:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }, 500); // 500ms debounce
    };
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      setSession(session);
      
      // For SIGNED_IN event, don't immediately call getCurrentUser to avoid race condition
      // The signIn method will handle updating the user state directly
      if (event === 'SIGNED_OUT') {
        // Clear user state on sign out
        setUser(null);
      } else if (event === 'USER_UPDATED') {
        // Update user data on profile changes
        if (session?.user) {
          try {
            const authUser = await authService.getCurrentUser();
            setUser(authUser);
          } catch (error) {
            console.error('[AuthContext] Error getting user:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // For token refresh, just update session without fetching user again
        // User data doesn't change during token refresh
        console.log('[AuthContext] Token refreshed, keeping existing user data');
      } else if (event === 'SIGNED_IN') {
        // Don't call getCurrentUser here to avoid race condition with signIn method
        // The signIn method will update user state directly
        console.log('[AuthContext] SIGNED_IN event received, user state will be updated by signIn method');
      } else {
        // For other events, use debounced update
        debouncedUpdateUser(session);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signIn called, delegating to authService...');
    const authUser = await authService.signIn(email, password);
    console.log('[AuthContext] authService.signIn completed, updating user state...');
    setUser(authUser);
    console.log('[AuthContext] User state updated in context');
    return authUser;
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    // Basic signUp implementation - can be expanded as needed
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      const authUser = await authService.signIn(email, password);
      setUser(authUser);
      return authUser;
    }
    throw new Error('Registration failed');
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out user...');
    await authService.signOut();
    setUser(null);
    setSession(null);
    
    // Redirect to login page after logout
    window.location.href = '/auth/login';
  };

  const resetPassword = async (email: string) => {
    const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  const hasPermission = (permission: string) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user?.permissions) return false;
    return permissions.some(p => user.permissions!.includes(p)) || user.permissions.includes('*');
  };

  const hasAllPermissions = (permissions: string[]) => {
    if (!user?.permissions) return false;
    return permissions.every(p => user.permissions!.includes(p)) || user.permissions.includes('*');
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

  return <AuthContext.Provider value={value as AuthContextType}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 