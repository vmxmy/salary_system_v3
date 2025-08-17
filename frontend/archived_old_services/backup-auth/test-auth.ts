import { authService } from '@/services/auth.service';

export async function testLogin(email: string, password: string) {
  console.log('[TestAuth] Starting login test...');
  console.log('[TestAuth] Email:', email);
  
  try {
    const startTime = Date.now();
    console.log('[TestAuth] Calling authService.signIn...');
    
    const user = await authService.signIn(email, password);
    
    const endTime = Date.now();
    console.log('[TestAuth] Login successful!');
    console.log('[TestAuth] Total time:', endTime - startTime, 'ms');
    console.log('[TestAuth] User:', user);
    
    return user;
  } catch (error) {
    console.error('[TestAuth] Login failed:', error);
    throw error;
  }
}

// Make it available globally for testing
(window as any).testLogin = testLogin;

// Auto-run test if URL has test parameter
if (window.location.search.includes('test=login')) {
  setTimeout(() => {
    console.log('[TestAuth] Auto-running login test...');
    testLogin('admin@example.com', 'admin123');
  }, 2000);
}