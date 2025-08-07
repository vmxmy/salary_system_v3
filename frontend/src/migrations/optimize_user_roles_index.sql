-- 优化 user_roles 表的查询性能
-- 创建复合索引以加速按 user_id 和 is_active 的查询

-- 如果索引不存在则创建
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active 
ON user_roles(user_id, is_active) 
WHERE is_active = true;

-- 添加注释说明索引用途
COMMENT ON INDEX idx_user_roles_user_active IS '优化获取用户激活角色的查询性能';