# 薪资管理系统迁移指南

从 Service 架构迁移到 Hook 架构的完整指南

## 概述

本指南帮助开发者从传统的 Service 层架构迁移到现代化的 React Hooks 架构。新架构基于 React Query 和 Supabase，提供更好的性能、类型安全和开发体验。

## 架构对比

### Service 架构 (旧)
```typescript
// 传统 Service 层
class PayrollService {
  async getPayrolls(filters) {
    const response = await fetch('/api/payrolls', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
    return response.json();
  }

  async createPayroll(data) {
    // 复杂的状态管理和错误处理
  }
}

// 组件中使用
function PayrollPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await PayrollService.getPayrolls(filters);
        setPayrolls(data);
      } catch (error) {
        // 手动错误处理
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  return <div>{/* 渲染逻辑 */}</div>;
}
```

### Hook 架构 (新)
```typescript
// 现代 Hook 架构
import { usePayroll } from '@/hooks/payroll';

function PayrollPage() {
  const { 
    payrolls, 
    loading, 
    mutations,
    actions 
  } = usePayroll({
    enableRealtime: true,
    filters: { periodId: 'current' }
  });

  const handleCreate = () => {
    mutations.createPayroll.mutate(data);
  };

  return <div>{/* 渲染逻辑 */}</div>;
}
```

## 核心差异

| 特性 | Service 架构 | Hook 架构 |
|------|-------------|-----------|
| **状态管理** | 手动 useState/useEffect | React Query 自动管理 |
| **缓存机制** | 无或手动实现 | 智能缓存和无效化 |
| **错误处理** | 手动 try-catch | 集成错误处理机制 |
| **实时更新** | 需要手动轮询 | Supabase 实时订阅 |
| **加载状态** | 手动状态跟踪 | 自动加载状态管理 |
| **类型安全** | 部分类型支持 | 完整 TypeScript 支持 |
| **代码复用** | 类继承 | Hook 组合 |
| **测试便利性** | 需要模拟网络请求 | 可以独立测试 Hook |

## 迁移步骤

### 第一阶段：安装依赖

```bash
npm install @tanstack/react-query @supabase/supabase-js
```

### 第二阶段：配置 React Query

```typescript
// main.tsx 或 App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 你的应用 */}
    </QueryClientProvider>
  );
}
```

### 第三阶段：逐步替换 Service

#### 1. 薪资周期管理
```typescript
// 替换前
import { periodService } from '@/services/period.service';

// 替换后
import { usePayrollPeriod } from '@/hooks/payroll';

function PeriodManagement() {
  // 旧方式
  // const [periods, setPeriods] = useState([]);
  // useEffect(() => {
  //   periodService.getPeriods().then(setPeriods);
  // }, []);

  // 新方式
  const { periods, loading, mutations } = usePayrollPeriod();

  return (
    <div>
      {loading.isLoading ? '加载中...' : (
        periods.map(period => (
          <div key={period.id}>{period.period_name}</div>
        ))
      )}
    </div>
  );
}
```

#### 2. 薪资计算
```typescript
// 替换前
import { calculationService } from '@/services/calculation.service';

// 替换后
import { usePayrollCalculation } from '@/hooks/payroll';

function PayrollCalculation() {
  const calculationHook = usePayrollCalculation();

  const handleCalculate = async () => {
    // 旧方式
    // const result = await calculationService.calculate(params);
    
    // 新方式
    await calculationHook.mutations.batchCalculate.mutateAsync({
      periodId: 'period-001',
      dryRun: false
    });
  };

  return (
    <div>
      <div>进度: {calculationHook.utils.getProgressPercentage()}%</div>
      <button 
        onClick={handleCalculate}
        disabled={calculationHook.loading.batch}
      >
        计算薪资
      </button>
    </div>
  );
}
```

#### 3. 导入导出功能
```typescript
// 替换前
import { importExportService } from '@/services/importExport.service';

// 替换后
import { usePayrollImportExport } from '@/hooks/payroll';

function ImportExport() {
  const importExportHook = usePayrollImportExport();

  const handleImport = async (file: File) => {
    // 旧方式
    // const formData = new FormData();
    // formData.append('file', file);
    // const result = await importExportService.import(formData);

    // 新方式
    const result = await importExportHook.mutations.importExcel.mutateAsync({
      file,
      config: {
        mode: 'append',
        validateBeforeImport: true,
        dataGroups: ['earnings', 'deductions']
      },
      periodId: 'period-001'
    });
  };

  const handleExport = async () => {
    // 旧方式
    // window.open('/api/export/payroll?period=2025-01');

    // 新方式
    await importExportHook.mutations.exportExcel.mutateAsync({
      template: 'standard',
      filters: { periodId: 'period-001' },
      includeDetails: true,
      format: 'xlsx'
    });
  };

  return (
    <div>
      <div>导入进度: {importExportHook.utils.getProgressPercentage()}%</div>
      <input 
        type="file" 
        onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
      />
      <button onClick={handleExport}>导出Excel</button>
    </div>
  );
}
```

### 第四阶段：更新业务逻辑

#### 审批流程迁移
```typescript
// 替换前
class ApprovalService {
  async submitForApproval(payrollIds: string[]) {
    // 复杂的状态管理
    return fetch('/api/approval/submit', {
      method: 'POST',
      body: JSON.stringify({ payrollIds })
    });
  }
}

// 替换后
function ApprovalManagement() {
  const approvalHook = usePayrollApproval();

  const handleSubmit = async (payrollIds: string[]) => {
    await approvalHook.mutations.submitForApproval.mutateAsync({
      payrollIds,
      notes: '请审批本月薪资'
    });
  };

  return (
    <div>
      <div>待审批: {approvalHook.pendingApprovals.length}</div>
      <button onClick={() => handleSubmit(['payroll-001'])}>
        提交审批
      </button>
    </div>
  );
}
```

### 第五阶段：数据分析功能迁移

```typescript
// 替换前
class AnalyticsService {
  async getStatistics(period: string) {
    // 手动聚合计算
    const payrolls = await this.getPayrolls(period);
    return this.calculateStatistics(payrolls);
  }
}

// 替换后
function PayrollAnalytics() {
  const analyticsHook = usePayrollAnalytics();
  
  // 自动计算统计数据
  const statisticsQuery = analyticsHook.queries.usePayrollStatistics('2025-01');
  const stats = statisticsQuery.data;

  // 部门统计
  const departmentQuery = analyticsHook.queries.useDepartmentStatistics('2025-01');
  
  // 趋势分析
  const trendsQuery = analyticsHook.queries.usePayrollTrends({
    startPeriod: '2024-01',
    endPeriod: '2024-12'
  });

  return (
    <div>
      <div>总员工: {stats?.totalEmployees}</div>
      <div>总工资: {analyticsHook.utils.formatCurrency(stats?.totalGrossPay || 0)}</div>
    </div>
  );
}
```

## 迁移检查清单

### 准备阶段
- [ ] 安装必要依赖 (@tanstack/react-query, @supabase/supabase-js)
- [ ] 配置 QueryClient
- [ ] 设置 Supabase 客户端
- [ ] 配置 TypeScript 类型

### 核心功能迁移
- [ ] 薪资周期管理 (usePayrollPeriod)
- [ ] 薪资计算逻辑 (usePayrollCalculation)
- [ ] 导入导出功能 (usePayrollImportExport)
- [ ] 审批流程 (usePayrollApproval)
- [ ] 数据分析 (usePayrollAnalytics)

### 辅助功能迁移
- [ ] 员工管理 (useEmployees)
- [ ] 部门管理 (useDepartments)
- [ ] 组件配置 (useComponents)
- [ ] 权限管理 (usePermissions)

### 测试和验证
- [ ] 单元测试覆盖
- [ ] 集成测试通过
- [ ] 性能基准测试
- [ ] 用户接受度测试

### 清理工作
- [ ] 删除旧 Service 文件
- [ ] 更新文档
- [ ] 清理无用依赖
- [ ] 代码审查

## 最佳实践

### 1. 渐进式迁移
```typescript
// 可以同时使用新旧架构
function HybridComponent() {
  // 新功能使用 Hook
  const { payrolls } = usePayroll();
  
  // 旧功能暂时保留 Service
  const [reports, setReports] = useState([]);
  useEffect(() => {
    reportService.getReports().then(setReports);
  }, []);

  return <div>{/* 混合使用 */}</div>;
}
```

### 2. 错误处理升级
```typescript
// 旧方式：手动错误处理
try {
  const result = await service.operation();
} catch (error) {
  toast.error(error.message);
  console.error(error);
}

// 新方式：集成错误处理
const { mutations } = usePayroll();
// 错误会自动通过 useErrorHandler 处理和显示
await mutations.operation.mutateAsync();
```

### 3. 实时数据同步
```typescript
// 旧方式：手动轮询
useEffect(() => {
  const interval = setInterval(() => {
    loadData();
  }, 5000);
  return () => clearInterval(interval);
}, []);

// 新方式：实时订阅
const { payrolls } = usePayroll({
  enableRealtime: true // 自动同步
});
```

### 4. 缓存策略优化
```typescript
// Hook 架构自动处理缓存
const { payrolls, refetch } = usePayroll();

// 需要时手动刷新
await refetch();

// 相关数据自动无效化
// 创建新薪资时，列表会自动更新
await createPayrollMutation.mutateAsync(data);
```

## 性能优化建议

### 1. 查询优化
```typescript
// 合理设置缓存时间
const { data } = useQuery({
  queryKey: ['payrolls'],
  queryFn: fetchPayrolls,
  staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
  cacheTime: 10 * 60 * 1000, // 10分钟后清理缓存
});
```

### 2. 条件查询
```typescript
// 避免不必要的查询
const { data } = usePayrollDetail(payrollId, {
  enabled: !!payrollId // 只有当 payrollId 存在时才查询
});
```

### 3. 分页和虚拟化
```typescript
const { data } = usePayrolls({
  page: 1,
  pageSize: 20,
  filters: { periodId }
});

// 使用虚拟列表处理大量数据
import { FixedSizeList } from 'react-window';
```

## 常见问题和解决方案

### Q1: 旧 Service 中的复杂业务逻辑如何迁移？

A: 将业务逻辑拆分到多个 Hook 中，或创建自定义 Hook：

```typescript
// 复杂业务逻辑的自定义 Hook
function usePayrollWorkflow(periodId: string) {
  const calculationHook = usePayrollCalculation();
  const approvalHook = usePayrollApproval();
  const analyticsHook = usePayrollAnalytics();

  const executeCompleteWorkflow = async () => {
    // 1. 计算薪资
    await calculationHook.mutations.batchCalculate.mutateAsync({ periodId });
    
    // 2. 提交审批
    const payrollIds = /* 获取薪资ID列表 */;
    await approvalHook.mutations.submitForApproval.mutateAsync({ payrollIds });
    
    // 3. 生成报表
    await analyticsHook.actions.generateReport({
      type: 'summary',
      periodStart: periodId,
      periodEnd: periodId
    });
  };

  return {
    executeCompleteWorkflow,
    loading: calculationHook.loading.batch || approvalHook.loading.isProcessing
  };
}
```

### Q2: 如何处理 Service 中的文件上传？

A: 迁移到 Hook 中的文件处理：

```typescript
// 旧方式
class FileService {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/upload', { method: 'POST', body: formData });
  }
}

// 新方式
const { mutations } = usePayrollImportExport();

const handleFileUpload = async (file: File) => {
  await mutations.importExcel.mutateAsync({
    file,
    config: { /* 配置 */ },
    periodId: 'current'
  });
};
```

### Q3: 原有的权限控制如何迁移？

A: 创建权限相关的 Hook：

```typescript
function usePermissions() {
  const { data: permissions } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: fetchUserPermissions
  });

  return {
    canCreatePayroll: permissions?.includes('payroll:create'),
    canApprovePayroll: permissions?.includes('payroll:approve'),
    canViewAnalytics: permissions?.includes('analytics:view')
  };
}

// 在组件中使用
function PayrollActions() {
  const { canCreatePayroll, canApprovePayroll } = usePermissions();
  
  return (
    <div>
      {canCreatePayroll && <CreateButton />}
      {canApprovePayroll && <ApprovalButton />}
    </div>
  );
}
```

### Q4: 如何处理 Service 中的全局状态？

A: 使用 React Query 的全局缓存或 Zustand：

```typescript
// 全局状态 Hook
import { create } from 'zustand';

interface PayrollStore {
  selectedPeriod: string | null;
  setSelectedPeriod: (period: string) => void;
}

const usePayrollStore = create<PayrollStore>((set) => ({
  selectedPeriod: null,
  setSelectedPeriod: (period) => set({ selectedPeriod: period })
}));

// 在组件中使用
function PayrollSelector() {
  const { selectedPeriod, setSelectedPeriod } = usePayrollStore();
  // 其他逻辑...
}
```

## 迁移完成后的清理

### 删除旧文件
```bash
# 删除 Service 层文件
rm -rf src/services/payroll.service.ts
rm -rf src/services/calculation.service.ts
rm -rf src/services/import-export.service.ts

# 清理相关类型定义
rm -rf src/types/services.ts

# 更新 import 语句
# 使用工具如 @typescript-eslint/parser 检查未使用的导入
```

### 更新配置文件
```typescript
// 移除不需要的依赖
// package.json
{
  "dependencies": {
    // 移除旧的 HTTP 客户端库
    // "axios": "^1.0.0",
    // "qs": "^6.0.0",
    
    // 保留新的依赖
    "@tanstack/react-query": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

## 总结

Hook 架构迁移带来的主要好处：

1. **开发效率提升** - 减少样板代码，自动处理缓存和错误
2. **性能优化** - 智能缓存，实时数据同步，减少不必要的请求
3. **类型安全** - 完整的 TypeScript 支持，减少运行时错误
4. **可测试性** - Hook 可以独立测试，提高代码质量
5. **可维护性** - 模块化设计，便于扩展和修改

迁移是一个渐进过程，建议按照本指南的步骤进行，确保系统稳定性的同时享受现代架构的优势。

---

*如有迁移过程中的具体问题，请参考 [API 文档](./PAYROLL_HOOKS_API.md) 或提交 Issue*