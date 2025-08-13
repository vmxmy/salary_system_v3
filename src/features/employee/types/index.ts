/**
 * 员工模块类型定义
 */

import type { Database } from '@/types/supabase'

// 从数据库类型推导
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update']

// 扩展类型（包含关联数据）
export interface EmployeeWithDetails extends Employee {
  department?: {
    id: string
    name: string
  }
  position?: {
    id: string
    name: string
    level: number
  }
  manager?: {
    id: string
    name: string
  }
  assignments?: EmployeeAssignment[]
  contacts?: EmployeeContact[]
  bankAccounts?: EmployeeBankAccount[]
}

// 员工分配
export interface EmployeeAssignment {
  id: string
  employee_id: string
  department_id: string
  position_id: string
  start_date: string
  end_date?: string
  is_active: boolean
}

// 员工联系方式
export interface EmployeeContact {
  id: string
  employee_id: string
  phone?: string
  email?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
}

// 员工银行账户
export interface EmployeeBankAccount {
  id: string
  employee_id: string
  bank_name: string
  account_number: string
  account_name?: string
  is_primary: boolean
}

// 查询过滤器
export interface EmployeeFilters {
  keyword?: string
  departmentId?: string
  positionId?: string
  status?: 'active' | 'inactive' | 'terminated'
  hireDateFrom?: string
  hireDateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 创建员工参数
export interface CreateEmployeeParams {
  name: string
  employeeCode?: string
  idNumber?: string
  gender?: 'male' | 'female'
  dateOfBirth?: string
  hireDate: string
  departmentId: string
  positionId: string
  managerId?: string
  contact?: Partial<EmployeeContact>
  bankAccount?: Partial<EmployeeBankAccount>
}

// 更新员工参数
export interface UpdateEmployeeParams {
  name?: string
  idNumber?: string
  gender?: 'male' | 'female'
  dateOfBirth?: string
  contact?: Partial<EmployeeContact>
  bankAccount?: Partial<EmployeeBankAccount>
}

// 部门调动参数
export interface TransferEmployeeParams {
  employeeId: string
  targetDepartmentId: string
  newPositionId?: string
  effectiveDate: string
  reason?: string
}

// API 响应类型
export interface EmployeeListResponse {
  data: EmployeeWithDetails[]
  total: number
  page: number
  pageSize: number
}

// 员工统计
export interface EmployeeStatistics {
  totalEmployees: number
  activeEmployees: number
  newEmployeesThisMonth: number
  terminatedThisMonth: number
  averageAge: number
  averageServiceYears: number
}