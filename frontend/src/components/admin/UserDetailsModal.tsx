/**
 * 用户详情模态框组件 - 基于新权限系统
 * 
 * 功能特性：
 * - 展示完整的用户信息和权限详情
 * - 支持实时权限编辑和角色分配
 * - 集成审计日志和操作历史
 * - 响应式设计和无障碍支持
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { useResourceAccess } from '@/hooks/permissions/useResourceAccess';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import type { UserWithPermissions } from '@/hooks/user-management/useUserManagement';
import { supabase } from '@/lib/supabase';

import {
  XMarkIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  EyeIcon,
  ChartBarSquareIcon,
  CogIcon,
  KeyIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface UserDetailsModalProps {
  isOpen: boolean;
  userId: string | null;
  user: UserDetailsData | null;
  onClose: () => void;
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canAssignRoles: boolean;
    canManagePermissions: boolean;
  };
  onRefresh: () => void;
}

interface UserDetailsData extends UserWithPermissions {
  // 扩展字段
  last_login_at?: string;
  login_count?: number;
  created_by?: string;
  updated_by?: string;
  audit_logs?: Array<{
    id: string;
    action: string;
    details: string;
    created_at: string;
    created_by: string;
  }>;
}

/**
 * 用户详情模态框主组件
 */
export default function UserDetailsModal({ 
  isOpen, 
  userId, 
  user,
  onClose, 
  permissions,
  onRefresh
}: UserDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 权限管理
  const permission = usePermission();
  const userResource = useResourceAccess({
    resourceType: 'employee',
    resourceId: userId || undefined,
    scope: 'all'
  });

  // 初始化状态重置
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setEditMode(false);
      setActiveTab('overview');
    }
  }, [isOpen]);

  /**
   * 处理角色更新
   */
  const handleRoleUpdate = useCallback(async (newRole: string) => {
    if (!user?.user_id || !permissions.canAssignRoles) return;

    try {
      setLoading(true);
      
      // 这里应该调用父组件传递的更新回调
      // await onUpdateUser(user.user_id, { role: newRole });
      
      // 刷新数据
      onRefresh();
      
    } catch (err) {
      console.error('[UserDetailsModal] Failed to update role:', err);
      setError(err instanceof Error ? err : new Error('更新角色失败'));
    } finally {
      setLoading(false);
    }
  }, [user, permissions.canAssignRoles, onRefresh]);

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <ModalContainer isOpen={isOpen} onClose={onClose} title="用户详情">
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </ModalContainer>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error) {
    return (
      <ModalContainer isOpen={isOpen} onClose={onClose} title="加载失败">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-error mb-4" />
          <h3 className="text-lg font-semibold mb-2">加载用户详情失败</h3>
          <p className="text-base-content/70 mb-4">{error.message}</p>
          <button className="btn btn-primary" onClick={onRefresh}>
            重试
          </button>
        </div>
      </ModalContainer>
    );
  }

  /**
   * 渲染用户不存在状态
   */
  if (!user) {
    return (
      <ModalContainer isOpen={isOpen} onClose={onClose} title="用户不存在">
        <div className="text-center py-12">
          <UserIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">用户不存在</h3>
          <p className="text-base-content/70">无法找到指定的用户信息</p>
        </div>
      </ModalContainer>
    );
  }

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} title="用户详情" size="lg">
      {/* 模态框头部 */}
      <div className="flex items-center justify-between p-6 border-b border-base-300">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div>
            <h2 className="text-xl font-semibold">{user.employee_name || user.email}</h2>
            <p className="text-base-content/70">{user.email}</p>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {permissions.canUpdate && (
            <button
              className={`btn btn-sm ${editMode ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <EyeIcon className="w-4 h-4" />
                  查看模式
                </>
              ) : (
                <>
                  <PencilSquareIcon className="w-4 h-4" />
                  编辑模式
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="tabs tabs-lifted px-6 pt-4">
        <button
          className={`tab tab-lg ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <UserIcon className="w-4 h-4 mr-2" />
          基本信息
        </button>
        <button
          className={`tab tab-lg ${activeTab === 'permissions' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <ShieldCheckIcon className="w-4 h-4 mr-2" />
          权限详情
        </button>
        <button
          className={`tab tab-lg ${activeTab === 'audit' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <ClockIcon className="w-4 h-4 mr-2" />
          操作记录
        </button>
      </div>

      {/* 标签页内容 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab user={user} editMode={editMode} permissions={permissions} />
        )}
        {activeTab === 'permissions' && (
          <PermissionsTab 
            user={user} 
            editMode={editMode} 
            permissions={permissions}
            onRoleUpdate={handleRoleUpdate}
          />
        )}
        {activeTab === 'audit' && (
          <AuditTab user={user} />
        )}
      </div>

      {/* 模态框底部 */}
      {editMode && (
        <div className="flex justify-end gap-3 p-6 border-t border-base-300">
          <button
            className="btn btn-outline"
            onClick={() => setEditMode(false)}
          >
            取消
          </button>
          <button className="btn btn-primary">
            保存更改
          </button>
        </div>
      )}
    </ModalContainer>
  );
}

/**
 * 模态框容器组件
 */
interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

function ModalContainer({ isOpen, onClose, title, size = 'md', children }: ModalContainerProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-box w-96 max-w-sm',
    md: 'modal-box w-full max-w-2xl',
    lg: 'modal-box w-full max-w-4xl',
    xl: 'modal-box w-full max-w-6xl'
  };

  return (
    <div className="modal modal-open">
      <div className={sizeClasses[size]}>
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}

/**
 * 用户头像组件
 */
interface UserAvatarProps {
  user: UserDetailsData;
  size?: 'sm' | 'md' | 'lg';
}

function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  return (
    <div className="avatar avatar-placeholder">
      <div className={`bg-primary text-primary-content rounded-full ${sizeClasses[size]}`}>
        <span className={`font-medium ${textSizes[size]}`}>
          {user.employee_name?.charAt(0) || user.email?.charAt(0) || 'U'}
        </span>
      </div>
    </div>
  );
}

/**
 * 基本信息标签页
 */
interface OverviewTabProps {
  user: UserDetailsData;
  editMode: boolean;
  permissions: any;
}

function OverviewTab({ user, editMode, permissions }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* 基本信息卡片 */}
      <div className="card bg-base-200/50">
        <div className="card-body">
          <h3 className="card-title">
            <UserIcon className="w-5 h-5" />
            基本信息
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField 
              icon={<EnvelopeIcon className="w-4 h-4" />}
              label="邮箱地址"
              value={user.email}
              editable={editMode}
            />
            <InfoField 
              icon={<UserCircleIcon className="w-4 h-4" />}
              label="员工姓名"
              value={user.employee_name}
              editable={editMode}
            />
            <InfoField 
              icon={<BuildingOfficeIcon className="w-4 h-4" />}
              label="所属部门"
              value={user.department_name}
            />
            <InfoField 
              icon={<CogIcon className="w-4 h-4" />}
              label="职位名称"
              value={user.position_name}
            />
          </div>
        </div>
      </div>

      {/* 角色状态卡片 */}
      <div className="card bg-base-200/50">
        <div className="card-body">
          <h3 className="card-title">
            <ShieldCheckIcon className="w-5 h-5" />
            角色状态
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">当前角色</span>
              </label>
              <div className="badge badge-primary badge-lg">
                {user.role_metadata?.role_name || user.user_role || 'N/A'}
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">数据范围</span>
              </label>
              <div className="badge badge-info badge-lg">
                {user.data_scope === 'all' ? '全部数据' :
                 user.data_scope === 'department' ? '部门数据' :
                 user.data_scope === 'self' ? '个人数据' : user.data_scope}
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">账户状态</span>
              </label>
              <div className={`badge badge-lg ${
                user.role_active && user.config_active ? 'badge-success' : 'badge-error'
              }`}>
                {user.role_active && user.config_active ? '正常' : '停用'}
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">权限数量</span>
              </label>
              <div className="badge badge-accent badge-lg">
                {user.permissions?.length || 0} 个权限
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 时间信息卡片 */}
      <div className="card bg-base-200/50">
        <div className="card-body">
          <h3 className="card-title">
            <CalendarDaysIcon className="w-5 h-5" />
            时间信息
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField 
              icon={<ClockIcon className="w-4 h-4" />}
              label="角色分配时间"
              value={user.role_assigned_at ? new Date(user.role_assigned_at).toLocaleString('zh-CN') : 'N/A'}
            />
            <InfoField 
              icon={<ClockIcon className="w-4 h-4" />}
              label="生效时间"
              value={user.effective_from ? new Date(user.effective_from).toLocaleString('zh-CN') : 'N/A'}
            />
            <InfoField 
              icon={<ClockIcon className="w-4 h-4" />}
              label="失效时间"
              value={user.effective_until ? new Date(user.effective_until).toLocaleString('zh-CN') : '无限制'}
            />
            <InfoField 
              icon={<ClockIcon className="w-4 h-4" />}
              label="最后登录"
              value={user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '从未登录'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 权限详情标签页
 */
interface PermissionsTabProps {
  user: UserDetailsData;
  editMode: boolean;
  permissions: any;
  onRoleUpdate: (role: string) => void;
}

function PermissionsTab({ user, editMode, permissions, onRoleUpdate }: PermissionsTabProps) {
  return (
    <div className="space-y-6">
      {/* 权限概览 */}
      <div className="stats stats-vertical lg:stats-horizontal shadow">
        <div className="stat">
          <div className="stat-figure text-primary">
            <KeyIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">总权限数</div>
          <div className="stat-value text-primary">{user.permissions?.length || 0}</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-secondary">
            <ChartBarSquareIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">页面权限</div>
          <div className="stat-value text-secondary">
            {Object.values(user.page_permissions || {}).filter(Boolean).length}
          </div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-accent">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">数据范围</div>
          <div className="stat-value text-accent">
            {user.data_scope === 'all' ? '全部' :
             user.data_scope === 'department' ? '部门' :
             user.data_scope === 'self' ? '个人' : '限制'}
          </div>
        </div>
      </div>

      {/* 具体权限列表 */}
      <div className="card bg-base-200/50">
        <div className="card-body">
          <h3 className="card-title">具体权限</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {user.permissions?.map((permission, index) => (
              <div key={index} className="badge badge-outline">
                {permission}
              </div>
            )) || (
              <p className="text-base-content/70 col-span-full">没有分配任何权限</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 页面权限详情 */}
      {user.page_permissions && Object.keys(user.page_permissions).length > 0 && (
        <div className="card bg-base-200/50">
          <div className="card-body">
            <h3 className="card-title">页面访问权限</h3>
            
            <div className="space-y-2">
              {Object.entries(user.page_permissions).map(([page, hasAccess]) => (
                <div key={page} className="flex justify-between items-center">
                  <span>{page}</span>
                  <div className={`badge ${hasAccess ? 'badge-success' : 'badge-error'}`}>
                    {hasAccess ? '可访问' : '无权限'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 审计记录标签页
 */
function AuditTab({ user }: { user: UserDetailsData }) {
  return (
    <div className="space-y-4">
      {user.audit_logs && user.audit_logs.length > 0 ? (
        <div className="space-y-3">
          {user.audit_logs.map((log, index) => (
            <div key={log.id || index} className="card bg-base-200/50">
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{log.action}</h4>
                    <p className="text-sm text-base-content/70">{log.details}</p>
                  </div>
                  <div className="text-right text-sm text-base-content/70">
                    <div>{new Date(log.created_at).toLocaleString('zh-CN')}</div>
                    <div>操作人: {log.created_by}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClockIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
          <p className="text-base-content/70">暂无操作记录</p>
        </div>
      )}
    </div>
  );
}

/**
 * 信息字段组件
 */
interface InfoFieldProps {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  editable?: boolean;
}

function InfoField({ icon, label, value, editable = false }: InfoFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  
  // Generate unique IDs for accessibility
  const fieldId = useMemo(() => `info-field-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);
  const inputId = `${fieldId}-input`;

  return (
    <div>
      <label htmlFor={editing ? inputId : undefined} className="label">
        <span className="label-text flex items-center gap-2">
          {icon}
          {label}
        </span>
      </label>
      
      {editing && editable ? (
        <div className="flex gap-2">
          <input
            id={inputId}
            name={fieldId}
            type="text"
            className="input input-bordered input-sm flex-1"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            aria-describedby={`${fieldId}-description`}
          />
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => {
              // 保存逻辑
              setEditing(false);
            }}
            aria-label={`保存 ${label}`}
          >
            <CheckCircleIcon className="w-4 h-4" />
          </button>
          <div id={`${fieldId}-description`} className="sr-only">
            正在编辑 {label}，按回车保存或点击保存按钮
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-sm" role="text" aria-label={`${label}: ${value || 'N/A'}`}>
            {value || 'N/A'}
          </span>
          {editable && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setEditing(true)}
              aria-label={`编辑 ${label}`}
            >
              <PencilSquareIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}