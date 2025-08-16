import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

// 员工数据接口
export interface EmployeeCreateData {
  employee_name: string;
  id_number?: string;
  phone?: string;
  email?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  department_id?: string;
  position_id?: string;
  personnel_category_id?: string;
  is_active?: boolean;
}

export interface EmployeeUpdateData extends Partial<EmployeeCreateData> {
  updated_at?: string;
}

/**
 * 员工操作 Hook
 * 提供员工的 CRUD 操作
 */
export function useEmployeeActions() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // 创建员工
  const createMutation = useMutation({
    mutationFn: async (employeeData: EmployeeCreateData) => {
      // 映射前端字段到数据库字段
      const dbData = {
        employee_name: employeeData.employee_name,
        id_number: employeeData.id_number || null,
        phone: employeeData.phone || null,
        email: employeeData.email || null,
        hire_date: employeeData.hire_date || null,
        date_of_birth: employeeData.birth_date || null, // 映射 birth_date 到 date_of_birth
        gender: employeeData.gender || null,
        department_id: employeeData.department_id || null,
        position_id: employeeData.position_id || null,
        personnel_category_id: employeeData.personnel_category_id || null,
        employment_status: employeeData.is_active !== false ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('employees')
        .insert(dbData as any)
        .select()
        .single();

      if (error) {
        console.error('Failed to create employee:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess('员工创建成功');
    },
    onError: (error: any) => {
      console.error('Create employee error:', error);
      showError(`创建员工失败: ${error.message}`);
    },
  });

  // 更新员工
  const updateMutation = useMutation({
    mutationFn: async ({ id, employeeData }: { id: string; employeeData: EmployeeUpdateData }) => {
      const { data, error } = await supabase
        .from('employees')
        .update({
          ...employeeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update employee:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess('员工信息更新成功');
    },
    onError: (error: any) => {
      console.error('Update employee error:', error);
      showError(`更新员工失败: ${error.message}`);
    },
  });

  // 软删除员工
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 软删除：更新 deleted_at 字段和 employment_status
      const { error } = await supabase
        .from('employees')
        .update({
          deleted_at: new Date().toISOString(),
          employment_status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null); // 只删除未被删除的记录

      if (error) {
        console.error('Failed to soft delete employee:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess('员工已移除');
    },
    onError: (error: any) => {
      console.error('Soft delete employee error:', error);
      showError(`移除员工失败: ${error.message}`);
    },
  });

  // 批量软删除员工
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // 批量软删除：更新 deleted_at 字段和 employment_status
      const { error } = await supabase
        .from('employees')
        .update({
          deleted_at: new Date().toISOString(),
          employment_status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .is('deleted_at', null); // 只删除未被删除的记录

      if (error) {
        console.error('Failed to batch soft delete employees:', error);
        throw error;
      }

      return ids;
    },
    onSuccess: (ids) => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess(`成功移除 ${ids.length} 名员工`);
    },
    onError: (error: any) => {
      console.error('Batch soft delete employees error:', error);
      showError(`批量移除失败: ${error.message}`);
    },
  });

  // 恢复软删除的员工
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .update({
          deleted_at: null,
          employment_status: 'active',
          termination_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .not('deleted_at', 'is', null); // 只恢复已删除的记录

      if (error) {
        console.error('Failed to restore employee:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess('员工已恢复');
    },
    onError: (error: any) => {
      console.error('Restore employee error:', error);
      showError(`恢复员工失败: ${error.message}`);
    },
  });

  // 永久删除员工（物理删除）
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 先检查是否已经软删除
      const { data: employee, error: checkError } = await supabase
        .from('employees')
        .select('deleted_at')
        .eq('id', id)
        .single();

      if (checkError) {
        throw new Error('无法验证员工状态');
      }

      if (!employee?.deleted_at) {
        throw new Error('只能永久删除已经软删除的员工');
      }

      // 执行物理删除
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to permanently delete employee:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employee_basic_info'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showSuccess('员工记录已永久删除');
    },
    onError: (error: any) => {
      console.error('Permanent delete employee error:', error);
      showError(`永久删除失败: ${error.message}`);
    },
  });

  return {
    // CRUD 操作
    create: (employeeData: EmployeeCreateData) => createMutation.mutateAsync(employeeData),
    update: (id: string, employeeData: EmployeeUpdateData) => 
      updateMutation.mutateAsync({ id, employeeData }),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    batchDelete: (ids: string[]) => batchDeleteMutation.mutateAsync(ids),
    restore: (id: string) => restoreMutation.mutateAsync(id),
    permanentDelete: (id: string) => permanentDeleteMutation.mutateAsync(id),

    // 加载状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPermanentDeleting: permanentDeleteMutation.isPending,

    // 操作状态
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    batchDeleteError: batchDeleteMutation.error,
    restoreError: restoreMutation.error,
    permanentDeleteError: permanentDeleteMutation.error,
  };
}