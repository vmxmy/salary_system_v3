# 表单可访问性指南 (Form Accessibility Guidelines)

## 概述 (Overview)

本文档提供了修复表单可访问性问题的系统化方法，确保应用程序符合 WCAG 2.1 AA 标准。

## 已修复的组件 (Fixed Components) ✅

### 认证表单 (Authentication Forms)
- ✅ LoginPage - 登录页面
- ✅ RegisterPage - 注册页面  
- ✅ ForgotPasswordPage - 忘记密码页面
- ✅ ResetPasswordPage - 重置密码页面

## 标准模式 (Standard Patterns)

### 1. 基本输入字段 (Basic Input Field)

```tsx
<div className="form-control">
  <label htmlFor="unique-field-id" className="label">
    <span className="label-text">字段标签 *</span>
  </label>
  <input
    id="unique-field-id"
    name="fieldName"
    type="text"
    className="input input-bordered"
    value={value}
    onChange={onChange}
    required
    autoComplete="appropriate-value"
    placeholder="输入提示"
    aria-describedby={hasError ? "field-error" : undefined}
    aria-invalid={!!hasError}
  />
  {hasError && (
    <label className="label">
      <span id="field-error" className="label-text-alt text-error">
        {errorMessage}
      </span>
    </label>
  )}
</div>
```

### 2. 邮箱字段 (Email Field)

```tsx
<div className="form-control">
  <label htmlFor="user-email" className="label">
    <span className="label-text">邮箱地址</span>
  </label>
  <input
    id="user-email"
    name="email"
    type="email"
    className="input input-bordered"
    value={formData.email}
    onChange={handleChange}
    required
    autoComplete="email"
    placeholder="user@example.com"
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && (
    <label className="label">
      <span id="email-error" className="label-text-alt text-error">
        {errors.email}
      </span>
    </label>
  )}
</div>
```

### 3. 密码字段 (Password Field)

```tsx
<div className="form-control">
  <label htmlFor="user-password" className="label">
    <span className="label-text">密码</span>
  </label>
  <input
    id="user-password"
    name="password"
    type="password"
    className="input input-bordered"
    value={formData.password}
    onChange={handleChange}
    required
    autoComplete="current-password" // 或 "new-password"
    placeholder="••••••••"
    aria-describedby={errors.password ? "password-error" : undefined}
  />
  {errors.password && (
    <label className="label">
      <span id="password-error" className="label-text-alt text-error">
        {errors.password}
      </span>
    </label>
  )}
</div>
```

### 4. 复选框 (Checkbox)

```tsx
<div className="form-control">
  <label htmlFor="remember-me" className="label cursor-pointer">
    <span className="label-text">记住我</span>
    <input
      id="remember-me"
      name="rememberMe"
      type="checkbox"
      className="checkbox checkbox-primary"
      checked={formData.rememberMe}
      onChange={(e) => setFormData(prev => ({ 
        ...prev, 
        rememberMe: e.target.checked 
      }))}
    />
  </label>
</div>
```

### 5. 下拉选择 (Select Field)

```tsx
<div className="form-control">
  <label htmlFor="user-role" className="label">
    <span className="label-text">用户角色</span>
  </label>
  <select
    id="user-role"
    name="role"
    className="select select-bordered"
    value={formData.role}
    onChange={handleChange}
    required
    aria-describedby={errors.role ? "role-error" : undefined}
  >
    <option value="">请选择角色</option>
    <option value="admin">管理员</option>
    <option value="user">普通用户</option>
  </select>
  {errors.role && (
    <label className="label">
      <span id="role-error" className="label-text-alt text-error">
        {errors.role}
      </span>
    </label>
  )}
</div>
```

## 命名约定 (Naming Conventions)

### ID 命名规则 (ID Naming Rules)
- 格式：`{component}-{field-name}`
- 示例：`login-email`, `register-password`, `user-create-role`

### Name 属性规则 (Name Attribute Rules)
- 使用 camelCase：`email`, `password`, `rememberMe`
- 与后端 API 字段名保持一致

### Error ID 规则 (Error ID Rules)
- 格式：`{field-id}-error`
- 示例：`login-email-error`, `register-password-error`

## AutoComplete 属性 (AutoComplete Values)

| 字段类型 | AutoComplete 值 |
|---------|----------------|
| 邮箱 | `email` |
| 当前密码 | `current-password` |
| 新密码 | `new-password` |
| 姓名 | `name` |
| 用户名 | `username` |
| 手机号 | `tel` |

## 待修复组件优先级 (Priority for Remaining Components)

### 高优先级 (High Priority)
1. **UserCreateModal** - 用户创建弹窗
2. **UserDetailsModal** - 用户详情弹窗  
3. **UserBatchActionsModal** - 批量操作弹窗
4. **EmployeeManagementPage** - 员工管理页面

### 中优先级 (Medium Priority)
5. **PayrollListPage** - 薪资列表页面
6. **StatisticsPage** - 统计页面
7. **DataTable** 组件系列

### 低优先级 (Low Priority)
8. 测试页面和演示组件
9. 已归档的组件

## 检查清单 (Checklist)

修复每个表单组件时，请确认以下项目：

- [ ] 所有 input 元素都有唯一的 `id` 属性
- [ ] 所有 input 元素都有 `name` 属性
- [ ] 所有 label 元素都有 `htmlFor` 属性
- [ ] 错误消息通过 `aria-describedby` 关联到对应字段
- [ ] 必填字段标记了 `required` 属性
- [ ] 适当的 `autoComplete` 属性
- [ ] 错误状态使用 `aria-invalid` 属性
- [ ] 有意义的 `placeholder` 文本

## 测试方法 (Testing Methods)

### 手动测试
1. 使用 Tab 键导航，确保焦点顺序合理
2. 使用屏幕阅读器测试（推荐 NVDA 或 VoiceOver）
3. 检查表单提交时的错误处理

### 自动化测试
- 运行 `npm run build` 检查是否有可访问性相关的编译错误
- 使用浏览器开发者工具的 Accessibility 面板检查

## 最佳实践 (Best Practices)

1. **一致性**: 在整个应用中使用相同的模式
2. **语义化**: 使用语义化的 HTML 元素
3. **错误处理**: 提供清晰、有用的错误消息
4. **焦点管理**: 确保键盘导航体验良好
5. **屏幕阅读器友好**: 提供足够的上下文信息

## 常见问题 (Common Issues)

### 问题：标签未关联到输入字段
**解决方案**: 确保 label 的 `htmlFor` 属性与 input 的 `id` 属性匹配

### 问题：错误消息未被屏幕阅读器读取
**解决方案**: 使用 `aria-describedby` 将错误消息关联到输入字段

### 问题：复选框标签不可点击
**解决方案**: 确保 label 包含 `htmlFor` 属性或嵌套 input 元素

## 资源链接 (Resources)

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [DaisyUI Form Documentation](https://daisyui.com/components/form/)