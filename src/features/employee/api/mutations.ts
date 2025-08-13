/**
 * 员工变更 API
 * 
 * 处理创建、更新、删除等操作
 */

import { supabase } from '@/shared/supabase/client'
import type { 
  CreateEmployeeParams,
  UpdateEmployeeParams,
  TransferEmployeeParams,
  Employee
} from '../types'

/**
 * 员工变更对象
 */
export const employeeMutations = {
  /**
   * 创建员工
   */
  create: async (params: CreateEmployeeParams): Promise<Employee> => {
    // 使用 RPC 函数处理事务
    const { data, error } = await supabase.rpc('create_employee_transaction', {
      p_name: params.name,
      p_employee_code: params.employeeCode,
      p_id_number: params.idNumber,
      p_department_id: params.departmentId,
      p_position_id: params.positionId,
      p_hire_date: params.hireDate,
      p_gender: params.gender,
      p_phone: params.contact?.phone,
      p_email: params.contact?.email,
      p_bank_name: params.bankAccount?.bank_name,
      p_account_number: params.bankAccount?.account_number
    })

    if (error) throw error
    return data
  },

  /**
   * 更新员工基本信息
   */
  update: async (id: string, params: UpdateEmployeeParams): Promise<Employee> => {
    const updates: any = {}
    
    if (params.name) updates.employee_name = params.name
    if (params.idNumber) updates.id_number = params.idNumber
    if (params.gender) updates.gender = params.gender
    if (params.dateOfBirth) updates.date_of_birth = params.dateOfBirth
    
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * 更新员工联系方式
   */
  updateContact: async (employeeId: string, contact: Partial<UpdateEmployeeParams['contact']>): Promise<void> => {
    const { error } = await supabase
      .from('employee_contacts')
      .upsert({
        employee_id: employeeId,
        ...contact,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  },

  /**
   * 更新银行账户
   */
  updateBankAccount: async (employeeId: string, bankAccount: Partial<UpdateEmployeeParams['bankAccount']>): Promise<void> => {
    const { error } = await supabase
      .from('employee_bank_accounts')
      .upsert({
        employee_id: employeeId,
        ...bankAccount,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  },

  /**
   * 部门调动
   */
  transfer: async (params: TransferEmployeeParams): Promise<void> => {
    const { error } = await supabase.rpc('transfer_employee', {
      p_employee_id: params.employeeId,
      p_target_department_id: params.targetDepartmentId,
      p_new_position_id: params.newPositionId,
      p_effective_date: params.effectiveDate,
      p_reason: params.reason
    })

    if (error) throw error
  },

  /**
   * 员工离职
   */
  terminate: async (employeeId: string, terminationDate: string, reason?: string): Promise<void> => {
    const { error } = await supabase
      .from('employees')
      .update({
        employment_status: 'terminated',
        termination_date: terminationDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)

    if (error) throw error

    // 结束当前分配
    await supabase
      .from('employee_assignments')
      .update({
        is_active: false,
        end_date: terminationDate
      })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
  },

  /**
   * 批量导入员工
   */
  bulkCreate: async (employees: CreateEmployeeParams[]): Promise<{ success: number; failed: number }> => {
    let success = 0
    let failed = 0

    // 分批处理
    for (const employee of employees) {
      try {
        await employeeMutations.create(employee)
        success++
      } catch (error) {
        failed++
        console.error('Failed to create employee:', error)
      }
    }

    return { success, failed }
  },

  /**
   * 批量更新状态
   */
  bulkUpdateStatus: async (employeeIds: string[], status: string): Promise<number> => {
    const { data, error } = await supabase.rpc('bulk_update_employee_status', {
      employee_ids: employeeIds,
      new_status: status
    })

    if (error) throw error
    return data
  },

  /**
   * 删除员工（软删除）
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('employees')
      .update({
        employment_status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
  }
}