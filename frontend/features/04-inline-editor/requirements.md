# 内联编辑器

## 功能概述
实现点击即编辑的内联编辑器组件，支持多种数据类型，提供流畅的编辑体验和乐观更新机制。

## 核心需求

### 1. 编辑器类型
根据字段类型自动选择合适的编辑器：
- **文本编辑器**：普通文本、多行文本
- **数字编辑器**：整数、小数、货币
- **日期选择器**：日期、日期时间
- **下拉选择器**：单选、多选
- **开关切换**：布尔值
- **文件上传**：文档、图片
- **自定义编辑器**：如身份证、手机号等特殊格式

### 2. 编辑交互流程
1. 点击字段进入编辑模式
2. 显示编辑控件和操作按钮
3. 实时验证输入
4. 保存/取消操作
5. 显示保存状态反馈

### 3. 乐观更新机制
- 立即更新UI，不等待服务器响应
- 后台异步保存
- 失败时回滚并提示
- 显示同步状态指示器

## 技术实现要点

### 通用编辑器组件
```tsx
interface InlineEditorProps<T = any> {
  value: T;
  fieldMeta: FieldMetadata;
  onSave: (newValue: T) => Promise<void>;
  disabled?: boolean;
  isEditing?: boolean;
  isLocked?: boolean; // 被其他用户锁定
  lockedBy?: string; // 锁定用户信息
}

const InlineEditor: React.FC<InlineEditorProps> = ({
  value,
  fieldMeta,
  onSave,
  disabled,
  isLocked,
  lockedBy
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  
  // 根据 fieldMeta.type 渲染不同的编辑器
};
```

### 验证机制
```typescript
interface ValidationRule {
  type: 'required' | 'pattern' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

const validateField = (
  value: any, 
  rules: ValidationRule[]
): ValidationResult => {
  // 实现验证逻辑
};
```

## 特殊字段处理

### 身份证编辑器
- 格式验证
- 自动提取生日、性别
- 脱敏显示

### 银行账号编辑器
- 格式化显示（4位一组）
- 银行识别
- 安全输入模式

## 用户体验优化
- 编辑模式的视觉反馈
- 自动聚焦
- ESC 键取消，Enter 键保存
- 失去焦点自动保存选项
- 撤销/重做支持

## 错误处理
- 网络错误重试机制
- 验证错误的清晰提示
- 并发编辑冲突提示