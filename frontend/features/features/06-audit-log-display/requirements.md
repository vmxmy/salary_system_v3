# 审计日志展示

## 功能概述
利用 Supabase 的数据库触发器和历史表，实现员工信息变更的完整审计追踪，提供可视化的历史记录查看。

## 核心需求

### 1. 数据库层实现
创建自动审计机制：
```sql
-- 创建审计表
CREATE TABLE employee_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id),
  table_name text NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  changed_by uuid REFERENCES user_profiles(id),
  changed_at timestamptz DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  changed_fields text[], -- 变更的字段列表
  ip_address inet,
  user_agent text
);

-- 创建触发器函数
CREATE OR REPLACE FUNCTION audit_employee_changes() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO employee_audit_logs (
    employee_id,
    table_name,
    operation,
    changed_by,
    old_values,
    new_values,
    changed_fields
  ) VALUES (
    COALESCE(NEW.employee_id, OLD.employee_id),
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY(
      SELECT jsonb_object_keys(to_jsonb(NEW)) 
      WHERE to_jsonb(NEW) != to_jsonb(OLD)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. 历史记录展示
- **时间线视图**：按时间顺序展示所有变更
- **分组视图**：按变更类型/表格分组
- **对比视图**：显示字段的新旧值对比

### 3. 查询和筛选
- 按时间范围筛选
- 按操作人筛选
- 按变更类型筛选
- 全文搜索功能

## 界面设计

### 时间线组件
```tsx
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  changes: FieldChange[];
}

interface FieldChange {
  fieldName: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  oldDisplay?: string; // 格式化后的显示值
  newDisplay?: string;
}

const AuditTimeline: React.FC<{
  employeeId: string;
  entries: AuditLogEntry[];
  loading?: boolean;
}> = ({ employeeId, entries, loading }) => {
  // 实现时间线展示
};
```

### 变更详情展示
- 高亮显示变更的部分
- 支持复杂数据类型的对比（如JSON）
- 提供撤销操作（需要权限）

## 高级功能

### 1. 智能摘要
- 自动生成变更摘要
- 重要变更的特殊标记
- 批量变更的合并显示

### 2. 数据恢复
- 查看历史快照
- 恢复到指定时间点
- 批量回滚功能

### 3. 合规性功能
- 导出审计报告
- 长期归档策略
- 敏感操作告警

## 性能优化
- 分页加载历史记录
- 使用虚拟滚动处理大量数据
- 缓存常用查询结果

## 权限控制
- 基于角色的审计日志访问权限
- 敏感信息的脱敏处理
- 特定操作的审批流程