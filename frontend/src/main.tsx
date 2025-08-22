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

// Clean startup with unified auth module
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)