# React Hook 重构指南

## 概述

本次重构将原有的大型Hook拆分为单一职责的小Hook，并引入了统一的错误处理和状态管理机制。重构遵循以下原则：

1. **单一职责原则** - 每个Hook只负责一个业务领域
2. **依赖注入** - Hook之间通过组合而非继承
3. **类型安全** - 完整的TypeScript类型定义
4. **向后兼容** - 旧代码可以继续工作，新代码使用新架构

## 架构概览

```
hooks/
├── core/                   # 核心通用Hook
│   ├── useErrorHandler.ts  # 统一错误处理
│   ├── useLoadingState.ts  # 细粒度加载状态管理
│   ├── useResource.ts      # 通用CRUD资源管理
│   └── index.ts
├── employee/               # 员工领域Hook
│   ├── useEmployeeList.ts  # 员工列表管理
│   ├── useEmployeeDetail.ts# 员工详情管理
│   ├── useEmployeeForm.ts  # 员工表单管理
│   └── index.ts
├── department/             # 部门领域Hook
├── position/               # 职位领域Hook
├── category/               # 人员类别领域Hook
└── index.ts               # 统一导出
```

## 核心Hook说明

### useErrorHandler - 统一错误处理

提供应用层面的统一错误处理策略：

```typescript
import { useErrorHandler } from '@/hooks/core';

const { handleError, handleNetworkError, handleValidationError } = useErrorHandler();

// 基础错误处理
handleError(error, {
  showToast: true,
  customMessage: '操作失败',
  reportError: true
});

// 特定场景错误处理
handleNetworkError(error);  // 网络错误
handleValidationError(error); // 验证错误
```

### useLoadingState - 细粒度加载状态

管理多种加载状态：

```typescript
import { useLoadingState } from '@/hooks/core';

const { loadingState, setLoading, withLoading } = useLoadingState();

// 手动控制加载状态
setLoading('isCreating', true);

// 自动包装异步操作
const result = await withLoading('isCreating', async () => {
  return await createEmployee(data);
});

// 访问细粒度状态
console.log(loadingState.isCreating);    // 创建中
console.log(loadingState.isUpdating);    // 更新中
console.log(loadingState.isDeleting);    // 删除中
```

### useResource - 通用资源管理

提供标准的CRUD操作模板：

```typescript
import { useResource } from '@/hooks/core';

const {
  items,
  loading,
  actions,
  utils
} = useResource({
  queryKey: ['employees'],
  tableConfig: {
    tableName: 'employees',
    viewName: 'view_employee_basic_info'
  },
  enableRealtime: true
});

// 标准操作
actions.create(newEmployee);
actions.update({ id, data: updates });
actions.delete(id);
actions.refresh();

// 工具函数
const employee = utils.createUseItem('emp-123');
const filtered = utils.searchItems('john', ['name', 'email']);
```

## 业务Hook说明

### useEmployeeList - 员工列表管理

专注于员工列表的CRUD操作：

```typescript
import { useEmployeeList } from '@/hooks/employee';

const {
  employees,         // 员工数据
  statistics,        // 统计信息
  loading,          // 细粒度加载状态
  actions,          // CRUD操作
  utils            // 数据处理工具
} = useEmployeeList();

// CRUD操作
actions.create(employeeData);
actions.update({ employeeId, updates });
actions.delete(employeeId);
actions.batchDelete([id1, id2, id3]);

// 数据处理
const filtered = utils.filterEmployees(employees, {
  search: 'john',
  department: 'IT',
  employment_status: 'active'
});

const sorted = utils.sortEmployees(employees, {
  field: 'employee_name',
  order: 'asc'
});
```

### useEmployeeDetail - 员工详情管理

管理单个员工的详细信息：

```typescript
import { useEmployeeDetail } from '@/hooks/employee';

const {
  employee,         // 员工基本信息
  bankAccounts,     // 银行账户
  education,        // 教育背景
  loading,         // 加载状态
  actions          // 操作函数
} = useEmployeeDetail(employeeId);

// 更新基本信息
actions.updateBasicInfo({
  employee_name: 'New Name',
  email: 'new@email.com'
});

// 银行账户管理
actions.addBankAccount(bankAccountData);
actions.updateBankAccount({ accountId, updates });
actions.deleteBankAccount(accountId);
```

### useEmployeeForm - 员工表单管理

专门用于员工表单的状态管理和验证：

```typescript
import { useEmployeeForm } from '@/hooks/employee';

const {
  formData,        // 表单数据
  validation,      // 验证错误
  isFormValid,     // 表单是否有效
  options,         // 选项数据（部门、职位等）
  actions          // 操作函数
} = useEmployeeForm({
  mode: 'create',
  onSuccess: (employee) => {
    console.log('员工创建成功:', employee);
  }
});

// 更新表单字段
actions.updateField('employee_name', 'John Doe');

// 批量更新
actions.updateMultipleFields({
  employee_name: 'John Doe',
  email: 'john@example.com'
});

// 提交表单
const result = await actions.submitForm();
if (result.success) {
  // 处理成功
}
```

## Hook组合模式

新架构支持Hook之间的自由组合：

```typescript
// 组合多个Hook实现复杂功能
function useEmployeeManagement() {
  const { employees, actions: listActions } = useEmployeeList();
  const { departments } = useDepartments();
  const { positions } = usePositions();
  
  return {
    employees,
    departments,
    positions,
    createEmployeeWithAssignment: async (employeeData, assignmentData) => {
      // 组合多个操作
      const employee = await listActions.create(employeeData);
      // ... 其他逻辑
    }
  };
}
```

## 迁移指南

### 从旧Hook迁移

#### useAllEmployees → useEmployeeList

**旧代码:**
```typescript
import { useAllEmployees } from '@/hooks/useEmployees';

const { data: employees, isLoading, error, refetch } = useAllEmployees();
```

**新代码:**
```typescript
import { useEmployeeList } from '@/hooks';

const { 
  employees, 
  loading: { isInitialLoading }, 
  error, 
  actions: { refresh } 
} = useEmployeeList();
```

#### useEmployee → useEmployeeDetail

**旧代码:**
```typescript
import { useEmployee } from '@/hooks/useEmployees';

const { data: employee, isLoading } = useEmployee(employeeId);
```

**新代码:**
```typescript
import { useEmployeeDetail } from '@/hooks';

const { employee, loading: { isLoading } } = useEmployeeDetail(employeeId);
```

#### 创建操作

**旧代码:**
```typescript
import { useCreateEmployee } from '@/hooks/useEmployees';

const createMutation = useCreateEmployee();
createMutation.mutate(employeeData);
```

**新代码:**
```typescript
import { useEmployeeList } from '@/hooks';

const { actions } = useEmployeeList();
actions.create(employeeData);
```

### 错误处理迁移

**旧代码:**
```typescript
try {
  await createEmployee(data);
  showToast({ type: 'success', message: '创建成功' });
} catch (error) {
  showToast({ type: 'error', message: error.message });
}
```

**新代码:**
```typescript
import { useEmployeeList } from '@/hooks';

const { actions } = useEmployeeList();
// 错误处理自动集成，无需手动处理
actions.create(data);
```

### 加载状态迁移

**旧代码:**
```typescript
const [isCreating, setIsCreating] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);

const createEmployee = async (data) => {
  setIsCreating(true);
  try {
    // ... 操作
  } finally {
    setIsCreating(false);
  }
};
```

**新代码:**
```typescript
import { useEmployeeList } from '@/hooks';

const { loading, actions } = useEmployeeList();

// 加载状态自动管理
console.log(loading.isCreating);  // 创建中
console.log(loading.isUpdating);  // 更新中

actions.create(data); // 自动管理isCreating状态
```

## 在组件中使用

### 员工列表页面

```typescript
import { useEmployeeList, useFilteredEmployeeList } from '@/hooks';

export function EmployeeListPage() {
  const { 
    employees, 
    loading, 
    actions, 
    statistics 
  } = useFilteredEmployeeList(
    { 
      search: searchTerm, 
      department: selectedDepartment 
    },
    { 
      field: 'employee_name', 
      order: 'asc' 
    }
  );

  if (loading.isInitialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="stats">
        <p>总员工数: {statistics.total}</p>
        <p>在职员工: {statistics.active}</p>
      </div>
      
      <EmployeeTable
        data={employees}
        onDelete={actions.delete}
        onBatchDelete={actions.batchDelete}
        isDeleting={loading.isDeleting}
        isBatchProcessing={loading.isBatchProcessing}
      />
    </div>
  );
}
```

### 员工表单页面

```typescript
import { useEmployeeForm } from '@/hooks';

export function EmployeeFormPage({ mode, employeeId }) {
  const {
    formData,
    validation,
    isFormValid,
    options,
    actions
  } = useEmployeeForm({
    mode,
    initialEmployee: mode === 'edit' ? employeeData : undefined,
    onSuccess: (employee) => {
      navigate(`/employees/${employee.id}`);
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      actions.submitForm();
    }}>
      <input
        value={formData.employee_name || ''}
        onChange={(e) => actions.updateField('employee_name', e.target.value)}
        className={validation.employee_name ? 'error' : ''}
      />
      {validation.employee_name && (
        <span className="error">{validation.employee_name}</span>
      )}
      
      <select
        value={formData.department_id || ''}
        onChange={(e) => actions.updateField('department_id', e.target.value)}
      >
        {options.departments.map(dept => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
      
      <button 
        type="submit" 
        disabled={!isFormValid}
      >
        {mode === 'create' ? '创建' : '更新'}
      </button>
    </form>
  );
}
```

## 测试策略

### Hook单元测试

```typescript
import { renderHook, act } from '@testing-library/react';
import { useEmployeeList } from '@/hooks/employee';

describe('useEmployeeList', () => {
  it('should fetch employees on mount', async () => {
    const { result } = renderHook(() => useEmployeeList());
    
    expect(result.current.loading.isInitialLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.employees).toHaveLength(10);
      expect(result.current.loading.isInitialLoading).toBe(false);
    });
  });
  
  it('should create new employee', async () => {
    const { result } = renderHook(() => useEmployeeList());
    
    act(() => {
      result.current.actions.create({
        employee_name: 'John Doe',
        id_number: '123456'
      });
    });
    
    await waitFor(() => {
      expect(result.current.loading.isCreating).toBe(false);
    });
  });
});
```

## 性能考虑

1. **查询缓存** - 使用React Query的缓存机制
2. **数据共享** - 相关Hook共享相同的查询键
3. **按需加载** - 组件按需导入所需的Hook
4. **实时更新** - 可选的Supabase Realtime集成

## 最佳实践

1. **单一职责** - 每个Hook只做一件事
2. **组合优于继承** - 通过组合Hook实现复杂功能
3. **统一的API** - 所有Hook返回一致的结构
4. **错误边界** - 使用useErrorBoundary处理组件级别错误
5. **类型安全** - 始终提供完整的TypeScript类型

## 常见问题

### Q: 为什么要重构Hook？
A: 原有的Hook职责过重，难以测试和维护。新架构遵循单一职责原则，更易于理解和扩展。

### Q: 旧代码还能用吗？
A: 可以。重构保持向后兼容，旧Hook继续可用，但建议逐步迁移到新架构。

### Q: 如何处理Hook之间的依赖？
A: 使用Hook组合模式，通过组合多个小Hook实现复杂功能。

### Q: 错误处理是否统一？
A: 是的。所有新Hook都集成了统一的错误处理机制，无需在组件中手动处理。

### Q: 如何扩展新的功能？
A: 遵循现有的模式，创建新的Hook或扩展现有Hook，保持单一职责原则。