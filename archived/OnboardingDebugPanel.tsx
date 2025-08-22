/**
 * 新用户指导调试面板
 * 用于测试和调试遮罩效果
 */

import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';

export const OnboardingDebugPanel = () => {
  const { 
    currentFlow, 
    currentStep, 
    isActive, 
    config, 
    context,
    startFlow, 
    nextStep, 
    pauseFlow, 
    resumeFlow,
    getAvailableFlows 
  } = useOnboarding();

  const [selectedTarget, setSelectedTarget] = useState<string>('dashboard-overview');
  const availableFlows = getAvailableFlows();

  const testTargets = [
    { id: 'dashboard-overview', label: '仪表板概览' },
    { id: 'dashboard-stats', label: '统计卡片' },
    { id: 'quick-actions', label: '快捷操作' },
    { id: 'navigation-menu', label: '导航菜单' }
  ];

  const testOverlay = () => {
    const element = document.querySelector(`[data-tour="${selectedTarget}"]`);
    console.log(`[Debug] Testing overlay for target: ${selectedTarget}`, {
      element,
      elementRect: element?.getBoundingClientRect(),
      config: config.overlay
    });
  };

  const logCurrentState = () => {
    const targetElement = currentStep?.targetElement ? 
      document.querySelector(currentStep.targetElement) : null;
    
    console.log(`[Debug] Current onboarding state:`, {
      currentFlow,
      currentStep,
      targetElement,
      targetElementFound: !!targetElement,
      isActive,
      config,
      context,
      availableFlows
    });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-base-100 shadow-lg rounded-lg p-4 z-50 border max-w-sm">
      <div className="text-sm font-semibold mb-3">🔧 指导系统调试面板</div>
      
      <div className="space-y-3">
        {/* 当前状态 */}
        <div className="text-xs">
          <div><strong>状态:</strong> {isActive ? '活跃' : '非活跃'}</div>
          <div><strong>当前流程:</strong> {currentFlow?.name || '无'}</div>
          <div><strong>当前步骤:</strong> {currentStep?.title || '无'}</div>
        </div>

        {/* 测试目标选择 */}
        <div>
          <label className="text-xs font-medium">测试目标:</label>
          <select 
            className="select select-xs select-bordered w-full mt-1"
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
          >
            {testTargets.map(target => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-1">
          <button 
            className="btn btn-xs btn-primary"
            onClick={() => {
              // 清除localStorage中的进度数据
              const keys = Object.keys(localStorage).filter(key => 
                key.startsWith('onboarding_progress_')
              );
              keys.forEach(key => localStorage.removeItem(key));
              console.log('[Debug] Cleared onboarding progress from localStorage:', keys);
              
              // 重新启动流程
              startFlow('gettingStarted');
            }}
          >
            重新开始指导
          </button>

          <button 
            className="btn btn-xs btn-accent"
            onClick={() => {
              // 清除localStorage并启动员工管理流程
              const keys = Object.keys(localStorage).filter(key => 
                key.startsWith('onboarding_progress_')
              );
              keys.forEach(key => localStorage.removeItem(key));
              console.log('[Debug] Starting employee workflow');
              
              startFlow('employeeWorkflow');
            }}
          >
            员工管理流程
          </button>
          
          <button 
            className="btn btn-xs btn-secondary"
            onClick={testOverlay}
          >
            测试遮罩
          </button>

          <button 
            className="btn btn-xs btn-info"
            onClick={() => {
              // 创建一个简单的测试遮罩
              const testDiv = document.createElement('div');
              testDiv.innerHTML = `
                <svg width="100%" height="100%" style="position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;">
                  <defs>
                    <mask id="test-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect x="300" y="200" width="400" height="200" rx="10" fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(255, 0, 0, 0.5)" mask="url(#test-mask)" />
                </svg>
              `;
              document.body.appendChild(testDiv);
              setTimeout(() => document.body.removeChild(testDiv), 3000);
            }}
          >
            纯SVG测试
          </button>

          <button 
            className="btn btn-xs btn-warning"
            onClick={() => {
              // 测试真实目标元素的遮罩
              const targetElement = document.querySelector(`[data-tour="${selectedTarget}"]`);
              if (!targetElement) {
                alert('未找到目标元素');
                return;
              }
              
              const rect = targetElement.getBoundingClientRect();
              const padding = 8;
              const x = Math.max(0, rect.left - padding);
              const y = Math.max(0, rect.top - padding);
              const width = Math.min(rect.width + padding * 2, window.innerWidth - x);
              const height = Math.min(rect.height + padding * 2, window.innerHeight - y);
              
              const testDiv = document.createElement('div');
              testDiv.innerHTML = `
                <svg width="100%" height="100%" style="position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: auto;">
                  <defs>
                    <mask id="target-test-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" mask="url(#target-test-mask)" />
                  <rect x="${x-1}" y="${y-1}" width="${width+2}" height="${height+2}" rx="9" fill="none" stroke="rgba(59, 130, 246, 0.8)" stroke-width="1" />
                </svg>
              `;
              document.body.appendChild(testDiv);
              testDiv.addEventListener('click', () => document.body.removeChild(testDiv));
              console.log('原生SVG遮罩测试', { targetElement, rect, x, y, width, height });
            }}
          >
            原生目标测试
          </button>
          
          <button 
            className="btn btn-xs"
            onClick={logCurrentState}
          >
            日志状态
          </button>

          <button 
            className="btn btn-xs btn-error"
            onClick={() => {
              console.log('[Debug] Attempting to fix currentStep');
              if (currentFlow && currentFlow.steps.length > 0) {
                // 强制设置第一个有targetElement的步骤
                const stepWithTarget = currentFlow.steps.find(step => step.targetElement);
                if (stepWithTarget) {
                  console.log('[Debug] Found step with target:', stepWithTarget);
                  // 这里需要调用内部方法，但我们没有直接访问权限
                  // 先尝试重新启动流程
                  startFlow('gettingStarted');
                } else {
                  console.log('[Debug] No step with targetElement found');
                }
              }
            }}
          >
            修复步骤
          </button>
          
          {isActive && (
            <>
              <button 
                className="btn btn-xs btn-accent"
                onClick={nextStep}
              >
                下一步
              </button>
              
              <button 
                className="btn btn-xs btn-warning"
                onClick={pauseFlow}
              >
                暂停
              </button>
            </>
          )}
        </div>

        {/* 配置信息 */}
        <div className="text-xs bg-base-200 p-2 rounded">
          <div><strong>遮罩颜色:</strong> {config.overlay.color}</div>
          <div><strong>透明度:</strong> {config.overlay.opacity}</div>
          <div><strong>模糊:</strong> {config.overlay.blur ? '开启' : '关闭'}</div>
          <div><strong>可用流程:</strong> {availableFlows.length}</div>
        </div>
      </div>
    </div>
  );
};