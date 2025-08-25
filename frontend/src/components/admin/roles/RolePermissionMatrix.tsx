/**
 * 角色权限矩阵组件 - 管理角色的权限分配
 * 
 * 功能特性：
 * - 权限分组展示
 * - 批量权限操作
 * - 权限搜索和过滤
 * - 实时权限预览
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/hooks/permissions';

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

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

interface RolePermissionMatrixProps {
  role: RoleData;
  onUpdatePermissions: (roleId: string, permissions: string[]) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

// 模拟权限数据 - 实际应用中应该从API获取
const MOCK_PERMISSIONS: Permission[] = [
  // 用户管理
  { id: '1', code: 'user_management.read', name: '查看用户', description: '可以查看用户列表和详情', category: '用户管理', resource: 'user_management', action: 'read' },
  { id: '2', code: 'user_management.write', name: '编辑用户', description: '可以创建、编辑和删除用户', category: '用户管理', resource: 'user_management', action: 'write' },
  { id: '3', code: 'user_management.delete', name: '删除用户', description: '可以删除用户账号', category: '用户管理', resource: 'user_management', action: 'delete' },
  
  // 员工管理
  { id: '4', code: 'employee_management.read', name: '查看员工', description: '可以查看员工信息', category: '员工管理', resource: 'employee_management', action: 'read' },
  { id: '5', code: 'employee_management.write', name: '编辑员工', description: '可以编辑员工信息', category: '员工管理', resource: 'employee_management', action: 'write' },
  { id: '6', code: 'employee_management.create', name: '创建员工', description: '可以创建新员工', category: '员工管理', resource: 'employee_management', action: 'create' },
  
  // 薪资管理
  { id: '7', code: 'payroll.read', name: '查看薪资', description: '可以查看薪资数据', category: '薪资管理', resource: 'payroll', action: 'read' },
  { id: '8', code: 'payroll.write', name: '编辑薪资', description: '可以编辑薪资数据', category: '薪资管理', resource: 'payroll', action: 'write' },
  { id: '9', code: 'payroll.import', name: '导入薪资', description: '可以批量导入薪资数据', category: '薪资管理', resource: 'payroll', action: 'import' },
  { id: '10', code: 'payroll.approve', name: '审批薪资', description: '可以审批薪资数据', category: '薪资管理', resource: 'payroll', action: 'approve' },
  
  // 角色管理
  { id: '11', code: 'manage_roles', name: '管理角色', description: '可以创建、编辑和删除角色', category: '系统管理', resource: 'role', action: 'manage' },
  { id: '12', code: 'view_roles', name: '查看角色', description: '可以查看角色信息', category: '系统管理', resource: 'role', action: 'view' },
  { id: '13', code: 'assign_roles', name: '分配角色', description: '可以为用户分配角色', category: '系统管理', resource: 'role', action: 'assign' },
  { id: '14', code: 'view_role_permissions', name: '查看角色权限', description: '可以查看角色的权限配置', category: '系统管理', resource: 'role', action: 'view_permissions' },
  
  // 权限管理
  { id: '15', code: 'manage_role_permissions', name: '管理角色权限', description: '可以为角色分配和管理权限', category: '系统管理', resource: 'permission', action: 'manage_role_permissions' },
  { id: '16', code: 'permission.manage', name: '权限管理', description: '可以管理权限资源和配置', category: '系统管理', resource: 'permission', action: 'manage' },
  
  // 基础权限
  { id: '17', code: 'dashboard.read', name: '查看仪表板', description: '可以访问系统仪表板', category: '基础功能', resource: 'dashboard', action: 'read' },
  { id: '18', code: 'statistics:read', name: '查看统计', description: '可以查看统计报表', category: '基础功能', resource: 'statistics', action: 'read' },
];

export function RolePermissionMatrix({
  role,
  onUpdatePermissions,
  onClose,
  loading = false
}: RolePermissionMatrixProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  // 获取权限分组
  const permissionCategories = useMemo(() => {
    const categories = Array.from(new Set(MOCK_PERMISSIONS.map(p => p.category)));
    return categories.sort();
  }, []);

  // 过滤权限
  const filteredPermissions = useMemo(() => {
    return MOCK_PERMISSIONS.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // 按分组组织权限
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    filteredPermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  }, [filteredPermissions]);

  // 检查权限是否被选中
  const isPermissionSelected = (permissionCode: string) => {
    return selectedPermissions.includes(permissionCode) || selectedPermissions.includes('*');
  };

  // 切换单个权限
  const togglePermission = (permissionCode: string) => {
    if (selectedPermissions.includes('*')) {
      // 如果有全部权限，不允许取消单个权限
      return;
    }
    
    setSelectedPermissions(prev => {
      if (prev.includes(permissionCode)) {
        return prev.filter(p => p !== permissionCode);
      } else {
        return [...prev, permissionCode];
      }
    });
  };

  // 切换分组权限
  const toggleCategoryPermissions = (category: string, enable: boolean) => {
    const categoryPermissions = MOCK_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.code);
    
    setSelectedPermissions(prev => {
      if (enable) {
        const newPermissions = new Set([...prev, ...categoryPermissions]);
        return Array.from(newPermissions);
      } else {
        return prev.filter(p => !categoryPermissions.includes(p));
      }
    });
  };

  // 全选/取消全选
  const toggleAllPermissions = (enable: boolean) => {
    if (enable) {
      setSelectedPermissions(['*']);
    } else {
      setSelectedPermissions([]);
    }
  };

  // 保存权限配置
  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdatePermissions(role.id, selectedPermissions);
      onClose();
    } catch (error) {
      console.error('保存权限失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 计算选中状态统计
  const selectionStats = useMemo(() => {
    const totalPermissions = MOCK_PERMISSIONS.length;
    const selectedCount = selectedPermissions.includes('*') ? totalPermissions : selectedPermissions.length;
    
    return {
      total: totalPermissions,
      selected: selectedCount,
      percentage: Math.round((selectedCount / totalPermissions) * 100)
    };
  }, [selectedPermissions]);

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">权限分配</h2>
            <p className="text-sm text-gray-500">
              为角色 <span className="font-medium text-primary">{role.name}</span> 分配权限
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat bg-primary/10 rounded-lg">
            <div className="stat-title text-primary">已选权限</div>
            <div className="stat-value text-primary text-2xl">{selectionStats.selected}</div>
          </div>
          <div className="stat bg-info/10 rounded-lg">
            <div className="stat-title text-info">总权限数</div>
            <div className="stat-value text-info text-2xl">{selectionStats.total}</div>
          </div>
          <div className="stat bg-success/10 rounded-lg">
            <div className="stat-title text-success">覆盖率</div>
            <div className="stat-value text-success text-2xl">{selectionStats.percentage}%</div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="form-control">
              <div className="input-group">
                <span className="input-group-text">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="搜索权限..."
                  className="input input-bordered flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="form-control min-w-0 sm:min-w-[150px]">
            <select
              className="select select-bordered"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">全部分类</option>
              {permissionCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toggleAllPermissions(true)}
              className="btn btn-sm btn-success"
              disabled={saving}
            >
              全选
            </button>
            <button
              onClick={() => toggleAllPermissions(false)}
              className="btn btn-sm btn-error"
              disabled={saving}
            >
              清空
            </button>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          {Object.entries(permissionsByCategory).map(([category, permissions]) => {
            const categoryPermissions = permissions.map(p => p.code);
            const selectedInCategory = categoryPermissions.filter(p => isPermissionSelected(p)).length;
            const isAllSelected = selectedInCategory === categoryPermissions.length;
            const isPartialSelected = selectedInCategory > 0 && selectedInCategory < categoryPermissions.length;

            return (
              <div key={category} className="collapse collapse-arrow border-b">
                <input type="checkbox" defaultChecked />
                <div className="collapse-title min-h-0 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="label cursor-pointer p-0">
                        <input
                          type="checkbox"
                          className={`checkbox checkbox-sm ${isPartialSelected ? 'checkbox-warning' : 'checkbox-primary'}`}
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartialSelected;
                          }}
                          onChange={(e) => toggleCategoryPermissions(category, e.target.checked)}
                          disabled={saving}
                        />
                      </label>
                      <span className="font-medium">{category}</span>
                    </div>
                    <span className="badge badge-sm">
                      {selectedInCategory} / {categoryPermissions.length}
                    </span>
                  </div>
                </div>
                <div className="collapse-content">
                  <div className="grid gap-2">
                    {permissions.map(permission => (
                      <label key={permission.id} className="label cursor-pointer justify-start py-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary mr-3"
                          checked={isPermissionSelected(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          disabled={saving || selectedPermissions.includes('*')}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-gray-500">{permission.description}</div>
                          <div className="text-xs text-gray-400 font-mono mt-1">{permission.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存权限配置
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}