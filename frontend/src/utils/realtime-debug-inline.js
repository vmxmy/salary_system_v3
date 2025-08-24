/**
 * 在浏览器控制台直接复制粘贴运行的Realtime调试代码
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具控制台
 * 2. 复制下面的整个函数并粘贴到控制台
 * 3. 按回车运行
 */

// 🔧 Realtime缓存匹配测试工具
(function debugRealtimeCache() {
  console.clear();
  console.log('🔍 Realtime缓存调试工具');
  console.log('==============================');
  
  // 当前系统实际使用的查询键
  const actualQueryKeys = [
    ['payrolls'],
    ['payrolls', 'list'], 
    ['payrolls', 'list', { page: 1, search: 'test' }],
    ['payrolls', 'detail', 'payroll-uuid-123'],
    ['payrolls', 'statistics', 'period-id-456'],
    ['payrolls', 'insurance', 'payroll-uuid-789'],
    ['employees'],
    ['employees', 'list'],
    ['departments'], 
    ['departments', 'statistics'],
    ['payroll-approval-records'],
    ['payroll-approval-stats'],
    ['payroll-workflow-progress']
  ];

  // Realtime配置的失效键
  const realtimeInvalidationKeys = [
    ['payrolls'],
    ['employees'], 
    ['departments'],
    ['positions'],
    ['payroll-statistics'],
    ['payroll-approval-records'],
    ['payroll-approval-stats'], 
    ['payroll-workflow-progress'],
    ['insurance']
  ];

  console.log('📋 查询键匹配测试结果:');
  console.log('实际查询键 vs Realtime失效配置');
  console.log('');
  
  let matchCount = 0;
  let totalCount = actualQueryKeys.length;
  
  actualQueryKeys.forEach((queryKey, index) => {
    const keyStr = JSON.stringify(queryKey);
    
    // 模拟 TanStack Query 的前缀匹配逻辑 (exact: false)
    const wouldInvalidate = realtimeInvalidationKeys.some(invKey => {
      if (queryKey.length < invKey.length) return false;
      return invKey.every((part, i) => queryKey[i] === part);
    });
    
    if (wouldInvalidate) matchCount++;
    
    const status = wouldInvalidate ? '✅ 会失效' : '❌ 不会失效';
    const color = wouldInvalidate ? 'color: green' : 'color: red';
    
    console.log(`%c${status}%c ${keyStr}`, color, 'color: default');
  });
  
  console.log('');
  console.log(`📊 匹配统计: ${matchCount}/${totalCount} (${Math.round(matchCount/totalCount*100)}%)`);
  
  // 检查当前是否有 queryClient 可用
  if (window.queryClient) {
    console.log('');
    console.log('🎯 当前缓存状态:');
    const allQueries = window.queryClient.getQueryCache().getAll();
    console.log(`- 总缓存查询数: ${allQueries.length}`);
    console.log(`- 薪资相关查询: ${allQueries.filter(q => q.queryKey[0] === 'payrolls').length}`);
    console.log('- 使用 queryClient.getQueryCache().getAll() 查看详细信息');
  } else {
    console.log('');
    console.log('⚠️  queryClient 不可用，请确保页面已完全加载');
  }
  
  console.log('');
  console.log('💡 测试建议:');
  console.log('1. 在薪资管理页面修改数据');
  console.log('2. 观察控制台的 [Realtime] 日志');
  console.log('3. 检查界面是否自动更新');
  
  return {
    matchRate: `${matchCount}/${totalCount}`,
    percentage: Math.round(matchCount/totalCount*100) + '%',
    successful: matchCount,
    failed: totalCount - matchCount
  };
})();