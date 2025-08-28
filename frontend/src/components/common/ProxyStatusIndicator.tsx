/**
 * 代理状态指示器组件
 */
import { useState, useEffect } from 'react';
import { useProxyConfig } from '@/hooks/core/useProxyConfig';
import { isProxyAvailable, testProxyConnection } from '@/lib/proxyFetch';

export const ProxyStatusIndicator = () => {
  const { config, status } = useProxyConfig();
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // 定期检查代理状态
  useEffect(() => {
    if (!config.enabled) return;

    const checkProxyStatus = async () => {
      setIsChecking(true);
      try {
        await isProxyAvailable();
      } catch (error) {
        console.error('[ProxyStatus] Failed to check proxy availability:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // 立即检查一次
    checkProxyStatus();

    // 每5分钟检查一次
    const interval = setInterval(checkProxyStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [config.enabled]);

  if (!config.enabled) {
    return null;
  }

  return (
    <div className="relative">
      {/* 状态指示器 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          status.connected
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-red-100 text-red-800 hover:bg-red-200'
        }`}
        title="点击查看代理状态详情"
      >
        <div className={`w-2 h-2 rounded-full ${
          isChecking
            ? 'bg-yellow-500 animate-pulse'
            : status.connected
            ? 'bg-green-500'
            : 'bg-red-500'
        }`} />
        <span>
          {isChecking ? '检查中' : status.connected ? '代理已连接' : '代理断开'}
        </span>
      </button>

      {/* 详情弹窗 */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-3">
            {/* 标题 */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">代理状态详情</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* 基本信息 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">代理类型:</span>
                <span className="font-medium">{config.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">代理地址:</span>
                <span className="font-medium">{config.host}:{config.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">连接状态:</span>
                <span className={`font-medium ${
                  status.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.connected ? '已连接' : '未连接'}
                </span>
              </div>
              {status.latency && (
                <div className="flex justify-between">
                  <span className="text-gray-600">延迟:</span>
                  <span className="font-medium">{status.latency}ms</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">最后检查:</span>
                <span className="font-medium">
                  {status.lastTested.toLocaleTimeString()}
                </span>
              </div>
              {status.location && status.location.ip && (
                <div className="flex justify-between">
                  <span className="text-gray-600">代理 IP:</span>
                  <span className="font-medium">{status.location.ip}</span>
                </div>
              )}
            </div>

            {/* 错误信息 */}
            {status.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                <strong>错误:</strong> {status.error}
              </div>
            )}

            {/* 连接建议 */}
            {!status.connected && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                <strong>建议:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>检查代理服务器是否正在运行</li>
                  <li>确认代理地址和端口配置正确</li>
                  <li>检查防火墙设置是否允许连接</li>
                  <li>如果使用认证，请检查用户名和密码</li>
                </ul>
              </div>
            )}

            {/* 快速测试按钮 */}
            <button
              onClick={async () => {
                setIsChecking(true);
                try {
                  await testProxyConnection(import.meta.env.VITE_SUPABASE_URL);
                } finally {
                  setIsChecking(false);
                }
              }}
              disabled={isChecking}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isChecking ? '测试中...' : '立即测试连接'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};