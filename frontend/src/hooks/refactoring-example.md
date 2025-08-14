# Hook 重构示例：遵循开发规范

## 现有实现问题分析

### 当前 `useEmployees.ts` 的问题：
1. Hook职责过多（包含员工、部门、职位、人员类别等）
2. 依赖Service层处理业务逻辑
3. 缺少统一的状态管理模式

## 重构方案

### 1. 拆分为单一职责的Hook

```typescript
// hooks/employee/useEmployeeList.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

/**
 * 员工列表管理Hook
 * 职责：处理员工列表的CRUD操作
 */
export function useEmployeeList() {
  const queryClient = useQueryClient();
  
  // 状态管理 - 更细粒度的加载状态
  const [loadingState, setLoadingState] = useState({
    isInitialLoading: true,
    isRefetching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false
  });

  // 数据获取
  const {
    data: rawData,
    isLoading,
    isRefetching,
    error
  } = useQuery({
    queryKey: ['employees', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .order('employee_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: false
  });

  // 数据转换 - 在Hook中处理，不依赖Service
  const employees = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.map(emp => ({
      id: emp.employee_id,
      name: emp.employee_name,
      department: emp.department_name,
      position: emp.position_name,
      status: emp.employment_status,
      hireDate: emp.hire_date,
      // ... 其他字段映射
    }));
  }, [rawData]);

  // 创建员工
  const createEmployee = useMutation({
    mutationFn: async (newEmployee: CreateEmployeeData) => {
      setLoadingState(prev => ({ ...prev, isCreating: true }));
      
      // 直接在Hook中处理业务逻辑
      const { data, error } = await supabase
        .from('employees')
        .insert({
          employee_name: newEmployee.name,
          id_number: newEmployee.idNumber,
          hire_date: newEmployee.hireDate,
          // ... 其他字段
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setLoadingState(prev => ({ ...prev, isCreating: false }));
    },
    onError: (error) => {
      setLoadingState(prev => ({ ...prev, isCreating: false }));
      // 统一错误处理
      handleError(error);
    }
  });

  // 更新员工
  const updateEmployee = useMutation({
    mutationFn: async ({ id, updates }: UpdateEmployeeData) => {
      setLoadingState(prev => ({ ...prev, isUpdating: true }));
      
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setLoadingState(prev => ({ ...prev, isUpdating: false }));
    },
    onError: (error) => {
      setLoadingState(prev => ({ ...prev, isUpdating: false }));
      handleError(error);
    }
  });

  // 删除员工
  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      setLoadingState(prev => ({ ...prev, isDeleting: true }));
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setLoadingState(prev => ({ ...prev, isDeleting: false }));
    },
    onError: (error) => {
      setLoadingState(prev => ({ ...prev, isDeleting: false }));
      handleError(error);
    }
  });

  // 返回值 - 清晰的API
  return {
    // 数据
    employees,
    
    // 状态
    loading: loadingState,
    error,
    
    // 操作函数
    actions: {
      create: createEmployee.mutate,
      update: updateEmployee.mutate,
      delete: deleteEmployee.mutate,
      refresh: () => queryClient.invalidateQueries(['employees'])
    }
  };
}
```

### 2. 独立的部门Hook

```typescript
// hooks/department/useDepartments.ts
export function useDepartments() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000 // 部门数据相对稳定，10分钟缓存
  });

  return {
    departments: data || [],
    isLoading,
    error
  };
}
```

### 3. 独立的职位Hook

```typescript
// hooks/position/usePositions.ts
export function usePositions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000
  });

  return {
    positions: data || [],
    isLoading,
    error
  };
}
```

### 4. 组合Hook - 用于复杂场景

```typescript
// hooks/employee/useEmployeeForm.ts
export function useEmployeeForm() {
  // 组合多个Hook
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const { categories } = usePersonnelCategories();
  const { actions } = useEmployeeList();
  
  // 表单专用的状态管理
  const [formData, setFormData] = useState<EmployeeFormData>({});
  const [validation, setValidation] = useState<ValidationErrors>({});
  
  // 表单验证逻辑
  const validateForm = useCallback(() => {
    const errors: ValidationErrors = {};
    
    if (!formData.name) {
      errors.name = '姓名是必填项';
    }
    
    if (!formData.idNumber) {
      errors.idNumber = '身份证号是必填项';
    } else if (!isValidIdNumber(formData.idNumber)) {
      errors.idNumber = '身份证号格式不正确';
    }
    
    setValidation(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);
  
  // 提交表单
  const submitForm = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      await actions.create(formData);
      // 成功后重置表单
      setFormData({});
      setValidation({});
    } catch (error) {
      // 错误已在Hook中处理
    }
  }, [formData, validateForm, actions]);
  
  return {
    // 表单数据
    formData,
    setFormData,
    
    // 验证
    validation,
    validateForm,
    
    // 选项数据
    options: {
      departments,
      positions,
      categories
    },
    
    // 操作
    submitForm
  };
}
```

### 5. 实时数据同步Hook

```typescript
// hooks/employee/useEmployeeRealtime.ts
export function useEmployeeRealtime() {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('Employee change detected:', payload);
          
          // 根据事件类型更新缓存
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
              queryClient.invalidateQueries(['employees']);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);
  
  return { connectionStatus };
}
```

## 在组件中使用重构后的Hook

```typescript
// pages/employee/EmployeeListPage.tsx
import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
import { useEmployeeRealtime } from '@/hooks/employee/useEmployeeRealtime';

export function EmployeeListPage() {
  // 使用Hook - 代码非常简洁
  const { employees, loading, actions } = useEmployeeList();
  const { connectionStatus } = useEmployeeRealtime();
  
  // 组件只关注UI渲染
  if (loading.isInitialLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      {/* 实时连接状态指示器 */}
      <ConnectionIndicator status={connectionStatus} />
      
      {/* 员工列表 */}
      <EmployeeTable
        data={employees}
        onEdit={(id) => {/* 导航到编辑页面 */}}
        onDelete={actions.delete}
        isDeleting={loading.isDeleting}
      />
      
      {/* 新增按钮 */}
      <Button 
        onClick={() => {/* 打开新增对话框 */}}
        loading={loading.isCreating}
      >
        新增员工
      </Button>
    </div>
  );
}
```

## 重构带来的好处

### 1. **职责单一**
- 每个Hook只负责一个领域
- 易于理解和维护

### 2. **高复用性**
- `useDepartments`可以在任何需要部门数据的地方使用
- `usePositions`可以独立使用

### 3. **组件简洁**
- 组件代码极其简洁
- 只关注UI渲染逻辑

### 4. **易于测试**
```typescript
// hooks/__tests__/useEmployeeList.test.ts
describe('useEmployeeList', () => {
  it('should fetch employees on mount', async () => {
    const { result } = renderHook(() => useEmployeeList());
    
    await waitFor(() => {
      expect(result.current.employees).toHaveLength(10);
    });
  });
  
  it('should create new employee', async () => {
    const { result } = renderHook(() => useEmployeeList());
    
    act(() => {
      result.current.actions.create({
        name: 'John Doe',
        idNumber: '123456'
      });
    });
    
    await waitFor(() => {
      expect(result.current.loading.isCreating).toBe(false);
    });
  });
});
```

### 5. **更好的类型安全**
```typescript
// types/employee.ts
interface UseEmployeeListReturn {
  employees: Employee[];
  loading: LoadingState;
  error: Error | null;
  actions: {
    create: (data: CreateEmployeeData) => void;
    update: (data: UpdateEmployeeData) => void;
    delete: (id: string) => void;
    refresh: () => void;
  };
}
```

## 迁移策略

### 第一阶段：创建新Hook
1. 不删除旧代码
2. 创建新的Hook文件
3. 逐步迁移组件

### 第二阶段：并行运行
1. 新功能使用新Hook
2. 旧功能逐步迁移
3. 保持向后兼容

### 第三阶段：完全迁移
1. 所有组件使用新Hook
2. 删除旧的Service层代码
3. 清理未使用的代码

## 总结

通过这次重构，我们实现了：
1. ✅ **职责分离** - 每个Hook只做一件事
2. ✅ **直接数据访问** - 不再依赖复杂的Service层
3. ✅ **统一的模式** - 所有Hook遵循相同的结构
4. ✅ **更好的可测试性** - 每个Hook可以独立测试
5. ✅ **提高复用性** - Hook可以自由组合使用