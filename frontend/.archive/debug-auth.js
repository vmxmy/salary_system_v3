/**
 * 前端认证状态调试脚本
 * 在浏览器控制台中粘贴并运行此脚本来检查认证状态
 */

console.log('🔍 开始检查前端认证状态...');

// 检查 Supabase 客户端状态
async function checkSupabaseAuth() {
  try {
    console.log('\n📡 检查 Supabase 认证状态:');
    
    // 检查是否存在 supabase 实例
    if (typeof window !== 'undefined' && window.supabase) {
      const { data: { session }, error } = await window.supabase.auth.getSession();
      console.log('  Session:', session);
      console.log('  Error:', error);
      
      if (session?.user) {
        console.log('  ✅ Supabase 会话存在');
        console.log('  用户ID:', session.user.id);
        console.log('  用户邮箱:', session.user.email);
      } else {
        console.log('  ❌ 无 Supabase 会话');
      }
    } else {
      console.log('  ❌ 未找到 Supabase 实例');
    }
  } catch (error) {
    console.error('  ❌ Supabase 检查失败:', error);
  }
}

// 检查 React 上下文状态
function checkReactAuthContext() {
  console.log('\n⚛️  检查 React 认证上下文:');
  
  // 尝试获取全局状态（如果有的话）
  const reactFiberNode = document.querySelector('#root')?._reactInternalInstance 
    || document.querySelector('#root')?._reactInternals;
    
  if (reactFiberNode) {
    console.log('  ✅ 找到 React Fiber 节点');
    // 这里可以进一步检查，但通常需要 React DevTools
  } else {
    console.log('  ❌ 未找到 React Fiber 节点');
  }
  
  // 检查 localStorage 中的认证相关信息
  console.log('\n🗄️  检查 LocalStorage:');
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || key.includes('supabase') || key.includes('user')
  );
  
  authKeys.forEach(key => {
    console.log(`  ${key}:`, localStorage.getItem(key));
  });
  
  if (authKeys.length === 0) {
    console.log('  ❌ 未找到认证相关的 localStorage 项');
  }
}

// 检查权限系统
function checkPermissionSystem() {
  console.log('\n🔐 检查权限系统:');
  
  // 检查权限常量是否正确定义
  if (typeof window !== 'undefined' && window.PERMISSIONS) {
    console.log('  ✅ 找到权限常量');
    console.log('  PAYROLL_CLEAR:', window.PERMISSIONS.PAYROLL_CLEAR);
  } else {
    console.log('  ❌ 未找到权限常量 (这是正常的，权限常量可能没有暴露到全局)');
  }
  
  // 给出调试建议
  console.log('\n💡 调试建议:');
  console.log('  1. 打开 React DevTools 检查 UnifiedAuthContext 状态');
  console.log('  2. 在 Components 面板中找到 UnifiedAuthProvider');
  console.log('  3. 查看 hooks 中的 user, loading, isAuthenticated 状态');
  console.log('  4. 检查 usePermission hook 的返回值');
  console.log('  5. 确认用户角色是否正确从数据库获取');
}

// 数据库权限检查指导
function showDatabaseCheckGuide() {
  console.log('\n🗃️  数据库权限检查 SQL:');
  console.log(`
-- 检查用户权限的 SQL 语句
SELECT 
    up.id as user_profile_id,
    up.email,
    ur.role,
    ur.is_active,
    ur.created_at as role_assigned_at
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id
WHERE up.email = 'blueyang@gmail.com';
  `);
}

// 执行所有检查
async function runAllChecks() {
  await checkSupabaseAuth();
  checkReactAuthContext();
  checkPermissionSystem();
  showDatabaseCheckGuide();
  
  console.log('\n✅ 认证状态检查完成!');
  console.log('如果发现问题，请检查:');
  console.log('1. 用户是否正确登录');
  console.log('2. 数据库中的用户角色是否正确');
  console.log('3. 前端认证上下文是否正确初始化');
  console.log('4. usePermission hook 是否正确实现');
}

// 开始检查
runAllChecks();