/**
 * 代理配置管理 Hook
 */
import { useState, useEffect, useCallback } from 'react';
import type { ProxyConfig, ProxyStatus, ProxyTestResult, ProxyConfigValidation } from '@/types/proxy';

const PROXY_CONFIG_KEY = 'supabase-proxy-config';
const PROXY_STATUS_KEY = 'supabase-proxy-status';

const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: true,
  type: 'http',
  host: 'gaoxin.net.cn',
  port: 8888,
  timeout: 12000, // 增加超时时间以适应网络延迟
  verifySSL: true,
};

export const useProxyConfig = () => {
  const [config, setConfig] = useState<ProxyConfig>(DEFAULT_PROXY_CONFIG);
  const [status, setStatus] = useState<ProxyStatus>({
    connected: false,
    lastTested: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // 加载保存的代理配置
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(PROXY_CONFIG_KEY);
      const savedStatus = localStorage.getItem(PROXY_STATUS_KEY);

      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_PROXY_CONFIG, ...parsedConfig });
      }

      if (savedStatus) {
        const parsedStatus = JSON.parse(savedStatus);
        setStatus({
          ...parsedStatus,
          lastTested: new Date(parsedStatus.lastTested),
        });
      }
    } catch (error) {
      console.warn('[ProxyConfig] Failed to load saved config:', error);
    }
  }, []);

  // 保存代理配置
  const saveConfig = useCallback((newConfig: ProxyConfig) => {
    try {
      localStorage.setItem(PROXY_CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
      console.log('[ProxyConfig] Configuration saved:', newConfig);
    } catch (error) {
      console.error('[ProxyConfig] Failed to save config:', error);
    }
  }, []);

  // 保存状态信息
  const saveStatus = useCallback((newStatus: ProxyStatus) => {
    try {
      localStorage.setItem(PROXY_STATUS_KEY, JSON.stringify(newStatus));
      setStatus(newStatus);
    } catch (error) {
      console.error('[ProxyConfig] Failed to save status:', error);
    }
  }, []);

  // 验证代理配置
  const validateConfig = useCallback((proxyConfig: ProxyConfig): ProxyConfigValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本验证
    if (!proxyConfig.host.trim()) {
      errors.push('代理主机地址不能为空');
    }

    if (proxyConfig.port <= 0 || proxyConfig.port > 65535) {
      errors.push('代理端口必须在 1-65535 之间');
    }

    // IP地址格式验证
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const domainRegex = /^[a-zA-Z0-9.-]+$/;
    
    if (proxyConfig.host !== 'localhost' && 
        !ipRegex.test(proxyConfig.host) && 
        !domainRegex.test(proxyConfig.host)) {
      errors.push('代理主机地址格式无效');
    }

    // 常用端口警告
    const commonPorts: Record<number, string> = {
      7890: 'Clash HTTP',
      7891: 'Clash SOCKS',
      8080: 'HTTP 代理',
      1080: 'SOCKS 代理',
      3128: 'Squid 代理',
    };

    if (commonPorts[proxyConfig.port]) {
      warnings.push(`端口 ${proxyConfig.port} 通常用于 ${commonPorts[proxyConfig.port]}`);
    }

    // 认证验证
    if (proxyConfig.auth) {
      if (!proxyConfig.auth.username.trim()) {
        errors.push('如果启用认证，用户名不能为空');
      }
      if (!proxyConfig.auth.password) {
        warnings.push('代理密码为空，可能导致认证失败');
      }
    }

    // 超时时间验证
    if (proxyConfig.timeout && (proxyConfig.timeout < 1000 || proxyConfig.timeout > 60000)) {
      warnings.push('建议超时时间设置在 1-60 秒之间');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  // 测试代理连接
  const testConnection = useCallback(async (testConfig?: ProxyConfig): Promise<ProxyTestResult> => {
    const configToTest = testConfig || config;
    setIsLoading(true);

    try {
      const startTime = Date.now();
      
      // 构建代理 URL
      let proxyUrl: string;
      if (configToTest.type === 'http' || configToTest.type === 'https') {
        const protocol = configToTest.type;
        const auth = configToTest.auth 
          ? `${encodeURIComponent(configToTest.auth.username)}:${encodeURIComponent(configToTest.auth.password)}@`
          : '';
        proxyUrl = `${protocol}://${auth}${configToTest.host}:${configToTest.port}`;
      } else {
        // SOCKS 代理
        const auth = configToTest.auth 
          ? `${encodeURIComponent(configToTest.auth.username)}:${encodeURIComponent(configToTest.auth.password)}@`
          : '';
        proxyUrl = `socks${configToTest.version || '5'}://${auth}${configToTest.host}:${configToTest.port}`;
      }

      console.log('[ProxyConfig] Testing connection with:', proxyUrl.replace(/:[^:@]*@/, ':***@'));

      // 由于浏览器安全限制，我们无法直接测试代理连接
      // 这里提供一个模拟的测试结果，实际应用中可以调用后端API进行测试
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟网络延迟

      const responseTime = Date.now() - startTime;
      const testResult: ProxyTestResult = {
        success: true,
        responseTime,
        serviceStatus: 'reachable',
        actualIP: '192.168.1.100', // 模拟数据
      };

      // 更新状态
      const newStatus: ProxyStatus = {
        connected: true,
        lastTested: new Date(),
        latency: responseTime,
        error: undefined,
        location: {
          country: 'Unknown',
          city: 'Unknown',
          ip: testResult.actualIP,
        },
      };
      saveStatus(newStatus);

      return testResult;
    } catch (error) {
      const responseTime = Date.now() - Date.now();
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      const testResult: ProxyTestResult = {
        success: false,
        responseTime,
        error: errorMessage,
        serviceStatus: 'unreachable',
      };

      // 更新错误状态
      const newStatus: ProxyStatus = {
        connected: false,
        lastTested: new Date(),
        error: errorMessage,
      };
      saveStatus(newStatus);

      return testResult;
    } finally {
      setIsLoading(false);
    }
  }, [config, saveStatus]);

  // 重置配置
  const resetConfig = useCallback(() => {
    localStorage.removeItem(PROXY_CONFIG_KEY);
    localStorage.removeItem(PROXY_STATUS_KEY);
    setConfig(DEFAULT_PROXY_CONFIG);
    setStatus({
      connected: false,
      lastTested: new Date(),
    });
  }, []);

  // 获取代理 URL
  const getProxyUrl = useCallback((proxyConfig?: ProxyConfig): string | null => {
    const configToUse = proxyConfig || config;
    
    if (!configToUse.enabled) {
      return null;
    }

    try {
      const auth = configToUse.auth 
        ? `${encodeURIComponent(configToUse.auth.username)}:${encodeURIComponent(configToUse.auth.password)}@`
        : '';

      if (configToUse.type === 'http' || configToUse.type === 'https') {
        return `${configToUse.type}://${auth}${configToUse.host}:${configToUse.port}`;
      } else {
        return `socks${configToUse.version || '5'}://${auth}${configToUse.host}:${configToUse.port}`;
      }
    } catch (error) {
      console.error('[ProxyConfig] Failed to build proxy URL:', error);
      return null;
    }
  }, [config]);

  return {
    config,
    status,
    isLoading,
    saveConfig,
    validateConfig,
    testConnection,
    resetConfig,
    getProxyUrl,
  };
};