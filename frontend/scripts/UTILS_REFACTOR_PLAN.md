# 工具函数重构计划 (Utils Refactoring Plan)

## 📊 现状分析

### 重叠问题识别
```
当前结构：
├── src/lib/format.ts (224行) - 基础格式化函数
├── src/utils/format.ts (276行) - 扩展格式化函数  
├── src/lib/dateUtils.ts (145行) - 日期工具函数
└── 散布在各组件中的工具函数

重叠功能：
1. formatCurrency - 两个版本，参数和实现不同
2. formatDate - 三个版本，功能重叠
3. formatNumber - 两个版本
4. formatFileSize - 完全重复
5. formatRelativeTime - 两个版本，实现略有不同
```

## 🎯 重构目标

### 1. 统一架构
- **单一职责原则**：每个函数只负责一个格式化任务
- **一致性接口**：统一的参数模式和返回值处理
- **国际化支持**：所有文本支持多语言
- **类型安全**：完整的TypeScript类型定义

### 2. 模块化设计
```
src/lib/formatters/
├── index.ts          # 统一导出
├── currency.ts       # 货币格式化
├── date.ts          # 日期格式化  
├── number.ts        # 数字格式化
├── text.ts          # 文本格式化
├── file.ts          # 文件格式化
├── phone.ts         # 电话格式化
└── types.ts         # 类型定义
```

## 📋 详细重构计划

### Phase 1: 创建统一架构 (第1天)

#### 1.1 创建类型定义
```typescript
// src/lib/formatters/types.ts
export interface FormatOptions {
  locale?: string;
  fallback?: string;
  precision?: number;
  currency?: string;
  showSymbol?: boolean;
}

export type FormatResult = string | null;

export interface Formatter<T = any> {
  (value: T, options?: FormatOptions): FormatResult;
}
```

#### 1.2 创建基础工具
```typescript
// src/lib/formatters/base.ts
import { useTranslation } from '@/hooks/useTranslation';

export function createFormatter<T>(
  formatFn: (value: T, options: FormatOptions, t: any) => string
): Formatter<T> {
  return (value: T, options: FormatOptions = {}) => {
    const { t } = useTranslation('common');
    const { fallback = '--' } = options;
    
    if (value === null || value === undefined) {
      return fallback;
    }
    
    try {
      return formatFn(value, options, t);
    } catch (error) {
      console.warn('Format error:', error);
      return fallback;
    }
  };
}
```

### Phase 2: 重构格式化模块 (第2-3天)

#### 2.1 货币格式化模块
```typescript
// src/lib/formatters/currency.ts
import { createFormatter } from './base';
import type { FormatOptions } from './types';

export const formatCurrency = createFormatter<number>((value, options, t) => {
  const { 
    precision = 2, 
    currency = 'CNY', 
    showSymbol = false,
    locale = 'zh-CN' 
  } = options;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value);

  if (showSymbol) {
    const symbol = currency === 'CNY' ? '¥' : currency;
    return `${symbol}${formatted}`;
  }

  return formatted;
});

export const formatPercent = createFormatter<number>((value, options, t) => {
  const { precision = 2 } = options;
  return `${(value * 100).toFixed(precision)}%`;
});
```

#### 2.2 日期格式化模块
```typescript
// src/lib/formatters/date.ts
import { createFormatter } from './base';

export const formatDate = createFormatter<string | Date>((value, options, t) => {
  const dateObj = typeof value === 'string' ? new Date(value) : value;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }

  const { format = 'medium', locale = 'zh-CN' } = options;
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    short: { year: 'numeric', month: '2-digit', day: '2-digit' }
  };

  return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
});

export const formatRelativeTime = createFormatter<string | Date>((value, options, t) => {
  const dateObj = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return t('time.just_now');
  } else if (diffInMinutes < 60) {
    return t('time.minutes_ago', { count: diffInMinutes });
  } else if (diffInHours < 24) {
    return t('time.hours_ago', { count: diffInHours });
  } else if (diffInDays < 30) {
    return t('time.days_ago', { count: diffInDays });
  } else {
    return formatDate(dateObj, { format: 'short' });
  }
});
```

#### 2.3 统一导出
```typescript
// src/lib/formatters/index.ts
export * from './currency';
export * from './date';
export * from './number';
export * from './text';
export * from './file';
export * from './phone';
export * from './types';

// 提供向后兼容的导出
export { formatCurrency as formatMoney } from './currency';
export { formatDate as formatDateTime } from './date';
```

### Phase 3: 迁移现有代码 (第4-5天)

#### 3.1 更新导入语句
```typescript
// 批量替换
// 旧的导入
import { formatCurrency } from '@/lib/format';
import { formatDate } from '@/utils/format';

// 新的导入
import { formatCurrency, formatDate } from '@/lib/formatters';
```

#### 3.2 清理冗余文件
```bash
# 删除重复文件
rm src/utils/format.ts
rm src/lib/format.ts

# 保留 dateUtils.ts 中的业务逻辑函数
# 只迁移格式化相关函数
```

### Phase 4: 验证和优化 (第6-7天)

#### 4.1 自动化测试
```typescript
// src/lib/formatters/__tests__/currency.test.ts
import { formatCurrency, formatPercent } from '../currency';

describe('Currency Formatters', () => {
  test('formatCurrency with default options', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56');
  });

  test('formatCurrency with symbol', () => {
    expect(formatCurrency(1234.56, { showSymbol: true })).toBe('¥1,234.56');
  });

  test('formatCurrency with null value', () => {
    expect(formatCurrency(null)).toBe('--');
  });
});
```

#### 4.2 性能基准测试
```typescript
// benchmarks/formatters.bench.ts
import { formatCurrency } from '@/lib/formatters';

const iterations = 10000;
const testValue = 12345.67;

console.time('formatCurrency');
for (let i = 0; i < iterations; i++) {
  formatCurrency(testValue);
}
console.timeEnd('formatCurrency');
```

## 🔧 实施时间表

### 第1天 (立即开始)
- [x] 创建 `UTILS_REFACTOR_PLAN.md`
- [ ] 创建基础架构和类型定义
- [ ] 建立新的文件结构

### 第2-3天
- [ ] 重构货币格式化模块
- [ ] 重构日期格式化模块
- [ ] 重构数字和文本格式化模块

### 第4-5天
- [ ] 迁移现有代码到新架构
- [ ] 更新所有导入语句
- [ ] 清理冗余文件

### 第6-7天
- [ ] 编写单元测试
- [ ] 性能验证
- [ ] 文档更新

## 📊 迁移映射表

### 格式化函数迁移
| 原函数 | 原位置 | 新函数 | 新位置 |
|--------|--------|--------|--------|
| `formatCurrency` (lib) | `src/lib/format.ts` | `formatCurrency` | `src/lib/formatters/currency.ts` |
| `formatCurrency` (utils) | `src/utils/format.ts` | `formatCurrency` | `src/lib/formatters/currency.ts` |
| `formatDate` (lib) | `src/lib/format.ts` | `formatDate` | `src/lib/formatters/date.ts` |
| `formatDate` (utils) | `src/utils/format.ts` | `formatDate` | `src/lib/formatters/date.ts` |
| `formatDate` (dateUtils) | `src/lib/dateUtils.ts` | `formatDate` | `src/lib/formatters/date.ts` |
| `formatRelativeTime` | 两个文件都有 | `formatRelativeTime` | `src/lib/formatters/date.ts` |

### 业务逻辑函数保留
| 函数 | 位置 | 说明 |
|------|------|------|
| `getMonthDateRange` | `src/lib/dateUtils.ts` | 业务逻辑，保留不变 |
| `getCurrentYearMonth` | `src/lib/dateUtils.ts` | 业务逻辑，保留不变 |
| `formatEmployeeStatus` | `src/utils/format.ts` | 迁移至相应业务模块 |

## ✅ 验收标准

1. **零重复**：消除所有重复的工具函数
2. **统一接口**：所有格式化函数使用一致的接口模式
3. **国际化支持**：所有文本输出支持多语言
4. **类型安全**：完整的TypeScript类型覆盖
5. **性能稳定**：重构后性能不下降
6. **向后兼容**：现有代码迁移无破坏性变更

## 🚀 长期维护

### 1. 代码规范
- 新增格式化函数必须放在对应模块
- 必须包含单元测试
- 必须支持国际化

### 2. 自动化检查
```json
// package.json scripts
{
  "scripts": {
    "check:duplicates": "node scripts/check-duplicate-utils.js",
    "test:formatters": "jest src/lib/formatters",
    "lint:formatters": "eslint src/lib/formatters"
  }
}
```

### 3. 文档维护
- 保持 API 文档同步
- 更新使用示例
- 记录破坏性变更

---

*这个重构计划将彻底解决工具函数重叠问题，建立可持续的维护架构。*