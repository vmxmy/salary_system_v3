# 薪资管理 Hooks API 文档

## 概述

薪资管理 Hooks 系统是一个基于 React Query 和 Supabase 构建的现代化薪资管理解决方案。它提供了完整的薪资计算、审批、导入导出、分析统计等功能，采用模块化 Hook 设计，支持实时数据同步和批量操作。

## 系统架构

### 核心技术栈
- **React Query (@tanstack/react-query)**: 状态管理和数据缓存
- **Supabase**: 数据库集成和实时订阅
- **TypeScript**: 完整类型安全
- **xlsx**: Excel 文件处理

### Hook 架构层次
```
薪资管理 Hook 系统
├── usePayrollPeriod        # 薪资周期管理
├── usePayrollCalculation   # 薪资计算
├── usePayrollImportExport  # 导入导出
├── usePayrollApproval      # 审批流程
├── usePayrollAnalytics     # 统计分析
├── usePayrollWorkflow      # 工作流集成
├── usePayrollEarnings      # 收入明细
├── useEmployeeCategory     # 员工类别
├── useEmployeePosition     # 员工职位
├── useContributionBase     # 缴费基数
└── usePayrollManagement    # 组合 Hook
```

## Hook API 参考

### 1. usePayrollPeriod - 薪资周期管理

薪资周期是整个薪资系统的基础，管理薪资计算的时间范围和状态。

#### 基础用法
```typescript
import { usePayrollPeriod } from '@/hooks/payroll';

function PayrollPeriodManagement() {
  const periodHook = usePayrollPeriod({
    autoLoadCurrent: true,
    enableRealtime: true
  });

  const { periods, currentPeriod, loading, mutations } = periodHook;

  // 创建新周期
  const handleCreatePeriod = () => {
    mutations.createPeriod.mutate({
      period_year: 2025,
      period_month: 1,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      pay_date: '2025-02-05',
      status: 'draft'
    });
  };

  return (
    <div>
      {periods.map(period => (
        <div key={period.id}>
          {period.period_name} - {period.status}
        </div>
      ))}
    </div>
  );
}
```

#### 配置选项
```typescript
interface UsePayrollPeriodOptions {
  autoLoadCurrent?: boolean;  // 自动加载当前周期
  enableRealtime?: boolean;   // 启用实时订阅
}
```

#### 返回数据结构
```typescript
{
  periods: PayrollPeriod[];           // 周期列表
  currentPeriod: PayrollPeriod | null; // 当前活跃周期
  pagination: PaginationInfo | null;   // 分页信息
  loading: {
    periods: boolean;
    currentPeriod: boolean;
    isLoading: boolean;
  };
  mutations: {
    createPeriod: UseMutationResult;    // 创建周期
    updatePeriod: UseMutationResult;    // 更新周期
    updateStatus: UseMutationResult;    // 更新状态
    toggleLock: UseMutationResult;      // 锁定/解锁
    deletePeriod: UseMutationResult;    // 删除周期
  };
  actions: {
    refresh: () => Promise<void>;
    createPeriod: (data) => void;
    updateStatus: (params) => void;
    // ... 其他操作方法
  };
  utils: {
    formatPeriodName: (period) => string;
    isPeriodLocked: (period) => boolean;
    canEditPeriod: (period) => boolean;
  };
}
```

#### 增强功能

**批量生成周期**
```typescript
const generateHook = useGeneratePayrollPeriods();

// 生成一年的周期
await generateHook.mutateAsync({
  startYear: 2025,
  startMonth: 1,
  endYear: 2025,
  endMonth: 12,
  payDay: 5
});
```

**周期对比分析**
```typescript
const comparisonHook = usePeriodComparison(['period-id-1', 'period-id-2']);
const { base, comparisons } = comparisonHook.data;

comparisons.forEach(comp => {
  console.log(`工资变化: ${comp.changes.grossPayChangePercent.toFixed(2)}%`);
});
```

**年度汇总统计**
```typescript
const yearSummaryHook = useYearPayrollSummary(2024);
const { months, yearTotal, averageMonthlyGrossPay } = yearSummaryHook.data;
```

### 2. usePayrollCalculation - 薪资计算

处理复杂的薪资计算逻辑，支持预览、批量计算和单项计算。

#### 基础用法
```typescript
import { usePayrollCalculation } from '@/hooks/payroll';

function PayrollCalculation() {
  const calculationHook = usePayrollCalculation();

  // 预览单个员工薪资计算
  const handlePreview = async () => {
    const result = await calculationHook.mutations.preview.mutateAsync({
      employeeId: 'emp-001',
      year: 2025,
      month: 1,
      configOverrides: {
        basicSalary: 8000,
        performanceBonus: 2000
      }
    });

    console.log('预览结果:', result);
  };

  // 批量计算薪资
  const handleBatchCalculate = async () => {
    await calculationHook.mutations.batchCalculate.mutateAsync({
      periodId: 'period-001',
      dryRun: false
    });
  };

  return (
    <div>
      <div>计算进度: {calculationHook.utils.getProgressPercentage()}%</div>
      <div>处理中: {calculationHook.progress.processed}/{calculationHook.progress.total}</div>
      
      <button onClick={handlePreview} disabled={calculationHook.loading.preview}>
        预览计算
      </button>
      
      <button onClick={handleBatchCalculate} disabled={calculationHook.loading.batch}>
        批量计算
      </button>
    </div>
  );
}
```

#### 计算结果类型
```typescript
interface CalculationResult {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  grossPay: number;           // 应发工资
  totalDeductions: number;    // 扣款总额
  netPay: number;            // 实发工资
  items: Array<{
    componentId: string;
    componentName: string;
    componentType: 'earning' | 'deduction';
    amount: number;
    notes?: string;
  }>;
  insurances: Array<{
    insuranceType: string;
    employeeAmount: number;    // 个人缴费
    employerAmount: number;    // 企业缴费
    contributionBase: number;  // 缴费基数
  }>;
  warnings?: string[];
  errors?: string[];
}
```

#### 高级功能

**从上期复制配置**
```typescript
await calculationHook.mutations.copyFromPrevious.mutateAsync({
  fromPeriodId: 'period-2024-12',
  toPeriodId: 'period-2025-01',
  includeItems: true
});
```

**薪资估算**
```typescript
const estimation = await calculationHook.mutations.estimate.mutateAsync({
  employeeIds: ['emp-001', 'emp-002'],
  year: 2025,
  month: 1
});
```

### 3. usePayrollImportExport - 导入导出

支持Excel文件的导入导出，包括数据验证和进度跟踪。

#### 导入功能
```typescript
import { usePayrollImportExport } from '@/hooks/payroll';

function PayrollImport() {
  const importExportHook = usePayrollImportExport();
  
  const handleImport = async (file: File) => {
    const result = await importExportHook.mutations.importExcel.mutateAsync({
      file,
      config: {
        mode: 'append',
        validateBeforeImport: true,
        skipDuplicates: true,
        dataGroups: ['earnings', 'deductions']
      },
      periodId: 'period-001'
    });

    console.log('导入结果:', {
      成功: result.successCount,
      失败: result.failedCount,
      错误: result.errors
    });
  };

  return (
    <div>
      <div>导入进度: {importExportHook.utils.getProgressPercentage()}%</div>
      <div>阶段: {importExportHook.utils.getPhaseDescription(importExportHook.importProgress.phase)}</div>
      
      <input 
        type="file" 
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
      />
    </div>
  );
}
```

#### 导出功能
```typescript
const handleExport = async () => {
  await importExportHook.mutations.exportExcel.mutateAsync({
    template: 'standard',
    filters: { 
      periodId: 'period-001',
      departmentId: 'dept-001'
    },
    includeDetails: true,
    includeInsurance: true,
    format: 'xlsx'
  });
};
```

#### 模板管理
```typescript
// 获取导入模板列表
const templatesQuery = importExportHook.queries.useImportTemplates();

// 下载模板
const handleDownloadTemplate = async (templateId: string) => {
  await importExportHook.mutations.downloadTemplate.mutateAsync(templateId);
};
```

### 4. usePayrollApproval - 审批流程

管理薪资审批工作流，支持多级审批和批量操作。

#### 基础用法
```typescript
import { usePayrollApproval } from '@/hooks/payroll';

function PayrollApproval() {
  const approvalHook = usePayrollApproval({
    autoLoadPendingApprovals: true,
    enableRealtime: true
  });

  // 提交审批
  const handleSubmitForApproval = async () => {
    await approvalHook.mutations.submitForApproval.mutateAsync({
      payrollIds: ['payroll-001', 'payroll-002'],
      notes: '请审批2025年1月薪资'
    });
  };

  // 批准薪资
  const handleApprove = async () => {
    await approvalHook.mutations.approve.mutateAsync({
      payrollIds: ['payroll-001'],
      notes: '审批通过',
      approverLevel: 'manager'
    });
  };

  // 拒绝薪资
  const handleReject = async () => {
    await approvalHook.mutations.reject.mutateAsync({
      payrollIds: ['payroll-001'],
      reason: '数据有误，需要重新计算',
      requireResubmit: true
    });
  };

  return (
    <div>
      <div>待审批: {approvalHook.pendingApprovals.length}</div>
      <div>审批进度: {Math.round((approvalHook.progress.processed / approvalHook.progress.total) * 100)}%</div>
      
      <button onClick={handleSubmitForApproval}>提交审批</button>
      <button onClick={handleApprove}>批准</button>
      <button onClick={handleReject}>拒绝</button>
    </div>
  );
}
```

#### 审批状态机
```typescript
// 薪资状态流转
draft → pending_approval → approved → paid
   ↓         ↓              ↓
rejected  rejected     cancelled
```

#### 审批流程配置
```typescript
interface ApprovalFlowConfig {
  requireManagerApproval?: boolean;    // 需要经理审批
  requireHRApproval?: boolean;         // 需要HR审批
  requireFinanceApproval?: boolean;    // 需要财务审批
  enableParallelApproval?: boolean;    // 启用并行审批
  autoApproveThreshold?: number;       // 自动审批阈值
}
```

### 5. usePayrollAnalytics - 统计分析

提供全面的薪资数据分析和报表功能。

#### 基础统计
```typescript
import { usePayrollAnalytics } from '@/hooks/payroll';

function PayrollAnalytics() {
  const analyticsHook = usePayrollAnalytics();
  
  // 获取薪资统计
  const statisticsQuery = analyticsHook.queries.usePayrollStatistics('2025-01');
  const stats = statisticsQuery.data;

  // 获取部门统计
  const departmentQuery = analyticsHook.queries.useDepartmentStatistics('2025-01');
  const departments = departmentQuery.data;

  return (
    <div>
      <div>总员工数: {stats?.totalEmployees}</div>
      <div>应发工资总额: {analyticsHook.utils.formatCurrency(stats?.totalGrossPay || 0)}</div>
      <div>人均实发: {analyticsHook.utils.formatCurrency(stats?.averageNetPay || 0)}</div>
      
      <h3>部门统计</h3>
      {departments?.map(dept => (
        <div key={dept.departmentId}>
          {dept.departmentName}: {analyticsHook.utils.formatCurrency(dept.totalGrossPay)}
          ({dept.percentOfTotal.toFixed(1)}%)
        </div>
      ))}
    </div>
  );
}
```

#### 趋势分析
```typescript
const trendsQuery = analyticsHook.queries.usePayrollTrends({
  startPeriod: '2024-01',
  endPeriod: '2024-12',
  groupBy: 'month'
});

const trends = trendsQuery.data;
trends?.forEach(trend => {
  console.log(`${trend.period}: 环比${trend.growthRate.toFixed(2)}%, 同比${trend.yearOverYear.toFixed(2)}%`);
});
```

#### 成分分析
```typescript
const componentQuery = analyticsHook.queries.useComponentAnalysis('2025-01');
const components = componentQuery.data;

// 按薪资成分分析
components?.forEach(component => {
  console.log(`${component.componentName}: ${component.totalAmount} (${component.percentOfTotal.toFixed(1)}%)`);
});
```

#### 对比分析
```typescript
const comparisonQuery = analyticsHook.queries.useComparison({
  basePeriod: '2024-12',
  comparePeriod: '2025-01',
  departmentId: 'dept-001'
});

const comparison = comparisonQuery.data;
comparison?.forEach(result => {
  console.log(`${result.metric}: ${result.percentageChange.toFixed(2)}% ${analyticsHook.utils.getTrendIcon(result.trend)}`);
});
```

#### 报表生成
```typescript
const generateReport = async () => {
  const report = await analyticsHook.actions.generateReport({
    type: 'summary',
    periodStart: '2024-01',
    periodEnd: '2024-12',
    departmentIds: ['dept-001', 'dept-002'],
    groupBy: 'department',
    sortBy: 'amount',
    sortOrder: 'desc'
  });

  // 导出为Excel
  await analyticsHook.actions.exportToExcel(report, '薪资统计报表.xlsx');
};
```

### 6. usePayrollManagement - 组合 Hook

提供统一的薪资管理接口，整合所有功能模块。

#### 基础用法
```typescript
import { usePayrollManagement } from '@/hooks/payroll';

function PayrollManagementPage() {
  const management = usePayrollManagement('period-001');
  
  const {
    // 数据
    payrolls, periods, employees,
    
    // 加载状态
    loading,
    
    // 所有操作
    actions
  } = management;

  // 完整工作流执行
  const handleCompleteWorkflow = async () => {
    await actions.executeCompleteWorkflow({
      periodId: 'period-001',
      employeeIds: ['emp-001', 'emp-002'],
      defaultCategoryId: 'cat-001'
    });
  };

  return (
    <div>
      <div>薪资记录: {payrolls?.length || 0}</div>
      <div>加载中: {loading.isLoading ? '是' : '否'}</div>
      
      <button onClick={handleCompleteWorkflow}>
        执行完整工作流
      </button>
    </div>
  );
}
```

## 最佳实践

### 1. 错误处理

所有 Hook 都集成了统一的错误处理机制：

```typescript
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

// Hook 内部自动处理错误
const periodHook = usePayrollPeriod();

// 手动错误处理
try {
  await periodHook.mutations.createPeriod.mutateAsync(data);
} catch (error) {
  // 错误已经通过 useErrorHandler 处理和显示
  console.error('操作失败:', error);
}
```

### 2. 实时数据同步

```typescript
// 启用实时订阅
const periodHook = usePayrollPeriod({
  enableRealtime: true
});

// 数据会自动同步，无需手动刷新
useEffect(() => {
  console.log('周期数据已更新:', periodHook.periods);
}, [periodHook.periods]);
```

### 3. 批量操作进度跟踪

```typescript
const calculationHook = usePayrollCalculation();

// 监听计算进度
useEffect(() => {
  if (calculationHook.progress.total > 0) {
    const percentage = calculationHook.utils.getProgressPercentage();
    console.log(`计算进度: ${percentage}%`);
    
    // 显示错误
    calculationHook.progress.errors.forEach(error => {
      console.error(`员工 ${error.employeeName}: ${error.error}`);
    });
  }
}, [calculationHook.progress]);
```

### 4. 缓存优化

```typescript
// React Query 自动处理缓存
const periodsQuery = usePayrollPeriods();

// 手动刷新缓存
await periodsQuery.refetch();

// 无效化相关查询
await queryClient.invalidateQueries({ queryKey: ['payrolls'] });
```

### 5. 类型安全

```typescript
import type { Database } from '@/types/supabase';

type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];
type PayrollInsert = Database['public']['Tables']['payroll_periods']['Insert'];

// 所有操作都有完整的类型支持
const createPeriod = (data: PayrollInsert) => {
  return periodHook.mutations.createPeriod.mutate(data);
};
```

## 性能优化

### 1. 查询优化
- 使用 `staleTime` 控制缓存时间
- 合理设置 `enabled` 条件避免不必要的查询
- 使用分页减少数据传输量

### 2. 实时订阅优化
- 按需启用实时功能
- 合理设置订阅范围
- 及时清理订阅避免内存泄漏

### 3. 批量操作优化
- 使用 Supabase RPC 进行服务端批量处理
- 实现进度跟踪和错误恢复
- 支持中断和重试机制

## 故障排除

### 1. 常见问题

**Q: Hook 数据不更新？**
A: 检查实时订阅是否启用，确认查询键是否正确

**Q: 批量操作失败？**
A: 检查网络连接，查看进度状态中的错误信息

**Q: 计算结果不正确？**
A: 验证输入参数，检查 Supabase 存储过程

### 2. 调试技巧

```typescript
// 启用调试模式
const periodHook = usePayrollPeriod({ debug: true });

// 查看查询状态
console.log('查询状态:', {
  isLoading: periodHook.loading.isLoading,
  error: periodHook.errors.periods,
  data: periodHook.periods
});

// 监听 React Query 状态
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.getQueryCache().subscribe(event => {
  console.log('Query event:', event);
});
```

## 版本历史

### v1.0.0 (2025-01-15)
- ✅ 完整的薪资管理 Hook 系统
- ✅ 支持 React Query 和 Supabase 集成
- ✅ 实时数据同步
- ✅ 批量操作和进度跟踪
- ✅ Excel 导入导出
- ✅ 完整的审批流程
- ✅ 统计分析功能
- ✅ TypeScript 类型安全
- ✅ 综合测试页面

### 下一版本计划
- 🔄 移动端适配
- 🔄 离线支持
- 🔄 更多报表模板
- 🔄 工作流可视化

---

*本文档持续更新，如有问题请提交 Issue*