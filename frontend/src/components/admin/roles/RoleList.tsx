/**
 * 角色列表组件 - 基于 DaisyUI 5 设计
 * 
 * 功能特性：
 * - 响应式表格设计
 * - 角色状态展示
 * - 操作按钮集成
 * - 加载状态处理
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RoleData {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface RoleListProps {
  roles: RoleData[];
  loading?: boolean;
  onEdit?: (role: RoleData) => void;
  onDelete?: (role: RoleData) => void;
  onManagePermissions?: (role: RoleData) => void;
  onRefresh?: () => void;
}

export function RoleList({
  roles,
  loading = false,
  onEdit,
  onDelete,
  onManagePermissions,
  onRefresh
}: RoleListProps) {

  // 获取角色等级显示
  const getRoleLevelBadge = (level: number) => {
    const levelConfig = {
      5: { text: '超级', class: 'badge-error' },
      4: { text: '高级', class: 'badge-warning' }, 
      3: { text: '中级', class: 'badge-info' },
      2: { text: '初级', class: 'badge-success' },
      1: { text: '基础', class: 'badge-primary' }
    };
    
    const config = levelConfig[level as keyof typeof levelConfig] || 
                  { text: '未知', class: 'badge-neutral' };
    
    return (
      <span className={`badge ${config.class} badge-sm`}>
        L{level} {config.text}
      </span>
    );
  };

  // 获取角色颜色样式
  const getRoleColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'primary': 'text-primary',
      'secondary': 'text-secondary', 
      'success': 'text-success',
      'info': 'text-info',
      'warning': 'text-warning',
      'error': 'text-error'
    };
    return colorMap[color] || 'text-primary';
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN
      });
    } catch {
      return '未知时间';
    }
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-2">加载角色列表中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">暂无角色数据</h3>
            <p className="text-base-content/70 mb-4">还没有创建任何角色，或者当前搜索条件下没有匹配的角色</p>
            {onRefresh && (
              <button onClick={onRefresh} className="btn btn-primary">
                刷新数据
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-0">
        {/* 表格头部 */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="card-title">角色列表 ({roles.length})</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          )}
        </div>

        {/* 响应式表格 */}
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>角色信息</th>
                <th>等级</th>
                <th>用户数</th>
                <th>权限数</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="hover">
                  {/* 角色信息 */}
                  <td>
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${role.isActive ? 'bg-success' : 'bg-error'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getRoleColorClass(role.color)}`}>
                            {role.name}
                          </span>
                          {role.isSystem && (
                            <span className="badge badge-neutral badge-xs">系统</span>
                          )}
                        </div>
                        <div className="text-sm text-base-content/70">
                          {role.code}
                        </div>
                        <div className="text-xs text-base-content/50 mt-1 max-w-xs truncate">
                          {role.description}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 等级 */}
                  <td>
                    {getRoleLevelBadge(role.level)}
                  </td>

                  {/* 用户数 */}
                  <td>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h3v-1a5.97 5.97 0 00-3-5.17" />
                      </svg>
                      <span className="font-medium">{role.userCount}</span>
                    </div>
                  </td>

                  {/* 权限数 */}
                  <td>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span className="font-medium">
                        {role.permissions.includes('*') ? '全部' : role.permissions.length}
                      </span>
                    </div>
                  </td>

                  {/* 状态 */}
                  <td>
                    <span className={`badge ${role.isActive ? 'badge-success' : 'badge-error'} badge-sm`}>
                      {role.isActive ? '启用' : '禁用'}
                    </span>
                  </td>

                  {/* 更新时间 */}
                  <td>
                    <div className="text-sm text-base-content/70">
                      {formatTime(role.updatedAt)}
                    </div>
                  </td>

                  {/* 操作 */}
                  <td>
                    <div className="flex items-center gap-1">
                      {onManagePermissions && (
                        <button
                          onClick={() => onManagePermissions(role)}
                          className="btn btn-ghost btn-xs text-info hover:bg-info hover:text-info-content"
                          title="管理权限"
                          aria-label={`管理角色 ${role.name} 的权限`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                          </svg>
                          <span className="hidden sm:inline ml-1">权限</span>
                        </button>
                      )}
                      
                      {onEdit && (
                        <button
                          onClick={() => onEdit(role)}
                          className="btn btn-ghost btn-xs text-warning hover:bg-warning hover:text-warning-content"
                          title="编辑角色"
                          aria-label={`编辑角色 ${role.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden sm:inline ml-1">编辑</span>
                        </button>
                      )}
                      
                      {onDelete && !role.isSystem && (
                        <button
                          onClick={() => onDelete(role)}
                          className={`btn btn-ghost btn-xs ${
                            role.userCount > 0 
                              ? 'text-base-300 cursor-not-allowed' 
                              : 'text-error hover:bg-error hover:text-error-content'
                          }`}
                          title={role.userCount > 0 ? `不能删除：该角色下有 ${role.userCount} 个用户` : '删除角色'}
                          aria-label={role.userCount > 0 ? `无法删除角色 ${role.name}，该角色下有 ${role.userCount} 个用户` : `删除角色 ${role.name}`}
                          disabled={role.userCount > 0}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline ml-1">删除</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}