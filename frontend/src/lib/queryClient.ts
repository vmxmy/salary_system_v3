import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据缓存5分钟
      staleTime: 5 * 60 * 1000,
      // 缓存保持10分钟
      gcTime: 10 * 60 * 1000,
      // 网络重连时重新获取
      refetchOnReconnect: true,
      // 窗口聚焦时不自动重新获取（员工数据相对静态）
      refetchOnWindowFocus: false,
      // 重试1次
      retry: 1,
    },
  },
});