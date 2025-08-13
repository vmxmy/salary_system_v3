/**
 * 员工查询 API
 * 
 * 遵循 Serverless 原则：
 * - 简单查询直接使用 Supabase
 * - 复杂查询使用视图或 RPC
 */

import { supabase } from '@/shared/supabase/client'
import type { 
  Employee, 
  EmployeeWithDetails, 
  EmployeeFilters,
  EmployeeListResponse,
  EmployeeStatistics
} from '../types'

/**
 * 员工查询对象
 */
export const employeeQueries = {
  /**
   * 获取员工列表
   */
  list: async (filters?: EmployeeFilters): Promise<EmployeeListResponse> => {
    // 使用优化的视图
    let query = supabase
      .from('view_employee_list_optimized')
      .select('*', { count: 'exact' })

    // 应用过滤器
    if (filters?.keyword) {
      query = query.or(`employee_name.ilike.%${filters.keyword}%,id_number.ilike.%${filters.keyword}%`)
    }
    if (filters?.departmentId) {
      // 需要从 employee_assignments 表查询
      const { data: assignments } = await supabase
        .from('employee_assignments')
        .select('employee_id')
        .eq('department_id', filters.departmentId)
        .eq('is_active', true)
      
      const employeeIds = assignments?.map(a => a.employee_id) || []
      if (employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds)
      }
    }
    if (filters?.status) {
      query = query.eq('employment_status', filters.status)
    }
    if (filters?.hireDateFrom) {
      query = query.gte('hire_date', filters.hireDateFrom)
    }
    if (filters?.hireDateTo) {
      query = query.lte('hire_date', filters.hireDateTo)
    }

    // 排序
    const sortBy = filters?.sortBy || 'hire_date'
    const sortOrder = filters?.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 分页
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    
    if (error) throw error

    return {
      data: data as EmployeeWithDetails[],
      total: count || 0,
      page,
      pageSize
    }
  },

  /**
   * 根据 ID 获取员工详情
   */
  getById: async (id: string): Promise<EmployeeWithDetails> => {
    // 获取基本信息
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()

    if (employeeError) throw employeeError

    // 获取当前分配
    const { data: assignment } = await supabase
      .from('employee_assignments')
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, name, level)
      `)
      .eq('employee_id', id)
      .eq('is_active', true)
      .single()

    // 获取联系方式
    const { data: contacts } = await supabase
      .from('employee_contacts')
      .select('*')
      .eq('employee_id', id)

    // 获取银行账户
    const { data: bankAccounts } = await supabase
      .from('employee_bank_accounts')
      .select('*')
      .eq('employee_id', id)

    return {
      ...employee,
      department: assignment?.department,
      position: assignment?.position,
      contacts: contacts || [],
      bankAccounts: bankAccounts || []
    }
  },

  /**
   * 搜索员工（全文搜索）
   */
  search: async (keyword: string): Promise<Employee[]> => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .or(`employee_name.ilike.%${keyword}%,id_number.ilike.%${keyword}%`)
      .limit(10)

    if (error) throw error
    return data
  },

  /**
   * 获取部门员工
   */
  getByDepartment: async (departmentId: string): Promise<EmployeeWithDetails[]> => {
    const { data, error } = await supabase
      .from('employee_assignments')
      .select(`
        employee:employees(*),
        position:positions(name, level)
      `)
      .eq('department_id', departmentId)
      .eq('is_active', true)

    if (error) throw error

    return data.map(item => ({
      ...item.employee,
      position: item.position
    })) as EmployeeWithDetails[]
  },

  /**
   * 获取下属员工
   */
  getSubordinates: async (managerId: string): Promise<Employee[]> => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('manager_id', managerId)
      .eq('employment_status', 'active')

    if (error) throw error
    return data
  },

  /**
   * 获取即将过生日的员工
   */
  getUpcomingBirthdays: async (days = 7): Promise<Employee[]> => {
    const { data, error } = await supabase.rpc('get_upcoming_birthdays', {
      days_ahead: days
    })

    if (error) throw error
    return data
  },

  /**
   * 获取合同即将到期的员工
   */
  getExpiringContracts: async (days = 30): Promise<Employee[]> => {
    const { data, error } = await supabase.rpc('get_expiring_contracts', {
      days_ahead: days
    })

    if (error) throw error
    return data
  },

  /**
   * 获取员工统计信息
   */
  getStatistics: async (): Promise<EmployeeStatistics> => {
    // 使用 RPC 函数获取统计数据
    const { data, error } = await supabase.rpc('get_employee_statistics')

    if (error) throw error

    return {
      totalEmployees: data.total_employees || 0,
      activeEmployees: data.active_employees || 0,
      newEmployeesThisMonth: data.new_employees_this_month || 0,
      terminatedThisMonth: data.terminated_this_month || 0,
      averageAge: data.average_age || 0,
      averageServiceYears: data.average_service_years || 0
    }
  },

  /**
   * 检查员工编号是否存在
   */
  checkEmployeeCode: async (code: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('employee_code', code)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { count, error } = await query
    if (error) throw error

    return (count || 0) > 0
  },

  /**
   * 检查身份证号是否存在
   */
  checkIdNumber: async (idNumber: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('id_number', idNumber)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { count, error } = await query
    if (error) throw error

    return (count || 0) > 0
  }
}