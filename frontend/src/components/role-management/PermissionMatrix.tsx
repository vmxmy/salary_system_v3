/**
 * 权限矩阵组件
 * 
 * 功能特性：
 * - 权限矩阵视图
 * - 实时权限分配/撤销
 * - 权限继承状态显示
 * - 批量权限操作
 * - 权限冲突提示
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoleManagement } from '@/hooks/role-management/useRoleManagement';
import { useRolePermissions, type PermissionMatrixItem, type PermissionInfo } from '@/hooks/role-management/useRolePermissions';

interface PermissionMatrixProps {
  onPermissionChange?: (roleId: string, permissionId: string, granted: boolean) => void;
  enableBatchOperations?: boolean;
  showInheritedPermissions?: boolean;
  maxVisibleRoles?: number;
  maxVisiblePermissions?: number;
}

interface PermissionCellProps {
  item: PermissionMatrixItem;
  onChange: (granted: boolean) => void;
  disabled?: boolean;
  showInheritanceInfo?: boolean;
}

const PermissionCell: React.FC<PermissionCellProps> = ({
  item,
  onChange,
  disabled = false,
  showInheritanceInfo = true
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    if (disabled || isToggling) return;

    setIsToggling(true);
    try {
      await onChange(!item.has_permission);
    } catch (error) {
      console.error('权限切换失败:', error);
    } finally {
      setIsToggling(false);
    }
  }, [disabled, isToggling, item.has_permission, onChange]);

  // 权限状态样式
  const getCellStyle = () => {
    if (disabled) {
      return 'opacity-50 cursor-not-allowed';
    }

    if (item.has_permission) {
      return item.is_inherited 
        ? 'bg-success/20 border-success/50 text-success' 
        : 'bg-primary/20 border-primary/50 text-primary';
    }

    return 'bg-base-200 hover:bg-base-300 border-base-300';
  };

  // 权限图标
  const getPermissionIcon = () => {
    if (!item.has_permission) return '⭕';
    return item.is_inherited ? '🔗' : '✅';
  };

  return (
    <div className="relative group">
      <button
        className={`
          w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg
          transition-all duration-200 ${getCellStyle()}
          ${isToggling ? 'animate-pulse' : 'hover:scale-110'}
        `}
        onClick={handleToggle}
        disabled={disabled || isToggling}
        title={
          item.has_permission
            ? `已授权${item.is_inherited ? ' (继承)' : ''}`
            : '未授权'
        }
      >
        {isToggling ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          getPermissionIcon()
        )}
      </button>

      {/* 继承信息提示 */}
      {showInheritanceInfo && item.has_permission && item.is_inherited && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-info rounded-full border border-base-100" 
             title={`从 ${item.inherited_from} 继承`}>
        </div>
      )}
    </div>
  );
};

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  onPermissionChange = () => {},
  enableBatchOperations = true,
  showInheritedPermissions = true,
  maxVisibleRoles = 10,
  maxVisiblePermissions = 20
}) => {
  const { roles, loading: rolesLoading } = useRoleManagement();
  const { 
    permissions,
    assignPermissionToRole,
    revokePermissionFromRole,
    buildPermissionMatrix,
    loading: permissionsLoading
  } = useRolePermissions();

  const [matrixData, setMatrixData] = useState<PermissionMatrixItem[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 加载权限矩阵数据
  const loadMatrixData = useCallback(async () => {
    setLoading(true);
    try {
      const matrix = await buildPermissionMatrix();
      setMatrixData(matrix);
    } catch (error) {
      console.error('加载权限矩阵失败:', error);
    } finally {
      setLoading(false);
    }
  }, [buildPermissionMatrix]);

  // 处理权限变更
  const handlePermissionChange = useCallback(async (
    roleId: string, 
    permissionId: string, 
    granted: boolean
  ) => {
    try {
      if (granted) {
        await assignPermissionToRole(roleId, permissionId);
      } else {
        await revokePermissionFromRole(roleId, permissionId);
      }
      
      onPermissionChange(roleId, permissionId, granted);
      await loadMatrixData(); // 重新加载矩阵数据
    } catch (error) {
      console.error('权限变更失败:', error);
      throw error;
    }
  }, [assignPermissionToRole, revokePermissionFromRole, onPermissionChange, loadMatrixData]);

  // 资源类型列表
  const resourceTypes = useMemo(() => {
    const types = new Set<string>();
    permissions.forEach(p => types.add(p.resource_id));
    return Array.from(types);
  }, [permissions]);

  // 过滤后的角色和权限
  const filteredRoles = useMemo(() => {
    let filtered = roles.filter(role => role.is_active);
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(role => 
        role.role_name.toLowerCase().includes(search) ||
        role.role_code.toLowerCase().includes(search)
      );
    }
    
    return filtered.slice(0, maxVisibleRoles);
  }, [roles, searchTerm, maxVisibleRoles]);

  const filteredPermissions = useMemo(() => {
    let filtered = permissions.filter(p => p.is_active);
    
    if (resourceFilter !== 'all') {
      filtered = filtered.filter(p => p.resource_id === resourceFilter);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.permission_name.toLowerCase().includes(search) ||
        p.permission_code.toLowerCase().includes(search)
      );
    }
    
    return filtered.slice(0, maxVisiblePermissions);
  }, [permissions, resourceFilter, searchTerm, maxVisiblePermissions]);

  // 获取矩阵项数据
  const getMatrixItem = useCallback((roleId: string, permissionId: string): PermissionMatrixItem => {
    const item = matrixData.find(m => m.role_id === roleId && m.permission_id === permissionId);
    
    if (!item) {
      // 默认项
      const role = roles.find(r => r.id === roleId);
      const permission = permissions.find(p => p.id === permissionId);
      
      return {
        role_id: roleId,
        role_name: role?.role_name || '',
        permission_id: permissionId,
        permission_code: permission?.permission_code || '',
        permission_name: permission?.permission_name || '',
        has_permission: false,
        is_inherited: false
      };
    }
    
    return item;
  }, [matrixData, roles, permissions]);

  // 批量操作
  const handleBatchGrant = useCallback(async () => {
    if (selectedRoles.size === 0 || selectedPermissions.size === 0) return;

    setLoading(true);
    try {
      for (const roleId of selectedRoles) {
        for (const permissionId of selectedPermissions) {
          await assignPermissionToRole(roleId, permissionId);
        }
      }
      await loadMatrixData();
      setSelectedRoles(new Set());
      setSelectedPermissions(new Set());
    } catch (error) {
      console.error('批量授权失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, selectedPermissions, assignPermissionToRole, loadMatrixData]);

  const handleBatchRevoke = useCallback(async () => {
    if (selectedRoles.size === 0 || selectedPermissions.size === 0) return;

    setLoading(true);
    try {
      for (const roleId of selectedRoles) {
        for (const permissionId of selectedPermissions) {
          await revokePermissionFromRole(roleId, permissionId);
        }
      }
      await loadMatrixData();
      setSelectedRoles(new Set());
      setSelectedPermissions(new Set());
    } catch (error) {
      console.error('批量撤销失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, selectedPermissions, revokePermissionFromRole, loadMatrixData]);

  // 统计信息
  const stats = useMemo(() => {
    const totalCells = filteredRoles.length * filteredPermissions.length;
    const grantedCells = matrixData.filter(m => 
      filteredRoles.some(r => r.id === m.role_id) &&
      filteredPermissions.some(p => p.id === m.permission_id) &&
      m.has_permission
    ).length;
    const inheritedCells = matrixData.filter(m => 
      filteredRoles.some(r => r.id === m.role_id) &&
      filteredPermissions.some(p => p.id === m.permission_id) &&
      m.has_permission && m.is_inherited
    ).length;

    return {
      total: totalCells,
      granted: grantedCells,
      inherited: inheritedCells,
      direct: grantedCells - inheritedCells,
      coverage: totalCells > 0 ? (grantedCells / totalCells) * 100 : 0
    };
  }, [filteredRoles, filteredPermissions, matrixData]);

  // 初始化加载
  useEffect(() => {
    if (roles.length > 0 && permissions.length > 0) {
      loadMatrixData();
    }
  }, [roles, permissions, loadMatrixData]);

  if (rolesLoading || permissionsLoading || loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-3">加载权限矩阵...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-col gap-4 p-4 border-b border-base-300">
        {/* 搜索和过滤 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索角色或权限..."
              className="input input-bordered w-full input-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="select select-bordered select-sm"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <option value="all">全部资源</option>
            {resourceTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <div className="form-control">
            <label className="label cursor-pointer">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm mr-2" 
                checked={showInheritedPermissions}
                onChange={(e) => {
                  // TODO: 实现继承权限显示控制
                }}
              />
              <span className="label-text text-sm">显示继承</span>
            </label>
          </div>
        </div>

        {/* 批量操作 */}
        {enableBatchOperations && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-base-content/60">
              已选: {selectedRoles.size} 角色, {selectedPermissions.size} 权限
            </div>
            
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleBatchGrant}
                disabled={selectedRoles.size === 0 || selectedPermissions.size === 0 || loading}
              >
                批量授权
              </button>
              
              <button
                className="btn btn-sm btn-error"
                onClick={handleBatchRevoke}
                disabled={selectedRoles.size === 0 || selectedPermissions.size === 0 || loading}
              >
                批量撤销
              </button>
              
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSelectedRoles(new Set());
                  setSelectedPermissions(new Set());
                }}
                disabled={selectedRoles.size === 0 && selectedPermissions.size === 0}
              >
                清除选择
              </button>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="stats stats-horizontal bg-base-100">
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">权限覆盖率</div>
            <div className="stat-value text-lg">{stats.coverage.toFixed(1)}%</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">直接授权</div>
            <div className="stat-value text-lg text-primary">{stats.direct}</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">继承权限</div>
            <div className="stat-value text-lg text-success">{stats.inherited}</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">总授权</div>
            <div className="stat-value text-lg text-accent">{stats.granted}</div>
          </div>
        </div>
      </div>

      {/* 权限矩阵 */}
      <div className="flex-1 overflow-auto">
        {filteredRoles.length === 0 || filteredPermissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">权限矩阵为空</h3>
            <p className="text-base-content/60">
              没有角色或权限数据，请检查搜索条件
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 矩阵表格 */}
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead className="sticky top-0 bg-base-200 z-10">
                  <tr>
                    <th className="w-48 p-3">
                      <div className="flex items-center gap-2">
                        <span>角色 / 权限</span>
                        {enableBatchOperations && (
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={selectedRoles.size === filteredRoles.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles(new Set(filteredRoles.map(r => r.id)));
                              } else {
                                setSelectedRoles(new Set());
                              }
                            }}
                          />
                        )}
                      </div>
                    </th>
                    {filteredPermissions.map(permission => (
                      <th key={permission.id} className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-medium truncate max-w-20" 
                                title={permission.permission_name}>
                            {permission.permission_name}
                          </span>
                          <span className="text-xs text-base-content/60 truncate max-w-20">
                            {permission.action_type}
                          </span>
                          {enableBatchOperations && (
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedPermissions);
                                if (e.target.checked) {
                                  newSelected.add(permission.id);
                                } else {
                                  newSelected.delete(permission.id);
                                }
                                setSelectedPermissions(newSelected);
                              }}
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map(role => (
                    <tr key={role.id} className="hover:bg-base-100">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {enableBatchOperations && (
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={selectedRoles.has(role.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedRoles);
                                if (e.target.checked) {
                                  newSelected.add(role.id);
                                } else {
                                  newSelected.delete(role.id);
                                }
                                setSelectedRoles(newSelected);
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium">{role.role_name}</div>
                            <div className="text-xs text-base-content/60">{role.role_code}</div>
                          </div>
                        </div>
                      </td>
                      {filteredPermissions.map(permission => {
                        const item = getMatrixItem(role.id, permission.id);
                        return (
                          <td key={`${role.id}-${permission.id}`} className="p-2 text-center">
                            <PermissionCell
                              item={item}
                              onChange={(granted) => handlePermissionChange(role.id, permission.id, granted)}
                              disabled={role.is_system_role && item.is_inherited}
                              showInheritanceInfo={showInheritedPermissions}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="border-t border-base-300 p-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-primary/20 border-primary/50"></div>
            <span>直接授权</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-success/20 border-success/50"></div>
            <span>继承权限</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-base-200 border-base-300"></div>
            <span>未授权</span>
          </div>
        </div>
      </div>
    </div>
  );
};