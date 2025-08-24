# 权限系统性能优化指南

## 概述

权限验证 Hook 系统设计时充分考虑了性能优化，通过多层缓存、批量处理、防抖机制等技术手段，确保在大规模应用中的高性能表现。

## 核心性能特性

### 🚀 智能缓存系统

#### 多层缓存架构
```
权限检查请求
    ↓
1. 内存缓存 (LRU策略)
    ↓
2. 会话存储缓存
    ↓
3. 权限管理器缓存
    ↓
4. 数据库查询
```

#### 缓存配置优化
```typescript
const permissionOptions = {
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5分钟，根据业务需求调整
  batchRequests: true,
  debounceMs: 100 // 防抖延迟
};
```

#### 缓存失效策略
- **时间失效**: 设定合理的过期时间
- **事件失效**: 权限变更时主动清理
- **容量失效**: LRU算法自动清理老旧缓存
- **手动失效**: 提供手动清理接口

### ⚡ 批量处理优化

#### 批量权限检查
```typescript
// ❌ 避免：多次单独检查
const canView = hasPermission(PERMISSIONS.EMPLOYEE_VIEW);
const canCreate = hasPermission(PERMISSIONS.EMPLOYEE_CREATE);
const canUpdate = hasPermission(PERMISSIONS.EMPLOYEE_UPDATE);

// ✅ 推荐：批量检查
const permissions = await checkMultiplePermissions([
  PERMISSIONS.EMPLOYEE_VIEW,
  PERMISSIONS.EMPLOYEE_CREATE,
  PERMISSIONS.EMPLOYEE_UPDATE
]);
```

#### 批量资源过滤
```typescript
// ❌ 避免：逐个检查
const accessibleItems = [];
for (const item of items) {
  if (await checkResourcePermission(item.id)) {
    accessibleItems.push(item);
  }
}

// ✅ 推荐：批量过滤
const accessibleIds = await getAccessibleIds(items.map(item => item.id));
const accessibleItems = items.filter(item => accessibleIds.includes(item.id));
```

### 🛡️ 防抖和节流

#### 防抖权限检查
```typescript
// 自动防抖，避免频繁权限检查
const { checkPermission } = useEnhancedPermission({
  debounceMs: 200 // 200ms防抖
});
```

#### 节流实时更新
```typescript
// 权限变更通知节流处理
const handlePermissionChange = throttle((event) => {
  // 处理权限变更
}, 1000); // 1秒最多执行一次
```

## 性能最佳实践

### 1. Hook 使用优化

#### ✅ 正确的使用方式
```typescript
function EmployeeList() {
  // 在组件顶层使用 hook，启用缓存
  const { hasPermission } = useEnhancedPermission({
    enableCache: true,
    cacheTimeout: 10 * 60 * 1000 // 10分钟
  });

  const canViewEmployee = hasPermission(PERMISSIONS.EMPLOYEE_VIEW);

  return (
    <div>
      {canViewEmployee && <EmployeeTable />}
    </div>
  );
}
```

#### ❌ 避免的使用方式
```typescript
function EmployeeList() {
  return (
    <div>
      {/* 避免在渲染中创建新的 hook 实例 */}
      {useEnhancedPermission().hasPermission(PERMISSIONS.EMPLOYEE_VIEW) && (
        <EmployeeTable />
      )}
    </div>
  );
}
```

### 2. 权限守卫优化

#### ✅ 高效的守卫使用
```typescript
// 在顶级路由使用权限守卫
function App() {
  return (
    <Routes>
      <Route path="/employees" element={
        <RequirePermission permission={PERMISSIONS.EMPLOYEE_VIEW}>
          <EmployeePage />
        </RequirePermission>
      } />
    </Routes>
  );
}

// 在页面内部使用具体的权限检查
function EmployeePage() {
  const { hasPermission } = useEnhancedPermission();
  
  return (
    <div>
      <EmployeeList />
      {hasPermission(PERMISSIONS.EMPLOYEE_CREATE) && <CreateButton />}
    </div>
  );
}
```

#### ❌ 避免过度嵌套
```typescript
// 避免多层嵌套权限守卫
function OverNestedExample() {
  return (
    <RequirePermission permission={PERMISSIONS.EMPLOYEE_VIEW}>
      <RequirePermission permission={PERMISSIONS.EMPLOYEE_CREATE}>
        <RequirePermission permission={PERMISSIONS.EMPLOYEE_UPDATE}>
          {/* 过度嵌套，影响性能和可读性 */}
          <Component />
        </RequirePermission>
      </RequirePermission>
    </RequirePermission>
  );
}
```

### 3. 缓存策略优化

#### 合理设置缓存时间
```typescript
// 根据权限变更频率设置缓存时间
const cacheConfig = {
  // 基础权限：长时间缓存
  basicPermissions: 30 * 60 * 1000, // 30分钟
  
  // 资源权限：中等缓存时间
  resourcePermissions: 10 * 60 * 1000, // 10分钟
  
  // 临时权限：短时间缓存
  temporaryPermissions: 1 * 60 * 1000, // 1分钟
};
```

#### 主动缓存管理
```typescript
function useOptimizedPermissions() {
  const { clearCache, invalidatePermission } = useEnhancedPermission();

  // 用户登录时预热缓存
  const preloadPermissions = useCallback(async () => {
    const commonPermissions = [
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.PAYROLL_VIEW,
      PERMISSIONS.REPORT_VIEW
    ];
    
    await checkMultiplePermissions(commonPermissions);
  }, []);

  // 权限变更时清理相关缓存
  const handlePermissionChange = useCallback((changedPermission: Permission) => {
    invalidatePermission(changedPermission);
    
    // 清理相关权限的缓存
    const relatedPermissions = getRelatedPermissions(changedPermission);
    relatedPermissions.forEach(p => invalidatePermission(p));
  }, [invalidatePermission]);

  return { preloadPermissions, handlePermissionChange };
}
```

### 4. 实时更新优化

#### 选择性订阅
```typescript
// 只订阅必要的权限变更
const { subscribe } = useEnhancedPermission();

useEffect(() => {
  const unsubscribe = subscribe({
    userId: user.id,
    permissions: [PERMISSIONS.EMPLOYEE_VIEW], // 只订阅特定权限
    onPermissionChange: handleChange
  });
  
  return unsubscribe;
}, [user.id]);
```

#### 订阅管理优化
```typescript
// 使用订阅池管理多个订阅
class PermissionSubscriptionPool {
  private subscriptions = new Map<string, () => void>();
  
  subscribe(key: string, config: PermissionSubscriptionConfig) {
    // 避免重复订阅
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!();
    }
    
    const unsubscribe = permissionManager.subscribe(config);
    this.subscriptions.set(key, unsubscribe);
    
    return () => {
      this.subscriptions.delete(key);
      unsubscribe();
    };
  }
}
```

## 性能监控

### 性能指标监控

```typescript
// 权限检查性能监控
class PermissionPerformanceMonitor {
  private metrics = {
    cacheHitRate: 0,
    averageCheckTime: 0,
    totalChecks: 0,
    slowChecks: 0 // 超过100ms的检查
  };

  recordPermissionCheck(startTime: number, fromCache: boolean) {
    const duration = Date.now() - startTime;
    
    this.metrics.totalChecks++;
    
    if (fromCache) {
      this.metrics.cacheHitRate = 
        (this.metrics.cacheHitRate * (this.metrics.totalChecks - 1) + 1) / 
        this.metrics.totalChecks;
    }
    
    this.metrics.averageCheckTime = 
      (this.metrics.averageCheckTime * (this.metrics.totalChecks - 1) + duration) / 
      this.metrics.totalChecks;
    
    if (duration > 100) {
      this.metrics.slowChecks++;
      console.warn(`Slow permission check detected: ${duration}ms`);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

### 开发环境性能调试

```typescript
// 开发环境下的性能调试工具
if (process.env.NODE_ENV === 'development') {
  const originalCheckPermission = permissionManager.checkPermission;
  
  permissionManager.checkPermission = async function(permission, context) {
    const startTime = performance.now();
    const result = await originalCheckPermission.call(this, permission, context);
    const duration = performance.now() - startTime;
    
    console.log(`Permission check: ${permission} took ${duration.toFixed(2)}ms`, {
      permission,
      allowed: result.allowed,
      fromCache: duration < 5, // 假设小于5ms的是缓存命中
      context
    });
    
    return result;
  };
}
```

## 内存优化

### 缓存大小控制

```typescript
const cacheConfig = {
  maxCacheSize: 1000, // 最大缓存条目数
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB内存限制
  cleanupInterval: 5 * 60 * 1000, // 5分钟清理一次
};
```

### 内存泄漏预防

```typescript
// 组件卸载时清理订阅
function usePermissionWithCleanup() {
  const subscription = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    return () => {
      // 组件卸载时清理订阅
      if (subscription.current) {
        subscription.current();
      }
    };
  }, []);
  
  const subscribe = useCallback((config) => {
    if (subscription.current) {
      subscription.current();
    }
    subscription.current = permissionManager.subscribe(config);
  }, []);
  
  return { subscribe };
}
```

## 网络优化

### 减少网络请求

```typescript
// 预取常用权限数据
const preloadCommonPermissions = async () => {
  const commonPermissions = [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.REPORT_VIEW
  ];
  
  // 批量检查并缓存
  await permissionManager.checkMultiplePermissions(commonPermissions);
};

// 在应用启动时预取
useEffect(() => {
  if (user) {
    preloadCommonPermissions();
  }
}, [user]);
```

### 增量更新

```typescript
// 只同步变更的权限
const handlePermissionUpdate = (changes: PermissionChange[]) => {
  changes.forEach(change => {
    if (change.type === 'permission_revoked') {
      permissionManager.invalidatePermission(change.permission);
    } else if (change.type === 'permission_granted') {
      // 更新缓存而不是清理
      permissionManager.setCachedResult(change.permission, {
        allowed: true,
        reason: 'Permission granted'
      });
    }
  });
};
```

## 性能测试

### 基准测试

```typescript
// 权限系统基准测试
async function benchmarkPermissionSystem() {
  const permissions = Object.values(PERMISSIONS);
  const iterations = 1000;
  
  console.log('Starting permission system benchmark...');
  
  // 测试单个权限检查
  const singleCheckStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await permissionManager.checkPermission(permissions[i % permissions.length]);
  }
  const singleCheckTime = performance.now() - singleCheckStart;
  
  // 测试批量权限检查
  const batchCheckStart = performance.now();
  const batches = Math.ceil(iterations / 10);
  for (let i = 0; i < batches; i++) {
    await permissionManager.checkMultiplePermissions(
      permissions.slice((i * 10) % permissions.length, ((i * 10) + 10) % permissions.length)
    );
  }
  const batchCheckTime = performance.now() - batchCheckStart;
  
  console.log('Benchmark Results:', {
    singleCheckAvg: (singleCheckTime / iterations).toFixed(2) + 'ms',
    batchCheckAvg: (batchCheckTime / batches).toFixed(2) + 'ms',
    batchEfficiency: ((singleCheckTime - batchCheckTime) / singleCheckTime * 100).toFixed(1) + '%'
  });
}
```

### 负载测试

```typescript
// 模拟高并发权限检查
async function loadTest() {
  const concurrency = 100;
  const requestsPerWorker = 50;
  
  const workers = Array.from({ length: concurrency }, async (_, i) => {
    const startTime = performance.now();
    
    for (let j = 0; j < requestsPerWorker; j++) {
      await permissionManager.checkPermission(
        PERMISSIONS.EMPLOYEE_VIEW,
        { user: { id: `user_${i}`, role: 'employee' } }
      );
    }
    
    return performance.now() - startTime;
  });
  
  const results = await Promise.all(workers);
  const totalTime = Math.max(...results);
  const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
  
  console.log('Load Test Results:', {
    totalRequests: concurrency * requestsPerWorker,
    totalTime: totalTime.toFixed(2) + 'ms',
    avgWorkerTime: avgTime.toFixed(2) + 'ms',
    requestsPerSecond: Math.round((concurrency * requestsPerWorker) / (totalTime / 1000))
  });
}
```

## 总结

权限验证 Hook 系统通过以下技术手段实现了高性能：

1. **多层缓存策略** - 减少重复计算和网络请求
2. **批量处理** - 提高处理效率，减少系统开销
3. **防抖机制** - 避免频繁的权限检查
4. **智能订阅** - 只订阅必要的权限变更
5. **内存管理** - 控制缓存大小，防止内存泄漏
6. **性能监控** - 实时监控性能指标，及时发现问题

通过遵循这些最佳实践和优化策略，可以确保权限系统在大规模生产环境中的稳定高效运行。