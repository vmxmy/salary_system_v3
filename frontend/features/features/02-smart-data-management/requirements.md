# 智能数据管理层

## 功能概述
利用 Supabase 的高级查询能力和 RLS 策略，实现高效的数据获取、缓存和权限管理。

## 核心需求

### 1. 优化的数据获取
- 单次查询获取所有相关数据
- 利用数据库视图简化查询
- 实现智能的预加载策略

### 2. 增量更新策略
- 只更新变更的字段
- 批量更新优化
- 实现乐观更新机制

### 3. RLS 权限集成
- 基于用户角色的字段可见性
- 敏感数据的自动脱敏
- 编辑权限的细粒度控制

## 技术实现要点

### 数据获取策略
```typescript
// 一次性获取所有员工相关数据
const fetchEmployeeDetails = async (employeeId: string) => {
  const { data, error } = await supabase
    .from('view_employee_basic_info')
    .select(`
      *,
      employee_education!left(*),
      employee_job_history!left(
        *,
        departments(name),
        positions(name),
        job_ranks(name)
      ),
      employee_bank_accounts!left(*),
      employee_documents!left(*),
      employee_contribution_bases!left(*),
      employee_special_deductions!left(*)
    `)
    .eq('employee_id', employeeId)
    .single();
    
  return data;
};
```

### 增量更新实现
```typescript
// 智能字段更新
const updateEmployeeField = async (
  employeeId: string, 
  fieldName: string, 
  value: any,
  tableName: string = 'employees'
) => {
  const updates = { [fieldName]: value };
  
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('employee_id', employeeId)
    .select()
    .single();
    
  return { data, error };
};
```

## 缓存策略
- 使用 React Query 进行客户端缓存
- 实现智能的缓存失效策略
- 支持离线模式

## 权限管理
- 创建 RLS 策略确保数据安全
- 实现前端权限检查辅助函数
- 动态显示/隐藏敏感字段