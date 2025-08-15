# 系统触发器清单

**更新时间**: 2025-01-15  
**项目**: 高新区工资信息管理系统 v3  
**状态**: ✅ **已整理完成**

## 📋 触发器概览

当前系统共有 **11个触发器**，分为4个主要类别：

- **通用updated_at触发器**: 5个
- **员工信息自动处理触发器**: 4个  
- **政策规则变更日志触发器**: 1个
- **个税计算日志触发器**: 1个

---

## 🔄 1. 通用 updated_at 触发器 (5个)

这些触发器自动更新记录的 `updated_at` 字段，确保数据变更时间的准确记录。

### 1.1 function_migration_control 表
```sql
-- 触发器名: update_migration_control_updated_at
-- 事件: BEFORE UPDATE
-- 功能: 更新迁移控制表的时间戳
```

### 1.2 insurance_type_category_rules 表
```sql
-- 触发器名: update_insurance_type_category_rules_updated_at  
-- 事件: BEFORE UPDATE
-- 功能: 更新保险费率规则的时间戳
```

### 1.3 payroll_periods 表
```sql
-- 触发器名: update_payroll_periods_updated_at
-- 事件: BEFORE UPDATE  
-- 功能: 更新薪资周期的时间戳
```

### 1.4 user_profiles 表
```sql
-- 触发器名: update_user_profiles_updated_at
-- 事件: BEFORE UPDATE
-- 功能: 更新用户档案的时间戳
```

### 1.5 user_roles 表
```sql
-- 触发器名: update_user_roles_updated_at
-- 事件: BEFORE UPDATE
-- 功能: 更新用户角色的时间戳
```

### 通用触发器函数
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
```

---

## 👤 2. 员工信息自动处理触发器 (4个)

这些触发器基于身份证号自动推导员工的生日和性别信息。

### 2.1 员工生日自动设置触发器

#### INSERT 触发器
```sql
-- 触发器名: set_birthday_on_insert
-- 表名: employees  
-- 事件: BEFORE INSERT
-- 功能: 新增员工时从身份证号提取生日
```

#### UPDATE 触发器  
```sql
-- 触发器名: update_birthday_on_id_change
-- 表名: employees
-- 事件: BEFORE UPDATE
-- 功能: 身份证号变更时重新提取生日
```

### 2.2 员工性别自动设置触发器

#### INSERT 触发器
```sql
-- 触发器名: set_gender_on_insert
-- 表名: employees
-- 事件: BEFORE INSERT  
-- 功能: 新增员工时从身份证号推导性别
```

#### UPDATE 触发器
```sql
-- 触发器名: update_gender_on_id_change
-- 表名: employees
-- 事件: BEFORE UPDATE
-- 功能: 身份证号变更时重新推导性别
```

### 员工信息处理函数

#### 生日提取函数
```sql
CREATE OR REPLACE FUNCTION public.update_birthday_from_id_card()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only update if ID number is valid (18 digits)
    IF NEW.id_number IS NOT NULL AND LENGTH(NEW.id_number) = 18 THEN
        -- Extract birthday from ID card (positions 7-14: YYYYMMDD)
        NEW.date_of_birth = TO_DATE(SUBSTRING(NEW.id_number, 7, 8), 'YYYYMMDD');
    END IF;
    RETURN NEW;
END;
$function$
```

#### 性别推导函数
```sql
CREATE OR REPLACE FUNCTION public.update_gender_from_id_card()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only update if ID number is valid (18 digits)
    IF NEW.id_number IS NOT NULL AND LENGTH(NEW.id_number) = 18 THEN
        -- Extract the 17th digit and determine gender
        NEW.gender = CASE 
            WHEN MOD(CAST(SUBSTRING(NEW.id_number, 17, 1) AS INTEGER), 2) = 1 THEN '男'
            ELSE '女'
        END;
    END IF;
    RETURN NEW;
END;
$function$
```

---

## 📝 3. 政策规则变更日志触发器 (1个)

### 3.1 policy_rules 表变更日志
```sql
-- 触发器名: log_policy_rule_changes
-- 表名: policy_rules
-- 事件: AFTER INSERT  
-- 功能: 记录政策规则变更，提醒批量重算
```

### 政策变更日志函数
```sql
CREATE OR REPLACE FUNCTION public.trigger_policy_rule_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    dummy_payroll_id uuid;
    dummy_employee_id uuid;
BEGIN
    -- 生成临时UUID用于系统级操作记录
    dummy_payroll_id := uuid_generate_v4();
    dummy_employee_id := uuid_generate_v4();
    
    -- 记录政策规则变更到日志表（简化版本，不再引用费率字段）
    INSERT INTO insurance_calculation_logs (
        payroll_id,
        employee_id,
        insurance_type_id,
        calculation_date,
        is_applicable,
        skip_reason
    ) VALUES (
        dummy_payroll_id,
        dummy_employee_id,
        COALESCE(NEW.insurance_type_id, OLD.insurance_type_id),
        NOW(),
        FALSE,
        '政策规则变更，建议批量重算。操作类型: ' || TG_OP || 
        ' （费率数据现在存储在insurance_type_category_rules表中）'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
```

---

## 🧮 4. 个税计算日志触发器 (1个)

### 4.1 个税计算日志更新触发器
```sql
-- 触发器名: trigger_update_personal_income_tax_calculation_logs_updated_at
-- 表名: personal_income_tax_calculation_logs
-- 事件: BEFORE UPDATE
-- 功能: 更新个税计算日志的时间戳
```

### 个税日志更新函数
```sql
CREATE OR REPLACE FUNCTION public.update_personal_income_tax_calculation_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
```

---

## 📊 触发器统计表

| 类别 | 数量 | 主要功能 | 状态 |
|------|------|----------|------|
| updated_at触发器 | 5个 | 自动更新时间戳 | ✅ 正常 |
| 员工信息处理 | 4个 | 身份证自动解析 | ✅ 正常 |
| 政策变更日志 | 1个 | 变更追踪提醒 | ✅ 正常 |
| 个税日志更新 | 1个 | 个税日志时间戳 | ✅ 正常 |
| **总计** | **11个** | **数据一致性保障** | ✅ **健康** |

---

## 🛠️ 维护建议

### ✅ 保持现状的触发器
- **updated_at触发器**: 核心数据一致性保障，必须保留
- **员工信息自动处理**: 提升用户体验，减少手工输入错误
- **政策变更日志**: 重要的审计追踪功能

### ⚠️ 需要关注的触发器  
- **政策规则变更日志**: 使用临时UUID记录，可能需要优化日志结构
- **个税计算日志**: 如果个税模块升级，可能需要相应调整

### 🚀 优化建议
1. **性能监控**: 定期检查触发器执行性能
2. **日志清理**: 建立老旧日志的清理机制
3. **错误处理**: 增强触发器的异常处理能力

---

## 📋 快速操作命令

### 查看所有触发器
```sql
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

### 禁用特定触发器
```sql
-- 示例：临时禁用员工生日触发器
ALTER TABLE employees DISABLE TRIGGER set_birthday_on_insert;

-- 重新启用
ALTER TABLE employees ENABLE TRIGGER set_birthday_on_insert;
```

### 查看触发器状态
```sql
SELECT 
    tgname,
    tgenabled,
    CASE tgenabled 
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'Always'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT t.tgisinternal;
```

---

*本文档记录了薪资系统v3的完整触发器架构和维护指南*  
*最后更新：2025-01-15*