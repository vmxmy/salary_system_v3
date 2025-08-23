-- RLS 策略实现迁移
-- 创建日期: 2025-08-23
-- 描述: 为权限管理系统实现完整的 RLS 策略，确保数据库层面的安全访问控制

-- 1. 创建统一权限验证函数
CREATE OR REPLACE FUNCTION user_has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 如果是 service_role，直接返回 true
  IF current_setting('role') = 'service_role' THEN
    RETURN true;
  END IF;

  -- 如果用户未认证，返回 false
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- 优先使用新的权限系统
  IF EXISTS (SELECT 1 FROM get_user_effective_permissions(auth.uid()) 
             WHERE permission_code = $1) THEN
    RETURN true;
  END IF;
  
  -- 兼容旧的管理员验证
  IF permission_code LIKE 'admin.%' AND is_admin() THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建数据范围验证函数
CREATE OR REPLACE FUNCTION user_can_access_data(data_scope TEXT DEFAULT 'self')
RETURNS BOOLEAN AS $$
BEGIN
  -- Service role 全权限
  IF current_setting('role') = 'service_role' THEN
    RETURN true;
  END IF;

  -- 未认证用户无权限
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- 检查数据范围权限
  CASE data_scope
    WHEN 'all' THEN
      RETURN user_has_permission('data.all.read');
    WHEN 'department' THEN  
      RETURN user_has_permission('data.department.read') OR user_has_permission('data.all.read');
    WHEN 'self' THEN
      RETURN user_has_permission('data.self.read') OR user_has_permission('data.department.read') OR user_has_permission('data.all.read');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建权限访问日志表
CREATE TABLE IF NOT EXISTS permission_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  permission_code TEXT,
  resource_accessed TEXT,
  access_result BOOLEAN,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 为日志表创建索引
CREATE INDEX IF NOT EXISTS idx_permission_logs_user_time ON permission_access_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_permission_logs_permission ON permission_access_logs(permission_code);
CREATE INDEX IF NOT EXISTS idx_permission_logs_result ON permission_access_logs(access_result, created_at);

-- 4. 启用所有权限管理表的 RLS
ALTER TABLE permission_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_access_logs ENABLE ROW LEVEL SECURITY;

-- 5. 权限资源表 RLS 策略
-- Service role 全权限
CREATE POLICY "permission_resources_service_role" ON permission_resources
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "permission_resources_super_admin" ON permission_resources
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 权限管理员可以管理权限资源
CREATE POLICY "permission_resources_admin_all" ON permission_resources
FOR ALL TO authenticated
USING (user_has_permission('permission_management.write'))
WITH CHECK (user_has_permission('permission_management.write'));

-- 有权限的用户可以查看权限资源
CREATE POLICY "permission_resources_read" ON permission_resources  
FOR SELECT TO authenticated
USING (user_has_permission('permission_management.read'));

-- 6. 权限定义表 RLS 策略
-- Service role 全权限
CREATE POLICY "permissions_service_role" ON permissions
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "permissions_super_admin" ON permissions
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 权限管理员可以管理权限
CREATE POLICY "permissions_admin_all" ON permissions
FOR ALL TO authenticated  
USING (user_has_permission('permission_management.write'))
WITH CHECK (user_has_permission('permission_management.write'));

-- 有权限的用户可以查看权限
CREATE POLICY "permissions_read" ON permissions
FOR SELECT TO authenticated
USING (user_has_permission('permission_management.read'));

-- 7. 角色扩展表 RLS 策略
-- Service role 全权限
CREATE POLICY "roles_service_role" ON roles
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "roles_super_admin" ON roles
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 角色管理员可以管理角色
CREATE POLICY "roles_admin_all" ON roles
FOR ALL TO authenticated
USING (user_has_permission('role_management.write'))
WITH CHECK (user_has_permission('role_management.write'));

-- 有权限的用户可以查看角色
CREATE POLICY "roles_read" ON roles  
FOR SELECT TO authenticated
USING (user_has_permission('role_management.read'));

-- 8. 角色权限关联表 RLS 策略
-- Service role 全权限
CREATE POLICY "role_permissions_service_role" ON role_permissions
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "role_permissions_super_admin" ON role_permissions
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 权限管理员可以分配角色权限
CREATE POLICY "role_permissions_admin_all" ON role_permissions
FOR ALL TO authenticated
USING (user_has_permission('permission_management.write'))
WITH CHECK (user_has_permission('permission_management.write'));

-- 用户可以查看自己相关的角色权限
CREATE POLICY "role_permissions_user_read" ON role_permissions
FOR SELECT TO authenticated
USING (
  role_id IN (
    SELECT r.id FROM roles r
    INNER JOIN user_roles ur ON ur.role = r.role_code
    WHERE ur.user_id = auth.uid() AND ur.is_active = true
  )
);

-- 9. 用户权限覆盖表 RLS 策略
-- Service role 全权限
CREATE POLICY "user_overrides_service_role" ON user_permission_overrides
FOR ALL TO service_role  
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "user_overrides_super_admin" ON user_permission_overrides
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 权限管理员可以管理用户权限覆盖
CREATE POLICY "user_overrides_admin_all" ON user_permission_overrides
FOR ALL TO authenticated
USING (user_has_permission('permission_management.write'))
WITH CHECK (user_has_permission('permission_management.write'));

-- 用户可以查看自己的权限覆盖
CREATE POLICY "user_overrides_self_read" ON user_permission_overrides
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 10. 权限申请表 RLS 策略
-- Service role 全权限  
CREATE POLICY "permission_requests_service_role" ON permission_requests
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员全权限
CREATE POLICY "permission_requests_super_admin" ON permission_requests
FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 用户可以创建和查看自己的权限申请
CREATE POLICY "permission_requests_self" ON permission_requests
FOR ALL TO authenticated
USING (requester_id = auth.uid())
WITH CHECK (requester_id = auth.uid());

-- 权限管理员可以审核权限申请
CREATE POLICY "permission_requests_admin_review" ON permission_requests
FOR ALL TO authenticated
USING (user_has_permission('permission_management.write'));

-- 11. 权限访问日志表 RLS 策略
-- Service role 全权限
CREATE POLICY "permission_logs_service_role" ON permission_access_logs
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 超级管理员可以查看所有日志
CREATE POLICY "permission_logs_super_admin" ON permission_access_logs
FOR SELECT TO authenticated
USING (is_super_admin());

-- 管理员可以查看权限日志
CREATE POLICY "permission_logs_admin_read" ON permission_access_logs
FOR SELECT TO authenticated
USING (user_has_permission('permission_management.read'));

-- 用户只能查看自己的权限日志
CREATE POLICY "permission_logs_self_read" ON permission_access_logs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 12. 创建权限日志记录函数
CREATE OR REPLACE FUNCTION log_permission_access(
  p_permission_code TEXT,
  p_resource_accessed TEXT,
  p_access_result BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO permission_access_logs (
    user_id,
    permission_code,
    resource_accessed,
    access_result,
    error_message,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_permission_code,
    p_resource_accessed,
    p_access_result,
    p_error_message,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 记录日志失败不应该影响业务逻辑，静默处理
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 创建权限验证增强函数（带日志记录）
CREATE OR REPLACE FUNCTION check_permission_with_log(
  permission_code TEXT,
  resource_accessed TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  has_perm := user_has_permission(permission_code);
  
  -- 记录权限访问日志
  PERFORM log_permission_access(
    permission_code,
    COALESCE(resource_accessed, 'unknown'),
    has_perm,
    CASE WHEN NOT has_perm THEN 'Permission denied' ELSE NULL END
  );
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 添加表注释
COMMENT ON TABLE permission_access_logs IS '权限访问日志表：记录用户权限验证和访问行为';
COMMENT ON FUNCTION user_has_permission(TEXT) IS '统一权限验证函数：整合新旧权限系统的权限验证';
COMMENT ON FUNCTION user_can_access_data(TEXT) IS '数据范围验证函数：验证用户对不同数据范围的访问权限';
COMMENT ON FUNCTION log_permission_access(TEXT, TEXT, BOOLEAN, TEXT) IS '权限访问日志记录函数：记录权限验证行为用于审计';
COMMENT ON FUNCTION check_permission_with_log(TEXT, TEXT) IS '带日志的权限验证函数：验证权限并记录访问日志';