# 增强导入进度管理系统使用指南

## 概述

增强导入进度管理系统提供了批处理、权重进度计算、取消操作和性能监控等高级功能，同时保持与现有代码的完全向后兼容性。

## 主要特性

### 🚀 智能批处理 (SmartBatchProcessor)
- **自适应批次大小**: 根据处理性能自动调整批次大小
- **进度节流**: 避免频繁UI更新，提升用户体验
- **错误处理**: 完善的错误收集和恢复机制
- **取消支持**: 支持中途取消长时间运行的操作

### ⚖️ 权重进度计算 (WeightedProgressCalculator)  
- **按操作复杂度分配权重**: 更准确的进度预估
- **多阶段进度管理**: 支持解析、验证、导入等多个阶段
- **预估剩余时间**: 基于历史数据的智能时间预估
- **平滑进度更新**: 避免进度条跳跃

### 📊 统一进度管理 (ProgressManager)
- **集成所有功能**: 统一管理批处理和权重计算
- **性能监控**: 实时监控内存使用、处理速度等指标
- **状态同步**: 自动同步基础和增强进度状态

## 使用方法

### 基础使用（向后兼容）

```typescript
import { usePayrollImportExport } from '@/hooks/payroll/usePayrollImportExport';

const {
  actions: { importExcel },
  importProgress,
  loading
} = usePayrollImportExport();

// 使用原有的导入方法
await importExcel({
  file: selectedFile,
  config: importConfig,
  periodId: '2025-01'
});
```

### 增强使用（新功能）

```typescript
import { usePayrollImportExport } from '@/hooks/payroll/usePayrollImportExport';

const {
  actions: { importExcelEnhanced, cancelImport },
  enhancedProgress,
  control: { canCancel, isCancelling },
  utils: { getPerformanceMetrics, formatDuration }
} = usePayrollImportExport();

// 使用增强的导入方法
await importExcelEnhanced({
  file: selectedFile,
  config: importConfig,
  periodId: '2025-01'
});

// 取消操作
if (canCancel) {
  cancelImport();
}

// 获取性能指标
const metrics = getPerformanceMetrics();
```

## 进度状态结构

### 基础进度状态 (ImportProgress)
```typescript
interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'creating_payrolls' | 'inserting_items' | 'completed' | 'error';
  global: {
    totalGroups: number;
    processedGroups: number;
    totalRecords: number;
    processedRecords: number;
    dataGroups: string[];
  };
  current: {
    groupName: string;
    groupIndex: number;
    sheetName: string;
    totalRecords: number;
    processedRecords: number;
    // ... 其他字段
  };
  message?: string;
  errors: any[];
  warnings: any[];
}
```

### 增强进度状态 (EnhancedImportProgress)
```typescript
interface EnhancedImportProgress extends ImportProgress {
  enhanced: {
    // 权重进度
    weightedProgress: {
      totalProgress: number;           // 总体权重进度 0-100
      currentPhase: string;           // 当前阶段名称
      currentPhaseProgress: number;   // 当前阶段进度 0-100
      estimatedTimeRemaining?: number; // 预估剩余时间（秒）
      averageSpeed?: number;          // 平均处理速度（记录/秒）
    };
    
    // 批处理状态
    batchProcessor: {
      currentBatchSize: number;       // 当前批次大小
      isProcessing: boolean;          // 是否正在处理
      processingSpeed?: number;       // 处理速度（记录/秒）
    };
    
    // 控制状态
    canCancel: boolean;               // 是否可以取消
    isCancelling: boolean;            // 是否正在取消
    
    // 性能指标
    performance: {
      averageProcessingTime: number;  // 平均处理时间（毫秒）
      memoryUsage?: number;          // 内存使用（MB）
      estimatedTimeRemaining?: number; // 预估剩余时间（秒）
    };
  };
}
```

## 组件使用

### 增强进度条组件

```typescript
import { EnhancedImportProgressComponent } from '@/components/payroll/EnhancedImportProgress';

<EnhancedImportProgressComponent
  progress={enhancedProgress}
  onCancel={canCancel ? cancelImport : undefined}
  className="my-custom-class"
/>
```

### 性能指标显示

```typescript
const performanceMetrics = getPerformanceMetrics();

if (performanceMetrics) {
  return (
    <div>
      <div>处理速度: {performanceMetrics.processingSpeed?.toFixed(1)} 条/秒</div>
      <div>剩余时间: {formatDuration(performanceMetrics.estimatedTimeRemaining)}</div>
      <div>内存使用: {performanceMetrics.memoryUsage?.toFixed(1)} MB</div>
      <div>批次大小: {performanceMetrics.currentBatchSize}</div>
    </div>
  );
}
```

## 配置选项

### 批处理器配置

```typescript
{
  batchProcessor: {
    initialBatchSize: 50,        // 初始批次大小
    minBatchSize: 10,           // 最小批次大小
    maxBatchSize: 200,          // 最大批次大小
    progressThrottleMs: 100,    // 进度更新节流间隔（毫秒）
    performanceThreshold: 1000   // 性能阈值（毫秒）
  },
  enablePerformanceMonitoring: true,  // 启用性能监控
  progressUpdateInterval: 100          // 进度更新间隔（毫秒）
}
```

### 权重配置

系统预定义了薪资导入的权重配置：

```typescript
const phases = [
  { name: 'parsing', weight: 0.15 },      // 解析Excel文件
  { name: 'validating', weight: 0.25 },   // 数据验证
  { name: 'creating_payrolls', weight: 0.20 }, // 创建薪资记录
  { name: 'inserting_items', weight: 0.35 },   // 插入明细项目
  { name: 'completed', weight: 0.05 }     // 完成清理
];
```

## 最佳实践

### 1. 大数据集处理
- 对于超过1000条记录的数据集，建议启用增强进度管理
- 系统会自动优化批次大小以获得最佳性能

### 2. 用户体验优化
- 显示预估剩余时间帮助用户了解进度
- 提供取消操作让用户能够中途退出
- 使用进度节流避免界面卡顿

### 3. 错误处理
- 监控错误率，及时提醒用户
- 收集详细的错误信息用于问题排查
- 提供重试机制处理临时性错误

### 4. 性能监控
- 监控内存使用，避免内存泄漏
- 跟踪处理速度，识别性能瓶颈
- 记录性能指标用于系统优化

## 迁移指南

### 从基础版本迁移

1. **无需修改现有代码**: 所有现有功能保持不变
2. **渐进式启用**: 可以选择性地在特定场景启用增强功能
3. **组件升级**: 更新进度显示组件以支持新功能

### 示例迁移

**之前:**
```typescript
const { actions: { importExcel }, importProgress } = usePayrollImportExport();
await importExcel(params);
```

**之后:**
```typescript
const { 
  actions: { importExcelEnhanced }, 
  enhancedProgress 
} = usePayrollImportExport();
await importExcelEnhanced(params); // 自动启用增强功能
```

## 故障排查

### 常见问题

1. **进度条不更新**
   - 检查是否正确设置进度回调
   - 确认进度节流设置是否合理

2. **取消操作无效**
   - 确认取消操作在正确的时机调用
   - 检查AbortController是否正确传递

3. **性能指标不准确**
   - 确认启用了性能监控
   - 检查浏览器是否支持Performance API

4. **内存使用过高**
   - 调整批次大小设置
   - 检查是否有内存泄漏

### 调试技巧

```typescript
// 启用详细日志
console.log('进度状态:', enhancedProgress);
console.log('性能指标:', getPerformanceMetrics());

// 监控批处理状态
const batchState = enhancedProgress?.enhanced.batchProcessor;
console.log('批处理状态:', batchState);
```

## 扩展功能

### 自定义权重配置

```typescript
import { WeightedProgressCalculator } from '@/utils/import/WeightedProgressCalculator';

const customPhases = [
  { name: 'custom_phase', weight: 0.5, totalSteps: 100, completedSteps: 0 }
];

const calculator = new WeightedProgressCalculator({ phases: customPhases });
```

### 自定义批处理器

```typescript
import { SmartBatchProcessor } from '@/utils/import/SmartBatchProcessor';

const processor = new SmartBatchProcessor({
  initialBatchSize: 100,
  performanceThreshold: 500
});
```

## 更新日志

### v1.0.0 (当前版本)
- ✅ 智能批处理器实现
- ✅ 权重进度计算器实现
- ✅ 统一进度管理器实现
- ✅ 取消操作支持
- ✅ 性能监控功能
- ✅ 向后兼容性保证
- ✅ 完整的TypeScript类型定义
- ✅ 组件和示例代码

### 未来计划
- 🔄 持久化进度状态（页面刷新恢复）
- 🔄 导出功能的进度管理支持
- 🔄 更多性能优化选项
- 🔄 自定义进度主题支持