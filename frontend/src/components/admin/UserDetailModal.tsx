/**
 * 用户详情模态框
 * 
 * 用于创建、编辑和查看用户信息的模态框组件，基于 DaisyUI 5 设计
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEnhancedPermission } from '@/hooks/permissions/useEnhancedPermission';
import { ModernModal } from '@/components/common/ModernModalSystem';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { supabase } from '@/lib/supabase';
import type { UserWithDetails, CreateUserData, UpdateUserData } from '@/types/user-management';

export interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  user?: UserWithDetails;
  mode: 'create' | 'edit' | 'view';
}

interface Employee {
  id: string;
  employee_name: string;
  departments: { department_name: string } | null;
  positions: { position_name: string } | null;
}

interface RoleOption {
  role_code: string;
  role_name: string;
  description?: string;
}

export function UserDetailModal({
  isOpen,
  onClose,
  onSave,
  user,
  mode
}: UserDetailModalProps) {
  const { t } = useTranslation('admin');
  const { hasPermission } = useEnhancedPermission();

  // 表单状态
  const [formData, setFormData] = useState<Partial<CreateUserData & UpdateUserData>>({
    email: '',
    employee_id: '',
    role: '',
    send_invitation: true,
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 数据选项
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 初始化表单数据
  useEffect(() => {
    if (user && (mode === 'edit' || mode === 'view')) {
      setFormData({
        email: user.email || '',
        employee_id: user.employee_id || '',
        role: user.active_role || user.role_names?.[0] || '',
        status: user.status || 'active'
      });
    } else {
      setFormData({
        email: '',
        employee_id: '',
        role: '',
        send_invitation: true,
        status: 'active'
      });
    }
    setErrors({});
  }, [user, mode, isOpen]);

  // 加载员工列表
  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_name,
          employee_job_history (
            department_id,
            position_id,
            departments (
              name
            ),
            positions (
              name
            )
          )
        `)
        .order('employee_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }, []);

  // 加载角色选项
  const loadRoles = useCallback(async () => {
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
  }, []);

  // 加载数据
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([loadEmployees(), loadRoles()])
        .finally(() => setLoading(false));
    }
  }, [isOpen, loadEmployees, loadRoles]);

  // 处理员工选择
  useEffect(() => {
    if (formData.employee_id) {
      const employee = employees.find(e => e.id === formData.employee_id);
      setSelectedEmployee(employee || null);
    } else {
      setSelectedEmployee(null);
    }
  }, [formData.employee_id, employees]);

  // 表单验证
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // 邮箱验证
    if (!formData.email?.trim()) {
      newErrors.email = t('validation.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    // 角色验证
    if (!formData.role?.trim()) {
      newErrors.role = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  // 处理表单字段变化
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // 处理表单提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await onSave(formData as CreateUserData);
      } else if (mode === 'edit' && user) {
        await onSave(user.id, formData as UpdateUserData);
      }
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      // 错误处理由父组件负责
    } finally {
      setSaving(false);
    }
  }, [formData, validateForm, mode, onSave, user, onClose]);

  const canEdit = mode !== 'view' && (
    (mode === 'create' && hasPermission('user:create')) ||
    (mode === 'edit' && hasPermission('user:update'))
  );

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
      title={
        mode === 'create' 
          ? t('user.createUser')
          : mode === 'edit'
          ? t('user.editUser')
          : t('user.userDetails')
      }
      size="lg"
      className="modal-enhanced"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="card card-compact bg-base-200/30">
          <div className="card-body">
            <h3 className="card-title text-lg">{t('user.basicInfo')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 邮箱地址 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('user.email')} *
                  </span>
                </label>
                <input
                  type="email"
                  className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder={t('user.emailPlaceholder')}
                  disabled={!canEdit}
                  required
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email}</span>
                  </label>
                )}
              </div>

              {/* 用户状态 */}
              {mode !== 'create' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t('user.status')}
                    </span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.status || 'active'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    disabled={!canEdit || !hasPermission('user:change_status')}
                  >
                    <option value="active">{t('user.status.active')}</option>
                    <option value="inactive">{t('user.status.inactive')}</option>
                    <option value="suspended">{t('user.status.suspended')}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 员工关联 */}
        <div className="card card-compact bg-base-200/30">
          <div className="card-body">
            <h3 className="card-title text-lg">{t('user.employeeAssociation')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 关联员工 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('user.linkedEmployee')}
                  </span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.employee_id || ''}
                  onChange={(e) => handleFieldChange('employee_id', e.target.value || null)}
                  disabled={!canEdit}
                >
                  <option value="">{t('user.noEmployee')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_name}
                      {emp.departments?.department_name && (
                        ` - ${emp.departments.department_name}`
                      )}
                    </option>
                  ))}
                </select>
              </div>

              {/* 员工信息显示 */}
              {selectedEmployee && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('user.employeeInfo')}</span>
                  </label>
                  <div className="bg-base-100 p-3 rounded-lg border">
                    <div className="text-sm font-medium">{selectedEmployee.employee_name}</div>
                    {selectedEmployee.departments?.department_name && (
                      <div className="text-xs text-base-content/60">
                        {selectedEmployee.departments.department_name}
                      </div>
                    )}
                    {selectedEmployee.positions?.position_name && (
                      <div className="text-xs text-base-content/60">
                        {selectedEmployee.positions.position_name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 角色分配 */}
        <div className="card card-compact bg-base-200/30">
          <div className="card-body">
            <h3 className="card-title text-lg">{t('user.roleAssignment')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 主要角色 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('user.primaryRole')} *
                  </span>
                </label>
                <select
                  className={`select select-bordered ${errors.role ? 'select-error' : ''}`}
                  value={formData.role || ''}
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                  disabled={!canEdit || !hasPermission('user:assign_role')}
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
                {errors.role && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.role}</span>
                  </label>
                )}
              </div>

              {/* 角色描述 */}
              {formData.role && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('user.roleDescription')}</span>
                  </label>
                  <div className="bg-base-100 p-3 rounded-lg border">
                    {(() => {
                      const selectedRole = roleOptions.find(r => r.role_code === formData.role);
                      return (
                        <div>
                          <div className="text-sm font-medium">{selectedRole?.role_name}</div>
                          {selectedRole?.description && (
                            <div className="text-xs text-base-content/60 mt-1">
                              {selectedRole.description}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 创建选项 */}
        {mode === 'create' && (
          <div className="card card-compact bg-base-200/30">
            <div className="card-body">
              <h3 className="card-title text-lg">{t('user.creationOptions')}</h3>
              
              <div className="form-control">
                <label className="cursor-pointer label justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.send_invitation || false}
                    onChange={(e) => handleFieldChange('send_invitation', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="label-text">
                    {t('user.sendInvitation')}
                  </span>
                </label>
                <div className="text-xs text-base-content/60 ml-8">
                  {t('user.sendInvitationDescription')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 现有角色显示（编辑/查看模式） */}
        {mode !== 'create' && user && user.roles.length > 0 && (
          <div className="card card-compact bg-base-200/30">
            <div className="card-body">
              <h3 className="card-title text-lg">{t('user.currentRoles')}</h3>
              
              <div className="flex flex-wrap gap-2">
                {user.roles.map((userRole, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className={`badge ${userRole.is_active ? 'badge-primary' : 'badge-ghost'}`}>
                      {userRole.role}
                    </span>
                    {userRole.is_active && (
                      <span className="badge badge-success badge-sm">
                        {t('user.active')}
                      </span>
                    )}
                  </div>
                ))}
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
            disabled={saving}
          >
            {mode === 'view' ? t('common.close') : t('common.cancel')}
          </button>
          
          {canEdit && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving && <span className="loading loading-spinner loading-sm"></span>}
              {saving 
                ? t('common.saving')
                : mode === 'create'
                ? t('user.createUser')
                : t('common.save')
              }
            </button>
          )}
        </div>
      </form>
    </ModernModal>
  );
}