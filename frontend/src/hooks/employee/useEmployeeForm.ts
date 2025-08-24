import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEmployeeList } from './useEmployeeList';
import { useDepartments } from '../department/useDepartments';
// Temporarily disabled - hooks moved to archived
// import { usePositions } from '../position/usePositions';
// import { usePersonnelCategories } from '../category/usePersonnelCategories';
import type { CreateEmployeeRequest, EmployeeBasicInfo } from '@/types/employee';

/**
 * 员工表单数据类型
 */
export interface EmployeeFormData {
  // 基本信息
  employee_name?: string;
  id_number?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  hire_date?: string;
  employment_status?: 'active' | 'inactive';
  
  // 联系信息
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
  
  // 组织信息
  department_id?: string;
  position_id?: string;
  category_id?: string;
}

/**
 * 表单验证错误类型
 */
export interface ValidationErrors {
  employee_name?: string;
  id_number?: string;
  gender?: string;
  date_of_birth?: string;
  hire_date?: string;
  employment_status?: string;
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
  department_id?: string;
  position_id?: string;
  category_id?: string;
}

/**
 * 表单模式
 */
export type FormMode = 'create' | 'edit';

/**
 * 表单配置选项
 */
export interface EmployeeFormOptions {
  /** 表单模式 */
  mode: FormMode;
  /** 编辑模式下的初始员工数据 */
  initialEmployee?: EmployeeBasicInfo;
  /** 是否启用实时验证 */
  enableRealtimeValidation?: boolean;
  /** 自定义验证规则 */
  customValidators?: Partial<Record<keyof EmployeeFormData, (value: any) => string | undefined>>;
  /** 成功回调 */
  onSuccess?: (employee: any) => void;
  /** 错误回调 */
  onError?: (error: any) => void;
}

/**
 * 身份证号验证
 */
function validateIdNumber(idNumber: string): boolean {
  // 简化的身份证号验证规则
  const idRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
  return idRegex.test(idNumber);
}

/**
 * 邮箱验证
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 手机号验证
 */
function validateMobile(mobile: string): boolean {
  const mobileRegex = /^1[3-9]\d{9}$/;
  return mobileRegex.test(mobile);
}

/**
 * 员工表单管理Hook
 * 集成表单状态、验证、提交等功能
 */
export function useEmployeeForm(options: EmployeeFormOptions) {
  const {
    mode,
    initialEmployee,
    enableRealtimeValidation = true,
    customValidators = {},
    onSuccess,
    onError
  } = options;

  // 获取依赖数据
  const { actions: employeeActions, loading: employeeLoading } = useEmployeeList();
  const { departments, loading: departmentLoading } = useDepartments();
  // Temporarily disabled - hooks moved to archived
  // const { positions, loading: positionLoading } = usePositions();
  // const { categories, loading: categoryLoading } = usePersonnelCategories();
  const positions: any[] = [];
  const categories: any[] = [];
  const positionLoading = false;
  const categoryLoading = false;
  
  // 适配loading状态
  const isDepartmentsLoading = departmentLoading;
  const isPositionsLoading = positionLoading;
  const isCategoriesLoading = categoryLoading;

  // 表单数据状态
  const [formData, setFormData] = useState<EmployeeFormData>({
    employment_status: 'active', // 默认状态
    gender: 'male', // 默认性别
    hire_date: new Date().toISOString().split('T')[0], // 默认今天
  });

  // 验证错误状态
  const [validation, setValidation] = useState<ValidationErrors>({});

  // 表单是否被修改过
  const [isDirty, setIsDirty] = useState(false);

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (mode === 'edit' && initialEmployee) {
      setFormData({
        employee_name: initialEmployee.employee_name,
        id_number: initialEmployee.id_number,
        gender: initialEmployee.gender as 'male' | 'female' | 'other' | undefined,
        date_of_birth: initialEmployee.date_of_birth,
        hire_date: initialEmployee.hire_date,
        employment_status: initialEmployee.employment_status as 'active' | 'inactive' | undefined,
        mobile_phone: initialEmployee.mobile_phone,
        email: initialEmployee.email,
        work_email: initialEmployee.work_email,
        personal_email: initialEmployee.personal_email,
        department_id: initialEmployee.department_id,
        position_id: initialEmployee.position_id,
        category_id: initialEmployee.category_id,
      });
      setIsDirty(false);
    }
  }, [mode, initialEmployee]);

  // 更新表单数据
  const updateFormData = useCallback((
    field: keyof EmployeeFormData,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    setIsDirty(true);

    // 实时验证
    if (enableRealtimeValidation) {
      validateField(field, value);
    }
  }, [enableRealtimeValidation]);

  // 批量更新表单数据
  const updateMultipleFields = useCallback((updates: Partial<EmployeeFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));

    setIsDirty(true);

    // 实时验证所有更新的字段
    if (enableRealtimeValidation) {
      Object.entries(updates).forEach(([field, value]) => {
        validateField(field as keyof EmployeeFormData, value);
      });
    }
  }, [enableRealtimeValidation]);

  // 验证单个字段
  const validateField = useCallback((
    field: keyof EmployeeFormData,
    value: any
  ) => {
    let error: string | undefined;

    // 自定义验证器
    if (customValidators[field]) {
      error = customValidators[field]!(value);
      if (error) {
        setValidation(prev => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 内置验证规则
    switch (field) {
      case 'employee_name':
        if (!value || value.trim() === '') {
          error = '员工姓名是必填项';
        } else if (value.length < 2) {
          error = '员工姓名至少需要2个字符';
        } else if (value.length > 50) {
          error = '员工姓名不能超过50个字符';
        }
        break;

      case 'id_number':
        if (!value || value.trim() === '') {
          error = '身份证号是必填项';
        } else if (!validateIdNumber(value)) {
          error = '身份证号格式不正确';
        }
        break;

      case 'gender':
        if (!value) {
          error = '请选择性别';
        }
        break;

      case 'date_of_birth':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          
          if (birthDate > today) {
            error = '出生日期不能晚于今天';
          } else if (age < 16) {
            error = '员工年龄不能小于16岁';
          } else if (age > 65) {
            error = '员工年龄不能大于65岁';
          }
        }
        break;

      case 'hire_date':
        if (!value) {
          error = '入职日期是必填项';
        } else {
          const hireDate = new Date(value);
          const today = new Date();
          
          if (hireDate > today) {
            error = '入职日期不能晚于今天';
          }
        }
        break;

      case 'mobile_phone':
        if (value && !validateMobile(value)) {
          error = '手机号格式不正确';
        }
        break;

      case 'email':
      case 'work_email':
      case 'personal_email':
        if (value && !validateEmail(value)) {
          error = '邮箱格式不正确';
        }
        break;

      default:
        break;
    }

    // 更新验证状态
    setValidation(prev => ({
      ...prev,
      [field]: error
    }));

    return !error;
  }, [customValidators]);

  // 验证整个表单
  const validateForm = useCallback((): boolean => {
    const requiredFields: (keyof EmployeeFormData)[] = [
      'employee_name',
      'id_number',
      'gender',
      'hire_date'
    ];

    let isValid = true;
    const newValidation: ValidationErrors = {};

    // 验证必填字段
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newValidation[field] = '此字段为必填项';
        isValid = false;
      } else {
        // 验证字段格式
        if (!validateField(field, formData[field])) {
          isValid = false;
        }
      }
    });

    // 验证可选字段（如果有值的话）
    Object.keys(formData).forEach(key => {
      const field = key as keyof EmployeeFormData;
      if (!requiredFields.includes(field) && formData[field]) {
        if (!validateField(field, formData[field])) {
          isValid = false;
        }
      }
    });

    setValidation(newValidation);
    return isValid;
  }, [formData, validateField]);

  // 提交表单
  const submitForm = useCallback(async () => {
    if (!validateForm()) {
      return { success: false, error: '表单验证失败，请检查输入内容' };
    }

    try {
      if (mode === 'create') {
        // 确保表单数据符合CreateEmployeeRequest类型
        const createData: CreateEmployeeRequest = {
          employee_name: formData.employee_name!,
          hire_date: formData.hire_date!,
          id_number: formData.id_number,
          employment_status: formData.employment_status,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          mobile_phone: formData.mobile_phone,
          email: formData.email,
          work_email: formData.work_email,
          personal_email: formData.personal_email,
        };
        
        await employeeActions.create(createData);
        
        // 重置表单
        setFormData({
          employment_status: 'active',
          gender: 'male',
          hire_date: new Date().toISOString().split('T')[0],
        });
        setValidation({});
        setIsDirty(false);
        
        onSuccess?.({ ...formData });
        return { success: true, message: '员工创建成功' };
        
      } else if (mode === 'edit' && initialEmployee) {
        await employeeActions.update({
          employeeId: initialEmployee.employee_id,
          updates: formData as Partial<CreateEmployeeRequest>
        });
        
        setIsDirty(false);
        onSuccess?.({ ...formData });
        return { success: true, message: '员工更新成功' };
      }
      
    } catch (error) {
      onError?.(error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    return { success: false, error: '未知错误' };
  }, [
    formData, 
    mode, 
    initialEmployee, 
    validateForm, 
    employeeActions, 
    onSuccess, 
    onError
  ]);

  // 重置表单
  const resetForm = useCallback(() => {
    if (mode === 'create') {
      setFormData({
        employment_status: 'active',
        gender: 'male',
        hire_date: new Date().toISOString().split('T')[0],
      });
    } else if (initialEmployee) {
      setFormData({
        employee_name: initialEmployee.employee_name,
        id_number: initialEmployee.id_number,
        gender: initialEmployee.gender as 'male' | 'female' | 'other' | undefined,
        date_of_birth: initialEmployee.date_of_birth,
        hire_date: initialEmployee.hire_date,
        employment_status: initialEmployee.employment_status as 'active' | 'inactive' | undefined,
        mobile_phone: initialEmployee.mobile_phone,
        email: initialEmployee.email,
        work_email: initialEmployee.work_email,
        personal_email: initialEmployee.personal_email,
        department_id: initialEmployee.department_id,
        position_id: initialEmployee.position_id,
        category_id: initialEmployee.category_id,
      });
    }
    
    setValidation({});
    setIsDirty(false);
  }, [mode, initialEmployee]);

  // 是否正在加载选项数据
  const isLoadingOptions = isDepartmentsLoading || isPositionsLoading || isCategoriesLoading;

  // 是否正在提交
  const isSubmitting = employeeLoading.isCreating || employeeLoading.isUpdating;

  // 表单是否有效
  const isFormValid = useMemo(() => {
    return Object.keys(validation).length === 0 && 
           formData.employee_name && 
           formData.id_number && 
           formData.gender && 
           formData.hire_date;
  }, [validation, formData]);

  return {
    // 表单数据
    formData,
    
    // 验证状态
    validation,
    isFormValid,
    
    // 表单状态
    isDirty,
    isSubmitting,
    isLoadingOptions,
    
    // 选项数据
    options: {
      departments,
      positions,
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        level: cat.level,
        parent_id: cat.parent_id
      }))
    },
    
    // 操作函数
    actions: {
      updateField: updateFormData,
      updateMultipleFields,
      validateField,
      validateForm,
      submitForm,
      resetForm
    }
  };
}