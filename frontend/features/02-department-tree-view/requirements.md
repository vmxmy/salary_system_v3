# 部门树形结构视图

## 功能概述
实现一个可交互的部门树形结构组件，直观展示部门层级关系，支持展开/折叠操作和快速操作菜单。

## 核心需求
- ✅ 递归渲染部门树形结构
- ✅ 支持节点展开/折叠动画
- ✅ 显示部门层级路径（full_path）
- ✅ 集成右键菜单和操作按钮
- ✅ 遵循孔雀屏设计模式

## 主要功能点
1. ✅ 树形结构组件（DepartmentTree）
2. ✅ 树节点组件（DepartmentTreeNode）
3. ✅ 展开/折叠状态管理
4. ✅ 部门快速操作菜单
5. ✅ 选中状态和高亮显示

## 已实现的功能

### DepartmentTree 主组件
- **搜索功能**: 实时搜索部门名称，自动展开匹配节点
- **展开控制**: 展开全部/折叠全部操作
- **状态管理**: 展开节点和选中部门的状态管理
- **数据集成**: 使用 useDepartmentTree hook 获取数据
- **空状态处理**: 优雅的加载和空数据状态显示

### DepartmentTreeNode 节点组件
- **递归渲染**: 支持无限层级的部门结构
- **动画效果**: 平滑的展开/折叠动画
- **视觉层次**: 
  - 缩进显示层级关系
  - 连接线显示父子关系
  - 深度指示器增强视觉效果
- **交互功能**:
  - 点击选择部门
  - 展开/折叠子部门
  - 操作菜单（查看、编辑、添加子部门、删除）
- **信息显示**:
  - 部门名称和完整路径
  - 员工数量统计
  - 部门图标

### 视觉设计特色
- **现代化样式**: 使用现有的设计系统组件
- **微交互动画**: 
  - 展开/折叠图标旋转动画
  - 节点悬停效果
  - 选中状态高亮
- **响应式设计**: 移动端适配优化
- **连接线系统**: CSS实现的树形连接线
- **性能优化**: 硬件加速和contain属性优化

### 技术实现
- **组件架构**: 父子组件通信，状态提升
- **动画系统**: CSS动画 + React状态管理
- **样式系统**: 
  - 独立的CSS文件（department-tree.css）
  - 与现有设计系统集成
  - 支持主题切换
- **可访问性**: 键盘导航和焦点管理
- **类型安全**: 完整的TypeScript类型定义

## 组件API

### DepartmentTree Props
```typescript
interface DepartmentTreeProps {
  selectedDepartmentId?: string;
  onDepartmentSelect?: (department: DepartmentNode) => void;
  onDepartmentAction?: (action: string, department: DepartmentNode) => void;
  showSearch?: boolean;
  showControls?: boolean;
  className?: string;
}
```

### DepartmentTreeNode Props
```typescript
interface DepartmentTreeNodeProps {
  department: DepartmentNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (departmentId: string) => void;
  onSelect: (department: DepartmentNode) => void;
  onMenuAction: (action: string, department: DepartmentNode) => void;
  className?: string;
}
```

## 下一步
树形结构视图已完成，可以继续实现第三个功能：**部门卡片视图**。