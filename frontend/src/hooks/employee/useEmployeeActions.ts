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
  const { showToast } = useToast();

  // 创建员工
  const createMutation = useMutation({
    mutationFn: async (employeeData: EmployeeCreateData) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          created_at: new Date().toISOString(),
        })
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
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employees_with_details'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showToast('员工创建成功', 'success');
    },
    onError: (error: any) => {
      console.error('Create employee error:', error);
      showToast(`创建员工失败: ${error.message}`, 'error');
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
        .eq('employee_id', id)
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
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employees_with_details'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showToast('员工信息更新成功', 'success');
    },
    onError: (error: any) => {
      console.error('Update employee error:', error);
      showToast(`更新员工失败: ${error.message}`, 'error');
    },
  });

  // 删除员工
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('employee_id', id);

      if (error) {
        console.error('Failed to delete employee:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employees_with_details'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showToast('员工删除成功', 'success');
    },
    onError: (error: any) => {
      console.error('Delete employee error:', error);
      showToast(`删除员工失败: ${error.message}`, 'error');
    },
  });

  // 批量删除员工
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .in('employee_id', ids);

      if (error) {
        console.error('Failed to batch delete employees:', error);
        throw error;
      }

      return ids;
    },
    onSuccess: (ids) => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['table-data', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['table-data', 'view_employees_with_details'] });
      queryClient.invalidateQueries({ queryKey: ['employee-table'] });
      
      showToast(`成功删除 ${ids.length} 名员工`, 'success');
    },
    onError: (error: any) => {
      console.error('Batch delete employees error:', error);
      showToast(`批量删除失败: ${error.message}`, 'error');
    },
  });

  return {
    // CRUD 操作
    create: (employeeData: EmployeeCreateData) => createMutation.mutateAsync(employeeData),
    update: (id: string, employeeData: EmployeeUpdateData) => 
      updateMutation.mutateAsync({ id, employeeData }),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    batchDelete: (ids: string[]) => batchDeleteMutation.mutateAsync(ids),

    // 加载状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,

    // 操作状态
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    batchDeleteError: batchDeleteMutation.error,
  };
}