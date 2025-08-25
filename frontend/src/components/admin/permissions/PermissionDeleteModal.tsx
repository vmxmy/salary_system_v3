/**
 * 权限删除确认模态框 - 基于DaisyUI 5设计
 * 
 * 功能特性：
 * - 删除影响分析
 * - 批量删除支持
 * - 安全确认机制
 * - 角色关联警告
 */

import React, { useState, useMemo } from 'react';
import type { DynamicPermission } from '@/services/dynamicPermissionService';
import { 
  XMarkIcon, 
  TrashIcon, 
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface PermissionDeleteModalProps {
  isOpen: boolean;
  permissions: DynamicPermission[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function PermissionDeleteModal({ 
  isOpen, 
  permissions, 
  onClose, 
  onSuccess 
}: PermissionDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // 重置状态
  React.useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setError(null);
      setIsDeleting(false);
      setShowDetails(false);
    }
  }, [isOpen]);

  /**
   * 删除影响分析
   */
  const impactAnalysis = useMemo(() => {
    const affectedRoles = new Set<string>();
    const systemPermissions: DynamicPermission[] = [];
    const userCreatedPermissions: DynamicPermission[] = [];
    
    permissions.forEach(perm => {
      // 收集受影响的角色
      perm.usedByRoles.forEach(role => affectedRoles.add(role));
      
      // 分类权限（系统权限vs用户创建权限）
      if (perm.isSystem) {
        systemPermissions.push(perm);
      } else {
        userCreatedPermissions.push(perm);
      }
    });

    const totalAffectedRoles = affectedRoles.size;
    const hasSystemPermissions = systemPermissions.length > 0;
    const hasRoleImpact = totalAffectedRoles > 0;

    return {
      affectedRoles: Array.from(affectedRoles),
      totalAffectedRoles,
      systemPermissions,
      userCreatedPermissions,
      hasSystemPermissions,
      hasRoleImpact,
      riskLevel: hasSystemPermissions ? 'high' : hasRoleImpact ? 'medium' : 'low'
    };
  }, [permissions]);

  /**
   * 确认文本验证
   */
  const isConfirmationValid = useMemo(() => {
    const isSingle = permissions.length === 1;
    const requiredText = isSingle ? permissions[0].code : `删除${permissions.length}个权限`;
    return confirmationInput === requiredText;
  }, [confirmationInput, permissions]);

  /**
   * 处理删除操作
   */
  const handleDelete = async () => {
    if (!isConfirmationValid) {
      setError('请输入正确的确认文本');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // TODO: 实现实际的权限删除API调用
      // await deletePermissions(permissions.map(p => p.code));
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除权限失败');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || permissions.length === 0) return null;

  const isSingle = permissions.length === 1;
  const permission = permissions[0];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              impactAnalysis.riskLevel === 'high' 
                ? 'bg-error/20' 
                : impactAnalysis.riskLevel === 'medium' 
                  ? 'bg-warning/20' 
                  : 'bg-base-200'
            }`}>
              <TrashIcon className={`w-6 h-6 ${
                impactAnalysis.riskLevel === 'high' 
                  ? 'text-error' 
                  : impactAnalysis.riskLevel === 'medium' 
                    ? 'text-warning' 
                    : 'text-base-content/70'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isSingle ? '删除权限' : `批量删除 ${permissions.length} 个权限`}
              </h3>
              <p className="text-sm text-base-content/70">
                {isSingle ? permission.name : '选中的权限将被永久删除'}
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isDeleting}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 风险等级警告 */}
        <div className={`alert mb-6 ${
          impactAnalysis.riskLevel === 'high' 
            ? 'alert-error' 
            : impactAnalysis.riskLevel === 'medium' 
              ? 'alert-warning' 
              : 'alert-info'
        }`}>
          {impactAnalysis.riskLevel === 'high' ? (
            <ShieldExclamationIcon className="w-5 h-5" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5" />
          )}
          <div>
            <div className="font-medium">
              {impactAnalysis.riskLevel === 'high' && '⚠️ 高风险操作'}
              {impactAnalysis.riskLevel === 'medium' && '⚠️ 中等风险操作'}  
              {impactAnalysis.riskLevel === 'low' && '💡 删除确认'}
            </div>
            <div className="text-sm mt-1">
              {impactAnalysis.hasSystemPermissions && '包含系统关键权限，删除后可能影响系统正常运行'}
              {!impactAnalysis.hasSystemPermissions && impactAnalysis.hasRoleImpact && 
                `删除后将影响 ${impactAnalysis.totalAffectedRoles} 个角色的权限配置`}
              {!impactAnalysis.hasSystemPermissions && !impactAnalysis.hasRoleImpact && 
                '这些权限未被任何角色使用，删除相对安全'}
            </div>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="card bg-base-200/50 mb-6">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">待删除的权限</span>
              {permissions.length > 3 && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? '收起' : `查看全部 ${permissions.length} 个`}
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {(showDetails ? permissions : permissions.slice(0, 3)).map(perm => (
                <div key={perm.code} className="flex items-center justify-between p-2 bg-base-100/50 rounded">
                  <div>
                    <div className="font-medium text-sm">{perm.name}</div>
                    <div className="text-xs text-base-content/60 font-mono">{perm.code}</div>
                  </div>
                  {perm.usedByRoles.length > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <UserGroupIcon className="w-3 h-3" />
                      <span>{perm.usedByRoles.length}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {!showDetails && permissions.length > 3 && (
                <div className="text-center text-sm text-base-content/50 py-2">
                  还有 {permissions.length - 3} 个权限...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 角色影响详情 */}
        {impactAnalysis.hasRoleImpact && (
          <div className="card bg-warning/5 border border-warning/20 mb-6">
            <div className="card-body py-4">
              <div className="flex items-center gap-2 mb-3">
                <UserGroupIcon className="w-4 h-4 text-warning" />
                <span className="font-medium text-warning">受影响的角色</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {impactAnalysis.affectedRoles.map(role => (
                  <span key={role} className="badge badge-warning badge-sm">{role}</span>
                ))}
              </div>
              
              <div className="text-sm text-base-content/70">
                删除这些权限后，上述角色的用户将失去相应的系统访问权限
              </div>
            </div>
          </div>
        )}

        {/* 系统权限警告 */}
        {impactAnalysis.hasSystemPermissions && (
          <div className="alert alert-error mb-6">
            <ShieldExclamationIcon className="w-5 h-5" />
            <div>
              <div className="font-medium">系统权限警告</div>
              <div className="text-sm mt-1">
                以下权限为系统关键权限，删除可能导致系统功能异常：
                <div className="mt-2 space-y-1">
                  {impactAnalysis.systemPermissions.map(perm => (
                    <div key={perm.code} className="font-mono text-xs bg-error/10 px-2 py-1 rounded">
                      {perm.code} - {perm.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 确认输入 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-medium">
              请输入 
              <code className="mx-1 px-1 bg-base-200 rounded text-xs">
                {isSingle ? permission.code : `删除${permissions.length}个权限`}
              </code> 
              确认删除
            </span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              confirmationInput && (isConfirmationValid ? 'input-success' : 'input-error')
            }`}
            value={confirmationInput}
            onChange={(e) => {
              setConfirmationInput(e.target.value);
              setError(null);
            }}
            disabled={isDeleting}
            placeholder={isSingle ? permission.code : `删除${permissions.length}个权限`}
          />
          <label className="label">
            <span className="label-text-alt">
              {confirmationInput && (isConfirmationValid ? 
                '✓ 确认文本正确' : 
                '✗ 确认文本不匹配')}
            </span>
          </label>
        </div>

        {/* 删除后果说明 */}
        <div className="alert mb-6">
          <InformationCircleIcon className="w-5 h-5" />
          <div>
            <div className="font-medium">删除后果</div>
            <div className="text-sm mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>权限将被永久删除，无法恢复</li>
                <li>相关角色将立即失去这些权限</li>
                <li>使用这些权限的用户将无法访问对应功能</li>
                <li>系统审计日志将记录此次删除操作</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-6">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 按钮组 */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            取消
          </button>
          <button
            type="button"
            className={`btn btn-error ${impactAnalysis.riskLevel === 'high' ? 'btn-outline' : ''}`}
            onClick={handleDelete}
            disabled={isDeleting || !isConfirmationValid}
          >
            {isDeleting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                删除中...
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4 mr-1" />
                {isSingle ? '删除权限' : `删除 ${permissions.length} 个权限`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}