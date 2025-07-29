/**
 * Unified useAuth hook that selects the appropriate auth context
 * based on the environment
 */

import { useAuth as useRealAuth } from '@/contexts/AuthContext';
import { useDevAuth } from '@/contexts/DevAuthContext';

const isDevelopment = import.meta.env.DEV;

export const useAuth = isDevelopment ? useDevAuth : useRealAuth;