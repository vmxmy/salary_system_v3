/**
 * 代理配置模态框组件
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useProxyConfig } from '@/hooks/core/useProxyConfig';
import type { ProxyConfig, ProxyType } from '@/types/proxy';
import { PROXY_PRESETS } from '@/types/proxy';

interface ProxyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxyConfigModal = ({ isOpen, onClose }: ProxyConfigModalProps) => {
  const { config, status, isLoading, saveConfig, validateConfig, testConnection, resetConfig } = useProxyConfig();
  const [editConfig, setEditConfig] = useState<ProxyConfig>(config);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // 同步配置状态
  useEffect(() => {
    setEditConfig(config);
    
    // 检查当前配置是否匹配某个预设
    const matchingPreset = PROXY_PRESETS.find(preset => 
      preset.config.type === config.type &&
      preset.config.host === config.host &&
      preset.config.port === config.port
    );
    
    if (matchingPreset) {
      setSelectedPreset(matchingPreset.id);
    } else {
      setSelectedPreset('custom');
    }
  }, [config, isOpen]);

  // 处理预设选择
  const handlePresetChange = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') {
      return;
    }

    const preset = PROXY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setEditConfig({
        ...editConfig,
        ...preset.config,
      });
    }
  }, [editConfig]);

  // 处理配置更改
  const handleConfigChange = useCallback(<K extends keyof ProxyConfig>(
    key: K,
    value: ProxyConfig[K]
  ) => {
    setEditConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // 处理认证配置更改
  const handleAuthChange = useCallback((field: 'username' | 'password', value: string) => {
    setEditConfig(prev => ({
      ...prev,
      auth: prev.auth ? {
        ...prev.auth,
        [field]: value,
      } : {
        username: field === 'username' ? value : '',
        password: field === 'password' ? value : '',
      },
    }));
  }, []);

  // 保存配置
  const handleSave = useCallback(() => {
    const validation = validateConfig(editConfig);
    
    if (!validation.valid) {
      alert(`配置验证失败：\n${validation.errors.join('\n')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = confirm(
        `配置有以下警告，是否继续保存？\n${validation.warnings.join('\n')}`
      );
      if (!confirmed) return;
    }

    saveConfig(editConfig);
    alert('代理配置已保存');
    onClose();
  }, [editConfig, validateConfig, saveConfig, onClose]);

  // 测试连接
  const handleTest = useCallback(async () => {
    setTestResult('正在测试连接...');
    try {
      const result = await testConnection(editConfig);
      if (result.success) {
        setTestResult(`✅ 连接成功！延迟: ${result.responseTime}ms`);
      } else {
        setTestResult(`❌ 连接失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      setTestResult(`❌ 测试异常: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [editConfig, testConnection]);

  // 重置配置
  const handleReset = useCallback(() => {
    if (confirm('确定要重置代理配置吗？')) {
      resetConfig();
      setEditConfig(config);
      setTestResult('');
      alert('代理配置已重置');
    }
  }, [resetConfig, config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">代理配置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 状态显示 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">当前状态</h3>
            <div className="flex items-center space-x-4 text-sm">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status.connected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {status.connected ? '✅ 已连接' : '❌ 未连接'}
              </span>
              {status.latency && (
                <span className="text-gray-600">延迟: {status.latency}ms</span>
              )}
              <span className="text-gray-600">
                最后测试: {status.lastTested.toLocaleTimeString()}
              </span>
            </div>
            {status.error && (
              <p className="text-red-600 text-sm mt-2">{status.error}</p>
            )}
          </div>

          {/* 基本设置 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="proxy-enabled"
                type="checkbox"
                checked={editConfig.enabled}
                onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="proxy-enabled" className="ml-2 text-sm font-medium text-gray-700">
                启用代理
              </label>
            </div>

            {editConfig.enabled && (
              <>
                {/* 预设选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    快速配置
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">选择预设配置</option>
                    {PROXY_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} - {preset.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 代理类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    代理类型
                  </label>
                  <select
                    value={editConfig.type}
                    onChange={(e) => handleConfigChange('type', e.target.value as ProxyType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks4">SOCKS4</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>

                {/* 主机和端口 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      代理主机
                    </label>
                    <input
                      type="text"
                      value={editConfig.host}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      placeholder="127.0.0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      端口
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={editConfig.port}
                      onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 8080)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 高级设置切换 */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showAdvanced ? '隐藏高级设置' : '显示高级设置'}
                </button>

                {/* 高级设置 */}
                {showAdvanced && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    {/* 认证信息 */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700">认证信息（可选）</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            用户名
                          </label>
                          <input
                            type="text"
                            value={editConfig.auth?.username || ''}
                            onChange={(e) => handleAuthChange('username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            密码
                          </label>
                          <input
                            type="password"
                            value={editConfig.auth?.password || ''}
                            onChange={(e) => handleAuthChange('password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SOCKS 版本 */}
                    {(editConfig.type === 'socks4' || editConfig.type === 'socks5') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SOCKS 版本
                        </label>
                        <select
                          value={editConfig.version || '5'}
                          onChange={(e) => handleConfigChange('version', e.target.value as '4' | '5')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="4">SOCKS4</option>
                          <option value="5">SOCKS5</option>
                        </select>
                      </div>
                    )}

                    {/* 超时设置 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        连接超时（毫秒）
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max="60000"
                        step="1000"
                        value={editConfig.timeout || 10000}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 10000)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* SSL 验证 */}
                    <div className="flex items-center">
                      <input
                        id="verify-ssl"
                        type="checkbox"
                        checked={editConfig.verifySSL !== false}
                        onChange={(e) => handleConfigChange('verifySSL', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="verify-ssl" className="ml-2 text-sm font-medium text-gray-700">
                        验证 SSL 证书
                      </label>
                    </div>
                  </div>
                )}

                {/* 测试连接 */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '测试中...' : '测试连接'}
                  </button>
                  {testResult && (
                    <p className={`text-sm ${
                      testResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {testResult}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-red-600 hover:text-red-800 font-medium"
          >
            重置配置
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};