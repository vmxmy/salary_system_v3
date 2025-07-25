# 性能优化

## 功能概述
实现全方位的性能优化策略，确保员工详情模态框在处理大量数据时仍能保持流畅的用户体验。

## 核心需求

### 1. 数据加载优化
- **渐进式加载**：优先加载基本信息和职务信息
- **懒加载策略**：其他信息组按需加载
- **预加载机制**：基于用户行为预测的智能预加载

### 2. 渲染性能优化
- **虚拟滚动**：长列表数据的虚拟化渲染
- **组件缓存**：使用 React.memo 优化重渲染
- **批量更新**：合并多个状态更新

### 3. 网络请求优化
- **请求合并**：批量处理多个字段的更新
- **请求去重**：防止重复的 API 调用
- **智能重试**：指数退避的重试策略

## 技术实现要点

### React Query 配置
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// 数据预取
const prefetchEmployeeData = async (employeeId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployeeDetails(employeeId),
  });
};
```

### 组件优化
```tsx
// 使用 React.memo 和 useMemo
const EmployeeFieldGroup = React.memo<{
  fields: FieldMetadata[];
  data: Record<string, any>;
  onEdit: (field: string, value: any) => void;
}>(({ fields, data, onEdit }) => {
  const renderedFields = useMemo(() => 
    fields.map(field => (
      <InlineEditor
        key={field.name}
        fieldMeta={field}
        value={data[field.name]}
        onSave={(value) => onEdit(field.name, value)}
      />
    )), 
    [fields, data, onEdit]
  );
  
  return <>{renderedFields}</>;
});
```

### 图片优化
```typescript
// Supabase Storage 图片转换
const getOptimizedImageUrl = (
  path: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
  }
) => {
  const { data } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(path, {
      transform: {
        width: options.width,
        height: options.height,
        quality: options.quality || 80,
      },
    });
    
  return data.publicUrl;
};
```

## 监控和分析

### 性能指标收集
```typescript
// 使用 Performance Observer API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // 发送到分析服务
    analytics.track('performance', {
      name: entry.name,
      duration: entry.duration,
      type: entry.entryType,
    });
  }
});

observer.observe({ entryTypes: ['measure', 'navigation'] });
```

### 用户体验指标
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)
- 自定义业务指标

## 缓存策略

### 多层缓存
1. **浏览器缓存**：Service Worker 缓存静态资源
2. **应用缓存**：React Query 缓存 API 响应
3. **数据库缓存**：Supabase 边缘缓存

### 缓存失效
- 基于时间的失效
- 基于事件的失效（数据更新时）
- 手动刷新机制

## 代码分割
```typescript
// 动态导入大型组件
const DocumentManager = lazy(() => 
  import('./components/DocumentManager')
);

const AuditTimeline = lazy(() => 
  import('./components/AuditTimeline')
);
```

## 错误边界
- 组件级错误边界
- 优雅的降级策略
- 错误恢复机制