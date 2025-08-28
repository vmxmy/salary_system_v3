import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getOptimizedConfig } from './performanceConfig';
import { networkAwareTimeout, createTimeoutSignal } from '../utils/network-aware-timeout';
import { executeWithRetry } from '../utils/network-retry';
import { createProxyFetch } from './proxyFetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      debug: false, // Disable verbose auth logging
      // 改进的认证配置以处理连接问题
      flowType: 'pkce', // 使用 PKCE 流程提高安全性
      storageKey: 'sb-rjlymghylrshudywrzec-auth-token',
    },
    global: {
      headers: {
        'x-application-name': 'salary-system-v3',
        'apikey': supabaseAnonKey,
      },
      // 网络感知的连接处理 - 根据网络质量动态调整超时，支持智能重试和代理配置
      fetch: async (url, options = {}) => {
        const urlString = typeof url === 'string' ? url : url.toString();
        const networkInfo = networkAwareTimeout.getNetworkInfo();
        
        // 确定操作类型，用于选择合适的超时和重试策略
        let operationType: 'api' | 'database' | 'upload' | 'download' = 'api';
        if (urlString.includes('/rest/v1/rpc/') || 
            urlString.includes('import') || 
            urlString.includes('batch')) {
          operationType = 'database';
        } else if (urlString.includes('/storage/v1/object/')) {
          operationType = options.method === 'POST' || options.method === 'PUT' 
            ? 'upload' : 'download';
        }
        
        // 对于慢网络环境，给出提示
        if (networkInfo.quality === 'poor' || networkInfo.quality === 'fair') {
          console.log(`[Supabase] Slow network detected (${networkInfo.quality}), using enhanced timeout and retry logic`);
        }
        
        // 创建代理感知的 fetch 实例
        const proxyFetch = createProxyFetch();
        
        // 使用重试机制执行请求
        const result = await executeWithRetry(
          async (signal, attempt) => {
            const timeoutMs = networkInfo.timeouts[operationType];
            console.log(`[Supabase] Request attempt ${attempt} to ${urlString} (timeout: ${timeoutMs}ms)`);
            
            return proxyFetch(url, {
              ...options,
              signal,
            });
          },
          operationType,
          // 对于某些关键操作，增加重试次数
          urlString.includes('/auth/') ? { maxRetries: 2 } : undefined
        );

        if (result.success && result.data) {
          if (result.attempts > 1) {
            console.log(`[Supabase] Request succeeded after ${result.attempts} attempts (${result.totalTime.toFixed(0)}ms total)`);
          }
          return result.data;
        } else {
          // 增强错误信息，包含重试信息
          const baseError = result.error?.message || 'Unknown error';
          const quality = networkInfo.quality;
          
          let enhancedMessage = `请求失败（${result.attempts}次尝试，${result.totalTime.toFixed(0)}ms）: ${baseError}`;
          
          if (baseError.includes('timeout') || baseError.includes('AbortError')) {
            const suggestion = quality === 'poor' || quality === 'fair' 
              ? '网络较慢，建议稍后重试或检查网络连接' 
              : '请检查网络连接或Supabase项目状态';
            enhancedMessage = `连接超时 - ${suggestion}`;
          } else if (baseError.includes('ERR_CONNECTION_CLOSED') || baseError.includes('ERR_NETWORK')) {
            enhancedMessage = '网络连接失败，可能是Supabase项目已暂停或网络不稳定';
          } else if (baseError.includes('Failed to fetch')) {
            enhancedMessage = quality === 'offline' 
              ? '网络连接已断开，请检查网络设置'
              : 'Supabase服务连接失败，请检查网络连接';
          }
          
          const error = new Error(enhancedMessage);
          console.error('[Supabase] Enhanced network error:', error);
          throw error;
        }
      },
    },
    db: {
      schema: 'public',
    },
    // 针对无状态应用的连接池配置
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Log initialization
console.log('[Supabase] Client initialized with URL:', supabaseUrl);

// 认证错误处理工具函数
export const handleAuthError = (error: any) => {
  if (error?.message?.includes('ERR_CONNECTION_CLOSED')) {
    // 清除可能损坏的认证状态
    localStorage.removeItem('sb-rjlymghylrshudywrzec-auth-token');
    console.warn('[Supabase] Connection closed, clearing auth state');
    
    // 可选：重新加载页面或重定向到登录页面
    return {
      shouldReload: true,
      message: 'Supabase 项目可能已暂停，请检查项目状态或稍后再试'
    };
  }
  
  if (error?.message?.includes('Invalid refresh token')) {
    // 清除无效的刷新令牌
    localStorage.removeItem('sb-rjlymghylrshudywrzec-auth-token');
    console.warn('[Supabase] Invalid refresh token, clearing auth state');
    
    return {
      shouldReload: true,
      message: '认证令牌已过期，请重新登录'
    };
  }
  
  return {
    shouldReload: false,
    message: error?.message || '未知错误'
  };
};

// Initialize performance monitoring in development mode
// Temporarily disabled to debug authentication issues
// if (process.env.NODE_ENV === 'development') {
//   createMonitoredSupabase();
// }

// Auth helpers
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  try {
    // 检查当前会话状态
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('[Supabase] No active session, clearing local state...');
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      // 处理会话已失效的情况
      if (error.message?.includes('Auth session missing') || 
          error.message?.includes('Invalid refresh token') ||
          error.status === 403) {
        console.log('[Supabase] Session invalid, clearing local state...');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('[Supabase] Sign-out error:', error);
    // 兜底：总是尝试清理本地状态
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (localError) {
      console.error('[Supabase] Failed to clear local state:', localError);
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Real-time subscription helper
export const subscribeToTable = <T>(
  tableName: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe();
};