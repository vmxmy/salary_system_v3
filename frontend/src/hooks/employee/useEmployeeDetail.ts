import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import { employeeQueryKeys } from './useEmployeeList';
import type { EmployeeBasicInfo, EmployeeBankAccount, EmployeeEducation } from '@/types/employee';

/**
 * 联系方式类型定义
 */
export interface EmployeeContact {
  id: string;
  employee_id: string;
  contact_type: 'mobile_phone' | 'work_email' | 'personal_email';
  contact_details: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * 多表更新的基础信息接口
 */
export interface EmployeeBasicInfoUpdate {
  // employees 表字段
  employee_name?: string;
  id_number?: string;
  gender?: string;
  date_of_birth?: string;
  employment_status?: string;
  
  // employee_contacts 表字段（通过类型区分）
  mobile_phone?: string;
  work_email?: string;
  personal_email?: string;
}

/**
 * 员工详情Hook - 重新设计以支持多表关系
 * 专注于单个员工的详细信息管理，正确处理数据库表结构
 */
export function useEmployeeDetail(employeeId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading } = useLoadingState();
  const subscriptionRef = useRef<any>(null);

  // 获取员工基本信息
  const {
    data: employee,
    isLoading: isLoadingEmployee,
    error: employeeError,
    refetch: refetchEmployee
  } = useQuery({
    queryKey: employeeQueryKeys.detail(employeeId),
    queryFn: async (): Promise<EmployeeBasicInfo | null> => {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // 员工不存在
        throw error;
      }
      return data as any;
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });

  // 获取员工联系方式信息
  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
    error: contactsError,
    refetch: refetchContacts
  } = useQuery({
    queryKey: [...employeeQueryKeys.detail(employeeId), 'contacts'],
    queryFn: async (): Promise<EmployeeContact[]> => {
      const { data, error } = await supabase
        .from('employee_contacts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('contact_type');

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // 获取员工银行账户信息
  const {
    data: bankAccounts = [],
    isLoading: isLoadingBankAccounts,
    error: bankAccountsError,
    refetch: refetchBankAccounts
  } = useQuery({
    queryKey: [...employeeQueryKeys.detail(employeeId), 'bank_accounts'],
    queryFn: async (): Promise<EmployeeBankAccount[]> => {
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // 获取员工教育背景信息
  const {
    data: education = [],
    isLoading: isLoadingEducation,
    error: educationError,
    refetch: refetchEducation
  } = useQuery({
    queryKey: [...employeeQueryKeys.detail(employeeId), 'education'],
    queryFn: async (): Promise<EmployeeEducation[]> => {
      const { data, error } = await supabase
        .from('employee_education')
        .select('*')
        .eq('employee_id', employeeId)
        .order('graduation_date', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });

  // 设置实时订阅
  useEffect(() => {
    if (employeeId) {
      console.log(`[Realtime] Setting up employee detail subscription for ID: ${employeeId}`);
      
      subscriptionRef.current = supabase
        .channel(`employee_detail:${employeeId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employees',
            filter: `id=eq.${employeeId}`
          },
          (payload) => {
            console.log(`[Realtime] Employee ${employeeId} change detected:`, payload);
            
            // 员工基本信息变更时，重新获取详细信息
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
            // 同时更新员工列表缓存
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employee_contacts',
            filter: `employee_id=eq.${employeeId}`
          },
          (payload) => {
            console.log(`[Realtime] Employee ${employeeId} contacts change detected:`, payload);
            
            // 联系方式变更时，重新获取联系方式信息
            queryClient.invalidateQueries({ 
              queryKey: [...employeeQueryKeys.detail(employeeId), 'contacts'] 
            });
          }
        )
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employee_assignments',
            filter: `employee_id=eq.${employeeId}`
          },
          (payload) => {
            console.log(`[Realtime] Employee ${employeeId} assignment change detected:`, payload);
            
            // 员工分配信息变更时，重新获取详细信息
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Employee ${employeeId} detail subscription status:`, status);
        });

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
      };
    }
  }, [employeeId, queryClient]);

  // 辅助函数：获取指定类型的联系方式
  const getContactByType = useCallback((type: EmployeeContact['contact_type']) => {
    return contacts.find(contact => contact.contact_type === type)?.contact_details || '';
  }, [contacts]);

  // 辅助函数：更新或创建联系方式
  const upsertContact = async (
    contactType: EmployeeContact['contact_type'], 
    contactDetails: string
  ) => {
    const existingContact = contacts.find(c => c.contact_type === contactType);
    
    if (existingContact) {
      // 更新现有联系方式
      const { error } = await supabase
        .from('employee_contacts')
        .update({ contact_details: contactDetails })
        .eq('id', existingContact.id);
      
      if (error) throw error;
    } else {
      // 创建新联系方式
      const { error } = await supabase
        .from('employee_contacts')
        .insert({
          employee_id: employeeId,
          contact_type: contactType,
          contact_details: contactDetails,
          is_primary: contactType === 'mobile_phone' // 手机号默认为主要联系方式
        });
      
      if (error) throw error;
    }
  };

  // 更新员工基本信息（支持多表）
  const updateEmployeeBasicInfo = useMutation({
    mutationFn: async (updates: EmployeeBasicInfoUpdate) => {
      // 验证 employeeId 是否有效
      if (!employeeId) {
        throw new Error('Employee ID is required for update operation');
      }
      
      setLoading('isUpdating', true);
      
      try {
        // 1. 更新 employees 表中的基础字段
        const employeeUpdates: any = {};
        if (updates.employee_name !== undefined) employeeUpdates.employee_name = updates.employee_name;
        if (updates.id_number !== undefined) employeeUpdates.id_number = updates.id_number;
        if (updates.gender !== undefined) employeeUpdates.gender = updates.gender;
        if (updates.date_of_birth !== undefined) employeeUpdates.date_of_birth = updates.date_of_birth;
        if (updates.employment_status !== undefined) employeeUpdates.employment_status = updates.employment_status;

        if (Object.keys(employeeUpdates).length > 0) {
          console.log('[useEmployeeDetail] Updating employee with ID:', employeeId, 'Updates:', employeeUpdates);
          const { error: employeeError } = await supabase
            .from('employees')
            .update(employeeUpdates)
            .eq('id', employeeId);

          if (employeeError) {
            console.error('[useEmployeeDetail] Employee update error:', employeeError);
            throw employeeError;
          }
          console.log('[useEmployeeDetail] Employee updated successfully');
        }

        // 2. 更新 employee_contacts 表中的联系方式
        const contactUpdates = [];
        if (updates.mobile_phone !== undefined) {
          console.log('[useEmployeeDetail] Updating mobile_phone:', updates.mobile_phone);
          contactUpdates.push(upsertContact('mobile_phone', updates.mobile_phone));
        }
        if (updates.work_email !== undefined) {
          console.log('[useEmployeeDetail] Updating work_email:', updates.work_email);
          contactUpdates.push(upsertContact('work_email', updates.work_email));
        }
        if (updates.personal_email !== undefined) {
          console.log('[useEmployeeDetail] Updating personal_email:', updates.personal_email);
          contactUpdates.push(upsertContact('personal_email', updates.personal_email));
        }

        // 并行执行所有联系方式更新
        if (contactUpdates.length > 0) {
          console.log('[useEmployeeDetail] Executing contact updates:', contactUpdates.length);
          await Promise.all(contactUpdates);
          console.log('[useEmployeeDetail] Contact updates completed');
        }

        console.log('[useEmployeeDetail] All updates completed successfully');
        return { success: true };
      } catch (error) {
        console.error('Multi-table update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // 刷新所有相关缓存
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: [...employeeQueryKeys.detail(employeeId), 'contacts'] });
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      console.log('员工基本信息更新成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新员工基本信息失败' });
    },
    onSettled: () => {
      setLoading('isUpdating', false);
    }
  });

  // 添加银行账户
  const addBankAccount = useMutation({
    mutationFn: async (bankAccount: Omit<EmployeeBankAccount, 'id' | 'employee_id' | 'created_at' | 'updated_at'>) => {
      setLoading('isCreating', true);
      
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .insert({
          employee_id: employeeId,
          ...bankAccount
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'bank_accounts'] 
      });
      console.log('银行账户添加成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '添加银行账户失败' });
    },
    onSettled: () => {
      setLoading('isCreating', false);
    }
  });

  // 更新银行账户
  const updateBankAccount = useMutation({
    mutationFn: async ({ 
      accountId, 
      updates 
    }: { 
      accountId: string; 
      updates: Partial<EmployeeBankAccount> 
    }) => {
      setLoading('isUpdating', true);
      
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .update(updates)
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'bank_accounts'] 
      });
      console.log('银行账户更新成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新银行账户失败' });
    },
    onSettled: () => {
      setLoading('isUpdating', false);
    }
  });

  // 删除银行账户
  const deleteBankAccount = useMutation({
    mutationFn: async (accountId: string) => {
      setLoading('isDeleting', true);
      
      const { error } = await supabase
        .from('employee_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'bank_accounts'] 
      });
      console.log('银行账户删除成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '删除银行账户失败' });
    },
    onSettled: () => {
      setLoading('isDeleting', false);
    }
  });

  // 添加教育背景
  const addEducation = useMutation({
    mutationFn: async (educationData: Omit<EmployeeEducation, 'id' | 'employee_id' | 'created_at' | 'updated_at'>) => {
      setLoading('isCreating', true);
      
      const { data, error } = await supabase
        .from('employee_education')
        .insert({
          employee_id: employeeId,
          ...educationData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'education'] 
      });
      console.log('教育背景添加成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '添加教育背景失败' });
    },
    onSettled: () => {
      setLoading('isCreating', false);
    }
  });

  // 更新教育背景
  const updateEducation = useMutation({
    mutationFn: async ({ 
      educationId, 
      updates 
    }: { 
      educationId: string; 
      updates: Partial<EmployeeEducation> 
    }) => {
      setLoading('isUpdating', true);
      
      const { data, error } = await supabase
        .from('employee_education')
        .update(updates)
        .eq('id', educationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'education'] 
      });
      console.log('教育背景更新成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新教育背景失败' });
    },
    onSettled: () => {
      setLoading('isUpdating', false);
    }
  });

  // 删除教育背景
  const deleteEducation = useMutation({
    mutationFn: async (educationId: string) => {
      setLoading('isDeleting', true);
      
      const { error } = await supabase
        .from('employee_education')
        .delete()
        .eq('id', educationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...employeeQueryKeys.detail(employeeId), 'education'] 
      });
      console.log('教育背景删除成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '删除教育背景失败' });
    },
    onSettled: () => {
      setLoading('isDeleting', false);
    }
  });

  // 刷新所有数据
  const refreshAll = useCallback(() => {
    refetchEmployee();
    refetchContacts();
    refetchBankAccounts();
    refetchEducation();
  }, [refetchEmployee, refetchContacts, refetchBankAccounts, refetchEducation]);

  // 综合加载状态
  const isLoading = isLoadingEmployee || isLoadingContacts || isLoadingBankAccounts || isLoadingEducation;
  const hasError = employeeError || contactsError || bankAccountsError || educationError;

  return {
    // 数据
    employee,
    contacts,
    bankAccounts,
    education,
    
    // 联系方式便捷访问
    contactInfo: {
      mobile_phone: getContactByType('mobile_phone'),
      work_email: getContactByType('work_email'),
      personal_email: getContactByType('personal_email'),
    },
    
    // 状态
    loading: {
      isLoading,
      isLoadingEmployee,
      isLoadingContacts,
      isLoadingBankAccounts,
      isLoadingEducation,
      isUpdating: loadingState.isUpdating,
      isCreating: loadingState.isCreating,
      isDeleting: loadingState.isDeleting,
    },
    error: hasError,
    
    // 操作
    actions: {
      // 基本信息操作（支持多表）
      updateBasicInfo: updateEmployeeBasicInfo.mutate,
      
      // 银行账户操作
      addBankAccount: addBankAccount.mutate,
      updateBankAccount: updateBankAccount.mutate,
      deleteBankAccount: deleteBankAccount.mutate,
      
      // 教育背景操作
      addEducation: addEducation.mutate,
      updateEducation: updateEducation.mutate,
      deleteEducation: deleteEducation.mutate,
      
      // 通用操作
      refresh: refreshAll,
    },
    
    // 异步操作状态
    mutations: {
      updateBasicInfo: updateEmployeeBasicInfo,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      addEducation,
      updateEducation,
      deleteEducation,
    }
  };
}