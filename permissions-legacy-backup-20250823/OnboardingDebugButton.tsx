/**
 * 新用户指导调试按钮
 * 用于测试OnboardingContext的基本功能
 */

import { useOnboarding } from '@/contexts/OnboardingContext';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

export const OnboardingDebugButton = () => {
  const {
    getAvailableFlows,
    startFlow,
    isActive,
    isLoading,
    currentFlow,
    error
  } = useOnboarding();
  
  const { user } = useUnifiedAuth();

  const handleTestClick = async () => {
    console.log('=== Onboarding Debug Test ===');
    
    try {
      // 1. 测试获取可用流程
      console.log('1. 测试获取可用流程...');
      const flows = getAvailableFlows();
      console.log('可用流程:', flows);
      
      if (flows.length === 0) {
        console.error('❌ 没有可用的指导流程');
        alert('❌ 没有可用的指导流程');
        return;
      }
      
      // 2. 测试启动第一个流程
      console.log('2. 测试启动指导流程...');
      const firstFlow = flows[0];
      console.log('准备启动流程:', firstFlow.name, firstFlow.id);
      
      await startFlow(firstFlow.id);
      console.log('✅ 流程启动成功');
      
    } catch (err) {
      console.error('❌ 测试失败:', err);
      alert(`❌ 测试失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStatusCheck = () => {
    console.log('=== Onboarding Status Check ===');
    console.log('isActive:', isActive);
    console.log('isLoading:', isLoading);
    console.log('currentFlow:', currentFlow);
    console.log('error:', error);
    console.log('getAvailableFlows:', typeof getAvailableFlows);
    console.log('startFlow:', typeof startFlow);
    
    // 详细检查用户和权限
    console.log('=== User Authentication Check ===');
    console.log('user:', user);
    console.log('user.permissions:', user?.permissions);
    console.log('user.id:', user?.id);
    
    // 检查原始流程数据
    import('@/config/onboardingFlows').then(module => {
      console.log('=== Flow Configuration Check ===');
      console.log('availableOnboardingFlows:', module.availableOnboardingFlows);
      console.log('availableOnboardingFlows.length:', module.availableOnboardingFlows.length);
      
      // 测试权限过滤
      const userPermissions = user?.permissions || [];
      console.log('userPermissions:', userPermissions);
      
      module.availableOnboardingFlows.forEach(flow => {
        console.log(`Flow ${flow.id}:`, {
          name: flow.name,
          permissions: flow.permissions,
          prerequisites: flow.prerequisites,
          hasPermission: !flow.permissions || flow.permissions.length === 0 || flow.permissions.some(p => userPermissions.includes(p))
        });
      });
    });
    
    alert(`状态检查：
    • 激活状态: ${isActive}
    • 加载状态: ${isLoading}
    • 当前流程: ${currentFlow?.name || '无'}
    • 错误信息: ${error || '无'}
    • 可用流程数量: ${getAvailableFlows().length}
    • 用户ID: ${user?.id || '无'}
    • 用户权限数量: ${user?.permissions?.length || 0}`);
  };

  return (
    <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">🔧 指导系统调试工具</h3>
      
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleStatusCheck}
          className="btn btn-outline btn-sm"
        >
          📊 检查状态
        </button>
        
        <button
          type="button"
          onClick={handleTestClick}
          disabled={isLoading}
          className="btn btn-primary btn-sm"
        >
          {isLoading ? '🔄 测试中...' : '🧪 测试启动流程'}
        </button>
        
        {error && (
          <div className="alert alert-error alert-sm">
            <span>错误: {error}</span>
          </div>
        )}
        
        {isActive && currentFlow && (
          <div className="alert alert-success alert-sm">
            <span>✅ 当前流程: {currentFlow.name}</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-base-content/60">
        <p>• 点击"检查状态"查看当前系统状态</p>
        <p>• 点击"测试启动流程"尝试启动指导</p>
        <p>• 查看浏览器控制台获取详细日志</p>
      </div>
    </div>
  );
};