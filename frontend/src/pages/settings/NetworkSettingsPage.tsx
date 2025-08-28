import { useState } from 'react';
import { ProxyConfigModal } from '@/components/common/ProxyConfigModal';
import { ProxyStatusIndicator } from '@/components/common/ProxyStatusIndicator';
import { useProxyConfig } from '@/hooks/core/useProxyConfig';

export default function NetworkSettingsPage() {
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { config } = useProxyConfig();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">网络设置</h1>
      
      <div className="space-y-8">
        {/* 网络与连接设置 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">网络与连接</h2>
          
          <div className="space-y-4">
            {/* 代理设置卡片 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">代理配置</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    配置网络代理以访问 Supabase 服务
                  </p>
                  {config.enabled && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">当前配置:</span> {config.type.toUpperCase()} - {config.host}:{config.port}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <ProxyStatusIndicator />
                  <button
                    onClick={() => setShowProxyModal(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:ring-2 focus:ring-blue-500"
                  >
                    {config.enabled ? '修改配置' : '启用代理'}
                  </button>
                </div>
              </div>
            </div>

            {/* 连接测试工具 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">连接测试</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    测试与 Supabase 服务的连接状态
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setIsTestingConnection(true);
                    
                    try {
                      // 检查环境变量配置
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                      
                      if (!supabaseUrl || !anonKey) {
                        alert('❌ 配置错误：缺少必要的环境变量\n\n请检查 .env.local 文件中的配置：\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY');
                        return;
                      }

                      const startTime = Date.now();
                      
                      // 测试基本连接
                      const response = await fetch(supabaseUrl + '/rest/v1/', {
                        method: 'HEAD',
                        headers: {
                          'apikey': anonKey,
                          'Authorization': `Bearer ${anonKey}`,
                          'Content-Type': 'application/json',
                        },
                        signal: AbortSignal.timeout(12000), // 12秒超时，考虑代理延迟
                      });
                      
                      const endTime = Date.now();
                      const duration = endTime - startTime;
                      
                      if (response.ok) {
                        const proxyStatus = config.enabled ? 
                          `\n🔄 代理状态：已启用 (${config.type.toUpperCase()} - ${config.host}:${config.port})` : 
                          '\n🔄 代理状态：未启用';
                        
                        alert(`✅ 连接成功！
                        
🌐 Supabase 服务可正常访问
⏱️ 响应时间：${duration}ms${proxyStatus}

${duration > 3000 ? '\n⚠️ 响应时间较长，建议检查网络或代理配置' : ''}`);
                      } else {
                        alert(`❌ 连接失败

HTTP 状态：${response.status} ${response.statusText}
响应时间：${duration}ms

可能的原因：
• Supabase 服务器问题
• API 密钥配置错误
• 网络连接问题${config.enabled ? '\n• 代理服务器配置错误' : ''}`);
                      }
                    } catch (error) {
                      const message = error instanceof Error ? error.message : '未知错误';
                      
                      let troubleshootingInfo = '\n\n排查建议：';
                      if (message.includes('timeout') || message.includes('Network')) {
                        troubleshootingInfo += '\n• 检查网络连接是否正常';
                        if (config.enabled) {
                          troubleshootingInfo += '\n• 验证代理服务器是否可用';
                          troubleshootingInfo += '\n• 尝试禁用代理后重新测试';
                        }
                      } else if (message.includes('DNS')) {
                        troubleshootingInfo += '\n• DNS 解析失败，检查网络配置';
                      } else if (message.includes('CORS')) {
                        troubleshootingInfo += '\n• 跨域问题，检查 Supabase 项目配置';
                      }
                      
                      alert(`❌ 连接异常：${message}${troubleshootingInfo}`);
                    } finally {
                      setIsTestingConnection(false);
                    }
                  }}
                  disabled={isTestingConnection}
                  className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTestingConnection && (
                    <span className="loading loading-spinner loading-xs"></span>
                  )}
                  {isTestingConnection ? '测试连接中...' : '测试连接'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">应用版本:</span>
              <span className="font-medium">v3.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">构建时间:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Supabase URL:</span>
              <span className="font-medium font-mono text-xs">
                {import.meta.env.VITE_SUPABASE_URL}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">环境:</span>
              <span className="font-medium">
                {import.meta.env.DEV ? '开发环境' : '生产环境'}
              </span>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">💡 代理使用说明</h2>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <h4 className="font-medium">常用代理软件配置:</h4>
              <ul className="mt-1 space-y-1 ml-4">
                <li>• <strong>Clash:</strong> HTTP 端口 7890，SOCKS5 端口 7891</li>
                <li>• <strong>V2Ray:</strong> HTTP 端口 8080，SOCKS5 端口 1080</li>
                <li>• <strong>其他代理:</strong> 请查看软件设置中的本地端口配置</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">注意事项:</h4>
              <ul className="mt-1 space-y-1 ml-4">
                <li>• 启用代理前请确保代理软件正在运行</li>
                <li>• 代理配置仅影响与 Supabase 的连接</li>
                <li>• 如遇连接问题，请先测试代理连通性</li>
                <li>• 配置会自动保存在浏览器本地存储中</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 代理配置模态框 */}
      <ProxyConfigModal
        isOpen={showProxyModal}
        onClose={() => setShowProxyModal(false)}
      />
    </div>
  );
}