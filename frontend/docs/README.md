# 薪资管理 Hooks 系统文档

## 📖 文档目录

本目录包含薪资管理 Hooks 系统的完整文档，帮助开发者快速理解和使用现代化的薪资管理解决方案。

### 核心文档

| 文档 | 描述 | 适合人群 |
|------|------|----------|
| [🔧 API 参考文档](./PAYROLL_HOOKS_API.md) | 完整的 Hook API 参考和使用示例 | 开发者、架构师 |
| [📋 迁移指南](./MIGRATION_GUIDE.md) | 从 Service 架构迁移到 Hook 架构的详细指南 | 项目维护者、开发团队 |
| [🧪 测试指南](./HOOK_TESTING_GUIDE.md) | 全面的测试策略和测试用例 | 测试工程师、质量保证 |

## 🚀 快速开始

### 基础使用

```typescript
import { usePayrollManagement } from '@/hooks/payroll';

function PayrollPage() {
  const { payrolls, loading, actions } = usePayrollManagement('period-001');
  
  if (loading.isLoading) return <div>加载中...</div>;
  
  return (
    <div>
      <h2>薪资管理</h2>
      {payrolls?.map(payroll => (
        <div key={payroll.id}>
          {payroll.employee_name}: {payroll.net_pay}
        </div>
      ))}
    </div>
  );
}
```

### 高级功能

```typescript
// 完整工作流执行
const handleCompleteWorkflow = async () => {
  await actions.executeCompleteWorkflow({
    periodId: 'period-001',
    employeeIds: selectedEmployees,
    options: {
      autoApprove: false,
      generateReports: true
    }
  });
};
```

## 核心特性

✨ **现代化 Hook 架构**: 基于 React Query 和 Supabase 的响应式数据管理  
🚀 **高性能**: 智能缓存、实时同步、批量操作优化  
📱 **完整类型安全**: TypeScript 严格模式，减少运行时错误  
🎨 **统一错误处理**: 集成的错误管理和用户友好提示  
♿ **实时数据同步**: WebSocket 自动连接管理和重连机制  
🧩 **模块化设计**: Hook 组合模式，灵活扩展和维护

## 🏗️ 系统架构

### Hook 生态系统

```
薪资管理 Hook 系统
├── 📊 usePayrollPeriod      # 薪资周期管理
├── 🧮 usePayrollCalculation # 薪资计算
├── 📥 usePayrollImportExport # 导入导出
├── ✅ usePayrollApproval    # 审批流程
├── 📈 usePayrollAnalytics   # 统计分析
└── 🔄 usePayrollManagement  # 统一管理
```

### 技术栈

- **React Query** - 状态管理和数据缓存
- **Supabase** - 数据库和实时订阅
- **TypeScript** - 类型安全
- **xlsx** - Excel 处理

## 📋 功能特性

### ✨ 核心功能

- **🔄 实时数据同步** - 基于 Supabase 实时订阅
- **⚡ 智能缓存管理** - React Query 自动优化
- **🛡️ 类型安全保障** - 完整的 TypeScript 支持
- **📊 批量操作支持** - 高效的批量处理能力
- **🔍 进度跟踪** - 实时操作进度监控
- **❌ 统一错误处理** - 集成的错误管理机制

### 🎯 业务功能

- **薪资周期管理** - 创建、更新、锁定薪资周期
- **薪资计算引擎** - 预览、批量、单项计算
- **Excel 导入导出** - 灵活的数据交换
- **多级审批流程** - 可配置的审批工作流
- **统计分析报表** - 全面的数据分析

## 📊 性能特点

### 查询优化
- 智能缓存策略 (5-30分钟不等)
- 条件查询避免无效请求
- 分页和虚拟化支持

### 实时同步
- WebSocket 连接自动管理
- 选择性数据订阅
- 自动重连和错误恢复

### 批量操作
- 服务端批量处理
- 进度跟踪和错误恢复
- 可中断和重试机制

## 🧪 测试覆盖

### 测试体系
- **单元测试** - Hook 逻辑和工具函数
- **集成测试** - Hook 组合和 Supabase 集成
- **端到端测试** - 完整用户流程
- **综合测试页面** - 可视化测试界面

### 覆盖率目标
- 函数覆盖率: **90%+**
- 分支覆盖率: **85%+**
- 行覆盖率: **90%+**

## 🔧 开发工具

### 调试和监控
```typescript
// 启用 React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### 错误追踪
```typescript
// 使用内置错误处理
const { handleError } = useErrorHandler();

try {
  await someOperation();
} catch (error) {
  handleError(error, { 
    customMessage: '操作失败',
    showToast: true 
  });
}
```

## 📈 最佳实践

### 1. Hook 组合使用
```typescript
function ComplexPayrollPage() {
  // 组合多个 Hook
  const periodHook = usePayrollPeriod();
  const calculationHook = usePayrollCalculation();
  const approvalHook = usePayrollApproval();
  
  // 或使用统一 Hook
  const management = usePayrollManagement(periodId);
  
  return <div>{/* 使用组合数据 */}</div>;
}
```

### 2. 性能优化
```typescript
// 条件查询
const { data } = usePayrollDetail(payrollId, {
  enabled: !!payrollId // 只有当 ID 存在时才查询
});

// 缓存配置
const { data } = useQuery({
  queryKey: ['payrolls', filters],
  queryFn: fetchPayrolls,
  staleTime: 10 * 60 * 1000, // 10分钟缓存
  enabled: filters.periodId !== null
});
```

### 3. 错误边界处理
```typescript
function PayrollErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<div>薪资数据加载失败，请刷新页面</div>}
      onError={(error) => console.error('Payroll error:', error)}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 🔍 故障排除

### 常见问题

**Q: Hook 数据不更新？**
```typescript
// 检查实时订阅配置
const hook = usePayrollPeriod({
  enableRealtime: true // ✅ 确保启用
});

// 手动刷新数据
await hook.actions.refresh();
```

**Q: 批量操作失败？**
```typescript
// 检查进度和错误信息
const { progress, loading } = usePayrollCalculation();

console.log('进度:', progress);
console.log('加载状态:', loading);

// 查看具体错误
progress.errors.forEach(error => {
  console.error(`员工 ${error.employeeName}: ${error.error}`);
});
```

**Q: TypeScript 类型错误？**
```typescript
// 使用正确的数据库类型
import type { Database } from '@/types/supabase';

type PayrollRow = Database['public']['Tables']['payrolls']['Row'];
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
```

### 调试技巧

```typescript
// 启用调试模式
const hook = usePayrollPeriod({ debug: true });

// 监听查询状态变化
const queryClient = useQueryClient();
queryClient.getQueryCache().subscribe(event => {
  console.log('Query event:', event);
});

// 检查缓存状态
const cacheData = queryClient.getQueryData(['payrolls']);
console.log('Cache data:', cacheData);
```

## 📝 更新日志

### v1.0.0 (2025-01-15)
- ✅ 完整的薪资管理 Hook 系统发布
- ✅ 支持 React Query 和 Supabase 集成
- ✅ 实时数据同步功能
- ✅ 批量操作和进度跟踪
- ✅ Excel 导入导出功能
- ✅ 多级审批流程
- ✅ 统计分析和报表生成
- ✅ 完整的 TypeScript 类型安全
- ✅ 综合测试页面和测试用例

### 计划功能
- 🔄 移动端响应式适配
- 🔄 离线模式支持
- 🔄 更多报表模板
- 🔄 工作流可视化编辑器
- 🔄 国际化支持扩展

## 🤝 贡献指南

### 开发流程
1. Fork 项目并创建功能分支
2. 编写代码并添加测试用例
3. 确保所有测试通过
4. 提交 Pull Request

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 编写完整的 JSDoc 注释
- 测试覆盖率达到 90% 以上

### 提交规范
```
type(scope): description

feat(hooks): add new payroll calculation feature
fix(period): resolve period creation bug
docs(api): update hook documentation
test(calculation): add unit tests for calculation hook
```

## 📞 技术支持

### 获取帮助
- 📖 [查看 API 文档](./PAYROLL_HOOKS_API.md)
- 🔄 [阅读迁移指南](./MIGRATION_GUIDE.md)
- 🧪 [参考测试指南](./HOOK_TESTING_GUIDE.md)
- 🐛 [提交 Issue](https://github.com/yourorg/salary-system/issues)
- 💬 [讨论区](https://github.com/yourorg/salary-system/discussions)

### 联系方式
- 📧 Email: dev-team@yourcompany.com
- 💬 企业微信: DevTeam-HR-System
- 📞 技术热线: 400-xxx-xxxx

---

**🎉 感谢使用薪资管理 Hooks 系统！**

*本文档会根据系统更新持续维护，最后更新时间: 2025年1月15日*