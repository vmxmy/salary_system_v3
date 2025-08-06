/**
 * Unified useAuth hook that uses real Supabase authentication
 */

import { useAuth as useRealAuth } from '@/contexts/AuthContext';

// 强制使用真正的 Supabase 认证
export const useAuth = useRealAuth;