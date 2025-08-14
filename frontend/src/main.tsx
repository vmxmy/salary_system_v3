import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import App from './App.tsx'
import './index.css'

// 开发环境下导入测试脚本
if (import.meta.env.DEV) {
  import('./test-hooks').then(module => {
    console.log('🧪 Hook测试脚本已加载，运行 testHooks() 进行测试');
  });
}

// Clean startup with unified auth module
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)