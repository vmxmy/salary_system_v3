/**
 * 统一的useAuth hook - 使用新的统一认证模块
 */

import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

// 统一的认证hook，遵循Supabase最佳实践
export const useAuth = useUnifiedAuth;