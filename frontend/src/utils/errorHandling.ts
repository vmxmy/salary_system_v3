/**
 * 浏览器扩展异步消息错误处理
 * 用于过滤和处理非应用相关的错误
 */

// 扩展相关错误的特征
const EXTENSION_ERROR_PATTERNS = [
  'A listener indicated an asynchronous response by returning true',
  'message channel closed before a response was received',
  'Extension context invalidated',
  'chrome-extension://',
  'moz-extension://'
];

/**
 * 检查是否为浏览器扩展相关错误
 */
export function isExtensionError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error.message;
  return EXTENSION_ERROR_PATTERNS.some(pattern => 
    message.includes(pattern)
  );
}

/**
 * 全局错误处理器
 * 过滤扩展错误，只报告应用相关错误
 */
export function setupGlobalErrorHandler() {
  // 处理未捕获的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (isExtensionError(error)) {
      console.debug('[Extension] Filtered browser extension error:', error);
      event.preventDefault(); // 阻止错误显示在控制台
      return;
    }
    
    // 应用相关错误继续正常处理
    console.error('[App] Unhandled promise rejection:', error);
  });

  // 处理同步错误
  window.addEventListener('error', (event) => {
    if (isExtensionError(event.error || event.message)) {
      console.debug('[Extension] Filtered browser extension error:', event.error);
      event.preventDefault();
      return;
    }
    
    console.error('[App] Unhandled error:', event.error);
  });
}

/**
 * React 错误边界使用的错误过滤
 */
export function shouldIgnoreError(error: Error): boolean {
  return isExtensionError(error);
}