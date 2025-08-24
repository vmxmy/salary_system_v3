/**
 * 用户批量操作模态框组件
 * 
 * 功能特性：
 * - 支持批量分配角色
 * - 批量修改数据范围
 * - 批量激活/停用用户
 * - 批量删除用户（危险操作）
 * - 操作确认和进度跟踪
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { supabase } from '@/lib/supabase';

import {
  XMarkIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  EyeSlashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface UserBatchActionsModalProps {
  isOpen: boolean;
  selectedUserIds: string[];
  selectedUsers: Array<{
    user_id: string;
    email: string;
    employee_name?: string;
    current_role?: string;
    current_scope?: string;
    is_active?: boolean;
  }>;
  availableRoles: Array<{ code: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  onBatchOperation: (operation: BatchOperation, userIds: string[]) => Promise<void>;
}

type BatchAction = 'assign_role' | 'change_scope' | 'activate' | 'deactivate' | 'delete';

interface BatchOperation {
  action: BatchAction;
  parameters?: Record<string, any>;
  reason?: string;
}

interface UserSummary {
  user_id: string;
  email: string;
  employee_name?: string;
  current_role?: string;
  current_scope?: string;
  is_active?: boolean;
}

/**
 * 批量操作模态框主组件
 */
export default function UserBatchActionsModal({ 
  isOpen, 
  selectedUserIds,
  selectedUsers,
  availableRoles,
  onClose, 
  onSuccess,
  onBatchOperation
}: UserBatchActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState<BatchAction>('assign_role');
  const [operation, setOperation] = useState<BatchOperation>({
    action: 'assign_role'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isExecuting, setIsExecuting] = useState(false);

  // 权限检查
  const permission = usePermission();

  // 将用户数据转换为内部格式
  const users: UserSummary[] = selectedUsers.map(user => ({
    user_id: user.user_id,
    email: user.email,
    employee_name: user.employee_name,
    current_role: user.current_role,
    current_scope: user.current_scope,
    is_active: user.is_active
  }));

  // 初始化重置状态
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setProgress({ current: 0, total: 0 });
      setIsExecuting(false);
      setOperation({ action: 'assign_role' });
      setSelectedAction('assign_role');
    }
  }, [isOpen]);

  /**
   * 操作配置
   */
  const actionConfigs = useMemo(() => ({
    assign_role: {
      name: '批量分配角色',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      color: 'text-primary',
      dangerous: false,
      description: '为选中的用户批量分配新角色'
    },
    change_scope: {
      name: '修改数据范围',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      color: 'text-info',
      dangerous: false,
      description: '批量修改用户的数据访问范围'
    },
    activate: {
      name: '批量激活用户',
      icon: <EyeIcon className="w-5 h-5" />,
      color: 'text-success',
      dangerous: false,
      description: '激活选中的用户账户'
    },
    deactivate: {
      name: '批量停用用户',
      icon: <EyeSlashIcon className="w-5 h-5" />,
      color: 'text-warning',
      dangerous: true,
      description: '停用选中的用户账户，用户将无法登录系统'
    },
    delete: {
      name: '批量删除用户',
      icon: <TrashIcon className="w-5 h-5" />,
      color: 'text-error',
      dangerous: true,
      description: '永久删除选中的用户账户，此操作不可恢复！'
    }
  }), []);

  /**
   * 执行批量操作
   */
  const executeBatchOperation = useCallback(async () => {
    if (!operation.action || users.length === 0) return;

    setIsExecuting(true);
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: users.length });

    try {
      await onBatchOperation(operation, selectedUserIds);
      onSuccess();
      
    } catch (err) {
      console.error('[UserBatchActionsModal] Batch operation failed:', err);
      setError(err instanceof Error ? err.message : '批量操作失败');
    } finally {
      setLoading(false);
      setIsExecuting(false);
    }
  }, [operation, users.length, selectedUserIds, onBatchOperation, onSuccess]);

  // 移除了直接的数据库操作函数，改为通过 onBatchOperation 回调处理

  if (!isOpen) return null;

  const currentActionConfig = actionConfigs[selectedAction];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-full max-w-3xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-primary" />
            批量用户操作
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-6">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 执行进度 */}
        {isExecuting && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">执行进度</span>
              <span className="text-sm text-base-content/70">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="progress progress-primary w-full">
              <div 
                className="progress-bar" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* 选中用户概览 */}
          <div className="card bg-base-200/50">
            <div className="card-body">
              <h4 className="card-title text-sm">
                选中用户 ({users.length} 名)
              </h4>
              
              <div className="max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-2 bg-base-100 rounded">
                      <div>
                        <div className="font-medium text-sm">{user.employee_name || user.email}</div>
                        <div className="text-xs text-base-content/70">
                          {user.current_role} · {user.current_scope} · 
                          <span className={user.is_active ? 'text-success' : 'text-error'}>
                            {user.is_active ? '正常' : '停用'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 操作选择 */}
          <fieldset className="form-control">
            <legend className="label">
              <span className="label-text font-medium">选择操作类型</span>
            </legend>
            
            <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="batch-action-legend">
              {Object.entries(actionConfigs).map(([action, config]) => (
                <label
                  key={action}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                    selectedAction === action
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-base-400'
                  } ${config.dangerous ? 'hover:border-error/50' : ''}`}
                >
                  <input
                    id={`action-${action}`}
                    type="radio"
                    name="batchAction"
                    value={action}
                    checked={selectedAction === action}
                    onChange={(e) => {
                      setSelectedAction(e.target.value as BatchAction);
                      setOperation({ action: e.target.value as BatchAction });
                    }}
                    className="radio radio-primary mr-3"
                    aria-describedby={`${action}-description`}
                  />
                  
                  <div className="inline-flex items-center gap-3">
                    <span className={config.color}>
                      {config.icon}
                    </span>
                    <div>
                      <div className={`font-medium ${config.dangerous ? 'text-error' : ''}`}>
                        {config.name}
                      </div>
                      <div id={`${action}-description`} className="text-sm text-base-content/70">
                        {config.description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 操作参数配置 */}
          {selectedAction === 'assign_role' && (
            <div className="form-control">
              <label htmlFor="batch-role-select" className="label">
                <span className="label-text">选择角色</span>
              </label>
              <select
                id="batch-role-select"
                name="batch_role"
                className="select select-bordered"
                value={operation.parameters?.role || ''}
                onChange={(e) => setOperation(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, role: e.target.value }
                }))}
                aria-describedby="batch-role-help"
                required
              >
                <option value="">请选择角色...</option>
                {availableRoles.map(role => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
              <div id="batch-role-help" className="label">
                <span className="label-text-alt">将为所有选中用户分配此角色</span>
              </div>
            </div>
          )}

          {selectedAction === 'change_scope' && (
            <div className="form-control">
              <label htmlFor="batch-scope-select" className="label">
                <span className="label-text">选择数据范围</span>
              </label>
              <select
                id="batch-scope-select"
                name="batch_scope"
                className="select select-bordered"
                value={operation.parameters?.scope || ''}
                onChange={(e) => setOperation(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, scope: e.target.value }
                }))}
                aria-describedby="batch-scope-help"
                required
              >
                <option value="">请选择数据范围...</option>
                <option value="self">仅个人数据</option>
                <option value="team">团队数据</option>
                <option value="department">部门数据</option>
                <option value="all">全部数据</option>
              </select>
              <div id="batch-scope-help" className="label">
                <span className="label-text-alt">将为所有选中用户设置此数据访问范围</span>
              </div>
            </div>
          )}

          {/* 操作原因 */}
          {(selectedAction === 'deactivate' || selectedAction === 'delete') && (
            <div className="form-control">
              <label htmlFor="operation-reason" className="label">
                <span className="label-text">操作原因</span>
              </label>
              <textarea
                id="operation-reason"
                name="operation_reason"
                className="textarea textarea-bordered"
                placeholder="请输入执行此操作的原因（将记录在审计日志中）"
                value={operation.reason || ''}
                onChange={(e) => setOperation(prev => ({
                  ...prev,
                  reason: e.target.value
                }))}
                rows={3}
                aria-describedby="reason-help"
                required={selectedAction === 'delete'}
              />
              <div id="reason-help" className="label">
                <span className="label-text-alt">
                  {selectedAction === 'delete' ? '删除操作必须提供原因' : '此原因将记录在审计日志中'}
                </span>
              </div>
            </div>
          )}

          {/* 危险操作警告 */}
          {currentActionConfig.dangerous && (
            <div className="alert alert-warning">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <div>
                <h4 className="font-bold">危险操作警告</h4>
                <div className="text-sm">
                  {selectedAction === 'delete' 
                    ? '删除用户是不可恢复的操作，请确认您真的要执行此操作。'
                    : '此操作将影响用户的系统访问权限，请谨慎操作。'
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          
          <button
            className={`btn ${currentActionConfig.dangerous ? 'btn-error' : 'btn-primary'}`}
            onClick={executeBatchOperation}
            disabled={
              loading || 
              (selectedAction === 'assign_role' && !operation.parameters?.role) ||
              (selectedAction === 'change_scope' && !operation.parameters?.scope) ||
              (currentActionConfig.dangerous && !operation.reason?.trim())
            }
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                执行中...
              </>
            ) : (
              <>
                {currentActionConfig.icon}
                执行操作
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}