/**
 * 重新验证功能测试工具
 * 
 * 用于测试和调试重新验证功能的各种场景
 */

import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const reAuthTest = {
  /**
   * 测试会话过期检测
   */
  async testSessionExpiration(): Promise<void> {
    console.log('🧪 Testing session expiration detection...');
    
    try {
      const session = await auth.getSession();
      if (!session) {
        console.log('❌ No active session found');
        return;
      }

      console.log('Current session expires at:', new Date((session.expires_at || 0) * 1000).toISOString());
      
      const isValid = await auth.validateSession();
      console.log('Session is valid:', isValid);
      
      if (isValid) {
        console.log('✅ Session expiration detection working correctly');
      } else {
        console.log('⚠️  Session is invalid - re-authentication should be triggered');
      }
    } catch (error) {
      console.error('❌ Session expiration test failed:', error);
    }
  },

  /**
   * 模拟会话过期场景
   */
  async simulateSessionExpiry(): Promise<void> {
    console.log('🧪 Simulating session expiry...');
    
    try {
      // 通过直接操作localStorage来模拟会话过期
      const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      const authData = localStorage.getItem(authKey);
      
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.expires_at) {
          // 将过期时间设置为过去
          parsed.expires_at = Math.floor(Date.now() / 1000) - 3600; // 1小时前过期
          localStorage.setItem(authKey, JSON.stringify(parsed));
          
          console.log('✅ Session expiry simulated - session should now appear expired');
          console.log('🔄 Try refreshing the page or navigating to test re-authentication');
        }
      }
    } catch (error) {
      console.error('❌ Session expiry simulation failed:', error);
    }
  },

  /**
   * 测试重新验证触发
   */
  async testReAuthTrigger(): Promise<void> {
    console.log('🧪 Testing re-authentication trigger...');
    
    try {
      // 触发重新验证事件
      window.dispatchEvent(new CustomEvent('auth-reauth-required', {
        detail: { reason: 'Testing re-authentication flow' }
      }));
      
      console.log('✅ Re-authentication event triggered');
      console.log('📋 Check if login page shows re-authentication UI');
    } catch (error) {
      console.error('❌ Re-authentication trigger test failed:', error);
    }
  },

  /**
   * 测试网络错误场景下的重试机制
   */
  async testNetworkErrorRetry(): Promise<void> {
    console.log('🧪 Testing network error retry mechanism...');
    
    // 这个测试需要手动断网后重新连网来测试
    console.log('📋 Manual test required:');
    console.log('1. Disconnect network');
    console.log('2. Try to login');
    console.log('3. Reconnect network');
    console.log('4. Use retry button');
    console.log('5. Verify login succeeds');
  },

  /**
   * 测试Magic Link重新发送功能
   */
  async testMagicLinkResend(): Promise<void> {
    console.log('🧪 Testing Magic Link resend functionality...');
    
    try {
      // 这需要一个测试邮箱地址
      const testEmail = prompt('Enter test email for Magic Link:');
      if (!testEmail) {
        console.log('❌ No email provided, skipping test');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?reauth=true`,
        },
      });

      if (error) {
        console.error('❌ Magic Link send failed:', error);
      } else {
        console.log('✅ Magic Link sent successfully');
        console.log('📧 Check email and test the re-authentication flow');
      }
    } catch (error) {
      console.error('❌ Magic Link test failed:', error);
    }
  },

  /**
   * 重置会话状态（清理测试数据）
   */
  async resetSessionState(): Promise<void> {
    console.log('🧹 Resetting session state...');
    
    try {
      // 清理本地存储
      const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      localStorage.removeItem(authKey);
      
      // 执行登出
      await auth.signOut();
      
      console.log('✅ Session state reset successfully');
      console.log('🔄 Page will reload to apply changes');
      
      // 刷新页面以应用更改
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Session reset failed:', error);
    }
  },

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Running all re-authentication tests...');
    console.log('==================================================');
    
    await this.testSessionExpiration();
    console.log('--------------------------------------------------');
    
    await this.testReAuthTrigger();
    console.log('--------------------------------------------------');
    
    await this.testNetworkErrorRetry();
    console.log('--------------------------------------------------');
    
    console.log('✅ All automated tests completed');
    console.log('📋 Manual tests (Magic Link, Network Error) require user interaction');
    console.log('==================================================');
  }
};

// 在开发环境下暴露到全局对象
if (import.meta.env.DEV) {
  (window as any).reAuthTest = reAuthTest;
  console.log('🔧 Re-authentication test utilities available at window.reAuthTest');
  console.log('Available methods:');
  console.log('- reAuthTest.testSessionExpiration()');
  console.log('- reAuthTest.simulateSessionExpiry()');
  console.log('- reAuthTest.testReAuthTrigger()');
  console.log('- reAuthTest.testNetworkErrorRetry()');
  console.log('- reAuthTest.testMagicLinkResend()');
  console.log('- reAuthTest.resetSessionState()');
  console.log('- reAuthTest.runAllTests()');
}