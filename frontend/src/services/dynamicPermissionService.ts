/**
 * 动态权限服务 - 从现有数据库动态提取权限元数据
 * 
 * 核心功能：
 * - 从 unified_permission_config 表提取所有权限定义
 * - 生成权限分类和描述信息
 * - 提供权限CRUD操作接口
 * - 支持权限缓存和实时更新
 */

import { supabase } from '@/lib/supabase';

// 动态权限接口定义
export interface DynamicPermission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  isSystem: boolean;
  isActive: boolean;
  usedByRoles: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissionCount: number;
  permissions: DynamicPermission[];
}

// 权限代码解析规则
const PERMISSION_PARSING_RULES = {
  // 权限代码格式：resource.action 或 resource_category.action 或 独立权限名
  codePattern: /^([a-z_]+)(?:\.([a-z_]+))?$/,
  
  // 资源名称映射
  resourceNames: {
    'user_management': '用户管理',
    'role_management': '角色管理', 
    'employee_management': '员工管理',
    'payroll_management': '薪资管理',
    'permission_management': '权限管理',
    'dashboard': '仪表板',
    'data': '数据访问',
    'statistics': '统计报表',
    'payroll': '薪资数据',
    'hr': '人力资源',
    // 独立权限（没有点分隔符的权限）
    'assign_roles': '分配角色',
    'view_roles': '查看角色',
    'view_role_permissions': '查看角色权限',
    'view_role_history': '查看角色历史',
    'manage_roles': '管理角色',
    'manage_role_permissions': '管理角色权限'
  } as Record<string, string>,
  
  // 动作名称映射
  actionNames: {
    'read': '查看',
    'write': '编辑',
    'create': '创建', 
    'delete': '删除',
    'import': '导入',
    'export': '导出',
    'approve': '审批',
    'clear': '清空',
    'view': '查看',
    'manage': '管理',
    'assign': '分配',
    'remove': '移除',
    'update': '更新',
    'trends': '趋势分析',
    'all': '全部数据',
    'department': '部门数据',
    'self': '个人数据'
  } as Record<string, string>,
  
  // 系统权限识别
  systemPermissions: [
    'permission_management.read',
    'permission_management.write', 
    'manage_roles',
    'manage_role_permissions',
    'approve_role_requests',
    // 薪资危险操作
    'payroll.clear'
  ]
};

/**
 * 动态权限管理服务
 */
class DynamicPermissionService {
  private permissionCache: Map<string, DynamicPermission> = new Map();
  private categoryCache: Map<string, PermissionCategory> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 从数据库提取所有权限定义
   */
  async extractAllPermissions(): Promise<DynamicPermission[]> {
    try {
      console.log('[DynamicPermissionService] 开始提取权限数据...');
      
      // 从unified_permission_config表获取所有权限配置
      const { data: configs, error } = await supabase
        .from('unified_permission_config')
        .select('role_code, permission_rules, is_active')
        .eq('is_active', true)
        .not('role_code', 'is', null);

      if (error) {
        throw new Error(`提取权限配置失败: ${error.message}`);
      }

      // 提取所有唯一权限代码
      const permissionSet = new Set<string>();
      const rolePermissionMap: Record<string, string[]> = {};

      configs?.forEach(config => {
        const rules = config.permission_rules as any;
        const permissions = rules?.permissions || [];
        const roleCode = config.role_code || 'unknown';
        
        rolePermissionMap[roleCode] = permissions;
        permissions.forEach((perm: string) => permissionSet.add(perm));
      });

      // 转换为权限对象列表
      const permissions: DynamicPermission[] = Array.from(permissionSet).map(code => 
        this.parsePermissionCode(code, rolePermissionMap)
      );

      // 更新缓存
      this.updateCache(permissions);
      
      console.log(`[DynamicPermissionService] 成功提取 ${permissions.length} 个权限`);
      return permissions.sort((a, b) => a.category.localeCompare(b.category));

    } catch (err) {
      console.error('[DynamicPermissionService] 权限提取失败:', err);
      throw err;
    }
  }

  /**
   * 解析权限代码，生成权限对象
   */
  private parsePermissionCode(code: string, roleMap: Record<string, string[]>): DynamicPermission {
    const rules = PERMISSION_PARSING_RULES;
    const match = code.match(rules.codePattern);
    
    let resource = 'unknown';
    let action = 'unknown';
    let name = code; // 默认使用原始代码作为名称
    
    if (match) {
      resource = match[1];
      action = match[2] || ''; // 对于没有动作的权限，action为空
    }

    // 查找使用此权限的角色
    const usedByRoles = Object.entries(roleMap)
      .filter(([, permissions]) => permissions.includes(code))
      .map(([roleCode]) => roleCode);

    // 生成权限名称和描述
    let resourceName = '';
    let actionName = '';
    
    // 首先检查是否是独立权限（完整权限代码映射）
    if ((rules.resourceNames as any)[code]) {
      name = (rules.resourceNames as any)[code];
      resourceName = (rules.resourceNames as any)[code];
      actionName = '';
    } else {
      // 否则尝试分解为资源+动作
      resourceName = (rules.resourceNames as any)[resource] || resource;
      actionName = action ? ((rules.actionNames as any)[action] || action) : '';
      
      // 生成组合名称
      if (actionName && resourceName) {
        name = `${actionName}${resourceName}`;
      } else if (resourceName) {
        name = resourceName;
      }
    }
    
    const description = this.generatePermissionDescription(resource, action, code);
    const category = this.determineCategory(resource, action, code);

    return {
      id: `perm_${code.replace(/[^a-zA-Z0-9]/g, '_')}`,
      code,
      name,
      description,
      category,
      resource,
      action,
      isSystem: rules.systemPermissions.includes(code),
      isActive: true,
      usedByRoles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成权限描述
   */
  private generatePermissionDescription(resource: string, action: string, code: string): string {
    const rules = PERMISSION_PARSING_RULES;

    // 特殊权限的自定义描述
    const specialDescriptions: Record<string, string> = {
      'dashboard.read': '访问系统仪表板和概览信息',
      'data.all.read': '访问系统中的所有数据',
      'data.department.read': '访问所属部门的数据',
      'data.self.read': '访问个人相关数据',
      'user_management.read': '查看用户列表和基本信息',
      'user_management.write': '创建、编辑和删除用户账号',
      'role_management.read': '查看系统角色和权限配置',
      'role_management.write': '管理系统角色和权限分配',
      'employee_management.read': '查看员工信息和档案',
      'employee_management.write': '创建、编辑员工信息',
      'payroll_management.read': '查看薪资数据和报表',
      'payroll_management.write': '编辑薪资数据和计算参数',
      'payroll.clear': '清空薪资数据（高风险操作）',
      'assign_roles': '为用户分配和移除系统角色',
      'view_roles': '查看系统中的所有角色信息',
      'view_role_permissions': '查看各角色的权限配置详情',
      'view_role_history': '查看角色变更历史记录',
      'manage_roles': '创建、编辑和删除系统角色',
      'manage_role_permissions': '管理角色的权限分配和配置'
    };

    if (specialDescriptions[code]) {
      return specialDescriptions[code];
    }

    // 生成通用描述
    const resourceName = (rules.resourceNames as any)[resource] || resource;
    const actionName = (rules.actionNames as any)[action] || action;

    if (action && resourceName && actionName) {
      return `允许对${resourceName}执行${actionName}操作`;
    } else if ((rules.resourceNames as any)[code]) {
      return `${(rules.resourceNames as any)[code]}相关的操作权限`;
    } else {
      return `${code} 权限`;
    }
  }

  /**
   * 确定权限分类（动态生成，基于实际权限数据）
   */
  private determineCategory(resource: string, action: string, code: string): string {
    // 首先检查是否有特定的权限分类映射
    const specificCategoryMap: Record<string, string> = {
      'assign_roles': '角色管理',
      'view_roles': '角色管理',
      'view_role_permissions': '角色管理',
      'view_role_history': '角色管理',
      'manage_roles': '角色管理',
      'manage_role_permissions': '角色管理'
    };

    if (specificCategoryMap[code]) {
      return specificCategoryMap[code];
    }

    // 动态分类映射 - 基于数据库中实际存在的权限代码前缀
    const categoryMap: Record<string, string> = {
      // 核心管理模块
      'user_management': '用户管理',
      'role_management': '角色管理',
      'permission_management': '权限管理',
      'employee_management': '员工管理', 
      'payroll_management': '薪资管理',
      'payroll': '薪资操作',
      
      // 基础功能
      'dashboard': '基础功能',
      'data': '数据访问',
      'statistics': '统计报表',
      'hr': '人力资源',
      
      // 系统功能（动态扩展）
      'system': '系统管理',
      'config': '系统配置',
      'audit': '审计日志',
      'report': '报表管理',
      'import': '数据导入',
      'export': '数据导出',
      'backup': '数据备份',
      
      // 财务相关
      'finance': '财务管理',
      'salary': '薪资核算',
      'benefit': '福利管理',
      'tax': '税务管理',
      
      // 其他可能的模块
      'attendance': '考勤管理',
      'leave': '请假管理',
      'training': '培训管理',
      'performance': '绩效管理',
      'contract': '合同管理',
      'department': '部门管理',
      'position': '职位管理'
    };

    // 如果有精确匹配，返回对应分类
    if (categoryMap[resource]) {
      return categoryMap[resource];
    }
    
    // 尝试部分匹配（适应各种可能的资源命名）
    for (const [key, value] of Object.entries(categoryMap)) {
      if (resource.includes(key) || key.includes(resource)) {
        return value;
      }
    }

    // 如果都没有匹配，基于权限代码的语义生成分类名称
    if (resource && resource.length > 0) {
      // 将下划线转换为可读的中文分类名
      const readableCategory = resource
        .split('_')
        .map(word => {
          // 英文单词到中文的基础映射
          const wordMap: Record<string, string> = {
            'user': '用户',
            'role': '角色', 
            'permission': '权限',
            'employee': '员工',
            'staff': '员工',
            'payroll': '薪资',
            'salary': '薪资',
            'wage': '工资',
            'management': '管理',
            'admin': '管理',
            'system': '系统',
            'data': '数据',
            'report': '报表',
            'finance': '财务',
            'hr': '人力资源',
            'department': '部门',
            'position': '职位',
            'attendance': '考勤',
            'leave': '请假',
            'training': '培训',
            'performance': '绩效',
            'contract': '合同'
          };
          
          return wordMap[word.toLowerCase()] || word;
        })
        .join('');
      
      return readableCategory + '管理';
    }

    // 最后的兜底分类
    return '其他功能';
  }

  /**
   * 获取权限分组
   */
  async getPermissionsByCategory(): Promise<PermissionCategory[]> {
    const permissions = await this.getAllPermissions();
    const categoryMap = new Map<string, DynamicPermission[]>();

    // 按分类分组权限
    permissions.forEach(permission => {
      const category = permission.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(permission);
    });

    // 转换为分类对象
    const categories: PermissionCategory[] = Array.from(categoryMap.entries()).map(([name, perms]) => ({
      id: `cat_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      description: `${name}相关的权限配置`,
      permissionCount: perms.length,
      permissions: perms.sort((a, b) => a.name.localeCompare(b.name))
    }));

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 获取所有权限（带缓存）
   */
  async getAllPermissions(): Promise<DynamicPermission[]> {
    const now = new Date();
    
    // 检查缓存是否有效
    if (this.lastCacheUpdate && 
        (now.getTime() - this.lastCacheUpdate.getTime()) < this.CACHE_TTL &&
        this.permissionCache.size > 0) {
      return Array.from(this.permissionCache.values());
    }

    // 缓存过期或为空，重新提取
    return await this.extractAllPermissions();
  }

  /**
   * 根据权限代码获取权限
   */
  async getPermissionByCode(code: string): Promise<DynamicPermission | null> {
    const permissions = await this.getAllPermissions();
    return permissions.find(p => p.code === code) || null;
  }

  /**
   * 搜索权限
   */
  async searchPermissions(query: string): Promise<DynamicPermission[]> {
    const permissions = await this.getAllPermissions();
    const searchQuery = query.toLowerCase().trim();
    
    if (!searchQuery) return permissions;

    return permissions.filter(permission => 
      permission.code.toLowerCase().includes(searchQuery) ||
      permission.name.toLowerCase().includes(searchQuery) ||
      permission.description.toLowerCase().includes(searchQuery) ||
      permission.category.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * 获取角色的权限列表
   */
  async getRolePermissions(roleCode: string): Promise<DynamicPermission[]> {
    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('permission_rules')
        .eq('role_code', roleCode)
        .eq('is_active', true)
        .single();

      if (error) {
        console.warn(`获取角色权限失败: ${roleCode}`, error);
        return [];
      }

      const rules = data?.permission_rules as any;
      const permissionCodes = rules?.permissions || [];
      
      const allPermissions = await this.getAllPermissions();
      return allPermissions.filter(p => permissionCodes.includes(p.code));

    } catch (err) {
      console.error('[DynamicPermissionService] 获取角色权限失败:', err);
      return [];
    }
  }

  /**
   * 更新缓存
   */
  private updateCache(permissions: DynamicPermission[]): void {
    this.permissionCache.clear();
    permissions.forEach(perm => {
      this.permissionCache.set(perm.code, perm);
    });
    this.lastCacheUpdate = new Date();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.categoryCache.clear();
    this.lastCacheUpdate = null;
  }

  /**
   * 获取权限统计信息
   */
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    categoriesCount: number;
    systemPermissions: number;
    mostUsedPermissions: Array<{ code: string; roleCount: number }>;
  }> {
    const permissions = await this.getAllPermissions();
    const categories = await this.getPermissionsByCategory();
    
    const systemPermissions = permissions.filter(p => p.isSystem).length;
    
    // 统计权限使用频率
    const permissionUsage = permissions
      .map(p => ({ code: p.code, roleCount: p.usedByRoles.length }))
      .sort((a, b) => b.roleCount - a.roleCount)
      .slice(0, 10);

    return {
      totalPermissions: permissions.length,
      categoriesCount: categories.length,
      systemPermissions,
      mostUsedPermissions: permissionUsage
    };
  }
}

// 导出单例实例
export const dynamicPermissionService = new DynamicPermissionService();