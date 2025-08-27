# 薪资系统批量查询性能优化

## 概述

本文档详细说明了薪资系统中批量查询优化的实现方案，用于解决循环查询导致的性能问题。

## 问题背景

### 原有性能问题

在优化前，系统存在以下性能问题：

1. **N+1查询问题**：在显示多个薪资记录时，每个记录都会触发独立的查询
2. **重复查询**：相同的数据被多次查询，没有有效的缓存机制
3. **网络开销大**：大量小查询造成不必要的网络往返时间

### 具体场景

```typescript
// ❌ 问题代码示例：循环查询
const payrollIds = ['id1', 'id2', 'id3', ...]; // N个ID

payrollIds.map(id => {
  const { data: details } = usePayrollDetails(id);     // N次查询
  const { data: insurance } = useEmployeeInsurance(id); // N次查询
  return <PayrollCard key={id} details={details} insurance={insurance} />;
});
// 总计：2N次查询，随着记录数量线性增长
```

## 优化方案

### 1. 批量查询Hook设计

创建专门的批量查询Hook来替代单独查询：

```typescript
// ✅ 优化后：批量查询
const { data: batchDetails } = useBatchPayrollDetails(payrollIds);    // 1次查询
const { data: batchInsurance } = useBatchEmployeeInsurance(payrollIds); // 1次查询
// 总计：2次查询，不随记录数量增长
```

### 2. 核心Hook实现

#### useBatchPayrollDetails

```typescript
export const useBatchPayrollDetails = (payrollIds: string[]) => {
  const sortedIds = useMemo(() => 
    payrollIds.filter(id => id && typeof id === 'string').sort(),
    [payrollIds]
  );

  return useQuery({
    queryKey: batchPayrollQueryKeys.details(sortedIds),
    queryFn: async () => {
      if (!sortedIds.length) return {};

      // 单个批量查询替代多个单独查询
      const { data, error } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .in('payroll_id', sortedIds)  // 关键：使用 .in() 批量查询
        .not('item_id', 'is', null)
        .order('payroll_id')
        .order('category')
        .order('component_name');

      // 按薪资ID分组返回结果
      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.payroll_id]) {
          acc[item.payroll_id] = [];
        }
        acc[item.payroll_id].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      return grouped;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
```

### 3. 智能批量查询管理器

对于大量数据，提供智能分批处理：

```typescript
export const useSmartBatchPayroll = (config: {
  payrollIds: string[];
  batchSize?: number; // 默认50
}) => {
  const shouldUseBatching = config.payrollIds.length > config.batchSize;
  
  // 自动分批处理，避免单次查询过大
  if (shouldUseBatching) {
    // 分批查询并合并结果
  }
  
  return combinedData;
};
```

## 预定义配置

为不同使用场景提供优化配置：

```typescript
export const BATCH_QUERY_CONFIGS = {
  // 薪资列表页面：只需汇总信息
  PAYROLL_LIST: {
    includeDetails: false,
    includeSummary: true,
    includeInsurance: false,
    batchSize: 100,
  },
  
  // 薪资详情页面：需要完整信息
  PAYROLL_DETAIL: {
    includeDetails: true,
    includeSummary: true,
    includeInsurance: true,
    batchSize: 20,
  },
  
  // 薪资导出：需要完整数据
  PAYROLL_EXPORT: {
    includeDetails: true,
    includeSummary: true,
    includeInsurance: true,
    batchSize: 50,
  }
};
```

## 实际应用示例

### 组件优化前后对比

#### 优化前 (PayrollDetailModal)

```typescript
// ❌ 单独查询，性能差
const { data: insuranceDetails } = useEmployeeInsuranceDetails(payrollId);
const { data: payrollDetails } = usePayrollDetails(payrollId);
```

#### 优化后 (PayrollDetailModal)

```typescript
// ✅ 批量查询，性能优化
const payrollIds = payrollId ? [payrollId] : [];
const { data: batchDetails } = useBatchPayrollDetails(payrollIds);
const { data: batchInsurance } = useBatchEmployeeInsurance(payrollIds);

// 从批量结果提取单个记录数据
const payrollDetails = payrollId ? batchDetails?.[payrollId] || [] : [];
const insuranceDetails = payrollId ? batchInsurance?.[payrollId] || [] : [];
```

### 多记录场景

```typescript
// 处理多个薪资记录的列表页面
function PayrollListComponent({ payrollIds }: { payrollIds: string[] }) {
  const { data: batchData } = useBatchPayrollComplete(payrollIds);
  
  return (
    <div>
      {payrollIds.map(id => (
        <PayrollCard 
          key={id}
          summary={batchData.summary.get(id)}
          details={batchData.details[id] || []}
          insurance={batchData.insurance[id] || []}
        />
      ))}
    </div>
  );
}
```

## 性能提升数据

### 查询次数对比

| 记录数量 | 优化前查询次数 | 优化后查询次数 | 性能提升 |
|---------|---------------|---------------|---------|
| 10条    | 20次          | 3次           | 85%     |
| 50条    | 100次         | 3次           | 97%     |
| 100条   | 200次         | 3次           | 98.5%   |

### 网络请求时间

- **优化前**：50条记录 ≈ 100次请求 × 50ms = 5000ms
- **优化后**：50条记录 ≈ 3次请求 × 50ms = 150ms
- **时间节省**：96.7%

## 缓存策略

### React Query缓存配置

```typescript
{
  staleTime: 5 * 60 * 1000,    // 5分钟内认为数据新鲜
  cacheTime: 10 * 60 * 1000,   // 10分钟缓存时间
}
```

### 查询键策略

```typescript
export const batchPayrollQueryKeys = {
  details: (payrollIds: string[]) => 
    ['batch-payroll', 'details', payrollIds.sort().join(',')],
  // 排序确保查询键稳定性，提高缓存命中率
};
```

## 迁移指南

### 1. 更新Import语句

```typescript
// 替换单独查询
import { usePayrollDetails, useEmployeeInsuranceDetails } from '@/hooks/payroll';

// 使用批量查询
import { useBatchPayrollDetails, useBatchEmployeeInsurance } from '@/hooks/payroll';
```

### 2. 修改Hook调用

```typescript
// 旧方式
const { data: details } = usePayrollDetails(payrollId);

// 新方式
const payrollIds = payrollId ? [payrollId] : [];
const { data: batchData } = useBatchPayrollDetails(payrollIds);
const details = payrollId ? batchData?.[payrollId] || [] : [];
```

### 3. 数据结构适配

批量查询返回的数据结构为 `Record<string, T[]>`，需要按payrollId提取数据。

## 最佳实践

### 1. 合理设置批量大小

```typescript
const RECOMMENDED_BATCH_SIZES = {
  mobile: 20,      // 移动端网络较慢
  desktop: 50,     // 桌面端正常
  export: 100,     // 导出场景可以更大
};
```

### 2. 错误处理

```typescript
const { data, isLoading, isError, error } = useBatchPayrollDetails(payrollIds);

if (isError) {
  // 批量查询失败时的降级策略
  console.error('批量查询失败:', error);
  // 可以考虑逐个查询作为后备方案
}
```

### 3. Loading状态管理

```typescript
// 批量查询的加载状态更简单
const isAnyLoading = batchQuery.isLoading;

// 而不是多个loading状态
const isLoading = query1.isLoading || query2.isLoading || query3.isLoading;
```

## 监控和调试

### 1. 开发环境调试

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(`批量查询 ${payrollIds.length} 条记录，预计节省 ${payrollIds.length * 2 - 3} 次请求`);
}
```

### 2. React DevTools

使用React Query DevTools监控查询状态和缓存命中率。

## 总结

通过实施批量查询优化：

1. **显著提升性能**：查询次数减少90%以上
2. **改善用户体验**：减少加载时间和网络等待
3. **降低服务器负载**：减少数据库查询压力
4. **简化状态管理**：统一的加载和错误状态
5. **提高可维护性**：集中的查询逻辑，便于优化和调试

这种优化方法可以应用到其他类似的批量数据查询场景中，是一个可复用的性能优化模式。