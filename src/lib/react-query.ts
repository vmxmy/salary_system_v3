/**
 * React Query 配置
 * 
 * 全局查询客户端配置
 */

import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// 默认配置
const defaultOptions = {
  queries: {
    // 数据陈旧时间（5分钟）
    staleTime: 5 * 60 * 1000,
    // 缓存时间（10分钟）
    gcTime: 10 * 60 * 1000,
    // 重试次数
    retry: (failureCount: number, error: any) => {
      // 4xx 错误不重试
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      // 最多重试 3 次
      return failureCount < 3
    },
    // 重试延迟
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // 窗口聚焦时不自动重新获取
    refetchOnWindowFocus: false,
    // 网络重连时重新获取
    refetchOnReconnect: 'always',
  },
  mutations: {
    // 错误处理
    onError: (error: any) => {
      const message = error?.message || '操作失败'
      toast.error(message)
    },
    // 重试配置
    retry: false,
  },
}

// 创建查询客户端
export const queryClient = new QueryClient({
  defaultOptions,
})

// 查询键工厂
export const queryKeys = {
  // 员工相关
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    search: (keyword: string) => [...queryKeys.employees.all, 'search', keyword] as const,
    statistics: () => [...queryKeys.employees.all, 'statistics'] as const,
  },
  
  // 部门相关
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.departments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.departments.all, 'detail', id] as const,
    tree: () => [...queryKeys.departments.all, 'tree'] as const,
  },
  
  // 薪资相关
  payroll: {
    all: ['payroll'] as const,
    lists: () => [...queryKeys.payroll.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.payroll.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.payroll.all, 'detail', id] as const,
    statistics: (periodId?: string) => [...queryKeys.payroll.all, 'statistics', periodId] as const,
    periods: () => [...queryKeys.payroll.all, 'periods'] as const,
  },
  
  // 用户相关
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
  },
}

// 使缓存失效的辅助函数
export const invalidateQueries = {
  employees: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  departments: () => queryClient.invalidateQueries({ queryKey: queryKeys.departments.all }),
  payroll: () => queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all }),
  auth: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
}

// 预取数据的辅助函数
export const prefetchQueries = {
  employeeList: async (filters?: any) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.employees.list(filters),
      queryFn: () => import('@/features/employee/api').then(m => m.employeeQueries.list(filters)),
    })
  },
  
  employeeDetail: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.employees.detail(id),
      queryFn: () => import('@/features/employee/api').then(m => m.employeeQueries.getById(id)),
    })
  },
  
  departmentTree: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.departments.tree(),
      queryFn: () => import('@/features/department/api').then(m => m.departmentQueries.getTree()),
    })
  },
}

// 乐观更新辅助函数
export const optimisticUpdate = {
  employee: (id: string, updates: any) => {
    queryClient.setQueryData(
      queryKeys.employees.detail(id),
      (old: any) => ({ ...old, ...updates })
    )
  },
  
  addToList: <T extends { id: string }>(queryKey: readonly unknown[], newItem: T) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return { data: [newItem], total: 1 }
      return {
        ...old,
        data: [newItem, ...old.data],
        total: old.total + 1,
      }
    })
  },
  
  removeFromList: (queryKey: readonly unknown[], id: string) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old
      return {
        ...old,
        data: old.data.filter((item: any) => item.id !== id),
        total: old.total - 1,
      }
    })
  },
}