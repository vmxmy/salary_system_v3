/**
 * 系统设置Hook - 基于当前系统架构的完整系统配置管理功能
 * 
 * 功能特性：
 * - 基于 Supabase 进行系统设置数据查询和更新
 * - 集成权限系统进行操作权限验证
 * - 支持新用户默认角色配置、用户注册设置和角色分配规则
 * - 提供缓存管理和实时数据同步
 * 
 * 设计原则：
 * - 权限控制：所有操作都经过权限验证
 * - 数据安全：敏感操作需要额外权限确认
 * - 实时同步：设置变更实时反映到系统
 * - 错误处理：统一的错误处理和用户反馈
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { usePermissions } from '@/hooks/permissions';
import { useCacheInvalidationManager } from '@/hooks/core/useCacheInvalidationManager';
import type { Permission } from '@/types/permission';

// 系统设置相关类型定义
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

export interface AvailableRole {
  role_code: string;
  role_name: string;
  role_level: number;
}

export interface SystemSettingsFilters {
  active?: boolean;
  search?: string;
  category?: string;
}

// 查询键管理
export const SYSTEM_SETTINGS_KEYS = {
  all: ['system-settings'] as const,
  settings: () => [...SYSTEM_SETTINGS_KEYS.all, 'settings'] as const,
  setting: (key: string) => [...SYSTEM_SETTINGS_KEYS.all, 'setting', key] as const,
  newUserConfig: () => [...SYSTEM_SETTINGS_KEYS.all, 'new-user-config'] as const,
  registrationSettings: () => [...SYSTEM_SETTINGS_KEYS.all, 'registration-settings'] as const,
  roleAssignmentRules: () => [...SYSTEM_SETTINGS_KEYS.all, 'role-assignment-rules'] as const,
  availableRoles: () => [...SYSTEM_SETTINGS_KEYS.all, 'available-roles'] as const,
} as const;

/**
 * 获取所有系统设置
 */
export function useSystemSettingsList(filters?: SystemSettingsFilters) {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: [...SYSTEM_SETTINGS_KEYS.settings(), filters],
    queryFn: async (): Promise<SystemSetting[]> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read system settings');
      }

      try {
        let query = supabase
          .from('system_settings')
          .select('*')
          .eq('is_active', true)
          .order('setting_key');

        // 应用过滤条件
        if (filters?.search) {
          query = query.or(`setting_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
          handleError(error, { customMessage: '获取系统设置失败' });
          throw error;
        }

        return (data || []) as SystemSetting[];
      } catch (error) {
        handleError(error, { customMessage: '获取系统设置失败' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: permissions.hasPermission('system.config'),
  });
}

/**
 * 获取单个系统设置
 */
export function useSystemSetting(key: string) {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: SYSTEM_SETTINGS_KEYS.setting(key),
    queryFn: async (): Promise<any> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read system settings');
      }

      try {
        const { data, error } = await supabase
          .rpc('get_system_setting', { setting_key_param: key });

        if (error) {
          handleError(error, { customMessage: `获取系统设置 ${key} 失败` });
          throw error;
        }

        return data;
      } catch (error) {
        handleError(error, { customMessage: `获取系统设置 ${key} 失败` });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: permissions.hasPermission('system.config') && !!key,
  });
}

/**
 * 获取新用户默认角色配置
 */
export function useNewUserRoleConfig() {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: SYSTEM_SETTINGS_KEYS.newUserConfig(),
    queryFn: async (): Promise<NewUserRoleConfig> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read system settings');
      }

      try {
        const { data, error } = await supabase
          .rpc('get_system_setting', { setting_key_param: 'new_user_default_role' });

        if (error) {
          handleError(error, { customMessage: '获取新用户角色配置失败' });
          throw error;
        }

        // Type assertion to ensure correct structure
        const defaultConfig: NewUserRoleConfig = {
          role: 'employee',
          auto_assign: true,
          require_approval: false,
          notify_admins: true,
          allowed_registration_domains: [],
          registration_enabled: true
        };
        
        if (data && typeof data === 'object' && data !== null) {
          return { ...defaultConfig, ...data as Partial<NewUserRoleConfig> };
        }
        
        return defaultConfig;
      } catch (error) {
        handleError(error, { customMessage: '获取新用户角色配置失败' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: permissions.hasPermission('system.config'),
  });
}

/**
 * 获取用户注册设置
 */
export function useUserRegistrationSettings() {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: SYSTEM_SETTINGS_KEYS.registrationSettings(),
    queryFn: async (): Promise<UserRegistrationSettings> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read system settings');
      }

      try {
        const { data, error } = await supabase
          .rpc('get_system_setting', { setting_key_param: 'user_registration_settings' });

        if (error) {
          handleError(error, { customMessage: '获取用户注册设置失败' });
          throw error;
        }

        // Type assertion to ensure correct structure
        const defaultSettings: UserRegistrationSettings = {
          enabled: true,
          require_email_verification: true,
          allow_public_registration: false,
          default_permissions: ['dashboard.read', 'data.self.read']
        };
        
        if (data && typeof data === 'object' && data !== null) {
          return { ...defaultSettings, ...data as Partial<UserRegistrationSettings> };
        }
        
        return defaultSettings;
      } catch (error) {
        handleError(error, { customMessage: '获取用户注册设置失败' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: permissions.hasPermission('system.config'),
  });
}

/**
 * 获取角色分配规则
 */
export function useRoleAssignmentRules() {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: SYSTEM_SETTINGS_KEYS.roleAssignmentRules(),
    queryFn: async (): Promise<RoleAssignmentRules> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read system settings');
      }

      try {
        const { data, error } = await supabase
          .rpc('get_system_setting', { setting_key_param: 'role_assignment_rules' });

        if (error) {
          handleError(error, { customMessage: '获取角色分配规则失败' });
          throw error;
        }

        // Type assertion to ensure correct structure
        const defaultRules: RoleAssignmentRules = {
          auto_assign_by_email_domain: {},
          require_admin_approval: false,
          escalation_roles: {
            employee: 'manager',
            manager: 'hr_manager',
            hr_manager: 'admin'
          }
        };
        
        if (data && typeof data === 'object' && data !== null) {
          return { ...defaultRules, ...data as Partial<RoleAssignmentRules> };
        }
        
        return defaultRules;
      } catch (error) {
        handleError(error, { customMessage: '获取角色分配规则失败' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: permissions.hasPermission('system.config'),
  });
}

/**
 * 获取可用角色列表
 */
export function useAvailableRoles() {
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();

  return useQuery({
    queryKey: SYSTEM_SETTINGS_KEYS.availableRoles(),
    queryFn: async (): Promise<AvailableRole[]> => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to read roles');
      }

      try {
        // 默认角色列表
        const defaultRoles: AvailableRole[] = [
          { role_code: 'super_admin', role_name: '超级管理员', role_level: 1 },
          { role_code: 'admin', role_name: '管理员', role_level: 2 },
          { role_code: 'hr_manager', role_name: 'HR经理', role_level: 3 },
          { role_code: 'manager', role_name: '部门经理', role_level: 4 },
          { role_code: 'employee', role_name: '员工', role_level: 5 }
        ];

        try {
          // 尝试从数据库获取，失败则使用默认值
          const { data, error } = await supabase
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
          console.warn('[useSystemSettings] Database query failed, using default roles:', dbError);
        }

        return defaultRoles;
      } catch (error) {
        handleError(error, { customMessage: '获取可用角色失败' });
        // 返回默认角色而不是抛出错误
        return [{ role_code: 'employee', role_name: '员工', role_level: 5 }];
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: permissions.hasPermission('system.config'),
  });
}

/**
 * 系统设置更新操作
 */
export function useSystemSettingsMutations() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const permissions = usePermissions();
  const cacheManager = useCacheInvalidationManager();

  // 更新系统设置
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to update system settings');
      }

      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        throw error;
      }
    },
    onSuccess: async (_, { key }) => {
      // 使用统一缓存失效管理器
      await cacheManager.invalidateByEvent('system:settings:updated');
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新系统设置失败' });
    },
  });

  // 创建新系统设置
  const createSetting = useMutation({
    mutationFn: async ({ key, value, description }: { key: string, value: any, description: string }) => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to create system settings');
      }

      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          description,
          is_active: true
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await cacheManager.invalidateByEvent('system:settings:updated');
    },
    onError: (error) => {
      handleError(error, { customMessage: '创建系统设置失败' });
    },
  });

  // 批量更新设置
  const batchUpdateSettings = useMutation({
    mutationFn: async (settings: Array<{ key: string, value: any }>) => {
      if (!permissions.hasPermission('system.config')) {
        throw new Error('Insufficient permissions to update system settings');
      }

      // 逐一更新每个设置
      for (const { key, value } of settings) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);

        if (error) {
          throw new Error(`Failed to update ${key}: ${error.message}`);
        }
      }
    },
    onSuccess: async () => {
      // 批量更新使用统一缓存失效
      await cacheManager.invalidateByEvent('system:settings:updated');
    },
    onError: (error) => {
      handleError(error, { customMessage: '批量更新设置失败' });
    },
  });

  return {
    updateSetting,
    createSetting,
    batchUpdateSettings,
  };
}

/**
 * 主系统设置Hook
 */
export function useSystemSettings() {
  const permissions = usePermissions();

  // 获取各类设置数据
  const settingsList = useSystemSettingsList();
  const newUserConfig = useNewUserRoleConfig();
  const registrationSettings = useUserRegistrationSettings();
  const roleAssignmentRules = useRoleAssignmentRules();
  const availableRoles = useAvailableRoles();

  // 获取变更操作
  const mutations = useSystemSettingsMutations();

  // 权限检查
  const canReadSettings = useMemo(() => 
    permissions.hasPermission('system.config'), [permissions]
  );
  
  const canWriteSettings = useMemo(() => 
    permissions.hasPermission('system.config'), [permissions]
  );

  // 便捷方法
  const updateNewUserRoleConfig = useCallback((config: NewUserRoleConfig) => {
    return mutations.updateSetting.mutateAsync({ 
      key: 'new_user_default_role', 
      value: config 
    });
  }, [mutations.updateSetting]);

  const updateUserRegistrationSettings = useCallback((settings: UserRegistrationSettings) => {
    return mutations.updateSetting.mutateAsync({ 
      key: 'user_registration_settings', 
      value: settings 
    });
  }, [mutations.updateSetting]);

  const updateRoleAssignmentRules = useCallback((rules: RoleAssignmentRules) => {
    return mutations.updateSetting.mutateAsync({ 
      key: 'role_assignment_rules', 
      value: rules 
    });
  }, [mutations.updateSetting]);

  // 综合加载状态
  const loading = settingsList.isLoading || newUserConfig.isLoading || 
                  registrationSettings.isLoading || roleAssignmentRules.isLoading ||
                  availableRoles.isLoading;

  // 综合错误状态
  const error = settingsList.error || newUserConfig.error || 
               registrationSettings.error || roleAssignmentRules.error ||
               availableRoles.error;

  return {
    // 数据
    settings: settingsList.data || [],
    newUserRoleConfig: newUserConfig.data,
    userRegistrationSettings: registrationSettings.data,
    roleAssignmentRules: roleAssignmentRules.data,
    availableRoles: availableRoles.data || [],

    // 数据查询状态
    loading,
    error,

    // 变更操作
    updateSetting: mutations.updateSetting.mutateAsync,
    createSetting: mutations.createSetting.mutateAsync,
    batchUpdateSettings: mutations.batchUpdateSettings.mutateAsync,

    // 便捷方法
    updateNewUserRoleConfig,
    updateUserRegistrationSettings,
    updateRoleAssignmentRules,

    // 变更状态
    isUpdating: mutations.updateSetting.isPending || 
               mutations.createSetting.isPending || 
               mutations.batchUpdateSettings.isPending,

    // 权限
    canReadSettings,
    canWriteSettings,

    // 刷新方法
    refetch: () => {
      settingsList.refetch();
      newUserConfig.refetch();
      registrationSettings.refetch();
      roleAssignmentRules.refetch();
      availableRoles.refetch();
    },
  };
}

export default useSystemSettings;