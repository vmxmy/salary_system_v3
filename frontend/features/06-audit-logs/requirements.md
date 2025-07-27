# 审计日志展示模块

## 功能概述
利用 Supabase 的数据库触发器和实时订阅功能，实现全面的数据变更追踪和可视化展示，提供清晰的审计轨迹。

## 核心需求

### 1. 日志记录范围
- **基本信息变更**：姓名、身份证、联系方式等
- **职务变更**：部门、职位、级别调整
- **薪资变更**：基本工资、津贴、社保基数等
- **文档操作**：上传、删除、查看、下载
- **系统操作**：登录、权限变更、批量操作

### 2. 日志信息内容
- **操作时间**：精确到秒的时间戳
- **操作人**：执行操作的用户信息
- **操作类型**：创建、更新、删除、查看
- **变更内容**：字段名称、旧值、新值
- **操作原因**：可选的变更说明
- **关联信息**：相关的审批流程、文档等

### 3. 展示功能
- **时间轴视图**：按时间顺序展示所有变更
- **分类视图**：按操作类型分组展示
- **对比视图**：直观展示字段变更前后对比
- **筛选功能**：按时间、类型、操作人筛选
- **实时更新**：新的操作实时显示

### 4. 高级功能
- **变更回滚**：支持回滚到历史版本（需权限）
- **批量导出**：导出审计日志为 Excel/PDF
- **异常检测**：标记异常操作模式
- **统计分析**：变更频率、热点分析

## 技术实现要点

### 数据库设计
```sql
-- 审计日志表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  operated_by UUID NOT NULL,
  operated_at TIMESTAMPTZ DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  reason TEXT,
  metadata JSONB
);

-- 创建触发器自动记录
CREATE TRIGGER audit_trigger_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

### 实时订阅
```typescript
// 订阅审计日志变更
const subscription = supabase
  .channel('audit-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'audit_logs',
    filter: `record_id=eq.${employeeId}`
  }, handleNewAuditLog)
  .subscribe();
```

### 可视化展示
- 使用时间轴组件展示变更历史
- 采用 Diff 算法高亮显示变更内容
- 支持展开/收起详细信息
- 提供丰富的交互体验

## 用户体验要求

### 1. 信息展示
- 清晰的时间线设计
- 直观的变更对比
- 合理的信息层级
- 友好的空状态提示

### 2. 交互设计
- 平滑的加载动画
- 智能的分页加载
- 快捷的筛选操作
- 便捷的导出功能

### 3. 性能优化
- 虚拟滚动处理大量日志
- 增量加载避免一次性加载
- 本地缓存减少请求
- 索引优化查询速度

## 权限控制

### 1. 查看权限
- 员工：只能查看自己的变更记录
- 经理：可查看部门内员工的记录
- HR：可查看所有员工的记录
- 管理员：完整的审计日志访问

### 2. 操作权限
- 导出权限：基于角色控制
- 回滚权限：仅限高级管理员
- 删除权限：审计日志不可删除
- 标记权限：可标记重要记录