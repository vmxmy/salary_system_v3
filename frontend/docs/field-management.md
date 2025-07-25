# 字段管理功能说明

## 概述

员工管理系统使用了高级的字段配置器（FieldSelector）来管理表格显示的字段，因此 DataTable 组件的自带字段管理器已被禁用。

## 功能特点

### FieldSelector 高级字段配置器
- 位置：表格工具栏右侧
- 功能：
  - 字段显示/隐藏控制
  - 字段排序（上下移动）
  - 字段搜索
  - 重置为默认配置
  - 显示字段统计信息

### 默认字段配置
系统默认显示以下字段（按顺序）：
1. 姓名 (full_name)
2. 性别 (gender)
3. 人员身份 (category_name)
4. 部门 (department_name)
5. 入职时间 (hire_date)
6. 手机号码 (mobile_phone)

### 配置持久化
- 用户的字段配置保存在浏览器本地存储中
- 配置包括：字段可见性、顺序、宽度等
- 配置有效期：7天（过期后自动恢复默认）

## 使用说明

### 自定义字段显示
1. 点击表格右上角的"字段设置"按钮
2. 在弹出的面板中：
   - 点击眼睛图标切换字段显示/隐藏
   - 使用上下箭头调整字段顺序
   - 使用搜索框快速查找字段
3. 更改会立即生效并自动保存

### 重置配置
- 点击字段设置面板中的重置按钮（刷新图标）
- 或清除浏览器本地存储中的 `table_config_*` 项

## 技术实现

### 相关组件
- `/src/components/common/FieldSelector.tsx` - 字段选择器组件
- `/src/services/column-config.service.tsx` - 列配置服务
- `/src/services/metadata.service.ts` - 表格元数据服务
- `/src/hooks/useTableConfiguration.ts` - 表格配置 Hook

### DataTable 配置
在使用 DataTable 组件时，设置 `showColumnToggle={false}` 来禁用自带的字段管理器：

```tsx
<DataTable
  data={data}
  columns={columns}
  showColumnToggle={false}  // 禁用自带字段管理器
  // ... 其他属性
/>
```