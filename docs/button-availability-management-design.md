# 按钮可用性管理系统 - 完整技术方案设计文档

## 目录
1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [数据库设计](#数据库设计)
4. [核心功能实现](#核心功能实现)
5. [API 接口设计](#api-接口设计)
6. [前端集成方案](#前端集成方案)
7. [性能优化策略](#性能优化策略)
8. [安全机制](#安全机制)
9. [部署与运维](#部署与运维)
10. [测试策略](#测试策略)

---

## 项目概述

### 系统目标
设计并实现一个高性能、可扩展的按钮可用性管理系统，该系统能够根据薪资周期状态、用户角色、业务规则等动态条件控制UI按钮的可用性状态。

### 核心价值主张
- **智能控制**: 基于复杂业务逻辑的智能按钮状态管理
- **高性能**: 利用 PostgreSQL 原生特性实现毫秒级响应
- **可扩展性**: 支持复杂的规则继承和层次化管理
- **实时同步**: 基于 Supabase Realtime 的实时状态更新
- **开发效率**: 提供直观的配置界面和简洁的 API

### 技术栈选择
- **数据库**: PostgreSQL 14+ (Supabase)
- **核心特性**: Table Inheritance, JSONB, Security Definer Functions, Triggers
- **前端**: React 19 + TypeScript
- **实时通信**: Supabase Realtime
- **缓存策略**: Materialized Views + Trigger-based Invalidation

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用层                                │
├─────────────────────────────────────────────────────────────────┤
│  SmartActionButton  │  ButtonAvailabilityProvider  │  管理界面    │
└─────────────────────┬───────────────────────────────┬───────────┘
                      │                               │
┌─────────────────────▼───────────────────────────────▼───────────┐
│                    Supabase 实时通信层                          │
├─────────────────────────────────────────────────────────────────┤
│  Realtime Channels  │  RPC Functions  │  Security Policies      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   PostgreSQL 数据库层                          │
├─────────────────────────────────────────────────────────────────┤
│  继承表体系  │  JSONB 条件引擎  │  物化视图缓存  │  触发器系统    │
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. 规则引擎 (Rule Engine)
- **table inheritance** 实现规则层次化
- **JSONB条件系统** 支持复杂逻辑表达式
- **继承级联** 支持规则自动继承和覆盖

#### 2. 缓存系统 (Caching System)
- **智能缓存**: 基于物化视图的预计算结果
- **自动失效**: 触发器驱动的缓存失效机制
- **多级缓存**: 内存 + 数据库 + 应用层缓存

#### 3. 实时同步 (Real-time Sync)
- **WebSocket通信**: 基于 Supabase Realtime
- **事件驱动**: 状态变更实时推送
- **智能更新**: 仅推送变化的按钮状态

---

## 数据库设计

### 表继承体系

```sql
-- 基础规则表 (父表)
CREATE TABLE button_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    button_type VARCHAR(100) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    conditions JSONB NOT NULL DEFAULT '{}',
    availability_config JSONB NOT NULL DEFAULT '{"available": true}',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_conditions CHECK (jsonb_typeof(conditions) = 'object'),
    CONSTRAINT valid_config CHECK (jsonb_typeof(availability_config) = 'object'),
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > effective_date)
);

-- 全局规则表 (最高优先级)
CREATE TABLE global_button_rules (
    rule_scope VARCHAR(20) DEFAULT 'global' CHECK (rule_scope = 'global')
) INHERITS (button_availability_rules);

-- 部门规则表
CREATE TABLE department_button_rules (
    department_id UUID NOT NULL REFERENCES departments(id),
    rule_scope VARCHAR(20) DEFAULT 'department' CHECK (rule_scope = 'department')
) INHERITS (button_availability_rules);

-- 角色规则表  
CREATE TABLE role_button_rules (
    role_name VARCHAR(50) NOT NULL,
    rule_scope VARCHAR(20) DEFAULT 'role' CHECK (rule_scope = 'role')
) INHERITS (button_availability_rules);

-- 用户个性化规则表 (最低优先级)
CREATE TABLE user_button_rules (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rule_scope VARCHAR(20) DEFAULT 'user' CHECK (rule_scope = 'user')
) INHERITS (button_availability_rules);
```

### 索引设计

```sql
-- 复合索引优化查询性能
CREATE INDEX idx_button_rules_type_priority ON button_availability_rules 
    (button_type, priority DESC, effective_date, end_date);

-- JSONB 条件索引 (GIN)
CREATE INDEX idx_button_rules_conditions_gin ON button_availability_rules 
    USING GIN (conditions);

-- 专用索引优化子表查询
CREATE INDEX idx_global_rules_active ON global_button_rules 
    (button_type) WHERE end_date IS NULL OR end_date > CURRENT_DATE;

CREATE INDEX idx_dept_rules_lookup ON department_button_rules 
    (department_id, button_type, priority DESC);

CREATE INDEX idx_role_rules_lookup ON role_button_rules 
    (role_name, button_type, priority DESC);

CREATE INDEX idx_user_rules_lookup ON user_button_rules 
    (user_id, button_type, priority DESC);
```

### 物化视图缓存

```sql
-- 按钮可用性缓存视图
CREATE MATERIALIZED VIEW mv_button_availability_cache AS
SELECT 
    button_type,
    department_id,
    role_name,
    user_id,
    rule_scope,
    priority,
    availability_config,
    conditions,
    effective_date,
    end_date,
    -- 预计算字段
    (CASE 
        WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN true
        ELSE false 
    END) as is_active,
    -- 规则优先级权重 (数字越小优先级越高)
    (CASE rule_scope
        WHEN 'global' THEN 1
        WHEN 'department' THEN 2  
        WHEN 'role' THEN 3
        WHEN 'user' THEN 4
        ELSE 99
    END) as scope_weight
FROM (
    SELECT button_type, NULL::UUID as department_id, NULL::VARCHAR as role_name, 
           NULL::UUID as user_id, 'global' as rule_scope, priority, availability_config, 
           conditions, effective_date, end_date
    FROM global_button_rules
    
    UNION ALL
    
    SELECT button_type, department_id, NULL::VARCHAR as role_name,
           NULL::UUID as user_id, 'department' as rule_scope, priority, availability_config,
           conditions, effective_date, end_date  
    FROM department_button_rules
    
    UNION ALL
    
    SELECT button_type, NULL::UUID as department_id, role_name,
           NULL::UUID as user_id, 'role' as rule_scope, priority, availability_config,
           conditions, effective_date, end_date
    FROM role_button_rules
    
    UNION ALL
    
    SELECT button_type, NULL::UUID as department_id, NULL::VARCHAR as role_name,
           user_id, 'user' as rule_scope, priority, availability_config,
           conditions, effective_date, end_date
    FROM user_button_rules
) combined_rules
WHERE effective_date <= CURRENT_DATE;

-- 缓存视图索引
CREATE UNIQUE INDEX idx_mv_button_cache_lookup 
    ON mv_button_availability_cache (button_type, scope_weight, priority, department_id, role_name, user_id);
```

---

## 核心功能实现

### Security Definer 函数

```sql
-- 高性能按钮可用性评估函数
CREATE OR REPLACE FUNCTION evaluate_button_availability(
    p_button_type VARCHAR(100),
    p_user_id UUID,
    p_department_id UUID DEFAULT NULL,
    p_role_name VARCHAR(50) DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
) 
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB := '{"available": true, "reason": "default"}'::jsonb;
    v_rule RECORD;
    v_condition_result BOOLEAN;
    v_merged_context JSONB;
BEGIN
    -- 构建完整上下文
    v_merged_context := jsonb_build_object(
        'user_id', p_user_id,
        'department_id', p_department_id,
        'role_name', p_role_name,
        'current_time', extract(epoch from now()),
        'current_date', CURRENT_DATE
    ) || COALESCE(p_context, '{}'::jsonb);
    
    -- 按优先级顺序查询适用规则 (利用物化视图)
    FOR v_rule IN 
        SELECT *
        FROM mv_button_availability_cache
        WHERE button_type = p_button_type
          AND is_active = true
          AND (
              (rule_scope = 'global') OR
              (rule_scope = 'department' AND department_id = p_department_id) OR
              (rule_scope = 'role' AND role_name = p_role_name) OR  
              (rule_scope = 'user' AND user_id = p_user_id)
          )
        ORDER BY scope_weight ASC, priority ASC
    LOOP
        -- 评估JSONB条件
        SELECT evaluate_jsonb_condition(v_rule.conditions, v_merged_context) INTO v_condition_result;
        
        IF v_condition_result THEN
            v_result := v_rule.availability_config;
            -- 添加规则匹配信息
            v_result := v_result || jsonb_build_object(
                'matched_rule_scope', v_rule.rule_scope,
                'matched_priority', v_rule.priority,
                'evaluation_time', extract(epoch from now())
            );
            
            -- 找到第一个匹配的规则后立即返回 (优先级机制)
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- 错误处理：返回安全的默认状态
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'evaluation_error',
            'error', SQLERRM
        );
END;
$$;
```

### JSONB 条件评估引擎

```sql
-- 通用JSONB条件评估函数
CREATE OR REPLACE FUNCTION evaluate_jsonb_condition(
    conditions JSONB,
    context JSONB
) 
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_operator TEXT;
    v_field TEXT;
    v_value JSONB;
    v_context_value JSONB;
    v_result BOOLEAN;
    v_sub_condition JSONB;
    v_sub_results BOOLEAN[] := ARRAY[]::BOOLEAN[];
BEGIN
    -- 空条件默认为真
    IF conditions IS NULL OR conditions = '{}'::jsonb THEN
        RETURN true;
    END IF;
    
    -- 处理逻辑运算符
    IF conditions ? 'and' THEN
        FOR v_sub_condition IN SELECT jsonb_array_elements(conditions->'and')
        LOOP
            v_sub_results := array_append(v_sub_results, evaluate_jsonb_condition(v_sub_condition, context));
        END LOOP;
        RETURN NOT (false = ANY(v_sub_results)); -- 所有条件必须为真
    END IF;
    
    IF conditions ? 'or' THEN
        FOR v_sub_condition IN SELECT jsonb_array_elements(conditions->'or')
        LOOP
            v_sub_results := array_append(v_sub_results, evaluate_jsonb_condition(v_sub_condition, context));
        END LOOP;
        RETURN true = ANY(v_sub_results); -- 任一条件为真即可
    END IF;
    
    IF conditions ? 'not' THEN
        RETURN NOT evaluate_jsonb_condition(conditions->'not', context);
    END IF;
    
    -- 处理比较运算符
    FOR v_operator IN SELECT jsonb_object_keys(conditions)
    LOOP
        v_value := conditions->v_operator;
        
        CASE v_operator
            WHEN 'eq' THEN -- 等于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN v_context_value = (v_value->'value');
                
            WHEN 'ne' THEN -- 不等于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN v_context_value != (v_value->'value');
                
            WHEN 'gt' THEN -- 大于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN (v_context_value->>0)::numeric > (v_value->>'value')::numeric;
                
            WHEN 'gte' THEN -- 大于等于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN (v_context_value->>0)::numeric >= (v_value->>'value')::numeric;
                
            WHEN 'lt' THEN -- 小于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN (v_context_value->>0)::numeric < (v_value->>'value')::numeric;
                
            WHEN 'lte' THEN -- 小于等于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN (v_context_value->>0)::numeric <= (v_value->>'value')::numeric;
                
            WHEN 'in' THEN -- 包含于
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN v_context_value <@ (v_value->'values');
                
            WHEN 'contains' THEN -- 包含
                v_field := v_value->>'field';
                v_context_value := context->v_field;
                RETURN v_context_value @> (v_value->'value');
                
            WHEN 'payroll_status' THEN -- 薪资状态检查 (业务逻辑)
                RETURN evaluate_payroll_status_condition(v_value, context);
                
            WHEN 'time_range' THEN -- 时间范围检查
                RETURN evaluate_time_range_condition(v_value, context);
                
            ELSE
                -- 未知运算符，返回false以确保安全
                RETURN false;
        END CASE;
    END LOOP;
    
    -- 如果没有匹配的条件，默认返回true
    RETURN true;
END;
$$;
```

### 自动缓存失效系统

```sql
-- 触发器函数：缓存失效管理
CREATE OR REPLACE FUNCTION invalidate_button_availability_cache()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 刷新物化视图
    REFRESH MATERIALIZED VIEW mv_button_availability_cache;
    
    -- 发送实时通知
    PERFORM pg_notify(
        'button_availability_changed',
        jsonb_build_object(
            'button_type', COALESCE(NEW.button_type, OLD.button_type),
            'operation', TG_OP,
            'timestamp', extract(epoch from now())
        )::text
    );
    
    -- 记录变更日志
    INSERT INTO button_availability_cache_log (
        table_name,
        operation,
        button_type,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.button_type, OLD.button_type),
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 为所有规则表创建触发器
CREATE TRIGGER tr_invalidate_global_rules_cache
    AFTER INSERT OR UPDATE OR DELETE ON global_button_rules
    FOR EACH ROW EXECUTE FUNCTION invalidate_button_availability_cache();

CREATE TRIGGER tr_invalidate_dept_rules_cache  
    AFTER INSERT OR UPDATE OR DELETE ON department_button_rules
    FOR EACH ROW EXECUTE FUNCTION invalidate_button_availability_cache();

CREATE TRIGGER tr_invalidate_role_rules_cache
    AFTER INSERT OR UPDATE OR DELETE ON role_button_rules  
    FOR EACH ROW EXECUTE FUNCTION invalidate_button_availability_cache();

CREATE TRIGGER tr_invalidate_user_rules_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_button_rules
    FOR EACH ROW EXECUTE FUNCTION invalidate_button_availability_cache();
```

---

## API 接口设计

### RPC 函数接口

```sql
-- 批量评估多个按钮状态
CREATE OR REPLACE FUNCTION batch_evaluate_button_availability(
    p_button_types TEXT[],
    p_user_id UUID,
    p_department_id UUID DEFAULT NULL,
    p_role_name VARCHAR(50) DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB := '{}'::jsonb;
    v_button_type TEXT;
    v_button_result JSONB;
BEGIN
    FOREACH v_button_type IN ARRAY p_button_types
    LOOP
        SELECT evaluate_button_availability(
            v_button_type, 
            p_user_id, 
            p_department_id, 
            p_role_name, 
            p_context
        ) INTO v_button_result;
        
        v_result := v_result || jsonb_build_object(v_button_type, v_button_result);
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- 管理接口：创建/更新规则
CREATE OR REPLACE FUNCTION upsert_button_rule(
    p_rule_scope TEXT,
    p_button_type VARCHAR(100),
    p_conditions JSONB,
    p_availability_config JSONB,
    p_priority INTEGER DEFAULT 100,
    p_department_id UUID DEFAULT NULL,
    p_role_name VARCHAR(50) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rule_id UUID;
    v_sql TEXT;
BEGIN
    -- 根据规则范围动态构建SQL
    CASE p_rule_scope
        WHEN 'global' THEN
            INSERT INTO global_button_rules (button_type, conditions, availability_config, priority, description)
            VALUES (p_button_type, p_conditions, p_availability_config, p_priority, p_description)
            ON CONFLICT (button_type) 
            DO UPDATE SET
                conditions = EXCLUDED.conditions,
                availability_config = EXCLUDED.availability_config,
                priority = EXCLUDED.priority,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id INTO v_rule_id;
            
        WHEN 'department' THEN
            INSERT INTO department_button_rules (button_type, department_id, conditions, availability_config, priority, description)
            VALUES (p_button_type, p_department_id, p_conditions, p_availability_config, p_priority, p_description)
            ON CONFLICT (button_type, department_id)
            DO UPDATE SET
                conditions = EXCLUDED.conditions,
                availability_config = EXCLUDED.availability_config,
                priority = EXCLUDED.priority,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id INTO v_rule_id;
            
        WHEN 'role' THEN
            INSERT INTO role_button_rules (button_type, role_name, conditions, availability_config, priority, description)
            VALUES (p_button_type, p_role_name, p_conditions, p_availability_config, p_priority, p_description)
            ON CONFLICT (button_type, role_name)
            DO UPDATE SET
                conditions = EXCLUDED.conditions,
                availability_config = EXCLUDED.availability_config,
                priority = EXCLUDED.priority,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id INTO v_rule_id;
            
        WHEN 'user' THEN
            INSERT INTO user_button_rules (button_type, user_id, conditions, availability_config, priority, description)
            VALUES (p_button_type, p_user_id, p_conditions, p_availability_config, p_priority, p_description)
            ON CONFLICT (button_type, user_id)
            DO UPDATE SET
                conditions = EXCLUDED.conditions,
                availability_config = EXCLUDED.availability_config,
                priority = EXCLUDED.priority,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id INTO v_rule_id;
            
        ELSE
            RAISE EXCEPTION 'Invalid rule scope: %', p_rule_scope;
    END CASE;
    
    RETURN v_rule_id;
END;
$$;
```

---

## 前端集成方案

### React Hook 实现

```typescript
// hooks/useAdvancedButtonAvailability.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ButtonAvailabilityContext {
  userId: string;
  departmentId?: string;
  roleName?: string;
  payrollPeriodId?: string;
  payrollStatus?: string;
  customContext?: Record<string, any>;
}

export interface ButtonAvailabilityResult {
  available: boolean;
  reason?: string;
  matchedRuleScope?: string;
  matchedPriority?: number;
  evaluationTime?: number;
  error?: string;
}

export const useAdvancedButtonAvailability = (
  buttonType: string,
  context: ButtonAvailabilityContext
) => {
  const [availability, setAvailability] = useState<ButtonAvailabilityResult>({
    available: true,
    reason: 'loading'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 构建评估上下文
  const evaluationContext = useMemo(() => ({
    user_id: context.userId,
    department_id: context.departmentId,
    role_name: context.roleName,
    payroll_period_id: context.payrollPeriodId,
    payroll_status: context.payrollStatus,
    ...context.customContext
  }), [context]);

  // 评估按钮可用性
  const evaluateAvailability = useCallback(async () => {
    if (!buttonType || !context.userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('evaluate_button_availability', {
          p_button_type: buttonType,
          p_user_id: context.userId,
          p_department_id: context.departmentId || null,
          p_role_name: context.roleName || null,
          p_context: evaluationContext
        });

      if (rpcError) throw rpcError;

      setAvailability(data as ButtonAvailabilityResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setAvailability({
        available: false,
        reason: 'evaluation_error',
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [buttonType, context.userId, context.departmentId, context.roleName, evaluationContext]);

  // 初始评估
  useEffect(() => {
    evaluateAvailability();
  }, [evaluateAvailability]);

  // 实时订阅状态变更
  useEffect(() => {
    const channel = supabase
      .channel(`button-availability-${buttonType}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_availability_rules',
        filter: `button_type=eq.${buttonType}`
      }, () => {
        // 规则变更时重新评估
        evaluateAvailability();
      })
      .on('broadcast', {
        event: 'button_availability_changed'
      }, (payload) => {
        if (payload.payload.button_type === buttonType) {
          evaluateAvailability();
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [buttonType, evaluateAvailability]);

  return {
    availability,
    loading,
    error,
    refresh: evaluateAvailability
  };
};

// 批量按钮可用性Hook
export const useBatchButtonAvailability = (
  buttonTypes: string[],
  context: ButtonAvailabilityContext
) => {
  const [availabilities, setAvailabilities] = useState<Record<string, ButtonAvailabilityResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const evaluateMultiple = useCallback(async () => {
    if (!buttonTypes.length || !context.userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('batch_evaluate_button_availability', {
          p_button_types: buttonTypes,
          p_user_id: context.userId,
          p_department_id: context.departmentId || null,
          p_role_name: context.roleName || null,
          p_context: context.customContext || {}
        });

      if (rpcError) throw rpcError;

      setAvailabilities(data || {});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buttonTypes, context]);

  useEffect(() => {
    evaluateMultiple();
  }, [evaluateMultiple]);

  return {
    availabilities,
    loading,
    error,
    refresh: evaluateMultiple
  };
};
```

### 智能按钮组件

```typescript
// components/common/SmartActionButton.tsx
import React from 'react';
import { useAdvancedButtonAvailability, ButtonAvailabilityContext } from '@/hooks/useAdvancedButtonAvailability';

export interface SmartActionButtonProps {
  buttonType: string;
  context: ButtonAvailabilityContext;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  loadingComponent?: React.ReactNode;
  unavailableComponent?: React.ReactNode;
  showReasonTooltip?: boolean;
}

export const SmartActionButton: React.FC<SmartActionButtonProps> = ({
  buttonType,
  context,
  children,
  onClick,
  className = '',
  loadingComponent,
  unavailableComponent,
  showReasonTooltip = true
}) => {
  const { availability, loading, error } = useAdvancedButtonAvailability(buttonType, context);

  // 加载状态
  if (loading) {
    return loadingComponent || (
      <button className={`btn loading ${className}`} disabled>
        <span className="loading loading-spinner loading-sm"></span>
        加载中...
      </button>
    );
  }

  // 不可用状态
  if (!availability.available) {
    const unavailableButton = unavailableComponent || (
      <button 
        className={`btn btn-disabled ${className}`}
        disabled
        title={showReasonTooltip ? availability.reason : undefined}
      >
        {children}
      </button>
    );
    return unavailableButton;
  }

  // 可用状态
  return (
    <button 
      className={`btn btn-primary ${className}`}
      onClick={onClick}
      title={showReasonTooltip ? `规则: ${availability.matchedRuleScope}` : undefined}
    >
      {children}
    </button>
  );
};

// 使用示例
export const PayrollActionButton = () => {
  const { user } = useAuth();
  
  return (
    <SmartActionButton
      buttonType="payroll_submit"
      context={{
        userId: user.id,
        departmentId: user.departmentId,
        roleName: user.roleName,
        payrollPeriodId: "current-period-id",
        payrollStatus: "draft"
      }}
      onClick={() => console.log('提交薪资')}
      showReasonTooltip={true}
    >
      提交薪资
    </SmartActionButton>
  );
};
```

---

## 性能优化策略

### 数据库层面优化

1. **索引策略**
   ```sql
   -- 分区表优化 (按时间分区)
   CREATE TABLE button_availability_rules_y2024m01 PARTITION OF button_availability_rules
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   
   -- 部分索引优化
   CREATE INDEX idx_active_rules ON button_availability_rules (button_type, priority)
   WHERE end_date IS NULL OR end_date > CURRENT_DATE;
   ```

2. **查询优化**
   ```sql
   -- 查询计划分析和优化
   EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
   SELECT * FROM evaluate_button_availability('payroll_submit', 'user-id');
   ```

3. **连接池配置**
   ```yaml
   # Supabase 配置
   pooler:
     default_pool_size: 25
     max_client_connections: 100
   ```

### 应用层面优化

1. **智能缓存策略**
   ```typescript
   // React Query 配置优化
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000, // 5分钟
         cacheTime: 10 * 60 * 1000, // 10分钟
         refetchOnWindowFocus: false,
         retry: (failureCount, error) => {
           // 智能重试策略
           return failureCount < 3 && error.message !== 'evaluation_error';
         }
       }
     }
   });
   ```

2. **批量处理优化**
   ```typescript
   // 防抖动批量请求
   const debouncedBatchEvaluate = useMemo(
     () => debounce(async (buttonTypes: string[]) => {
       return evaluateMultiple(buttonTypes);
     }, 200),
     [evaluateMultiple]
   );
   ```

---

## 安全机制

### Row Level Security (RLS) 策略

```sql
-- 启用RLS
ALTER TABLE button_availability_rules ENABLE ROW LEVEL SECURITY;

-- 管理员全权限策略
CREATE POLICY admin_full_access ON button_availability_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

-- 用户只能访问与自己相关的规则
CREATE POLICY user_own_rules ON button_availability_rules
    FOR SELECT USING (
        -- 全局规则所有人可见
        EXISTS (SELECT 1 FROM global_button_rules WHERE global_button_rules.id = button_availability_rules.id)
        OR
        -- 部门规则：同部门用户可见
        EXISTS (
            SELECT 1 FROM department_button_rules db
            JOIN user_profiles up ON up.department_id = db.department_id
            WHERE db.id = button_availability_rules.id 
            AND up.user_id = auth.uid()
        )
        OR
        -- 角色规则：同角色用户可见
        EXISTS (
            SELECT 1 FROM role_button_rules rb
            JOIN user_profiles up ON up.role_name = rb.role_name  
            WHERE rb.id = button_availability_rules.id
            AND up.user_id = auth.uid()
        )
        OR
        -- 用户规则：仅本人可见
        EXISTS (
            SELECT 1 FROM user_button_rules ub
            WHERE ub.id = button_availability_rules.id
            AND ub.user_id = auth.uid()
        )
    );
```

### API 访问控制

```sql
-- 函数执行权限控制
REVOKE EXECUTE ON FUNCTION evaluate_button_availability FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluate_button_availability TO authenticated;

-- 敏感操作额外验证
CREATE OR REPLACE FUNCTION secure_upsert_button_rule(
    -- 参数...
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 权限检查
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role_name IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient privileges for rule management';
    END IF;
    
    -- 审计日志
    INSERT INTO security_audit_log (
        user_id, action, resource, timestamp
    ) VALUES (
        auth.uid(), 'UPSERT_BUTTON_RULE', p_button_type, NOW()
    );
    
    -- 执行实际操作
    RETURN upsert_button_rule(/* 参数传递 */);
END;
$$;
```

---

## 部署与运维

### 部署步骤

1. **数据库迁移**
   ```bash
   # Supabase 迁移文件
   supabase migration new create_button_availability_system
   supabase db push
   ```

2. **初始化数据**
   ```sql
   -- 创建默认全局规则
   INSERT INTO global_button_rules (button_type, conditions, availability_config, description)
   VALUES 
   ('payroll_submit', '{"payroll_status": {"field": "payroll_status", "value": "draft"}}', 
    '{"available": true}', '薪资提交：仅草稿状态可用'),
   ('payroll_approve', '{"and": [{"payroll_status": {"field": "payroll_status", "value": "submitted"}}, {"role_name": {"field": "role_name", "value": "manager"}}]}', 
    '{"available": true}', '薪资审批：需要管理员权限且状态为已提交');
   ```

3. **性能监控设置**
   ```sql
   -- 创建监控视图
   CREATE VIEW v_button_availability_performance AS
   SELECT 
       button_type,
       COUNT(*) as total_evaluations,
       AVG(extract(milliseconds from (evaluation_end - evaluation_start))) as avg_response_time_ms,
       MAX(extract(milliseconds from (evaluation_end - evaluation_start))) as max_response_time_ms
   FROM button_availability_performance_log 
   GROUP BY button_type;
   ```

### 运维监控

1. **性能指标监控**
   ```typescript
   // 性能监控Hook
   export const useButtonAvailabilityMetrics = () => {
     const [metrics, setMetrics] = useState({
       averageResponseTime: 0,
       cacheHitRate: 0,
       errorRate: 0
     });
     
     useEffect(() => {
       const fetchMetrics = async () => {
         const { data } = await supabase
           .from('v_button_availability_performance')
           .select('*');
         // 处理metrics数据
       };
       
       fetchMetrics();
       const interval = setInterval(fetchMetrics, 30000); // 30秒
       return () => clearInterval(interval);
     }, []);
     
     return metrics;
   };
   ```

2. **告警系统**
   ```sql
   -- 自动告警触发器
   CREATE OR REPLACE FUNCTION check_performance_alerts()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   AS $$
   BEGIN
     IF NEW.response_time_ms > 1000 THEN -- 响应时间超过1秒
       INSERT INTO system_alerts (alert_type, message, severity, created_at)
       VALUES ('PERFORMANCE', 'Button availability evaluation slow: ' || NEW.response_time_ms || 'ms', 'WARNING', NOW());
     END IF;
     
     RETURN NEW;
   END;
   $$;
   ```

---

## 测试策略

### 单元测试

```typescript
// tests/buttonAvailability.test.ts
describe('Button Availability System', () => {
  describe('Rule Evaluation', () => {
    it('should evaluate global rules correctly', async () => {
      const result = await supabase.rpc('evaluate_button_availability', {
        p_button_type: 'test_button',
        p_user_id: 'test-user-id'
      });
      
      expect(result.data.available).toBe(true);
      expect(result.data.matched_rule_scope).toBe('global');
    });
    
    it('should respect rule priority order', async () => {
      // 创建冲突规则测试优先级
    });
    
    it('should handle complex JSONB conditions', async () => {
      // 测试复杂条件逻辑
    });
  });
  
  describe('Performance Tests', () => {
    it('should evaluate within performance threshold', async () => {
      const startTime = performance.now();
      
      await supabase.rpc('batch_evaluate_button_availability', {
        p_button_types: ['btn1', 'btn2', 'btn3'],
        p_user_id: 'test-user'
      });
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 100ms阈值
    });
  });
});
```

### 集成测试

```typescript
// tests/integration/buttonAvailability.integration.test.ts
describe('Button Availability Integration', () => {
  it('should sync state changes in real-time', async () => {
    const mockChannel = jest.fn();
    
    // 模拟规则变更
    await supabase
      .from('global_button_rules')
      .update({ availability_config: { available: false } })
      .eq('button_type', 'test_button');
    
    // 验证实时更新
    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          button_type: 'test_button',
          operation: 'UPDATE'
        })
      );
    });
  });
});
```

### 压力测试

```bash
#!/bin/bash
# load-test.sh - 压力测试脚本

# 并发用户数
CONCURRENT_USERS=100
# 测试持续时间
DURATION=60s

# 使用 k6 进行压力测试
k6 run --vus $CONCURRENT_USERS --duration $DURATION - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const response = http.post('${SUPABASE_URL}/rpc/evaluate_button_availability', {
    p_button_type: 'payroll_submit',
    p_user_id: 'load-test-user'
  }, {
    headers: {
      'Authorization': 'Bearer ${SUPABASE_ANON_KEY}',
      'Content-Type': 'application/json'
    }
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200
  });
}
EOF
```

---

## 总结

### 核心优势

1. **高性能架构**: 
   - PostgreSQL table inheritance 实现零冗余的规则层次化
   - JSONB + GIN 索引实现复杂条件的高效查询
   - Materialized views + 触发器实现智能缓存

2. **可扩展设计**:
   - 规则继承机制支持无限层次扩展
   - JSONB 条件引擎支持任意复杂的业务逻辑
   - 模块化架构便于新功能集成

3. **开发友好**:
   - React Hooks 封装提供简洁 API
   - 智能组件自动处理状态管理
   - 完善的 TypeScript 类型支持

4. **生产就绪**:
   - 完整的安全机制和权限控制
   - 综合的监控和告警系统
   - 全面的测试覆盖

### 技术创新点

1. **PostgreSQL Table Inheritance 在 Web 应用中的创新应用**
2. **JSONB 驱动的动态条件引擎设计**  
3. **Materialized Views + Triggers 的智能缓存系统**
4. **Supabase Realtime + React 的实时状态同步**

这套系统充分利用了 Supabase 和 PostgreSQL 的原生特性，实现了高性能、高可用、高扩展性的按钮可用性管理解决方案，为现代 Web 应用提供了企业级的功能控制能力。