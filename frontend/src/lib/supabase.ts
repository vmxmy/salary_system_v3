import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

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
      // 改进连接处理
      fetch: (url, options = {}) => {
        const urlString = typeof url === 'string' ? url : url.toString();
        const timeoutMs = urlString.includes('/rest/v1/rpc/') || 
                         urlString.includes('import') || 
                         urlString.includes('batch') ? 120000 : 60000; // 对RPC和批量操作使用2分钟超时，其他使用1分钟
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, timeoutMs);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).then(response => {
          clearTimeout(timeout);
          return response;
        }).catch(error => {
          clearTimeout(timeout);
          console.error('[Supabase] Network error:', error);
          
          if (error.name === 'AbortError' || error.message.includes('timed out')) {
            throw new Error(`连接超时（${timeoutMs/1000}秒），请检查网络连接或项目状态`);
          }
          if (error.message.includes('ERR_CONNECTION_CLOSED') || error.message.includes('ERR_NETWORK')) {
            throw new Error('网络连接失败，可能项目已暂停或网络不稳定');
          }
          if (error.message.includes('Failed to fetch')) {
            throw new Error('无法连接到Supabase服务，请检查网络连接');
          }
          throw error;
        });
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