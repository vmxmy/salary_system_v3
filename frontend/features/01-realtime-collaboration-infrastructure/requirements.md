# 实时协作基础设施

## 功能概述
建立基于 Supabase Realtime 的实时数据同步机制，支持多用户同时查看和编辑员工信息，实现协作编辑体验。

## 核心需求

### 1. Realtime 订阅机制
- 订阅 `employees` 表的变更事件
- 订阅相关联表的变更（education, job_history, bank_accounts 等）
- 实现智能的订阅管理，避免内存泄漏

### 2. 协作状态管理
- 跟踪当前查看/编辑该员工信息的用户列表
- 显示其他用户正在编辑的字段
- 实现编辑锁定机制，防止冲突

### 3. 冲突检测与解决
- 检测并发编辑冲突
- 提供冲突解决策略（最后写入优先/用户选择）
- 保存冲突历史供审计

## 技术实现要点

```typescript
// 订阅示例
const subscription = supabase
  .channel(`employee:${employeeId}`)
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'employees',
      filter: `id=eq.${employeeId}`
    }, 
    (payload) => handleRealtimeUpdate(payload)
  )
  .on('presence', { event: 'sync' }, () => handlePresenceSync())
  .subscribe();
```

## 数据结构设计

### Presence 状态
```typescript
interface PresenceState {
  userId: string;
  userName: string;
  editingFields: string[]; // 正在编辑的字段列表
  lastActivity: Date;
}
```

## 性能考虑
- 使用防抖处理频繁的更新
- 实现智能的差异更新，而非全量刷新
- 在组件卸载时正确清理订阅

## 安全性
- 确保 Realtime 订阅遵循 RLS 策略
- 验证用户编辑权限
- 防止恶意的数据覆盖