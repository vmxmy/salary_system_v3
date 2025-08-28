/**
 * 支持代理的 Fetch 实现
 * 由于浏览器安全限制，实际代理功能需要通过后端代理服务器实现
 * 这里提供一个扩展的 fetch 包装器，支持代理配置管理
 */
import type { ProxyConfig } from '@/types/proxy';

// 代理配置存储键
const PROXY_CONFIG_KEY = 'supabase-proxy-config';

// 获取当前代理配置
const getProxyConfig = (): ProxyConfig | null => {
  try {
    const savedConfig = localStorage.getItem(PROXY_CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig) as ProxyConfig;
      return config.enabled ? config : null;
    }
  } catch (error) {
    console.warn('[ProxyFetch] Failed to load proxy config:', error);
  }
  return null;
};

// 构建代理请求头
const buildProxyHeaders = (config: ProxyConfig): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // 添加代理配置信息到请求头（用于后端处理）
  headers['X-Proxy-Config'] = JSON.stringify({
    type: config.type,
    host: config.host,
    port: config.port,
    version: config.version,
    timeout: config.timeout,
    verifySSL: config.verifySSL,
  });
  
  // 如果有认证信息，添加到请求头
  if (config.auth) {
    const auth = btoa(`${config.auth.username}:${config.auth.password}`);
    headers['X-Proxy-Auth'] = auth;
  }
  
  // 添加用户代理
  if (config.userAgent) {
    headers['User-Agent'] = config.userAgent;
  }
  
  return headers;
};

// 代理感知的 fetch 包装器
export const createProxyFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const proxyConfig = getProxyConfig();
    
    // 如果没有启用代理或在开发环境中，使用标准 fetch
    if (!proxyConfig || process.env.NODE_ENV === 'development') {
      return fetch(input, init);
    }
    
    try {
      // 构建代理请求
      const proxyHeaders = buildProxyHeaders(proxyConfig);
      const enhancedInit: RequestInit = {
        ...init,
        headers: {
          ...init?.headers,
          ...proxyHeaders,
        },
      };
      
      // 记录代理使用情况
      console.log('[ProxyFetch] Using proxy configuration:', {
        type: proxyConfig.type,
        host: proxyConfig.host,
        port: proxyConfig.port,
        url: typeof input === 'string' ? input : input.toString(),
      });
      
      // 执行请求
      const response = await fetch(input, enhancedInit);
      
      // 记录成功响应
      if (response.ok) {
        console.log('[ProxyFetch] Proxy request successful:', response.status);
      } else {
        console.warn('[ProxyFetch] Proxy request failed:', response.status, response.statusText);
      }
      
      return response;
    } catch (error) {
      console.error('[ProxyFetch] Proxy request error:', error);
      
      // 如果代理请求失败，可以选择性地回退到直接连接
      const shouldFallback = error instanceof Error && (
        error.message.includes('ERR_PROXY') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('timeout')
      );
      
      if (shouldFallback) {
        console.warn('[ProxyFetch] Falling back to direct connection');
        return fetch(input, init);
      }
      
      throw error;
    }
  };
};

// 检查代理是否可用
export const isProxyAvailable = async (): Promise<boolean> => {
  const config = getProxyConfig();
  if (!config) return false;
  
  try {
    // 尝试通过代理发送一个简单的请求
    const proxyFetch = createProxyFetch();
    const response = await proxyFetch('https://httpbin.org/ip', {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    });
    
    return response.ok;
  } catch (error) {
    console.error('[ProxyFetch] Proxy availability check failed:', error);
    return false;
  }
};

// 获取通过代理的真实IP地址
export const getProxyIP = async (): Promise<string | null> => {
  const config = getProxyConfig();
  if (!config) return null;
  
  try {
    const proxyFetch = createProxyFetch();
    const response = await proxyFetch('https://httpbin.org/ip', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.origin || null;
    }
  } catch (error) {
    console.error('[ProxyFetch] Failed to get proxy IP:', error);
  }
  
  return null;
};

// 测试代理连接到特定目标
export const testProxyConnection = async (targetUrl: string): Promise<{
  success: boolean;
  responseTime: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const proxyFetch = createProxyFetch();
    const response = await proxyFetch(targetUrl, {
      method: 'HEAD', // 使用 HEAD 方法减少数据传输
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return {
      success: false,
      responseTime,
      error: errorMessage,
    };
  }
};

// 默认导出代理 fetch 实例
export default createProxyFetch();