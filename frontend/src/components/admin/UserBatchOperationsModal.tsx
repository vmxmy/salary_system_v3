/**
 * 用户批量操作模态框
 * 
 * 处理用户的批量操作功能，基于 DaisyUI 5 设计
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { ModernModal } from '@/components/common/ModernModalSystem';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { supabase } from '@/lib/supabase';
import type { BatchUserAction, BatchUserOperation } from '@/types/user-management';

export interface UserBatchOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (operation: BatchUserOperation) => Promise<void>;
  action: BatchUserAction;
  selectedUserIds: string[];
}

interface UserInfo {
  id: string;
  email: string;
  employee_name?: string;
  role_names?: string[];
}

interface RoleOption {
  role_code: string;
  role_name: string;
  description?: string;
}

export function UserBatchOperationsModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedUserIds
}: UserBatchOperationsModalProps) {
  const { t } = useTranslation('admin');
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserInfo[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  
  // 表单数据
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(false);

  // 操作配置
  const actionConfig = useMemo(() => {
    const configs = {
      activate: {
        title: t('user.batchActivate'),
        description: t('user.batchActivateDescription'),
        color: 'success',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        confirmText: t('user.activate')
      },
      deactivate: {
        title: t('user.batchDeactivate'),
        description: t('user.batchDeactivateDescription'),
        color: 'warning',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 4h4.018a2 2 0 011.789 1.106l.5 1A2 2 0 0113.382 8H9m-4 6h2m-2 0h2m4 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        confirmText: t('user.deactivate')
      },
      suspend: {
        title: t('user.batchSuspend'),
        description: t('user.batchSuspendDescription'),
        color: 'error',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        ),
        confirmText: t('user.suspend')
      },
      delete: {
        title: t('user.batchDelete'),
        description: t('user.batchDeleteDescription'),
        color: 'error',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        confirmText: t('user.delete')
      },
      assign_role: {
        title: t('user.batchAssignRole'),
        description: t('user.batchAssignRoleDescription'),
        color: 'primary',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        confirmText: t('user.assignRole')
      },
      remove_role: {
        title: t('user.batchRemoveRole'),
        description: t('user.batchRemoveRoleDescription'),
        color: 'warning',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        ),
        confirmText: t('user.removeRole')
      },
      export: {
        title: t('user.batchExport'),
        description: t('user.batchExportDescription'),
        color: 'info',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        confirmText: t('common.export')
      }
    };
    
    return configs[action] || configs.activate;
  }, [action, t]);

  // 需要角色选择的操作
  const requiresRoleSelection = useMemo(() => {
    return ['assign_role', 'remove_role'].includes(action);
  }, [action]);

  // 需要确认的危险操作
  const isDangerousAction = useMemo(() => {
    return ['delete', 'suspend'].includes(action);
  }, [action]);

  // 加载选中用户信息
  const loadSelectedUsers = useCallback(async () => {
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          employees (
            employee_name
          ),
          user_roles (
            role
          )
        `)
        .in('id', selectedUserIds);

      if (error) throw error;

      const users: UserInfo[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        employee_name: user.employees?.employee_name || undefined,
        role_names: user.user_roles?.map((r: any) => r.role) || []
      }));

      setSelectedUsers(users);
    } catch (err) {
      console.error('Failed to load selected users:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUserIds]);

  // 加载角色选项
  const loadRoles = useCallback(async () => {
    if (!requiresRoleSelection) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('is_active', true);

      if (error) throw error;
      
      // 获取唯一角色并转换为RoleOption格式
      const uniqueRoles = [...new Set((data || []).map(item => item.role))];
      const roleOptions = uniqueRoles.map(role => ({
        role_code: role,
        role_name: role
      }));
      
      setRoleOptions(roleOptions);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, [requiresRoleSelection]);

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      Promise.all([loadSelectedUsers(), loadRoles()]);
      
      // 重置表单
      setSelectedRole('');
      setReason('');
      setNotify(false);
    }
  }, [isOpen, loadSelectedUsers, loadRoles]);

  // 表单验证
  const isFormValid = useMemo(() => {
    if (requiresRoleSelection && !selectedRole) {
      return false;
    }
    return true;
  }, [requiresRoleSelection, selectedRole]);

  // 处理确认操作
  const handleConfirm = useCallback(async () => {
    if (!isFormValid) return;

    setProcessing(true);
    try {
      const operation: BatchUserOperation = {
        action,
        userIds: selectedUserIds,
        parameters: {}
      };

      // 添加角色参数
      if (requiresRoleSelection && selectedRole) {
        operation.parameters!.role = selectedRole;
      }

      // 添加其他参数
      if (reason.trim()) {
        operation.parameters!.reason = reason.trim();
      }

      if (notify) {
        operation.parameters!.notify = true;
      }

      await onConfirm(operation);
      onClose();
    } catch (err) {
      console.error('Batch operation failed:', err);
      // 错误处理由父组件负责
    } finally {
      setProcessing(false);
    }
  }, [isFormValid, action, selectedUserIds, requiresRoleSelection, selectedRole, reason, notify, onConfirm, onClose]);

  if (loading) {
    return (
      <ModernModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('common.loading')}
        size="lg"
      >
        <LoadingScreen variant="inline" />
      </ModernModal>
    );
  }

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={actionConfig.title}
      size="lg"
      className="modal-enhanced"
    >
      <div className="space-y-6">
        {/* 操作说明 */}
        <div className={`alert alert-${actionConfig.color === 'primary' ? 'info' : actionConfig.color}`}>
          <div className="flex-shrink-0">
            {actionConfig.icon}
          </div>
          <div className="flex-1">
            <div className="font-medium mb-1">{actionConfig.title}</div>
            <div className="text-sm">{actionConfig.description}</div>
          </div>
        </div>

        {/* 选中用户列表 */}
        <div className="card card-compact bg-base-200/30">
          <div className="card-body">
            <h3 className="card-title text-lg">
              {t('user.selectedUsers')} ({selectedUsers.length})
            </h3>
            
            <div className="max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2 px-3 bg-base-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8 h-8">
                          <span className="text-xs">
                            {user.employee_name?.[0] || user.email[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.email}</div>
                        {user.employee_name && (
                          <div className="text-xs text-base-content/60">{user.employee_name}</div>
                        )}
                      </div>
                    </div>
                    
                    {user.role_names && user.role_names.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {user.role_names.map((role, index) => (
                          <span key={index} className="badge badge-primary badge-xs">
                            {t(`role.${role}`, role)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 角色选择 */}
        {requiresRoleSelection && (
          <div className="card card-compact bg-base-200/30">
            <div className="card-body">
              <h3 className="card-title text-lg">
                {action === 'assign_role' ? t('user.selectRoleToAssign') : t('user.selectRoleToRemove')}
              </h3>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('user.role')} *
                  </span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  <option value="">{t('user.selectRole')}</option>
                  {roleOptions.map(role => (
                    <option key={role.role_code} value={role.role_code}>
                      {role.role_name}
                      {role.description && ` - ${role.description}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 操作选项 */}
        <div className="card card-compact bg-base-200/30">
          <div className="card-body">
            <h3 className="card-title text-lg">{t('user.operationOptions')}</h3>
            
            <div className="space-y-4">
              {/* 原因说明 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {isDangerousAction ? t('user.reason') + ' *' : t('user.reason')}
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-20"
                  placeholder={t('user.reasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={isDangerousAction}
                />
                {isDangerousAction && (
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      {t('user.reasonRequiredForDangerous')}
                    </span>
                  </label>
                )}
              </div>

              {/* 通知选项 */}
              <div className="form-control">
                <label className="cursor-pointer label justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                  />
                  <span className="label-text">
                    {t('user.notifyUsers')}
                  </span>
                </label>
                <div className="text-xs text-base-content/60 ml-8">
                  {t('user.notifyUsersDescription')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 危险操作警告 */}
        {isDangerousAction && (
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <div className="font-medium">{t('common.warning')}</div>
              <div className="text-sm">
                {action === 'delete' 
                  ? t('user.deleteWarning')
                  : t('user.suspendWarning')
                }
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={processing}
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="button"
            className={`btn btn-${actionConfig.color}`}
            onClick={handleConfirm}
            disabled={processing || !isFormValid || (isDangerousAction && !reason.trim())}
          >
            {processing && <span className="loading loading-spinner loading-sm"></span>}
            {processing ? t('common.processing') : actionConfig.confirmText}
          </button>
        </div>
      </div>
    </ModernModal>
  );
}