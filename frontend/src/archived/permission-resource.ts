/**
 * 权限资源管理系统类型定义
 */

// 数据库表对应的基础类型
export interface PermissionResource {
  id: string;
  resource_code: string;
  resource_name: string;
  resource_type: 'page' | 'action' | 'data' | 'api' | 'feature';
  parent_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  permission_code: string;
  permission_name: string;
  resource_id: string;
  action_type: 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'manage';
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 扩展类型（包含关联数据）
export interface PermissionResourceWithChildren extends PermissionResource {
  children?: PermissionResourceWithChildren[];
  permissions?: Permission[];
  parent?: PermissionResource;
}

export interface PermissionWithResource extends Permission {
  resource?: PermissionResource;
}

// 权限代码生成配置
export interface PermissionCodeConfig {
  resourceCode: string;
  actionType: Permission['action_type'];
  autoGenerate: boolean;
}

// 资源树节点类型
export interface ResourceTreeNode {
  key: string;
  label: string;
  data: PermissionResource;
  children?: ResourceTreeNode[];
  isLeaf?: boolean;
  icon?: string;
}

// 权限使用统计
export interface PermissionUsageStats {
  permissionId: string;
  permissionCode: string;
  totalUsers: number;
  activeUsers: number;
  roleAssignments: Array<{
    roleName: string;
    userCount: number;
  }>;
  lastUsed?: string;
}

// 表单数据类型
export interface PermissionResourceFormData {
  resource_code: string;
  resource_name: string;
  resource_type: PermissionResource['resource_type'];
  parent_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
}

export interface PermissionFormData {
  permission_code: string;
  permission_name: string;
  resource_id: string;
  action_type: Permission['action_type'];
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
}

// 批量操作类型
export interface BatchPermissionOperation {
  type: 'create' | 'update' | 'delete' | 'toggle_active';
  resourceIds?: string[];
  permissionIds?: string[];
  data?: Partial<PermissionResourceFormData> | Partial<PermissionFormData>;
}

// 权限模板类型
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  resources: Array<{
    resource_code: string;
    resource_name: string;
    resource_type: PermissionResource['resource_type'];
    permissions: Array<{
      action_type: Permission['action_type'];
      permission_name: string;
    }>;
  }>;
  is_system: boolean;
  created_at: string;
}

// Hook 选项类型
export interface UsePermissionResourceOptions {
  includeChildren?: boolean;
  includePermissions?: boolean;
  includeStats?: boolean;
  onlyActive?: boolean;
}

export interface UseResourceTreeOptions {
  rootOnly?: boolean;
  includePermissions?: boolean;
  sortBy?: 'name' | 'code' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

// Hook 返回类型
export interface UsePermissionResourceReturn {
  // 数据状态
  resources: PermissionResourceWithChildren[];
  permissions: PermissionWithResource[];
  loading: boolean;
  error: string | null;

  // CRUD 操作
  createResource: (data: PermissionResourceFormData) => Promise<PermissionResource>;
  updateResource: (id: string, data: Partial<PermissionResourceFormData>) => Promise<PermissionResource>;
  deleteResource: (id: string) => Promise<boolean>;
  
  createPermission: (data: PermissionFormData) => Promise<Permission>;
  updatePermission: (id: string, data: Partial<PermissionFormData>) => Promise<Permission>;
  deletePermission: (id: string) => Promise<boolean>;

  // 批量操作
  batchOperation: (operation: BatchPermissionOperation) => Promise<boolean>;
  
  // 查询方法
  getResourceById: (id: string) => PermissionResourceWithChildren | undefined;
  getPermissionById: (id: string) => PermissionWithResource | undefined;
  getResourceByCode: (code: string) => PermissionResourceWithChildren | undefined;
  getPermissionByCode: (code: string) => PermissionWithResource | undefined;
  
  // 工具方法
  generatePermissionCode: (resourceCode: string, actionType: Permission['action_type']) => string;
  validateResourceCode: (code: string) => { valid: boolean; message?: string };
  validatePermissionCode: (code: string) => { valid: boolean; message?: string };
  
  // 刷新数据
  refresh: () => Promise<void>;
}

export interface UseResourceTreeReturn {
  // 树形数据
  treeData: ResourceTreeNode[];
  flatData: PermissionResource[];
  loading: boolean;
  error: string | null;

  // 树操作
  expandNode: (key: string) => void;
  collapseNode: (key: string) => void;
  selectNode: (key: string) => void;
  updateNodeOrder: (dragKey: string, targetKey: string, position: 'before' | 'after' | 'inside') => Promise<boolean>;

  // 状态
  expandedKeys: string[];
  selectedKeys: string[];
  
  // 工具方法
  findNode: (key: string) => ResourceTreeNode | null;
  getNodePath: (key: string) => ResourceTreeNode[];
  
  // 刷新
  refresh: () => Promise<void>;
}

export interface UsePermissionDefinitionReturn {
  // 权限定义数据
  permissions: PermissionWithResource[];
  loading: boolean;
  error: string | null;

  // 权限分组
  permissionsByResource: Record<string, PermissionWithResource[]>;
  permissionsByAction: Record<Permission['action_type'], PermissionWithResource[]>;
  
  // 统计数据
  usageStats: PermissionUsageStats[];
  
  // 操作方法
  createPermissions: (resourceId: string, actionTypes: Permission['action_type'][]) => Promise<Permission[]>;
  bulkUpdatePermissions: (updates: Array<{ id: string; data: Partial<PermissionFormData> }>) => Promise<boolean>;
  
  // 模板操作
  applyTemplate: (templateId: string, resourceId: string) => Promise<boolean>;
  saveAsTemplate: (name: string, resourceIds: string[]) => Promise<PermissionTemplate>;
  
  // 工具方法
  getAvailableActions: (resourceType: PermissionResource['resource_type']) => Permission['action_type'][];
  getAvailablePermissions: (resourceType?: PermissionResource['resource_type']) => PermissionWithResource[];
  
  // 刷新
  refresh: () => Promise<void>;
}

// 组件属性类型
export interface PermissionResourceListProps {
  onResourceSelect?: (resource: PermissionResourceWithChildren) => void;
  onResourceEdit?: (resource: PermissionResourceWithChildren) => void;
  onResourceDelete?: (resource: PermissionResourceWithChildren) => void;
  selectedResourceId?: string;
  className?: string;
}

export interface PermissionDefinitionEditorProps {
  resourceId: string;
  permissions?: PermissionWithResource[];
  onPermissionUpdate?: (permission: PermissionWithResource) => void;
  onPermissionCreate?: (permission: Permission) => void;
  onPermissionDelete?: (permissionId: string) => void;
  readonly?: boolean;
  className?: string;
}

export interface ResourceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: PermissionResourceWithChildren;
  parentResource?: PermissionResource;
  onSave?: (resource: PermissionResource) => void;
  mode: 'create' | 'edit';
}

export interface PermissionCodeGeneratorProps {
  resourceCode: string;
  actionType: Permission['action_type'];
  onCodeGenerated: (code: string) => void;
  autoGenerate?: boolean;
  className?: string;
}

// 搜索和过滤类型
export interface ResourceFilter {
  search?: string;
  resourceType?: PermissionResource['resource_type'];
  isActive?: boolean;
  hasPermissions?: boolean;
  parentId?: string;
}

export interface PermissionFilter {
  search?: string;
  resourceId?: string;
  actionType?: Permission['action_type'];
  isActive?: boolean;
}