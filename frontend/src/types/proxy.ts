/**
 * 代理配置类型定义
 */

export interface ProxyConfig {
  /** 是否启用代理 */
  enabled: boolean;
  /** 代理类型 */
  type: ProxyType;
  /** 代理服务器主机 */
  host: string;
  /** 代理服务器端口 */
  port: number;
  /** 代理认证信息（可选） */
  auth?: ProxyAuth;
  /** 代理协议版本（SOCKS专用） */
  version?: '4' | '5';
  /** 连接超时时间（毫秒） */
  timeout?: number;
  /** 是否验证 SSL 证书 */
  verifySSL?: boolean;
  /** 用户代理字符串（可选） */
  userAgent?: string;
}

export interface ProxyAuth {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface ProxyStatus {
  /** 连接状态 */
  connected: boolean;
  /** 最后测试时间 */
  lastTested: Date;
  /** 连接延迟（毫秒） */
  latency?: number;
  /** 错误信息 */
  error?: string;
  /** 代理地址信息 */
  location?: {
    country?: string;
    city?: string;
    ip?: string;
  };
}

export interface ProxyTestResult {
  /** 测试是否成功 */
  success: boolean;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 实际IP地址 */
  actualIP?: string;
  /** 目标服务状态 */
  serviceStatus: 'reachable' | 'unreachable' | 'timeout';
}

/**
 * 代理配置预设
 */
export interface ProxyPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<ProxyConfig, 'enabled'>;
}

/**
 * 常用代理预设
 */
export const PROXY_PRESETS: ProxyPreset[] = [
  {
    id: 'gaoxin-proxy',
    name: 'Gaoxin 代理服务器',
    description: '高新区默认代理服务器配置',
    config: {
      type: 'http',
      host: 'gaoxin.net.cn',
      port: 8888,
      timeout: 12000,
      verifySSL: true,
    },
  },
  {
    id: 'clash-http',
    name: 'Clash HTTP 代理',
    description: '适用于 Clash 的 HTTP 代理配置',
    config: {
      type: 'http',
      host: '127.0.0.1',
      port: 7890,
      timeout: 10000,
      verifySSL: true,
    },
  },
  {
    id: 'clash-socks5',
    name: 'Clash SOCKS5 代理',
    description: '适用于 Clash 的 SOCKS5 代理配置',
    config: {
      type: 'socks5',
      host: '127.0.0.1',
      port: 7891,
      version: '5',
      timeout: 10000,
      verifySSL: true,
    },
  },
  {
    id: 'v2ray-http',
    name: 'V2Ray HTTP 代理',
    description: '适用于 V2Ray 的 HTTP 代理配置',
    config: {
      type: 'http',
      host: '127.0.0.1',
      port: 8080,
      timeout: 10000,
      verifySSL: true,
    },
  },
  {
    id: 'v2ray-socks5',
    name: 'V2Ray SOCKS5 代理',
    description: '适用于 V2Ray 的 SOCKS5 代理配置',
    config: {
      type: 'socks5',
      host: '127.0.0.1',
      port: 1080,
      version: '5',
      timeout: 10000,
      verifySSL: true,
    },
  },
  {
    id: 'custom',
    name: '自定义代理',
    description: '用户自定义的代理配置',
    config: {
      type: 'http',
      host: '',
      port: 8080,
      timeout: 10000,
      verifySSL: true,
    },
  },
];

/**
 * 代理配置验证结果
 */
export interface ProxyConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}