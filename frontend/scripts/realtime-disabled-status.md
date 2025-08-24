# Supabase Realtime 停用状态

## ✅ 已停用的 Realtime 功能

### 1. PayrollListPage.tsx
- `usePayrollRealtime({ enabled: false })` 
- 注释更新为"已停用"

### 2. PayrollApprovalPage.tsx  
- `usePayrollRealtime({ enabled: false })`
- `showNotifications: false`
- 注释更新为"已停用"

## 📍 当前状态

### ✅ 已完成
- 所有页面级别的 Realtime 订阅已停用
- 保留了代码结构，便于将来重新启用
- Hook 函数本身保持不变，只是不会创建订阅

### 🔍 验证方法
1. 检查浏览器控制台，应该不再看到：
   - `[Realtime] Setting up subscriptions...`
   - `[Realtime] Subscription error`
   - WebSocket 连接相关日志

2. 检查网络面板，应该没有 WebSocket 连接到 Supabase Realtime

## 🔄 如需重新启用
只需将以下文件中的 `enabled: false` 改为 `enabled: true`：
- `/pages/payroll/PayrollListPage.tsx:73`
- `/pages/payroll/PayrollApprovalPage.tsx:51`

## 📊 影响说明

### 停用后的变化
- ❌ 数据不会自动实时更新
- ❌ 多用户协作时看不到其他人的操作
- ❌ 批量操作完成后需要手动刷新

### 保持正常的功能  
- ✅ 页面加载时正常获取数据
- ✅ 用户操作后通过 React Query 自动刷新
- ✅ 手动刷新按钮仍然工作
- ✅ 所有业务功能保持完整

现在系统运行时不会再出现 Realtime 相关的错误信息。