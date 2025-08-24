import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ROLE_PERMISSIONS } from '@/constants/permissions';

export interface UserRoleData {
  role: string;
  permissions: readonly string[];
  loading: boolean;
  error: string | null;
}

/**
 * 获取用户角色和权限的Hook
 * 独立于认证状态，专门用于获取角色信息
 */
export function useUserRole(userEmail?: string) {
  const [data, setData] = useState<UserRoleData>({
    role: 'employee',
    permissions: ROLE_PERMISSIONS['employee'],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!userEmail) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    let mounted = true;

    const fetchUserRole = async () => {
      try {
        console.log('[useUserRole] Fetching role for:', userEmail);
        
        // First, get the user profile to find the user ID
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error('[useUserRole] Profile query error:', profileError);
          setData(prev => ({
            ...prev,
            loading: false,
            error: profileError.message
          }));
          return;
        }

        if (!profileData) {
          console.warn('[useUserRole] No user profile found for:', userEmail);
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'User profile not found'
          }));
          return;
        }

        // Then, get the user role using the user ID
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, is_active')
          .eq('user_id', profileData.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!mounted) return;

        if (roleError) {
          console.error('[useUserRole] Role query error:', roleError);
          setData(prev => ({
            ...prev,
            loading: false,
            error: roleError.message
          }));
          return;
        }

        let role = 'employee';
        if (roleData?.role) {
          role = roleData.role;
          console.log('[useUserRole] Found role:', role);
        } else {
          console.warn('[useUserRole] No role found for user, using default employee');
        }

        const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS['employee'];

        setData({
          role,
          permissions,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('[useUserRole] Fetch error:', error);
        if (mounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    };

    fetchUserRole();

    return () => {
      mounted = false;
    };
  }, [userEmail]);

  return data;
}