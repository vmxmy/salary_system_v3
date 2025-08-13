/**
 * 员工列表 Hook
 * 
 * 使用 React Query 管理服务端状态
 * 支持实时更新和乐观更新
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/shared/supabase/client'
import { employeeQueries, employeeMutations } from '../api'
import type { EmployeeFilters, CreateEmployeeParams, UpdateEmployeeParams } from '../types'
import { toast } from 'sonner'

/**
 * 获取员工列表
 */
export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeeQueries.list(filters),
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
  })
}

/**
 * 获取员工详情
 */
export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeQueries.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 创建员工
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeMutations.create,
    onSuccess: (data) => {
      // 使缓存失效
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      // 设置新员工的缓存
      queryClient.setQueryData(['employee', data.id], data)
      toast.success('员工创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    }
  })
}

/**
 * 更新员工
 */
export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: UpdateEmployeeParams) => 
      employeeMutations.update(id, params),
    onMutate: async (params) => {
      // 取消相关查询
      await queryClient.cancelQueries({ queryKey: ['employee', id] })
      
      // 保存之前的数据
      const previousData = queryClient.getQueryData(['employee', id])
      
      // 乐观更新
      queryClient.setQueryData(['employee', id], (old: any) => ({
        ...old,
        ...params
      }))
      
      return { previousData }
    },
    onError: (error, variables, context) => {
      // 回滚
      if (context?.previousData) {
        queryClient.setQueryData(['employee', id], context.previousData)
      }
      toast.error(`更新失败: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('员工信息更新成功')
    }
  })
}

/**
 * 删除员工
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeMutations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('员工删除成功')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    }
  })
}

/**
 * 员工调动
 */
export function useTransferEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeMutations.transfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('员工调动成功')
    },
    onError: (error: Error) => {
      toast.error(`调动失败: ${error.message}`)
    }
  })
}

/**
 * 批量导入员工
 */
export function useBulkCreateEmployees() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeMutations.bulkCreate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success(`导入完成: 成功 ${result.success} 条, 失败 ${result.failed} 条`)
    },
    onError: (error: Error) => {
      toast.error(`导入失败: ${error.message}`)
    }
  })
}

/**
 * 实时订阅员工变更
 */
export function useRealtimeEmployees() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('Employee change:', payload)
          
          // 根据事件类型处理
          switch (payload.eventType) {
            case 'INSERT':
              // 新增员工，刷新列表
              queryClient.invalidateQueries({ queryKey: ['employees'] })
              toast.info('有新员工加入')
              break
            case 'UPDATE':
              // 更新员工，刷新相关缓存
              queryClient.invalidateQueries({ queryKey: ['employee', payload.new.id] })
              queryClient.invalidateQueries({ queryKey: ['employees'] })
              break
            case 'DELETE':
              // 删除员工，刷新列表
              queryClient.invalidateQueries({ queryKey: ['employees'] })
              toast.info('有员工离职')
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

/**
 * 搜索员工（带防抖）
 */
export function useSearchEmployees(keyword: string, debounceMs = 300) {
  return useQuery({
    queryKey: ['employees-search', keyword],
    queryFn: () => employeeQueries.search(keyword),
    enabled: keyword.length > 0,
    staleTime: 60 * 1000, // 1 分钟
  })
}

/**
 * 获取部门员工
 */
export function useDepartmentEmployees(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-employees', departmentId],
    queryFn: () => employeeQueries.getByDepartment(departmentId!),
    enabled: !!departmentId,
  })
}

/**
 * 获取下属员工
 */
export function useSubordinates(managerId: string | undefined) {
  return useQuery({
    queryKey: ['subordinates', managerId],
    queryFn: () => employeeQueries.getSubordinates(managerId!),
    enabled: !!managerId,
  })
}

/**
 * 获取生日提醒
 */
export function useUpcomingBirthdays(days = 7) {
  return useQuery({
    queryKey: ['upcoming-birthdays', days],
    queryFn: () => employeeQueries.getUpcomingBirthdays(days),
    staleTime: 24 * 60 * 60 * 1000, // 24 小时
  })
}

/**
 * 获取员工统计
 */
export function useEmployeeStatistics() {
  return useQuery({
    queryKey: ['employee-statistics'],
    queryFn: employeeQueries.getStatistics,
    staleTime: 10 * 60 * 1000, // 10 分钟
  })
}