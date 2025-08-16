# 归档的服务层代码

此文件夹包含已归档的旧服务层代码，这些代码已被纯 Hook 架构替代。

## 归档时间
2025-01-16

## 归档原因
系统架构从服务层模式迁移到纯 Hook 系统，直接使用 Supabase BaaS，移除中间服务层。

## 归档内容

### 服务层文件 (services/)
- `base.service.ts` - 基础服务类
- `metadata.service.ts` - 元数据服务
- `performance-monitor.service.ts` - 性能监控服务
- `excel.service.ts` - Excel处理服务
- `import-template.service.ts` - 导入模板服务
- `payroll-creation.service.ts` - 薪资创建服务
- `payroll-export.service.ts` - 薪资导出服务
- `payroll-import.service.ts` - 薪资导入服务
- `payroll-statistics.service.ts` - 薪资统计服务
- `payroll-validation.service.ts` - 薪资验证服务
- `salary-component-fields.service.ts` - 薪资组件字段服务
- `column-config.service.tsx` - 列配置服务

### 其他相关文件
- `backup-auth/auth.service.ts` - 备份的认证服务

## 迁移后的架构

### 新的 Hook 系统
所有服务层功能已迁移到以下 hooks：

1. **useTableConfiguration** - 替代 metadata.service.ts
2. **usePermission** - 权限管理，使用常量配置
3. **useInsuranceBases** - 替代保险基数服务
4. **usePerformanceMonitor** - 替代 performance-monitor.service.ts
5. **useInsuranceConfig** - 保险配置管理
6. **useExcelTemplate** - 替代 import-template.service.ts

### 架构改进
- **直接 Supabase 查询**: 移除中间服务层，直接使用 Supabase SDK
- **常量配置管理**: 使用 constants/ 文件夹管理配置
- **类型安全**: 使用 Supabase 生成的类型
- **更好的性能**: 减少抽象层，提高查询效率

## 注意事项

⚠️ **这些文件仅供参考，不应在新代码中使用**

如果需要实现类似功能，请：
1. 使用对应的 Hook
2. 直接调用 Supabase
3. 使用常量配置

## 还需要清理的引用

以下组件仍在引用旧服务层（需要更新）：
- PayrollListPage.tsx
- PayrollReports.tsx
- PayrollCycleWizardPage.tsx
- FieldSelector.tsx
- PayrollImportPage.tsx
- HistoryDataExporter.tsx
- ValidationStep.tsx
- PerformanceDashboard.tsx
- PerformanceMonitorPage.tsx
- ConfirmationStep.tsx
- DepartmentImportExport.tsx

这些组件需要逐步迁移到新的 Hook 架构。