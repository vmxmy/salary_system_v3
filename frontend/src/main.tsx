import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { setupGlobalErrorHandler } from './utils/errorHandling'
import App from './App.tsx'
import './locales' // Initialize i18n
import './index.css'

// 设置全局错误处理，过滤浏览器扩展错误
setupGlobalErrorHandler();

// 调试工具已归档到 archived/test-pages-20250828/
// if (import.meta.env.DEV) {
//   import('./utils/realtime-debug').then(({ debugRealtimeCache }) => {
//     (window as any).debugRealtimeCache = debugRealtimeCache;
//     (window as any).queryClient = queryClient;
//     console.log('🔧 开发调试工具已加载:');
//     console.log('- debugRealtimeCache(): 测试Realtime缓存失效');
//     console.log('- queryClient: TanStack Query客户端实例');
//   });
// }

// Clean startup with unified auth module
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)