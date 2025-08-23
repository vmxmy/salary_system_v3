-- 权限管理系统数据库迁移
-- 创建日期: 2025-08-23
-- 描述: 创建完整的 RBAC 权限管理系统，支持角色继承和细粒度权限控制

-- 1. 创建权限资源表
CREATE TABLE IF NOT EXISTS permission_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_code TEXT NOT NULL UNIQUE,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('page', 'action', 'data')),
  parent_id UUID REFERENCES permission_resources(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建权限定义表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_code TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  resource_id UUID NOT NULL REFERENCES permission_resources(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('read', 'write', 'delete', 'execute')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建角色扩展表
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_code TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  parent_role_id UUID REFERENCES roles(id),
  level INTEGER DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 创建角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(role_id, permission_id)
);

-- 5. 创建用户权限覆盖表
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN ('grant', 'deny')),
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_id)
);

-- 6. 创建权限申请表
CREATE TABLE IF NOT EXISTS permission_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES user_profiles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('grant', 'revoke')),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 创建性能优化索引
CREATE INDEX IF NOT EXISTS idx_permission_resources_code ON permission_resources(resource_code);
CREATE INDEX IF NOT EXISTS idx_permission_resources_type ON permission_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_permission_resources_parent ON permission_resources(parent_id);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action_type);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(role_code);
CREATE INDEX IF NOT EXISTS idx_roles_parent_level ON roles(parent_role_id, level);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_active ON role_permissions(role_id, is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_overrides_user_active ON user_permission_overrides(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_overrides_permission ON user_permission_overrides(permission_id);

CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_permission_requests_requester ON permission_requests(requester_id);

-- 8. 创建递归权限计算函数
CREATE OR REPLACE FUNCTION get_user_effective_permissions(user_uuid UUID)
RETURNS TABLE (
  permission_code TEXT,
  resource_code TEXT,
  action_type TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- 获取用户直接角色
    SELECT r.id, r.role_code, r.parent_role_id, r.level, 0 as depth
    FROM roles r
    INNER JOIN user_roles ur ON ur.role = r.role_code
    WHERE ur.user_id = user_uuid AND ur.is_active = true AND r.is_active = true
    
    UNION ALL
    
    -- 递归获取父级角色
    SELECT r.id, r.role_code, r.parent_role_id, r.level, rh.depth + 1
    FROM roles r
    INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
    WHERE rh.depth < 10 AND r.is_active = true -- 防止无限递归
  ),
  role_permissions_expanded AS (
    -- 通过角色获得的权限
    SELECT DISTINCT
      p.permission_code,
      pr.resource_code,
      p.action_type,
      'role' as source
    FROM role_hierarchy rh
    INNER JOIN role_permissions rp ON rp.role_id = rh.id
    INNER JOIN permissions p ON p.id = rp.permission_id
    INNER JOIN permission_resources pr ON pr.id = p.resource_id
    WHERE rp.is_active = true 
      AND p.is_active = true 
      AND pr.is_active = true
      AND (rp.expires_at IS NULL OR rp.expires_at > now())
  ),
  user_overrides AS (
    -- 用户级别权限覆盖
    SELECT 
      p.permission_code,
      pr.resource_code,
      p.action_type,
      CASE 
        WHEN upo.override_type = 'grant' THEN 'override_grant'
        ELSE 'override_deny'
      END as source
    FROM user_permission_overrides upo
    INNER JOIN permissions p ON p.id = upo.permission_id
    INNER JOIN permission_resources pr ON pr.id = p.resource_id
    WHERE upo.user_id = user_uuid 
      AND upo.is_active = true
      AND (upo.expires_at IS NULL OR upo.expires_at > now())
  )
  -- 合并角色权限和用户覆盖，用户覆盖优先级更高
  SELECT DISTINCT
    COALESCE(uo.permission_code, rpe.permission_code) as permission_code,
    COALESCE(uo.resource_code, rpe.resource_code) as resource_code,
    COALESCE(uo.action_type, rpe.action_type) as action_type,
    COALESCE(uo.source, rpe.source) as source
  FROM role_permissions_expanded rpe
  FULL OUTER JOIN user_overrides uo ON (
    uo.permission_code = rpe.permission_code
  )
  WHERE COALESCE(uo.source, rpe.source) != 'override_deny'; -- 排除被拒绝的权限
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建权限验证函数
CREATE OR REPLACE FUNCTION check_user_permission(user_uuid UUID, permission_code_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_effective_permissions(user_uuid) 
    WHERE permission_code = permission_code_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建角色层级更新触发器
CREATE OR REPLACE FUNCTION update_role_hierarchy_levels() 
RETURNS TRIGGER AS $$
BEGIN
  -- 当角色的父级关系变更时，重新计算层级
  WITH RECURSIVE role_levels AS (
    SELECT id, role_code, parent_role_id, 0 as calculated_level
    FROM roles 
    WHERE parent_role_id IS NULL
    
    UNION ALL
    
    SELECT r.id, r.role_code, r.parent_role_id, rl.calculated_level + 1
    FROM roles r
    INNER JOIN role_levels rl ON r.parent_role_id = rl.id
  )
  UPDATE roles 
  SET level = rl.calculated_level
  FROM role_levels rl 
  WHERE roles.id = rl.id;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_role_levels
  AFTER INSERT OR UPDATE OF parent_role_id ON roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_role_hierarchy_levels();

-- 11. 初始化系统角色数据
INSERT INTO roles (role_code, role_name, parent_role_id, level, description, is_system_role, is_active) VALUES
('super_admin', '超级管理员', NULL, 0, '系统最高权限角色，拥有所有权限', true, true),
('admin', '系统管理员', NULL, 1, '系统管理员，负责用户和权限管理', true, true),
('hr_manager', '人事经理', NULL, 2, '人事管理员，负责员工和薪资管理', true, true),
('manager', '部门经理', NULL, 3, '部门经理，负责本部门员工管理', true, true),
('employee', '普通员工', NULL, 4, '普通员工，只能查看自己的信息', true, true)
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  updated_at = now();

-- 12. 设置角色继承关系
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE role_code = 'super_admin') WHERE role_code = 'admin';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE role_code = 'admin') WHERE role_code = 'hr_manager';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE role_code = 'hr_manager') WHERE role_code = 'manager';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE role_code = 'manager') WHERE role_code = 'employee';

-- 13. 初始化基础权限资源
INSERT INTO permission_resources (resource_code, resource_name, resource_type, description) VALUES
-- 页面权限
('page.dashboard', '仪表盘', 'page', '系统仪表盘页面访问权限'),
('page.user-management', '用户管理', 'page', '用户管理页面访问权限'),
('page.role-management', '角色管理', 'page', '角色管理页面访问权限'),
('page.permission-management', '权限管理', 'page', '权限管理页面访问权限'),
('page.employee-management', '员工管理', 'page', '员工管理页面访问权限'),
('page.payroll-management', '薪资管理', 'page', '薪资管理页面访问权限'),
-- 功能权限
('action.user', '用户操作', 'action', '用户相关操作权限'),
('action.role', '角色操作', 'action', '角色相关操作权限'),
('action.permission', '权限操作', 'action', '权限相关操作权限'),
('action.employee', '员工操作', 'action', '员工相关操作权限'),
('action.payroll', '薪资操作', 'action', '薪资相关操作权限'),
-- 数据权限
('data.all', '所有数据', 'data', '访问所有数据的权限'),
('data.department', '部门数据', 'data', '访问本部门数据的权限'),
('data.self', '个人数据', 'data', '访问个人数据的权限')
ON CONFLICT (resource_code) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  description = EXCLUDED.description,
  updated_at = now();

-- 14. 初始化基础权限
INSERT INTO permissions (permission_code, permission_name, resource_id, action_type, description) VALUES
-- 页面访问权限
('dashboard.read', '查看仪表盘', (SELECT id FROM permission_resources WHERE resource_code = 'page.dashboard'), 'read', '访问系统仪表盘'),
('user_management.read', '查看用户管理', (SELECT id FROM permission_resources WHERE resource_code = 'page.user-management'), 'read', '访问用户管理页面'),
('user_management.write', '用户管理操作', (SELECT id FROM permission_resources WHERE resource_code = 'page.user-management'), 'write', '用户增删改操作'),
('role_management.read', '查看角色管理', (SELECT id FROM permission_resources WHERE resource_code = 'page.role-management'), 'read', '访问角色管理页面'),
('role_management.write', '角色管理操作', (SELECT id FROM permission_resources WHERE resource_code = 'page.role-management'), 'write', '角色增删改操作'),
('permission_management.read', '查看权限管理', (SELECT id FROM permission_resources WHERE resource_code = 'page.permission-management'), 'read', '访问权限管理页面'),
('permission_management.write', '权限管理操作', (SELECT id FROM permission_resources WHERE resource_code = 'page.permission-management'), 'write', '权限分配操作'),
('employee_management.read', '查看员工管理', (SELECT id FROM permission_resources WHERE resource_code = 'page.employee-management'), 'read', '访问员工管理页面'),
('employee_management.write', '员工管理操作', (SELECT id FROM permission_resources WHERE resource_code = 'page.employee-management'), 'write', '员工信息增删改'),
('payroll_management.read', '查看薪资管理', (SELECT id FROM permission_resources WHERE resource_code = 'page.payroll-management'), 'read', '访问薪资管理页面'),
('payroll_management.write', '薪资管理操作', (SELECT id FROM permission_resources WHERE resource_code = 'page.payroll-management'), 'write', '薪资数据操作'),
-- 数据权限
('data.all.read', '查看所有数据', (SELECT id FROM permission_resources WHERE resource_code = 'data.all'), 'read', '查看系统所有数据'),
('data.department.read', '查看部门数据', (SELECT id FROM permission_resources WHERE resource_code = 'data.department'), 'read', '查看本部门数据'),
('data.self.read', '查看个人数据', (SELECT id FROM permission_resources WHERE resource_code = 'data.self'), 'read', '查看个人数据')
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description,
  updated_at = now();

-- 15. 为系统角色分配基础权限
-- super_admin 拥有所有权限
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
  (SELECT id FROM roles WHERE role_code = 'super_admin'),
  p.id,
  NULL
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin 拥有管理权限
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
  (SELECT id FROM roles WHERE role_code = 'admin'),
  p.id,
  NULL
FROM permissions p 
WHERE p.permission_code IN (
  'dashboard.read', 'user_management.read', 'user_management.write',
  'role_management.read', 'employee_management.read', 'employee_management.write',
  'payroll_management.read', 'data.all.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hr_manager 拥有人事权限
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
  (SELECT id FROM roles WHERE role_code = 'hr_manager'),
  p.id,
  NULL
FROM permissions p 
WHERE p.permission_code IN (
  'dashboard.read', 'employee_management.read', 'employee_management.write',
  'payroll_management.read', 'payroll_management.write', 'data.all.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager 拥有部门管理权限
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
  (SELECT id FROM roles WHERE role_code = 'manager'),
  p.id,
  NULL
FROM permissions p 
WHERE p.permission_code IN (
  'dashboard.read', 'employee_management.read', 'payroll_management.read', 'data.department.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- employee 只有查看个人数据权限
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
  (SELECT id FROM roles WHERE role_code = 'employee'),
  p.id,
  NULL
FROM permissions p 
WHERE p.permission_code IN ('dashboard.read', 'data.self.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 16. 添加表注释
COMMENT ON TABLE permission_resources IS '权限资源表：定义系统中所有可控制的资源（页面、功能、数据）';
COMMENT ON TABLE permissions IS '权限定义表：定义对资源的具体操作权限';
COMMENT ON TABLE roles IS '角色表：支持角色继承的角色定义';
COMMENT ON TABLE role_permissions IS '角色权限关联表：角色与权限的多对多关系';
COMMENT ON TABLE user_permission_overrides IS '用户权限覆盖表：用户级别的特殊权限分配';
COMMENT ON TABLE permission_requests IS '权限申请表：用户自助权限申请系统';

COMMENT ON FUNCTION get_user_effective_permissions(UUID) IS '获取用户有效权限：递归计算用户通过角色继承和直接分配获得的所有权限';
COMMENT ON FUNCTION check_user_permission(UUID, TEXT) IS '检查用户权限：验证用户是否拥有特定权限';