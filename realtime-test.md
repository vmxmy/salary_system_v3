# Supabase Realtime 配置状态检查

## 当前配置状态 ✅

### 1. SQL 层配置 - 已完成
- ✅ 所有表已添加到 `supabase_realtime` publication
- ✅ RLS 策略已正确配置给 `authenticated` 角色
- ✅ Publication 支持所有操作类型 (INSERT/UPDATE/DELETE)

### 2. 待完成配置 ⏳

**需要在 Supabase Dashboard 中启用表复制：**

访问: https://rjlymghylrshudywrzec.supabase.co

导航路径: `Database → Replication`

需要启用的表：
- payrolls
- payroll_items  
- employees
- employee_category_assignments
- departments
- positions
- payroll_periods

## 验证步骤

启用 Dashboard 复制后，执行以下 SQL 验证：

```sql
-- 1. 检查订阅是否创建
SELECT COUNT(*) as subscription_count FROM realtime.subscription;

-- 2. 验证 publication 状态
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## 预期结果

启用复制后：
- `realtime.subscription` 表将有记录
- 前端控制台的 CHANNEL_ERROR 将变为 SUBSCRIBED 状态
- 实时数据同步开始工作

## 故障排除

如果启用后仍有问题：
1. 检查浏览器网络面板的 WebSocket 连接
2. 验证用户认证状态
3. 确认 RLS 策略允许当前用户访问数据