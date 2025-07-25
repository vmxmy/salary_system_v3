# 国际化（i18n）配置管理指南

## 目录
1. [概述](#概述)
2. [技术栈](#技术栈)
3. [目录结构](#目录结构)
4. [配置说明](#配置说明)
5. [使用指南](#使用指南)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)
8. [维护指南](#维护指南)

## 概述

本项目使用 react-i18next 实现国际化功能，支持中文（zh-CN）和英文（en-US）两种语言。国际化系统采用模块化设计，便于管理和维护大型应用的翻译内容。

## 技术栈

- **react-i18next**: React 国际化框架
- **i18next**: 核心国际化库
- **i18next-browser-languagedetector**: 自动检测用户语言偏好

## 目录结构

```
src/
├── locales/
│   ├── zh-CN/                    # 中文翻译文件
│   │   ├── common.json          # 通用翻译
│   │   ├── auth.json            # 认证相关
│   │   ├── dashboard.json       # 仪表板
│   │   ├── employee.json        # 员工管理
│   │   ├── payroll.json         # 薪资管理
│   │   └── admin.json           # 系统管理
│   ├── en-US/                    # 英文翻译文件
│   │   └── ... (同上结构)
│   └── index.ts                  # i18n 配置文件
├── hooks/
│   └── useTranslation.ts         # 自定义翻译 Hook
└── components/
    └── common/
        └── LanguageSwitcher.tsx  # 语言切换组件
```

## 配置说明

### 1. 主配置文件 (`src/locales/index.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入所有翻译文件
import zhCNCommon from './zh-CN/common.json';
// ... 其他导入

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        common: zhCNCommon,
        // ... 其他命名空间
      },
      'en-US': {
        // ... 英文资源
      },
    },
    lng: 'zh-CN',              // 默认语言
    fallbackLng: 'zh-CN',      // 回退语言
    defaultNS: 'common',       // 默认命名空间
    ns: ['common', 'auth', 'dashboard', 'employee', 'payroll', 'admin'],
    
    interpolation: {
      escapeValue: false,      // React 已经转义
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });
```

### 2. 翻译文件结构

每个翻译文件应该按照功能模块组织，采用嵌套的 JSON 结构：

```json
{
  "title": "仪表板",
  "stats": {
    "totalEmployees": "员工总数",
    "departments": "部门数量",
    "payrollTotal": "薪资总额",
    "activePositions": "在职岗位"
  },
  "actions": {
    "add": "添加",
    "edit": "编辑",
    "delete": "删除"
  }
}
```

## 使用指南

### 1. 在组件中使用翻译

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function MyComponent() {
  // 使用单个命名空间
  const { t } = useTranslation('dashboard');
  
  // 或使用多个命名空间
  const { t } = useTranslation(['dashboard', 'common']);
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('common:actions.add')}</button>
    </div>
  );
}
```

### 2. 使用插值

```typescript
// 翻译文件
{
  "welcome": "欢迎，{{name}}！",
  "itemCount": "共 {{count}} 个项目"
}

// 组件中使用
<p>{t('welcome', { name: '张三' })}</p>
<p>{t('itemCount', { count: 42 })}</p>
```

### 3. 格式化辅助函数

自定义的 `useTranslation` Hook 提供了额外的格式化函数：

```typescript
const { t, formatCurrency, formatDate, formatDateTime } = useTranslation();

// 格式化货币（根据语言自动选择 ¥ 或 $）
formatCurrency(1234.56); // "¥1,234.56" 或 "$1,234.56"

// 格式化日期
formatDate(new Date()); // "2024/1/24" 或 "1/24/2024"

// 格式化日期时间
formatDateTime(new Date()); // "2024年1月24日 14:30" 或 "January 24, 2024 at 2:30 PM"
```

### 4. 语言切换

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
      <option value="zh-CN">中文</option>
      <option value="en-US">English</option>
    </select>
  );
}
```

## 最佳实践

### 1. 命名约定

- **命名空间**：使用功能模块名，如 `dashboard`、`employee`
- **键名**：使用点号分隔的层级结构，如 `stats.totalEmployees`
- **变量名**：使用 camelCase，如 `{{userName}}`

### 2. 组织原则

- **按功能模块**：每个主要功能模块一个翻译文件
- **通用内容**：放在 `common.json` 中
- **避免重复**：相同的翻译放在 common 中复用

### 3. 翻译键命名

```json
{
  // ✅ 好的命名
  "employee": {
    "list": {
      "title": "员工列表",
      "actions": {
        "add": "添加员工",
        "edit": "编辑员工"
      }
    }
  },
  
  // ❌ 避免的命名
  "employeeListTitle": "员工列表",
  "addEmployeeButton": "添加员工"
}
```

### 4. 性能优化

- 使用命名空间按需加载翻译
- 避免在翻译文件中放置大量不常用的文本
- 对于动态内容，考虑使用懒加载

## 常见问题

### Q1: 如何添加新的翻译模块？

1. 在 `locales/zh-CN/` 和 `locales/en-US/` 下创建新的 JSON 文件
2. 在 `locales/index.ts` 中导入新文件
3. 将其添加到 resources 配置和 ns 数组中

### Q2: 如何处理复数形式？

```json
{
  "item": "{{count}} 个项目",
  "item_0": "没有项目",
  "item_1": "1 个项目",
  "item_other": "{{count}} 个项目"
}
```

### Q3: 如何处理 HTML 内容？

```typescript
import { Trans } from 'react-i18next';

// 翻译文件
{
  "terms": "请阅读我们的<1>服务条款</1>"
}

// 组件中
<Trans i18nKey="terms">
  请阅读我们的<a href="/terms">服务条款</a>
</Trans>
```

## 维护指南

### 1. 添加新页面的翻译

1. 确定页面所属的功能模块
2. 在对应的翻译文件中添加新的翻译键
3. 如果是新模块，创建新的翻译文件并更新配置
4. 在组件中使用 `useTranslation` Hook

### 2. 翻译文件验证

定期检查：
- [ ] 所有翻译键在中英文文件中都存在
- [ ] 没有未使用的翻译键
- [ ] 插值变量名一致
- [ ] 格式化标记正确

### 3. 翻译工作流程

1. **开发阶段**：开发者添加翻译键和中文翻译
2. **翻译阶段**：提供英文翻译文件给翻译人员
3. **审核阶段**：检查翻译的准确性和一致性
4. **测试阶段**：在不同语言下测试界面显示

### 4. 命令行工具（待实现）

```bash
# 扫描未翻译的文本
npm run i18n:scan

# 检查翻译文件完整性
npm run i18n:check

# 提取所有翻译键
npm run i18n:extract
```

## 注意事项

1. **避免硬编码文本**：所有用户可见的文本都应该通过 i18n 系统
2. **保持一致性**：相同含义的文本使用相同的翻译
3. **上下文考虑**：某些词在不同上下文可能需要不同翻译
4. **文化适应**：考虑不同文化的表达习惯，而不是直译

## 示例代码

### 完整组件示例

```typescript
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';

export function EmployeeList() {
  const { t, formatDate } = useTranslation('employee');
  const [employees, setEmployees] = useState([]);
  
  return (
    <div>
      <h1>{t('list.title')}</h1>
      
      <button className="btn btn-primary">
        {t('list.actions.add')}
      </button>
      
      <table>
        <thead>
          <tr>
            <th>{t('fields.name')}</th>
            <th>{t('fields.department')}</th>
            <th>{t('fields.joinDate')}</th>
            <th>{t('common:actions.title')}</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.name}</td>
              <td>{emp.department}</td>
              <td>{formatDate(emp.joinDate)}</td>
              <td>
                <button>{t('common:actions.edit')}</button>
                <button>{t('common:actions.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {employees.length === 0 && (
        <p>{t('list.empty')}</p>
      )}
    </div>
  );
}
```

---

更新日期：2024-01-24  
版本：1.0