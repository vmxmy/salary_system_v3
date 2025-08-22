# AI助手聊天会话持久化功能指南

## 🎯 功能概述

现在AI助手支持聊天会话持久化！关闭模态框后重新打开，可以保留之前的聊天记录。

## ✨ 主要特性

### 1. 自动会话管理
- ✅ **自动保存**：聊天内容实时保存到浏览器本地存储
- ✅ **智能标题**：根据首条消息自动生成会话标题
- ✅ **无缝恢复**：关闭重开后自动恢复上次会话
- ✅ **用户隔离**：每个用户的会话独立存储

### 2. 本地存储策略
- **存储位置**：浏览器 localStorage
- **数据格式**：JSON 格式，包含消息、时间戳、用户ID
- **容量管理**：自动保留最近20个会话
- **性能优化**：防抖保存（500ms延迟）

### 3. 会话生命周期
```
用户输入首条消息 → 创建新会话 → 自动生成标题 
→ 实时保存消息 → 关闭模态框 → 重新打开恢复会话
```

## 🔧 技术实现

### 核心组件架构
```typescript
PersistentAIRuntimeProvider
├── SessionManager (单例模式)
│   ├── createSession() - 创建新会话
│   ├── saveSession() - 保存会话
│   ├── loadSession() - 加载会话
│   └── deleteSession() - 删除会话
├── 本地存储管理
│   ├── chat_session_{id} - 会话详细数据
│   └── chat_sessions_list - 会话列表索引
└── Assistant UI 集成
    └── useExternalStoreRuntime - 状态管理
```

### 会话数据结构
```typescript
interface ChatSession {
  id: string;           // 唯一标识
  userId: string;       // 用户ID
  title: string;        // 会话标题
  messages: PersistentMessage[];  // 消息列表
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
}

interface PersistentMessage {
  id: string;           // 消息ID
  role: 'user' | 'assistant';  // 角色
  content: string;      // 内容
  timestamp: number;    // 时间戳
  sessionId: string;    // 所属会话
}
```

## 🚀 使用方式

### 基础使用
AI助手会自动处理会话持久化，用户无需任何操作：

1. **首次使用**：自动创建新会话
2. **后续对话**：消息自动保存
3. **关闭重开**：自动恢复上次会话
4. **多次使用**：保持同一会话连续性

### 高级功能（开发者）
```typescript
// 获取会话管理器
import { useSessionManager } from '@/components/ai';

const sessionManager = useSessionManager();

// 获取会话列表
const sessions = sessionManager.getSessionsList();

// 删除指定会话
await sessionManager.deleteSession(sessionId);

// 创建新会话
const newSession = sessionManager.createSession(userId, firstMessage);
```

## 📊 存储管理

### 自动清理机制
- **会话限制**：最多保留20个最近会话
- **自动清理**：超出限制时删除最旧会话
- **数据完整性**：确保存储不会无限增长

### 存储键名规范
```
localStorage键名：
├── chat_session_{sessionId}  - 具体会话数据
└── chat_sessions_list        - 会话索引列表
```

## 🛡️ 安全考虑

### 数据隔离
- ✅ **用户隔离**：通过用户ID确保数据隔离
- ✅ **会话验证**：加载时验证会话所有权
- ✅ **本地存储**：敏感数据仅在本地存储

### 错误处理
- **存储失败**：优雅降级，不影响正常使用
- **数据损坏**：自动创建新会话
- **权限问题**：回退到内存存储

## 🔍 调试信息

开发环境下可通过控制台查看详细日志：
```
💾 Session saved to localStorage: session_xxx
📂 Session loaded from localStorage: session_xxx
🆕 Created new session: session_xxx
🗑️ Session deleted: session_xxx
```

## 📈 性能优化

### 已实现优化
- **防抖保存**：避免频繁写入localStorage
- **懒加载**：仅在需要时加载会话数据
- **内存缓存**：当前会话保存在内存中
- **容量限制**：防止存储空间无限增长

### 性能指标
- **保存延迟**：500ms 防抖
- **加载速度**：<10ms (本地存储)
- **内存占用**：最小化状态存储
- **存储限制**：20个会话上限

## 🔄 兼容性

### 浏览器支持
- ✅ Chrome 4+
- ✅ Firefox 3.5+
- ✅ Safari 4+
- ✅ Edge 12+

### 降级策略
localStorage不可用时自动降级到会话内存存储

## 📝 待优化功能

### 短期计划
- [ ] 会话搜索功能
- [ ] 会话导出功能
- [ ] 云端同步选项

### 长期规划
- [ ] 多设备同步
- [ ] 会话分类管理
- [ ] 聊天记录分析

---

## 🎉 使用体验

现在您可以：
1. **放心关闭模态框** - 聊天记录不会丢失
2. **随时继续对话** - 重新打开时自动恢复
3. **享受连续体验** - 就像从未中断过一样

**注意**：目前会话数据存储在浏览器本地，清除浏览器数据会导致聊天记录丢失。