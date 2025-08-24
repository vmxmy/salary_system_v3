/**
 * 批量权限操作面板组件
 * 
 * 提供批量权限分配、撤销、角色管理等功能界面
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  BatchOperation,
  BatchOperationResult,
  BatchProgress,
  BatchOperationType,
  AssignmentOperation
} from '@/types/permission-assignment';
import { usePermissions } from '@/hooks/permissions';
import { useTranslation } from '@/hooks/useTranslation';
import { ConfirmModal } from '@/components/common/ConfirmModal';

interface BatchOperationPanelProps {
  selectedUserIds: string[];
  onOperationComplete?: (results: BatchOperationResult[]) => void;
  onClose?: () => void;
  className?: string;
}

interface OperationConfig {
  type: BatchOperationType;
  title: string;
  description: string;
  icon: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation: boolean;
}

interface BatchOperationForm {
  operationType: BatchOperationType;
  targetEntityId?: string; // 权限ID或角色ID
  reason: string;
  expiresAt?: Date;
  applyToAllUsers: boolean;
  selectedUsers: string[];
  overrideType?: 'grant' | 'deny';
  templateId?: string;
}

export function BatchOperationPanel({
  selectedUserIds,
  onOperationComplete,
  onClose,
  className = ''
}: BatchOperationPanelProps) {
  const { t } = useTranslation();
  const {
    isProcessing,
    progress,
    currentOperation,
    errors,
    results,
    batchAssignPermissions,
    batchRevokePermissions,
    batchAssignRoles,
    batchRemoveRoles,
    batchCreateOverrides,
    applyPermissionTemplate,
    cleanupExpiredPermissions,
    validateBatchOperations,
    previewBatchOperations,
    cancelOperation,
    resetResults
  } = useBatchPermissionOperations();

  const { previewBatchAssignment } = usePermissionAssignment();

  const [form, setForm] = useState<BatchOperationForm>({
    operationType: 'assign_permissions',
    reason: '',
    applyToAllUsers: true,
    selectedUsers: selectedUserIds
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Array<{id: string, name: string, code: string}>>([]);
  const [availableRoles, setAvailableRoles] = useState<Array<{id: string, name: string, code: string}>>([]);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string, name: string, description: string}>>([]);

  // 操作配置
  const operationConfigs = useMemo<OperationConfig[]>(() => [
    {
      type: 'assign_permissions',
      title: t('admin.permissions.assignPermissions'),
      description: t('admin.permissions.assignPermissionsDesc'),
      icon: '✓',
      riskLevel: 'medium',
      requiresConfirmation: true
    },
    {
      type: 'revoke_permissions',
      title: t('admin.permissions.revokePermissions'),
      description: t('admin.permissions.revokePermissionsDesc'),
      icon: '✗',
      riskLevel: 'high',
      requiresConfirmation: true
    },
    {
      type: 'assign_roles',
      title: t('admin.permissions.assignRoles'),
      description: t('admin.permissions.assignRolesDesc'),
      icon: '👤',
      riskLevel: 'high',
      requiresConfirmation: true
    },
    {
      type: 'remove_roles',
      title: t('admin.permissions.removeRoles'),
      description: t('admin.permissions.removeRolesDesc'),
      icon: '👤⚠️',
      riskLevel: 'critical',
      requiresConfirmation: true
    },
    {
      type: 'create_overrides',
      title: t('admin.permissions.createOverrides'),
      description: t('admin.permissions.createOverridesDesc'),
      icon: '⚡',
      riskLevel: 'medium',
      requiresConfirmation: true
    },
    {
      type: 'apply_template',
      title: t('admin.permissions.applyTemplate'),
      description: t('admin.permissions.applyTemplateDesc'),
      icon: '📋',
      riskLevel: 'medium',
      requiresConfirmation: true
    },
    {
      type: 'cleanup_expired',
      title: t('admin.permissions.cleanupExpired'),
      description: t('admin.permissions.cleanupExpiredDesc'),
      icon: '🧹',
      riskLevel: 'low',
      requiresConfirmation: false
    }
  ], [t]);

  const currentConfig = operationConfigs.find(config => config.type === form.operationType);

  // 初始化数据加载
  useEffect(() => {
    loadAvailableData();
  }, []);

  const loadAvailableData = useCallback(async () => {
    try {
      // 这些数据应该从相应的hooks或API获取
      // 暂时用示例数据
      setAvailablePermissions([
        { id: '1', name: '员工查看', code: 'employee.view' },
        { id: '2', name: '员工编辑', code: 'employee.edit' },
        { id: '3', name: '薪资查看', code: 'payroll.view' }
      ]);

      setAvailableRoles([
        { id: '1', name: '管理员', code: 'admin' },
        { id: '2', name: 'HR经理', code: 'hr_manager' },
        { id: '3', name: '员工', code: 'employee' }
      ]);

      setAvailableTemplates([
        { id: '1', name: '基础权限模板', description: '包含基本查看权限' },
        { id: '2', name: 'HR权限模板', description: '包含人事管理权限' }
      ]);
    } catch (error) {
      console.error('Failed to load available data:', error);
    }
  }, []);

  // 处理表单变更
  const handleFormChange = useCallback(<K extends keyof BatchOperationForm>(
    field: K,
    value: BatchOperationForm[K]
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 预览批量操作
  const handlePreview = useCallback(async () => {
    if (!validateForm()) return;

    try {
      const operations = createOperations();
      const preview = await previewBatchOperations(operations);
      setPreviewData(preview);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  }, [form, previewBatchOperations]);

  // 验证表单
  const validateForm = useCallback(() => {
    if (form.selectedUsers.length === 0) {
      alert(t('admin.permissions.noUsersSelected'));
      return false;
    }

    const needsTargetEntity = [
      'assign_permissions',
      'revoke_permissions',
      'assign_roles',
      'remove_roles',
      'create_overrides'
    ];

    if (needsTargetEntity.includes(form.operationType) && !form.targetEntityId) {
      alert(t('admin.permissions.targetEntityRequired'));
      return false;
    }

    if (form.operationType === 'apply_template' && !form.templateId) {
      alert(t('admin.permissions.templateRequired'));
      return false;
    }

    if (!form.reason.trim()) {
      alert(t('admin.permissions.reasonRequired'));
      return false;
    }

    return true;
  }, [form, t]);

  // 创建操作数组
  const createOperations = useCallback((): BatchOperation[] => {
    const userIds = form.applyToAllUsers ? selectedUserIds : form.selectedUsers;
    
    switch (form.operationType) {
      case 'assign_permissions':
      case 'revoke_permissions':
        return userIds.map(userId => ({
          userId,
          permissionId: form.targetEntityId!,
          operationType: form.operationType,
          reason: form.reason,
          expiresAt: form.expiresAt
        }));

      case 'create_overrides':
        return userIds.map(userId => ({
          userId,
          permissionId: form.targetEntityId!,
          operationType: form.operationType,
          reason: form.reason,
          expiresAt: form.expiresAt,
          metadata: { overrideType: form.overrideType }
        }));

      default:
        return userIds.map(userId => ({
          userId,
          permissionId: form.targetEntityId || '',
          operationType: form.operationType,
          reason: form.reason
        }));
    }
  }, [form, selectedUserIds]);

  // 执行批量操作
  const executeBatchOperation = useCallback(async () => {
    if (!validateForm()) return;

    setShowConfirmModal(false);
    resetResults();

    try {
      const userIds = form.applyToAllUsers ? selectedUserIds : form.selectedUsers;
      let results: BatchOperationResult[] = [];

      switch (form.operationType) {
        case 'assign_permissions':
          results = await batchAssignPermissions(createOperations());
          break;

        case 'revoke_permissions':
          results = await batchRevokePermissions(createOperations());
          break;

        case 'assign_roles':
          results = await batchAssignRoles(userIds, form.targetEntityId!);
          break;

        case 'remove_roles':
          results = await batchRemoveRoles(userIds, form.targetEntityId!);
          break;

        case 'create_overrides':
          results = await batchCreateOverrides(
            userIds.map(userId => ({
              userId,
              permissionId: form.targetEntityId!,
              overrideType: form.overrideType!,
              reason: form.reason,
              expiresAt: form.expiresAt
            }))
          );
          break;

        case 'apply_template':
          results = await applyPermissionTemplate(userIds, form.templateId!);
          break;

        case 'cleanup_expired':
          results = await cleanupExpiredPermissions(userIds);
          break;

        default:
          throw new Error(`Unsupported operation type: ${form.operationType}`);
      }

      onOperationComplete?.(results);
    } catch (error) {
      console.error('Batch operation failed:', error);
    }
  }, [
    form,
    selectedUserIds,
    validateForm,
    resetResults,
    createOperations,
    batchAssignPermissions,
    batchRevokePermissions,
    batchAssignRoles,
    batchRemoveRoles,
    batchCreateOverrides,
    applyPermissionTemplate,
    cleanupExpiredPermissions,
    onOperationComplete
  ]);

  // 获取风险级别样式
  const getRiskLevelClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': return 'badge-error';
      case 'critical': return 'badge-error animate-pulse';
      default: return 'badge-neutral';
    }
  };

  if (isProcessing) {
    return (
      <div className={`batch-operation-processing ${className}`}>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              <span className="loading loading-spinner loading-sm"></span>
              {t('admin.permissions.processingBatchOperation')}
            </h3>

            {progress && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>{currentOperation}</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={progress.percentage} 
                    max="100"
                  ></progress>
                </div>

                <div className="stats stats-horizontal shadow">
                  <div className="stat">
                    <div className="stat-title">已完成</div>
                    <div className="stat-value text-success">{progress.completed}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">失败</div>
                    <div className="stat-value text-error">{progress.failed}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">总数</div>
                    <div className="stat-value text-neutral">{progress.total}</div>
                  </div>
                </div>

                {progress.estimatedTimeRemaining > 0 && (
                  <div className="text-sm text-base-content/70">
                    预计剩余时间: {Math.ceil(progress.estimatedTimeRemaining / 1000)}秒
                  </div>
                )}
              </div>
            )}

            <div className="card-actions justify-end">
              <button 
                className="btn btn-outline btn-error"
                onClick={cancelOperation}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className={`batch-operation-results ${className}`}>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              {t('admin.permissions.batchOperationResults')}
            </h3>

            <div className="stats stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">成功</div>
                <div className="stat-value text-success">
                  {results.filter(r => r.success).length}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">失败</div>
                <div className="stat-value text-error">
                  {results.filter(r => !r.success).length}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">总数</div>
                <div className="stat-value text-neutral">{results.length}</div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold">操作错误:</h4>
                  <ul className="list-disc list-inside">
                    {errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                  {errors.length > 5 && (
                    <p className="text-sm">还有 {errors.length - 5} 个错误...</p>
                  )}
                </div>
              </div>
            )}

            <div className="card-actions justify-end">
              <button 
                className="btn btn-outline"
                onClick={resetResults}
              >
                {t('admin.permissions.startNewOperation')}
              </button>
              <button 
                className="btn btn-primary"
                onClick={onClose}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`batch-operation-panel ${className}`}>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h3 className="card-title">
              {t('admin.permissions.batchOperations')}
            </h3>
            {onClose && (
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                ✕
              </button>
            )}
          </div>

          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 className="font-bold">已选择 {selectedUserIds.length} 个用户</h4>
              <p>请选择要执行的批量操作</p>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('admin.permissions.operationType')}</span>
            </label>
            <select 
              className="select select-bordered"
              value={form.operationType}
              onChange={(e) => handleFormChange('operationType', e.target.value as BatchOperationType)}
            >
              {operationConfigs.map(config => (
                <option key={config.type} value={config.type}>
                  {config.icon} {config.title}
                </option>
              ))}
            </select>
            {currentConfig && (
              <label className="label">
                <span className="label-text-alt flex items-center gap-2">
                  <span className={`badge badge-sm ${getRiskLevelClass(currentConfig.riskLevel)}`}>
                    {t(`admin.permissions.riskLevel.${currentConfig.riskLevel}`)}
                  </span>
                  {currentConfig.description}
                </span>
              </label>
            )}
          </div>

          {/* 目标实体选择 */}
          {['assign_permissions', 'revoke_permissions', 'create_overrides'].includes(form.operationType) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('admin.permissions.selectPermission')}</span>
              </label>
              <select 
                className="select select-bordered"
                value={form.targetEntityId || ''}
                onChange={(e) => handleFormChange('targetEntityId', e.target.value)}
              >
                <option value="">{t('admin.permissions.selectPermissionPlaceholder')}</option>
                {availablePermissions.map(permission => (
                  <option key={permission.id} value={permission.id}>
                    {permission.name} ({permission.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {['assign_roles', 'remove_roles'].includes(form.operationType) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('admin.permissions.selectRole')}</span>
              </label>
              <select 
                className="select select-bordered"
                value={form.targetEntityId || ''}
                onChange={(e) => handleFormChange('targetEntityId', e.target.value)}
              >
                <option value="">{t('admin.permissions.selectRolePlaceholder')}</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.operationType === 'apply_template' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('admin.permissions.selectTemplate')}</span>
              </label>
              <select 
                className="select select-bordered"
                value={form.templateId || ''}
                onChange={(e) => handleFormChange('templateId', e.target.value)}
              >
                <option value="">{t('admin.permissions.selectTemplatePlaceholder')}</option>
                {availableTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.operationType === 'create_overrides' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('admin.permissions.overrideType')}</span>
              </label>
              <select 
                className="select select-bordered"
                value={form.overrideType || ''}
                onChange={(e) => handleFormChange('overrideType', e.target.value as 'grant' | 'deny')}
              >
                <option value="">{t('admin.permissions.selectOverrideType')}</option>
                <option value="grant">{t('admin.permissions.grant')}</option>
                <option value="deny">{t('admin.permissions.deny')}</option>
              </select>
            </div>
          )}

          {/* 操作原因 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('admin.permissions.operationReason')}</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-20"
              placeholder={t('admin.permissions.operationReasonPlaceholder')}
              value={form.reason}
              onChange={(e) => handleFormChange('reason', e.target.value)}
            ></textarea>
          </div>

          {/* 有效期设置 */}
          {['assign_permissions', 'create_overrides'].includes(form.operationType) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('admin.permissions.expiresAt')} ({t('common.optional')})</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered"
                value={form.expiresAt ? form.expiresAt.toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFormChange('expiresAt', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          )}

          {/* 用户范围选择 */}
          <div className="form-control">
            <label className="cursor-pointer label">
              <span className="label-text">{t('admin.permissions.applyToAllSelected')}</span>
              <input 
                type="checkbox"
                className="checkbox"
                checked={form.applyToAllUsers}
                onChange={(e) => handleFormChange('applyToAllUsers', e.target.checked)}
              />
            </label>
          </div>

          <div className="card-actions justify-end">
            <button 
              className="btn btn-outline"
              onClick={handlePreview}
              disabled={!validateForm()}
            >
              {t('admin.permissions.previewOperation')}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                if (currentConfig?.requiresConfirmation) {
                  handlePreview();
                } else {
                  executeBatchOperation();
                }
              }}
              disabled={!validateForm()}
            >
              {t('admin.permissions.executeOperation')}
            </button>
          </div>
        </div>
      </div>

      {/* 确认模态框 */}
      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={executeBatchOperation}
          title={t('admin.permissions.confirmBatchOperation')}
          confirmText={t('admin.permissions.executeOperation')}
          confirmClassName={`btn-${currentConfig?.riskLevel === 'critical' ? 'error' : 'primary'}`}
        >
          <div className="space-y-4">
              <p>{t('admin.permissions.batchOperationConfirmMessage')}</p>
              
              {previewData && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">{t('admin.permissions.operationPreview')}</h4>
                  <div className="text-sm space-y-1">
                    <div>影响用户: {previewData.affectedUsers?.length || 0}</div>
                    <div>操作类型: {currentConfig?.title}</div>
                    <div>风险级别: <span className={`badge badge-sm ${getRiskLevelClass(currentConfig?.riskLevel || 'low')}`}>
                      {t(`admin.permissions.riskLevel.${currentConfig?.riskLevel}`)}
                    </span></div>
                    {previewData.warnings && previewData.warnings.length > 0 && (
                      <div className="mt-2">
                        <div className="text-warning">⚠️ 警告:</div>
                        <ul className="list-disc list-inside ml-4">
                          {previewData.warnings.map((warning: any, index: number) => (
                            <li key={index}>{warning.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}