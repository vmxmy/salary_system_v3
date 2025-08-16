# 薪资管理 Hooks 测试指南

本指南详细说明如何对薪资管理 Hooks 系统进行全面测试，包括单元测试、集成测试和端到端测试。

## 测试架构概览

```
测试体系
├── 单元测试 (Unit Tests)
│   ├── Hook 逻辑测试
│   ├── 工具函数测试
│   └── 类型验证测试
├── 集成测试 (Integration Tests)
│   ├── Hook 组合测试
│   ├── Supabase 集成测试
│   └── React Query 集成测试
├── 端到端测试 (E2E Tests)
│   ├── 完整工作流测试
│   ├── 用户界面测试
│   └── 性能测试
└── 综合测试页面
    ├── PayrollHooksTestPage
    ├── 自动化测试用例
    └── 手动测试清单
```

## 综合测试页面使用指南

### 1. 测试页面入口

访问测试页面：
```
http://localhost:3000/test/payroll-hooks
```

或在路由中添加：
```typescript
// router/index.tsx
{
  path: "/test/payroll-hooks",
  element: <PayrollHooksTestPage />
}
```

### 2. 测试步骤

#### 基础准备工作
1. 确保 Supabase 连接正常
2. 准备测试数据（员工、部门、职位等）
3. 选择测试用的员工 ID 和周期 ID

#### 系统化测试流程

**步骤1：薪资周期管理测试**
```typescript
// 测试创建新周期
const testPeriodManagement = async () => {
  const newPeriod = await periodHook.mutations.createPeriod.mutateAsync({
    period_year: 2025,
    period_month: 1,
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    pay_date: '2025-02-05',
    status: 'draft'
  });
  
  console.log('✅ 周期创建测试通过');
};
```

**步骤2：员工类别和职位分配测试**
```typescript
// 测试员工类别分配
const testCategoryAssignment = async () => {
  await categoryHook.mutations.assignCategory.mutateAsync({
    employeeId: selectedEmployeeId,
    categoryId: mockCategoryId,
    periodId: selectedPeriodId,
    notes: '测试类别分配'
  });
  
  console.log('✅ 类别分配测试通过');
};
```

**步骤3：薪资计算测试**
```typescript
// 测试预览计算
const testPayrollCalculation = async () => {
  const previewResult = await calculationHook.mutations.preview.mutateAsync({
    employeeId: selectedEmployeeId,
    year: 2025,
    month: 1
  });
  
  // 验证计算结果
  expect(previewResult.grossPay).toBeGreaterThan(0);
  expect(previewResult.netPay).toBeLessThan(previewResult.grossPay);
  
  console.log('✅ 薪资计算测试通过');
};
```

**步骤4：导入导出测试**
```typescript
// 测试导出功能
const testImportExport = async () => {
  await importExportHook.mutations.exportExcel.mutateAsync({
    template: 'standard',
    filters: { periodId: selectedPeriodId },
    includeDetails: true,
    format: 'xlsx'
  });
  
  console.log('✅ 导入导出测试通过');
};
```

**步骤5：审批流程测试**
```typescript
// 测试审批流程
const testApprovalFlow = async () => {
  const mockPayrollIds = ['mock-payroll-1', 'mock-payroll-2'];
  
  await approvalHook.mutations.submitForApproval.mutateAsync({
    payrollIds: mockPayrollIds,
    notes: '测试提交审批'
  });
  
  console.log('✅ 审批流程测试通过');
};
```

### 3. 测试结果解读

#### 成功指标
- ✅ 所有测试用例通过
- ✅ 无 JavaScript 错误
- ✅ 数据状态正确更新
- ✅ 实时订阅正常工作
- ✅ 进度跟踪准确

#### 失败排查
- ❌ 网络连接问题：检查 Supabase 配置
- ❌ 权限错误：确认用户权限设置
- ❌ 数据问题：验证测试数据完整性
- ❌ 类型错误：检查 TypeScript 类型定义

## 自动化测试

### 1. 单元测试示例

```typescript
// __tests__/hooks/usePayrollPeriod.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';

// 测试环境设置
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('usePayrollPeriod', () => {
  test('应该正确加载薪资周期列表', async () => {
    const { result } = renderHook(() => usePayrollPeriod(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading.isLoading).toBe(false);
    });
    
    expect(result.current.periods).toBeDefined();
    expect(Array.isArray(result.current.periods)).toBe(true);
  });

  test('应该正确创建新周期', async () => {
    const { result } = renderHook(() => usePayrollPeriod(), { wrapper });
    
    const periodData = {
      period_year: 2025,
      period_month: 1,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      pay_date: '2025-02-05',
      status: 'draft' as const
    };

    await waitFor(() => {
      result.current.mutations.createPeriod.mutate(periodData);
    });

    expect(result.current.mutations.createPeriod.isSuccess).toBe(true);
  });

  test('应该正确格式化周期名称', () => {
    const { result } = renderHook(() => usePayrollPeriod(), { wrapper });
    
    const mockPeriod = {
      id: 'test-id',
      period_year: 2025,
      period_month: 1,
      period_name: '2025年1月'
    } as any;

    const formatted = result.current.utils.formatPeriodName(mockPeriod);
    expect(formatted).toBe('2025年1月');
  });
});
```

### 2. 计算 Hook 测试

```typescript
// __tests__/hooks/usePayrollCalculation.test.ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePayrollCalculation } from '@/hooks/payroll/usePayrollCalculation';

describe('usePayrollCalculation', () => {
  test('应该正确进行预览计算', async () => {
    const { result } = renderHook(() => usePayrollCalculation(), { wrapper });
    
    const previewParams = {
      employeeId: 'test-employee-id',
      year: 2025,
      month: 1,
      configOverrides: {
        basicSalary: 8000,
        performanceBonus: 2000
      }
    };

    let previewResult: any;
    await act(async () => {
      previewResult = await result.current.mutations.preview.mutateAsync(previewParams);
    });

    expect(previewResult).toBeDefined();
    expect(previewResult.grossPay).toBeGreaterThan(0);
    expect(previewResult.netPay).toBeLessThan(previewResult.grossPay);
  });

  test('应该正确跟踪批量计算进度', async () => {
    const { result } = renderHook(() => usePayrollCalculation(), { wrapper });
    
    // 模拟批量计算
    await act(async () => {
      result.current.mutations.batchCalculate.mutate({
        periodId: 'test-period-id',
        dryRun: true
      });
    });

    // 验证进度跟踪
    expect(result.current.progress).toBeDefined();
    expect(typeof result.current.utils.getProgressPercentage()).toBe('number');
  });

  test('应该正确处理计算错误', async () => {
    const { result } = renderHook(() => usePayrollCalculation(), { wrapper });
    
    // 测试错误格式化
    const error = new Error('计算失败');
    const formatted = result.current.utils.formatCalculationError(error);
    expect(formatted).toBe('计算失败');
  });
});
```

### 3. 导入导出测试

```typescript
// __tests__/hooks/usePayrollImportExport.test.ts
describe('usePayrollImportExport', () => {
  test('应该正确解析Excel文件', async () => {
    const { result } = renderHook(() => usePayrollImportExport(), { wrapper });
    
    // 模拟Excel文件
    const mockFile = new File(['test data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const parseResult = await result.current.actions.parseExcelFile(mockFile);
    expect(Array.isArray(parseResult)).toBe(true);
  });

  test('应该正确验证导入数据', async () => {
    const { result } = renderHook(() => usePayrollImportExport(), { wrapper });
    
    const mockData = [
      {
        '员工姓名': '张三',
        '基本工资': '8000',
        '岗位工资': '2000'
      }
    ];

    const config = {
      mode: 'append' as const,
      validateBeforeImport: true,
      skipDuplicates: false,
      dataGroups: ['earnings']
    };

    const validation = await result.current.actions.validateImportData(mockData, config);
    expect(validation.isValid).toBe(true);
    expect(Array.isArray(validation.errors)).toBe(true);
    expect(Array.isArray(validation.warnings)).toBe(true);
  });

  test('应该正确跟踪导入进度', () => {
    const { result } = renderHook(() => usePayrollImportExport(), { wrapper });
    
    expect(result.current.importProgress).toBeDefined();
    expect(['parsing', 'validating', 'importing', 'completed', 'error'])
      .toContain(result.current.importProgress.phase);
    
    const percentage = result.current.utils.getProgressPercentage();
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});
```

### 4. 审批流程测试

```typescript
// __tests__/hooks/usePayrollApproval.test.ts
describe('usePayrollApproval', () => {
  test('应该正确提交审批', async () => {
    const { result } = renderHook(() => usePayrollApproval(), { wrapper });
    
    const mockPayrollIds = ['payroll-1', 'payroll-2'];
    
    await act(async () => {
      await result.current.mutations.submitForApproval.mutateAsync({
        payrollIds: mockPayrollIds,
        notes: '请审批测试'
      });
    });

    expect(result.current.mutations.submitForApproval.isSuccess).toBe(true);
  });

  test('应该正确处理批量审批', async () => {
    const { result } = renderHook(() => usePayrollApproval(), { wrapper });
    
    await act(async () => {
      await result.current.mutations.batchApprove.mutateAsync({
        payrollIds: ['payroll-1'],
        notes: '批量审批测试'
      });
    });

    expect(result.current.mutations.batchApprove.isSuccess).toBe(true);
  });

  test('应该正确跟踪审批进度', () => {
    const { result } = renderHook(() => usePayrollApproval(), { wrapper });
    
    expect(result.current.progress).toBeDefined();
    expect(typeof result.current.progress.total).toBe('number');
    expect(typeof result.current.progress.processed).toBe('number');
  });
});
```

### 5. 分析统计测试

```typescript
// __tests__/hooks/usePayrollAnalytics.test.ts
describe('usePayrollAnalytics', () => {
  test('应该正确获取薪资统计', async () => {
    const { result } = renderHook(() => usePayrollAnalytics(), { wrapper });
    
    const statisticsQuery = result.current.queries.usePayrollStatistics('2025-01');
    
    await waitFor(() => {
      expect(statisticsQuery.data).toBeDefined();
    });

    const stats = statisticsQuery.data;
    if (stats) {
      expect(typeof stats.totalEmployees).toBe('number');
      expect(typeof stats.totalGrossPay).toBe('number');
      expect(typeof stats.averageNetPay).toBe('number');
    }
  });

  test('应该正确格式化货币', () => {
    const { result } = renderHook(() => usePayrollAnalytics(), { wrapper });
    
    const formatted = result.current.utils.formatCurrency(12345.67);
    expect(formatted).toMatch(/¥.*12,345\.67/);
  });

  test('应该正确生成报表', async () => {
    const { result } = renderHook(() => usePayrollAnalytics(), { wrapper });
    
    const reportConfig = {
      type: 'summary' as const,
      periodStart: '2024-01',
      periodEnd: '2024-12',
      groupBy: 'department' as const
    };

    const report = await result.current.actions.generateReport(reportConfig);
    expect(report).toBeDefined();
  });
});
```

## 集成测试

### 1. Hook 组合测试

```typescript
// __tests__/integration/payroll-workflow.test.ts
describe('Payroll Workflow Integration', () => {
  test('应该完成完整的薪资处理流程', async () => {
    const { result: periodResult } = renderHook(() => usePayrollPeriod(), { wrapper });
    const { result: calculationResult } = renderHook(() => usePayrollCalculation(), { wrapper });
    const { result: approvalResult } = renderHook(() => usePayrollApproval(), { wrapper });

    // 1. 创建周期
    let periodId: string;
    await act(async () => {
      const period = await periodResult.current.mutations.createPeriod.mutateAsync({
        period_year: 2025,
        period_month: 1,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        pay_date: '2025-02-05',
        status: 'draft'
      });
      periodId = period.id;
    });

    // 2. 批量计算
    await act(async () => {
      await calculationResult.current.mutations.batchCalculate.mutateAsync({
        periodId,
        dryRun: false
      });
    });

    // 3. 提交审批
    await act(async () => {
      await approvalResult.current.mutations.submitForApproval.mutateAsync({
        payrollIds: ['mock-payroll-id'],
        notes: '集成测试审批'
      });
    });

    // 验证流程完成
    expect(periodResult.current.mutations.createPeriod.isSuccess).toBe(true);
    expect(calculationResult.current.mutations.batchCalculate.isSuccess).toBe(true);
    expect(approvalResult.current.mutations.submitForApproval.isSuccess).toBe(true);
  });
});
```

### 2. Supabase 集成测试

```typescript
// __tests__/integration/supabase-integration.test.ts
describe('Supabase Integration', () => {
  test('应该正确连接 Supabase', async () => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .limit(1);
    
    expect(error).toBe(null);
    expect(Array.isArray(data)).toBe(true);
  });

  test('应该正确处理实时订阅', (done) => {
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'payroll_periods' },
        (payload) => {
          expect(payload.eventType).toBe('INSERT');
          done();
        }
      )
      .subscribe();

    // 清理
    setTimeout(() => {
      channel.unsubscribe();
      done();
    }, 5000);
  });
});
```

## 端到端测试

### 1. Playwright E2E 测试

```typescript
// e2e/payroll-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('薪资管理端到端测试', () => {
  test('完整的薪资计算流程', async ({ page }) => {
    // 导航到测试页面
    await page.goto('/test/payroll-hooks');
    
    // 选择测试员工
    await page.selectOption('[data-testid="employee-select"]', 'emp-001');
    
    // 创建薪资周期
    await page.click('[data-testid="test-period-btn"]');
    await expect(page.locator('.alert-success')).toBeVisible();
    
    // 执行薪资计算
    await page.click('[data-testid="test-calculation-btn"]');
    
    // 等待计算完成
    await expect(page.locator('[data-testid="calculation-progress"]')).toContainText('100%');
    
    // 验证结果
    await expect(page.locator('.alert-success')).toContainText('测试成功');
  });

  test('导入导出功能', async ({ page }) => {
    await page.goto('/test/payroll-hooks');
    
    // 测试导出
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="test-export-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    
    // 测试导入（需要准备测试文件）
    await page.setInputFiles('[data-testid="file-input"]', 'test-data/sample-payroll.xlsx');
    await page.click('[data-testid="test-import-btn"]');
    await expect(page.locator('.alert-success')).toBeVisible();
  });
});
```

### 2. 性能测试

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('性能测试', () => {
  test('薪资列表加载性能', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/payroll');
    
    // 等待列表加载完成
    await page.waitForSelector('[data-testid="payroll-table"]');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // 应在2秒内加载完成
  });

  test('批量操作性能', async ({ page }) => {
    await page.goto('/test/payroll-hooks');
    
    const startTime = Date.now();
    
    // 执行批量计算
    await page.click('[data-testid="batch-calculate-btn"]');
    
    // 等待计算完成
    await page.waitForSelector('[data-testid="calculation-complete"]');
    
    const processTime = Date.now() - startTime;
    console.log(`批量计算耗时: ${processTime}ms`);
    
    // 根据数据量设置合理的时间限制
    expect(processTime).toBeLessThan(30000); // 30秒内完成
  });
});
```

## 测试最佳实践

### 1. 模拟数据管理

```typescript
// __tests__/fixtures/payroll-data.ts
export const mockPayrollPeriod = {
  id: 'test-period-001',
  period_year: 2025,
  period_month: 1,
  period_name: '2025年1月',
  period_start: '2025-01-01',
  period_end: '2025-01-31',
  pay_date: '2025-02-05',
  status: 'draft' as const
};

export const mockEmployee = {
  id: 'test-emp-001',
  employee_name: '测试员工',
  employee_code: 'EMP001',
  department_id: 'dept-001'
};

export const mockCalculationResult = {
  payrollId: 'test-payroll-001',
  employeeId: 'test-emp-001',
  employeeName: '测试员工',
  grossPay: 10000,
  totalDeductions: 2000,
  netPay: 8000,
  items: [],
  insurances: []
};
```

### 2. 测试工具函数

```typescript
// __tests__/utils/test-helpers.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false }
  }
});

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

export const waitForHookToSettle = async (result: any) => {
  await waitFor(() => {
    expect(result.current.loading.isLoading).toBe(false);
  });
};

export const expectHookError = async (hookResult: any, expectedError: string) => {
  await waitFor(() => {
    expect(hookResult.current.error).toBeDefined();
    expect(hookResult.current.error.message).toContain(expectedError);
  });
};
```

### 3. 测试配置

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/hooks/**/*.{ts,tsx}',
    '!src/hooks/**/*.d.ts',
    '!src/hooks/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 模拟 Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: mockRpcResult, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() }))
    }))
  }
}));
```

## 测试覆盖率要求

### 代码覆盖率目标
- **函数覆盖率**: 90% 以上
- **分支覆盖率**: 85% 以上
- **行覆盖率**: 90% 以上
- **语句覆盖率**: 90% 以上

### 关键测试点
- ✅ 所有公共 Hook 接口
- ✅ 错误处理逻辑
- ✅ 边界条件处理
- ✅ 异步操作完成
- ✅ 状态管理正确性
- ✅ 实时订阅功能
- ✅ 缓存无效化策略

## 持续集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Payroll Hooks

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:coverage
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

通过这套完整的测试体系，确保薪资管理 Hooks 系统的稳定性和可靠性。

---

*持续更新测试用例，保持高质量代码标准*