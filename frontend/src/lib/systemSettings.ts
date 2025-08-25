/**
 * 系统设置管理 API
 * 
 * 提供系统配置的读取和更新功能，包括：
 * - 新用户默认角色配置
 * - 用户注册设置
 * - 角色分配规则
 */

import { supabase } from './supabase';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewUserRoleConfig {
  role: string;
  auto_assign: boolean;
  require_approval: boolean;
  notify_admins: boolean;
  allowed_registration_domains: string[];
  registration_enabled: boolean;
}

export interface UserRegistrationSettings {
  enabled: boolean;
  require_email_verification: boolean;
  allow_public_registration: boolean;
  default_permissions: string[];
}

export interface RoleAssignmentRules {
  auto_assign_by_email_domain: Record<string, string>;
  require_admin_approval: boolean;
  escalation_roles: Record<string, string>;
}

/**
 * 系统设置 API 类
 */
class SystemSettingsAPI {
  /**
   * 获取指定的系统配置
   */
  async getSetting(key: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_system_setting', { setting_key_param: key });

      if (error) {
        console.error(`[SystemSettings] Error getting setting ${key}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[SystemSettings] Failed to get setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * 获取新用户默认角色配置
   */
  async getNewUserRoleConfig(): Promise<NewUserRoleConfig> {
    const config = await this.getSetting('new_user_default_role');
    
    return config || {
      role: 'employee',
      auto_assign: true,
      require_approval: false,
      notify_admins: true,
      allowed_registration_domains: [],
      registration_enabled: true
    };
  }

  /**
   * 获取用户注册设置
   */
  async getUserRegistrationSettings(): Promise<UserRegistrationSettings> {
    const config = await this.getSetting('user_registration_settings');
    
    return config || {
      enabled: true,
      require_email_verification: true,
      allow_public_registration: false,
      default_permissions: ['dashboard.read', 'data.self.read']
    };
  }

  /**
   * 获取角色分配规则
   */
  async getRoleAssignmentRules(): Promise<RoleAssignmentRules> {
    const config = await this.getSetting('role_assignment_rules');
    
    return config || {
      auto_assign_by_email_domain: {},
      require_admin_approval: false,
      escalation_roles: {
        employee: 'manager',
        manager: 'hr_manager',
        hr_manager: 'admin'
      }
    };
  }

  /**
   * 获取所有系统设置
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      // 直接使用 supabase 客户端避免类型问题
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('*')
        .eq('is_active', true)
        .order('setting_key');

      if (error) {
        console.error('[SystemSettings] Error getting all settings:', error);
        throw error;
      }

      return (data || []) as SystemSetting[];
    } catch (error) {
      console.error('[SystemSettings] Failed to get all settings:', error);
      throw error;
    }
  }

  /**
   * 更新系统设置
   */
  async updateSetting(key: string, value: any): Promise<void> {
    try {
      // 直接使用表操作避免类型问题
      const { error } = await (supabase as any)
        .from('system_settings')
        .update({
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        console.error(`[SystemSettings] Error updating setting ${key}:`, error);
        throw error;
      }

      console.log(`[SystemSettings] Successfully updated setting: ${key}`);
    } catch (error) {
      console.error(`[SystemSettings] Failed to update setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * 更新新用户角色配置
   */
  async updateNewUserRoleConfig(config: NewUserRoleConfig): Promise<void> {
    await this.updateSetting('new_user_default_role', config);
  }

  /**
   * 更新用户注册设置
   */
  async updateUserRegistrationSettings(config: UserRegistrationSettings): Promise<void> {
    await this.updateSetting('user_registration_settings', config);
  }

  /**
   * 更新角色分配规则
   */
  async updateRoleAssignmentRules(config: RoleAssignmentRules): Promise<void> {
    await this.updateSetting('role_assignment_rules', config);
  }

  /**
   * 创建新的系统设置
   */
  async createSetting(key: string, value: any, description: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('system_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          description,
          is_active: true
        });

      if (error) {
        console.error(`[SystemSettings] Error creating setting ${key}:`, error);
        throw error;
      }

      console.log(`[SystemSettings] Successfully created setting: ${key}`);
    } catch (error) {
      console.error(`[SystemSettings] Failed to create setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * 获取可用的角色列表（用于配置界面）
   */
  async getAvailableRoles(): Promise<Array<{role_code: string, role_name: string, role_level: number}>> {
    try {
      // 简化实现，返回常用角色列表
      const defaultRoles = [
        { role_code: 'super_admin', role_name: '超级管理员', role_level: 1 },
        { role_code: 'admin', role_name: '管理员', role_level: 2 },
        { role_code: 'hr_manager', role_name: 'HR经理', role_level: 3 },
        { role_code: 'manager', role_name: '部门经理', role_level: 4 },
        { role_code: 'employee', role_name: '员工', role_level: 5 }
      ];

      try {
        // 尝试从数据库获取，失败则使用默认值
        const { data, error } = await (supabase as any)
          .from('unified_permission_config')
          .select('role_code')
          .eq('is_active', true)
          .limit(10);

        if (!error && data && Array.isArray(data)) {
          // 如果数据库查询成功，返回数据库中的角色
          return data.map((item: any, index: number) => ({
            role_code: item.role_code || `role_${index}`,
            role_name: item.role_code || `角色 ${index}`,
            role_level: index + 1
          }));
        }
      } catch (dbError) {
        console.warn('[SystemSettings] Database query failed, using default roles:', dbError);
      }

      return defaultRoles;
    } catch (error) {
      console.error('[SystemSettings] Failed to get available roles:', error);
      // 返回默认角色而不是抛出错误
      return [
        { role_code: 'employee', role_name: '员工', role_level: 5 }
      ];
    }
  }
}

// 导出单例实例
export const systemSettings = new SystemSettingsAPI();

// 默认导出API实例
export default systemSettings;