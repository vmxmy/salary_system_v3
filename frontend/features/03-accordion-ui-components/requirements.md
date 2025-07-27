# 手风琴UI组件

## 功能概述
创建响应式的手风琴布局组件，用于分组展示员工信息，支持实时数据更新和优雅的交互体验。

## 核心需求

### 1. 信息分组结构
基于元数据动态生成以下信息组：
- **基本信息**（默认展开）
  - 姓名、性别、身份证号、出生日期等
- **职务信息**（默认展开）  
  - 部门、职位、上级、入职日期、在职状态等
- **联系方式**
  - 手机、邮箱（工作/个人）、地址等
- **银行信息**
  - 开户行、账号、支行等
- **教育背景**
  - 学历、学校、专业、毕业时间等
- **工作经历**
  - 历史职位、部门变动等
- **文档资料**
  - 上传的相关文档
- **其他信息**
  - 社保基数、专项扣除等

### 2. 交互特性
- 平滑的展开/收起动画
- 记忆用户的展开状态偏好
- 支持键盘导航（上下箭头切换组）
- 移动端友好的触摸交互

### 3. 视觉设计
- 现代化的卡片式设计
- 清晰的信息层次
- 适当的间距和留白
- 支持深色模式

## 技术实现要点

### 组件结构
```tsx
interface AccordionSection {
  id: string;
  title: string;
  icon: ReactNode;
  defaultOpen: boolean;
  fields: FieldMetadata[];
  data: Record<string, any>;
  onFieldEdit: (fieldName: string, value: any) => void;
  editingFields?: string[]; // 当前被其他用户编辑的字段
}

const EmployeeAccordion: React.FC<{
  sections: AccordionSection[];
  loading?: boolean;
}> = ({ sections, loading }) => {
  // 实现逻辑
};
```

### 动画实现
- 使用 CSS transitions 实现平滑动画
- 高度自动计算，避免抖动
- 渐进式内容加载

## 响应式设计
- 桌面端：侧边固定导航 + 主内容区
- 平板端：全宽手风琴
- 移动端：单列布局，一次只展开一个组

## 可访问性
- ARIA 属性支持
- 键盘导航
- 屏幕阅读器优化