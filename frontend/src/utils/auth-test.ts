/**
 * 认证修复测试工具
 * 
 * 此文件用于测试退出登录的修复是否有效
 */

import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const testAuthFix = {
  /**
   * 测试会话验证功能
   */
  async testSessionValidation(): Promise<void> {
    console.log('🧪 Testing session validation...');
    
    const isValid = await auth.validateSession();
    console.log('Session is valid:', isValid);
    
    if (isValid) {
      const session = await auth.getSession();
      console.log('Session expires at:', new Date((session?.expires_at || 0) * 1000).toISOString());
    }
  },

  /**
   * 测试安全退出功能（模拟会话失效情况）
   */
  async testSafeSignOut(): Promise<void> {
    console.log('🧪 Testing safe sign-out with session validation...');
    
    try {
      // 首先检查会话状态
      const hasSession = await auth.validateSession();
      console.log('Has valid session before sign-out:', hasSession);
      
      // 执行退出
      await auth.signOut();
      console.log('✅ Sign-out completed successfully');
      
      // 检查本地状态是否已清理
      const sessionAfter = await auth.getSession();
      console.log('Session after sign-out:', sessionAfter ? 'Still exists (error)' : 'Cleaned up (success)');
      
    } catch (error) {
      console.error('❌ Sign-out test failed:', error);
      
      // 检查是否是我们处理的已知错误
      if (error instanceof Error) {
        if (error.message.includes('Auth session missing') || 
            error.message.includes('Invalid refresh token')) {
          console.log('🔧 This is the error we\'re designed to handle gracefully');
        }
      }
    }
  },

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      // 强制清理本地状态
      await supabase.auth.signOut({ scope: 'local' });
      console.log('✅ Local state cleaned');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }
};

// 开发环境下暴露到 window 对象供控制台测试
if (import.meta.env.DEV) {
  (window as any).testAuthFix = testAuthFix;
  console.log('🔧 Auth fix test utilities available at window.testAuthFix');
  console.log('Available methods:');
  console.log('- testAuthFix.testSessionValidation()');
  console.log('- testAuthFix.testSafeSignOut()');
  console.log('- testAuthFix.cleanup()');
}