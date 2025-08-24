/**
 * Realtime调试工具
 * 用于测试和验证TanStack Query缓存失效是否正常工作
 */

export const debugRealtimeCache = () => {
  // 在浏览器控制台运行此函数来测试缓存失效
  console.log('🔍 Realtime缓存调试工具');
  
  // 模拟Query Key匹配测试
  const testQueryKeys = [
    ['payrolls'],
    ['payrolls', 'list'],
    ['payrolls', 'list', { page: 1 }],
    ['payrolls', 'detail', 'uuid'],
    ['payrolls', 'statistics', 'period-id'],
    ['employees'],
    ['employees', 'list'],
    ['departments']
  ];

  const invalidationKeys = [
    ['payrolls'],
    ['employees'], 
    ['departments']
  ];

  console.log('📋 查询键测试结果:');
  
  testQueryKeys.forEach(queryKey => {
    const keyStr = JSON.stringify(queryKey);
    const wouldInvalidate = invalidationKeys.some(invKey => {
      const invKeyStr = JSON.stringify(invKey);
      return keyStr.startsWith(invKeyStr.slice(0, -1)); // 模拟前缀匹配
    });
    
    console.log(`${wouldInvalidate ? '✅' : '❌'} ${keyStr}`);
  });

  return {
    testQueryKeys,
    invalidationKeys,
    message: '检查控制台输出查看匹配结果'
  };
};

// 将函数绑定到全局，便于在浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugRealtimeCache = debugRealtimeCache;
}