# 国际化使用规范指南 (i18n Guidelines)

## 📖 概述

本文档制定了薪资管理系统的国际化使用标准，确保项目中所有文本内容的一致性和可维护性。

## 🎯 核心原则

### 1. 绝对禁止硬编码文本
```typescript
// ❌ 错误示例
<button>保存</button>
<span>员工管理</span>
alert('操作成功');

// ✅ 正确示例
<button>{t('common:actions.save')}</button>
<span>{t('common:modules.employee_management')}</span>
alert(t('common:messages.operation_success'));
```

### 2. 统一使用 useTranslation Hook
```typescript
// ✅ 标准用法
import { useTranslation } from '@/hooks/useTranslation';

export function MyComponent() {
  const { t } = useTranslation(['common', 'employee']);
  
  return (
    <div>
      <h1>{t('employee:title')}</h1>
      <button>{t('common:actions.submit')}</button>
    </div>
  );
}
```

## 🗂️ 命名空间规范

### 主要命名空间
- `common`: 通用文本（按钮、操作、状态等）
- `auth`: 认证相关
- `dashboard`: 仪表板
- `employee`: 员工管理
- `payroll`: 薪资管理
- `department`: 部门管理
- `finance`: 财务相关

### 命名空间内部结构
```json
{
  "common": {
    "actions": {
      "save": "保存",
      "cancel": "取消",
      "delete": "删除",
      "edit": "编辑",
      "create": "创建",
      "submit": "提交",
      "reset": "重置",
      "search": "搜索",
      "filter": "筛选",
      "export": "导出",
      "import": "导入"
    },
    "status": {
      "active": "激活",
      "inactive": "停用",
      "pending": "待处理",
      "approved": "已批准",
      "rejected": "已拒绝"
    },
    "messages": {
      "operation_success": "操作成功",
      "operation_failed": "操作失败",
      "loading": "加载中...",
      "no_data": "暂无数据",
      "confirm_delete": "确认删除？"
    },
    "modules": {
      "dashboard": "工作台",
      "employee_management": "员工管理",
      "payroll_management": "薪资管理",
      "department_management": "部门管理"
    }
  }
}
```

## 📝 最佳实践

### 1. 动态内容处理
```typescript
// ✅ 使用插值
t('employee:messages.delete_confirm', { name: employee.name })

// 对应翻译文件
{
  "messages": {
    "delete_confirm": "确认删除员工 {{name}} 吗？"
  }
}
```

### 2. 条件文本处理
```typescript
// ✅ 使用条件键名
const statusKey = isActive ? 'active' : 'inactive';
const statusText = t(`common:status.${statusKey}`);

// ❌ 避免条件文本
const statusText = isActive ? '激活' : '停用';
```

### 3. 复数形式处理
```typescript
// ✅ 使用复数键
t('employee:count', { count: employees.length })

// 对应翻译文件
{
  "count_one": "{{count}} 名员工",
  "count_other": "{{count}} 名员工"
}
```

### 4. 长文本处理
```typescript
// ✅ 将长文本拆分
<div>
  <h2>{t('help:payroll.title')}</h2>
  <p>{t('help:payroll.description')}</p>
  <ul>
    <li>{t('help:payroll.step1')}</li>
    <li>{t('help:payroll.step2')}</li>
  </ul>
</div>
```

## 🚫 常见错误和避免方法

### 1. 临时翻译映射
```typescript
// ❌ 当前问题代码 (Sidebar.tsx:151-165)
const translations: Record<string, string> = {
  'dashboard': '工作台',
  'employees': '员工管理',
  // ...
};
return translations[key] || String(t(`common:nav.${key}`));

// ✅ 正确做法
return t(`common:nav.${key}`);
```

### 2. 混合使用
```typescript
// ❌ 问题代码
<span className="text-xs opacity-70">{user.email}</span>
<button className="text-error">退出登录</button>

// ✅ 正确做法
<span className="text-xs opacity-70">{user.email}</span>
<button className="text-error">{t('common:actions.logout')}</button>
```

### 3. 格式化函数中的硬编码
```typescript
// ❌ 问题代码 (formatRelativeTime函数)
if (diffInMinutes < 1) {
  return '刚刚';
} else if (diffInMinutes < 60) {
  return `${diffInMinutes}分钟前`;
}

// ✅ 正确做法
if (diffInMinutes < 1) {
  return t('common:time.just_now');
} else if (diffInMinutes < 60) {
  return t('common:time.minutes_ago', { count: diffInMinutes });
}
```

## 🔧 重构优先级

### 高优先级 (立即修复)
1. `src/components/layout/Sidebar.tsx` - 临时翻译映射
2. `src/lib/format.ts` - formatRelativeTime等函数
3. `src/utils/format.ts` - formatEmployeeStatus等函数

### 中优先级 (1-2周内)
4. 图表组件中的硬编码标签
5. 错误消息和提示文本
6. 表单验证消息

### 低优先级 (持续优化)
7. 帮助文档和说明文本
8. 调试和开发相关文本

## 📊 翻译文件结构建议

### 更新 common.json
```json
{
  "nav": {
    "dashboard": "工作台",
    "employees": "员工管理",
    "departments": "部门管理",
    "payroll": "薪资管理",
    "payroll_import": "薪资导入",
    "payroll_management": "薪资列表",
    "payroll_approval": "薪资审批",
    "insurance_config": "五险一金配置",
    "test_features": "计算验证",
    "insurance_calculation": "保险计算测试",
    "payroll_calculation": "薪资计算测试",
    "font_test": "字体测试"
  },
  "time": {
    "just_now": "刚刚",
    "minutes_ago": "{{count}}分钟前",
    "hours_ago": "{{count}}小时前",
    "days_ago": "{{count}}天前",
    "months_ago": "{{count}}个月前",
    "years_ago": "{{count}}年前"
  },
  "file_size": {
    "bytes": "字节",
    "kilobytes": "KB",
    "megabytes": "MB",
    "gigabytes": "GB",
    "terabytes": "TB"
  }
}
```

## 🛠️ 工具和自动化

### 1. 创建检查脚本
```bash
# 创建 scripts/check-i18n.js
# 自动检测硬编码中文文本
```

### 2. ESLint 规则
```json
{
  "rules": {
    "no-chinese-text": "error",
    "require-i18n-key": "warn"
  }
}
```

### 3. 开发时检查
```typescript
// 开发环境警告未翻译文本
if (process.env.NODE_ENV === 'development') {
  console.warn('Untranslated text detected:', text);
}
```

## 📈 实施计划

### 第1周：立即修复
- 修复 Sidebar.tsx 临时翻译映射
- 重构格式化函数中的硬编码

### 第2周：系统梳理
- 完善翻译文件结构
- 重构高频使用组件

### 第3-4周：全面覆盖
- 完成所有组件的国际化改造
- 建立检查和验证机制

## ✅ 验收标准

1. **零硬编码文本**：项目中不存在任何硬编码的中文文本
2. **命名规范统一**：所有翻译键遵循命名空间和结构规范
3. **功能完整**：所有文本支持多语言切换
4. **维护性良好**：新增功能能够轻松集成国际化

---

*本指南将持续更新，确保与项目发展保持同步。*