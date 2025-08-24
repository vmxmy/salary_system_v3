/**
 * AI Session Debug Test Component
 * 用于测试和验证AI会话无限循环修复效果
 */

import React, { useState, useEffect, useRef } from 'react';
import { SimplePersistentAIRuntimeProvider } from '../lib/simplePersistentAIRuntime';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';

interface DebugMetrics {
  sessionCreationCount: number;
  rerenderCount: number;
  initializationAttempts: number;
  lastSessionId: string | null;
  sessionIds: string[];
}

const AISessionDebugTest: React.FC = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    sessionCreationCount: 0,
    rerenderCount: 0,
    initializationAttempts: 0,
    lastSessionId: null,
    sessionIds: []
  });
  
  const { user } = useUnifiedAuth();
  const renderCountRef = useRef(0);
  const sessionChangeCountRef = useRef(0);
  const sessionIdsRef = useRef<Set<string>>(new Set());

  // 跟踪重渲染次数
  useEffect(() => {
    renderCountRef.current += 1;
    setDebugMetrics(prev => ({
      ...prev,
      rerenderCount: renderCountRef.current
    }));
  });

  // 模拟会话变更处理
  const handleSessionChange = (sessionId: string) => {
    sessionChangeCountRef.current += 1;
    sessionIdsRef.current.add(sessionId);
    
    console.log(`🔄 Session changed: ${sessionId} (Change #${sessionChangeCountRef.current})`);
    
    setDebugMetrics(prev => ({
      ...prev,
      sessionCreationCount: sessionChangeCountRef.current,
      lastSessionId: sessionId,
      sessionIds: Array.from(sessionIdsRef.current),
      initializationAttempts: sessionChangeCountRef.current
    }));

    // 如果在5秒内创建了超过3个会话，可能存在问题
    if (sessionChangeCountRef.current > 3) {
      console.error('🚨 POTENTIAL INFINITE LOOP DETECTED: Too many session changes!');
    }
  };

  const startTest = () => {
    console.log('🧪 Starting AI Session Debug Test...');
    
    // 重置计数器
    renderCountRef.current = 0;
    sessionChangeCountRef.current = 0;
    sessionIdsRef.current.clear();
    
    setDebugMetrics({
      sessionCreationCount: 0,
      rerenderCount: 0,
      initializationAttempts: 0,
      lastSessionId: null,
      sessionIds: []
    });
    
    setIsTestRunning(true);
  };

  const stopTest = () => {
    console.log('🛑 Stopping AI Session Debug Test...');
    setIsTestRunning(false);
  };

  const getTestStatus = (): 'pass' | 'fail' | 'unknown' => {
    if (!isTestRunning) return 'unknown';
    
    // 测试标准：5秒内不应该创建超过2个会话，重渲染不应该超过10次
    if (debugMetrics.sessionCreationCount <= 2 && debugMetrics.rerenderCount <= 10) {
      return 'pass';
    } else if (debugMetrics.sessionCreationCount > 3 || debugMetrics.rerenderCount > 20) {
      return 'fail';
    } else {
      return 'unknown';
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-warning/10 rounded-lg">
        <h3 className="font-bold text-warning">⚠️ 需要登录</h3>
        <p>请先登录后再进行AI会话调试测试</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-base-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🧪 AI Session Debug Test</h2>
        <div className="space-x-2">
          <button 
            onClick={startTest}
            disabled={isTestRunning}
            className="btn btn-primary btn-sm"
          >
            {isTestRunning ? '测试进行中...' : '开始测试'}
          </button>
          <button 
            onClick={stopTest}
            disabled={!isTestRunning}
            className="btn btn-error btn-sm"
          >
            停止测试
          </button>
        </div>
      </div>

      {/* 测试状态指示器 */}
      <div className="flex items-center gap-4">
        <div className={`badge ${
          getTestStatus() === 'pass' ? 'badge-success' : 
          getTestStatus() === 'fail' ? 'badge-error' : 
          'badge-warning'
        }`}>
          {getTestStatus() === 'pass' ? '✅ PASS' : 
           getTestStatus() === 'fail' ? '❌ FAIL' : 
           '⏳ RUNNING'}
        </div>
        <span className="text-sm">
          状态: {isTestRunning ? '测试运行中' : '测试未启动'}
        </span>
      </div>

      {/* 调试指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">会话创建次数</div>
            <div className={`stat-value text-2xl ${
              debugMetrics.sessionCreationCount > 3 ? 'text-error' : 'text-primary'
            }`}>
              {debugMetrics.sessionCreationCount}
            </div>
            <div className="stat-desc">
              {debugMetrics.sessionCreationCount <= 2 ? '正常' : '异常'}
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">重渲染次数</div>
            <div className={`stat-value text-2xl ${
              debugMetrics.rerenderCount > 20 ? 'text-error' : 'text-info'
            }`}>
              {debugMetrics.rerenderCount}
            </div>
            <div className="stat-desc">
              {debugMetrics.rerenderCount <= 10 ? '正常' : '可能过多'}
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">当前会话ID</div>
            <div className="stat-value text-sm">
              {debugMetrics.lastSessionId ? 
                debugMetrics.lastSessionId.substring(0, 12) + '...' : 
                'None'
              }
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">会话ID总数</div>
            <div className="stat-value text-2xl">
              {debugMetrics.sessionIds.length}
            </div>
            <div className="stat-desc">
              {debugMetrics.sessionIds.length === 1 ? '理想' : '需要检查'}
            </div>
          </div>
        </div>
      </div>

      {/* 详细会话ID列表 */}
      {debugMetrics.sessionIds.length > 0 && (
        <div className="collapse collapse-arrow bg-base-100">
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium">
            📋 会话ID历史 ({debugMetrics.sessionIds.length} 个)
          </div>
          <div className="collapse-content">
            <div className="space-y-1">
              {debugMetrics.sessionIds.map((id, index) => (
                <div key={id} className="text-xs font-mono bg-base-200 p-2 rounded">
                  #{index + 1}: {id}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Runtime Provider 测试实例 */}
      {isTestRunning && (
        <div className="border border-dashed border-base-300 p-4 rounded">
          <h3 className="font-semibold mb-2">🤖 AI Runtime Provider 实例</h3>
          <SimplePersistentAIRuntimeProvider
            onSessionChange={handleSessionChange}
          >
            <div className="text-sm text-base-content/70">
              AI Runtime Provider 已加载，正在监控会话创建行为...
            </div>
          </SimplePersistentAIRuntimeProvider>
        </div>
      )}

      {/* 测试说明 */}
      <div className="text-xs text-base-content/60 bg-base-100 p-3 rounded">
        <strong>测试说明：</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>正常情况：应该只创建1个会话，重渲染次数合理（&le;10次）</li>
          <li>异常情况：会话创建次数过多（&gt;3次），表明存在无限循环</li>
          <li>该测试会自动监控5秒钟的行为模式</li>
        </ul>
      </div>
    </div>
  );
};

export default AISessionDebugTest;