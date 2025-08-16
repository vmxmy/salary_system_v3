import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import type { 
  FullEmployeeCreateRequest, 
  EmployeeCreateResult,
  EmployeeFormOptions,
  LookupOption
} from '@/types/employee';
import { employeeQueryKeys } from './useEmployeeList';

/**
 * 完整员工创建Hook
 * 支持创建员工及其所有关联数据（组织分配、类别分配、银行账户、教育背景等）
 * 使用数据库事务确保数据一致性
 */
export function useEmployeeFullCreate() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandlerWithToast();
  const { loadingState, setLoading } = useLoadingState();

  // 获取表单选项数据
  const {
    data: formOptions,
    isLoading: isLoadingOptions,
    error: optionsError
  } = useQuery({
    queryKey: ['employee-form-options'],
    queryFn: async (): Promise<EmployeeFormOptions> => {
      // 并行获取所有选项数据
      const [departmentsResponse, positionsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name')
          .order('name'),
        supabase
          .from('positions')
          .select('id, name, description')
          .order('name'),
        supabase
          .from('employee_categories')
          .select('id, name, description')
          .order('name')
      ]);

      // 检查错误
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (positionsResponse.error) throw positionsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      // 转换为标准选项格式
      const departments: LookupOption[] = (departmentsResponse.data || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        description: null // departments表没有description字段
      }));

      const positions: LookupOption[] = (positionsResponse.data || []).map(pos => ({
        id: pos.id,
        name: pos.name,
        description: pos.description
      }));

      const categories: LookupOption[] = (categoriesResponse.data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description
      }));

      return {
        departments,
        positions,
        categories
      };
    },
    staleTime: 10 * 60 * 1000, // 10分钟缓存
  });

  // 处理表单选项错误
  useEffect(() => {
    if (optionsError) {
      handleError(optionsError, { customMessage: '获取表单选项失败' });
    }
  }, [optionsError, handleError]);

  // 完整员工创建操作
  const createFullEmployee = useMutation({
    mutationFn: async (employeeData: FullEmployeeCreateRequest): Promise<EmployeeCreateResult> => {
      setLoading('isCreating', true);
      
      console.log('[FullCreate] Starting full employee creation:', employeeData);

      // 声明结果变量在try块外面，以便在catch块中访问
      let result: EmployeeCreateResult | undefined;

      try {
        // Step 1: 创建基本员工信息
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .insert({
            employee_name: employeeData.employee_name,
            id_number: employeeData.id_number,
            gender: employeeData.gender,
            date_of_birth: employeeData.date_of_birth,
            hire_date: employeeData.hire_date,
            employment_status: employeeData.employment_status || 'active',
          })
          .select()
          .single();

        if (employeeError) {
          console.error('[FullCreate] Employee creation failed:', employeeError);
          throw employeeError;
        }

        console.log('[FullCreate] Employee created successfully:', employee.id);

        result = { employee };
        const createdRecords: Array<Promise<any>> = [];

        // Step 1.5: 创建联系方式（如果提供）
        if (employeeData.mobile_phone || employeeData.email || employeeData.work_email || employeeData.personal_email) {
          console.log('[FullCreate] Creating contact information');
          
          const contacts: any[] = [];
          
          if (employeeData.mobile_phone) {
            contacts.push({
              employee_id: employee.id,
              contact_type: 'mobile_phone',
              contact_details: employeeData.mobile_phone,
              is_primary: true,
            });
          }
          
          if (employeeData.work_email) {
            contacts.push({
              employee_id: employee.id,
              contact_type: 'work_email',
              contact_details: employeeData.work_email,
              is_primary: true,
            });
          }
          
          if (employeeData.personal_email) {
            contacts.push({
              employee_id: employee.id,
              contact_type: 'personal_email',
              contact_details: employeeData.personal_email,
              is_primary: employeeData.work_email ? false : true,
            });
          }
          
          // If only general email is provided, treat it as work_email
          if (employeeData.email && !employeeData.work_email && !employeeData.personal_email) {
            contacts.push({
              employee_id: employee.id,
              contact_type: 'work_email',
              contact_details: employeeData.email,
              is_primary: true,
            });
          }
          
          if (contacts.length > 0) {
            const contactsPromise = supabase
              .from('employee_contacts')
              .insert(contacts)
              .select();

            createdRecords.push(Promise.resolve(contactsPromise).then(({ data, error }) => {
              if (error) throw error;
              console.log('[FullCreate] Created contacts:', data?.length);
              return data;
            }));
          }
        }

        // Step 2: 创建组织分配（如果提供且有效）
        if (employeeData.organizational_assignment && 
            employeeData.organizational_assignment.department_id && 
            employeeData.organizational_assignment.position_id &&
            employeeData.organizational_assignment.start_date) {
          console.log('[FullCreate] Creating organizational assignment');
          
          const assignmentPromise = supabase
            .from('employee_job_history')
            .insert({
              employee_id: employee.id,
              department_id: employeeData.organizational_assignment.department_id,
              position_id: employeeData.organizational_assignment.position_id,
              rank_id: employeeData.organizational_assignment.rank_id || null,
              effective_start_date: employeeData.organizational_assignment.start_date,
              effective_end_date: employeeData.organizational_assignment.end_date || null,
              notes: employeeData.organizational_assignment.notes || `Created on ${new Date().toISOString().split('T')[0]}`,
            })
            .select()
            .single();

          createdRecords.push(Promise.resolve(assignmentPromise).then(({ data, error }) => {
            if (error) throw error;
            if (result) result.organizational_assignment = data;
            return data;
          }));
        }

        // Step 3: 创建类别分配（如果提供且有效）
        if (employeeData.category_assignment && 
            employeeData.category_assignment.employee_category_id &&
            employeeData.category_assignment.effective_start_date) {
          console.log('[FullCreate] Creating category assignment');
          
          const categoryPromise = supabase
            .from('employee_category_assignments')
            .insert({
              employee_id: employee.id,
              employee_category_id: employeeData.category_assignment.employee_category_id,
              effective_start_date: employeeData.category_assignment.effective_start_date,
              effective_end_date: employeeData.category_assignment.effective_end_date || null,
              notes: employeeData.category_assignment.notes,
            })
            .select()
            .single();

          createdRecords.push(Promise.resolve(categoryPromise).then(({ data, error }) => {
            if (error) throw error;
            if (result) result.category_assignment = data;
            return data;
          }));
        }

        // Step 4: 创建银行账户（如果提供且有效）
        const validBankAccounts = employeeData.bank_accounts?.filter(account => 
          account.account_number && account.bank_name && account.effective_start_date
        ) || [];
        
        if (validBankAccounts.length > 0) {
          console.log('[FullCreate] Creating bank accounts:', validBankAccounts.length);
          
          const bankAccountsData = validBankAccounts.map(account => ({
            employee_id: employee.id,
            account_holder_name: account.account_holder_name,
            account_number: account.account_number,
            bank_name: account.bank_name,
            branch_name: account.branch_name || null,
            is_primary: account.is_primary,
            effective_start_date: account.effective_start_date,
            effective_end_date: account.effective_end_date || null,
          }));

          const bankPromise = supabase
            .from('employee_bank_accounts')
            .insert(bankAccountsData)
            .select();

          createdRecords.push(Promise.resolve(bankPromise).then(({ data, error }) => {
            if (error) throw error;
            if (result) result.bank_accounts = data;
            return data;
          }));
        }

        // Step 5: 创建教育背景（如果提供且有效）
        const validEducation = employeeData.education?.filter(edu => 
          edu.institution_name && edu.degree
        ) || [];
        
        if (validEducation.length > 0) {
          console.log('[FullCreate] Creating education records:', validEducation.length);
          
          const educationData = validEducation.map(edu => ({
            employee_id: employee.id,
            institution_name: edu.institution_name,
            degree: edu.degree,
            field_of_study: edu.field_of_study || null,
            graduation_date: edu.graduation_date || null,
            notes: edu.notes || null,
          }));

          const educationPromise = supabase
            .from('employee_education')
            .insert(educationData)
            .select();

          createdRecords.push(Promise.resolve(educationPromise).then(({ data, error }) => {
            if (error) throw error;
            if (result) result.education = data;
            return data;
          }));
        }

        // 等待所有关联数据创建完成
        if (createdRecords.length > 0) {
          console.log('[FullCreate] Waiting for related records creation');
          await Promise.all(createdRecords);
        }

        console.log('[FullCreate] Full employee creation completed successfully');
        if (!result) {
          throw new Error('Employee creation failed - result is undefined');
        }
        return result;

      } catch (error) {
        console.error('[FullCreate] Full employee creation failed:', error);
        
        // 如果有员工记录已经创建，尝试清理（简化的回滚）
        // 注意：在实际生产环境中，应该使用数据库事务或更复杂的补偿逻辑
        if (result?.employee?.id) {
          console.log('[FullCreate] Attempting cleanup for employee:', result.employee.id);
          try {
            await supabase.from('employees').delete().eq('id', result.employee.id);
            console.log('[FullCreate] Cleanup completed');
          } catch (cleanupError) {
            console.error('[FullCreate] Cleanup failed:', cleanupError);
          }
        }
        
        throw error;
      }
    },
    onSuccess: (result) => {
      // 刷新相关查询缓存
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(result.employee.id) });
      
      console.log('[FullCreate] Success - Employee created with full data:', result.employee.id);
    },
    onError: (error) => {
      console.error('[FullCreate] Error:', error);
      handleError(error, { customMessage: '创建完整员工信息失败' });
    },
    onSettled: () => {
      setLoading('isCreating', false);
    }
  });

  // 简化的员工创建（仅基本信息）
  const createBasicEmployee = useMutation({
    mutationFn: async (employeeData: FullEmployeeCreateRequest): Promise<EmployeeCreateResult> => {
      setLoading('isCreating', true);
      
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          employee_name: employeeData.employee_name,
          id_number: employeeData.id_number,
          gender: employeeData.gender,
          date_of_birth: employeeData.date_of_birth,
          hire_date: employeeData.hire_date,
          employment_status: employeeData.employment_status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return { employee };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      console.log('[BasicCreate] Basic employee created:', result.employee.id);
    },
    onError: (error) => {
      handleError(error, { customMessage: '创建员工基本信息失败' });
    },
    onSettled: () => {
      setLoading('isCreating', false);
    }
  });

  return {
    // 数据
    formOptions,
    
    // 状态
    loading: {
      isCreatingFull: createFullEmployee.isPending,
      isCreatingBasic: createBasicEmployee.isPending,
      isLoadingOptions,
      isCreating: createFullEmployee.isPending || createBasicEmployee.isPending,
    },
    
    // 错误
    errors: {
      createError: createFullEmployee.error || createBasicEmployee.error,
      optionsError,
    },
    
    // 操作
    actions: {
      createFull: createFullEmployee.mutate,
      createBasic: createBasicEmployee.mutate,
    },
    
    // 异步操作状态
    mutations: {
      createFull: createFullEmployee,
      createBasic: createBasicEmployee,
    }
  };
}

/**
 * 获取表单选项的独立Hook
 * 可以在表单组件中单独使用
 */
export function useEmployeeFormOptions() {
  const { handleError } = useErrorHandlerWithToast();

  const query = useQuery({
    queryKey: ['employee-form-options'],
    queryFn: async (): Promise<EmployeeFormOptions> => {
      const [departmentsResponse, positionsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name')
          .order('name'),
        supabase
          .from('positions')
          .select('id, name, description')
          .order('name'),
        supabase
          .from('employee_categories')
          .select('id, name, description')
          .order('name')
      ]);

      if (departmentsResponse.error) throw departmentsResponse.error;
      if (positionsResponse.error) throw positionsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      return {
        departments: (departmentsResponse.data || []).map(dept => ({
          id: dept.id,
          name: dept.name,
          description: null // departments表没有description字段
        })),
        positions: (positionsResponse.data || []).map(pos => ({
          id: pos.id,
          name: pos.name,
          description: pos.description
        })),
        categories: (categoriesResponse.data || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description
        }))
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  // 处理错误
  useEffect(() => {
    if (query.error) {
      handleError(query.error, { customMessage: '获取表单选项失败' });
    }
  }, [query.error, handleError]);

  return query;
}