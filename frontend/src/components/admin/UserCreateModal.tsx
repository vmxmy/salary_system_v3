/**
 * 用户创建模态框组件
 * 
 * 功能特性：
 * - 支持创建新用户账户
 * - 集成员工信息关联
 * - 角色分配和权限配置
 * - 表单验证和错误处理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { supabase } from '@/lib/supabase';

import {
  XMarkIcon,
  UserPlusIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface UserCreateModalProps {
  isOpen: boolean;
  employees: Array<{
    employee_id: string;
    employee_name: string;
    department_name: string;
    position_name: string;
    email?: string;
  }>;
  availableRoles: Array<{ code: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  onCreateUser: (userData: CreateUserForm) => Promise<void>;
}

interface CreateUserForm {
  email: string;
  employee_id: string;
  role: string;
  data_scope: string;
  effective_from?: string;
  effective_until?: string;
  send_invitation: boolean;
}

interface Employee {
  employee_id: string;
  employee_name: string;
  department_name: string;
  position_name: string;
  email?: string;
}

/**
 * 用户创建模态框主组件
 */
export default function UserCreateModal({ 
  isOpen, 
  employees,
  availableRoles,
  onClose, 
  onSuccess,
  onCreateUser
}: UserCreateModalProps) {
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    employee_id: '',
    role: 'employee',
    data_scope: 'self',
    send_invitation: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 权限检查
  const permission = usePermission();

  // 数据现在通过props传递，不再需要加载函数

  // 初始化重置状态
  useEffect(() => {
    if (isOpen) {
      // 重置表单
      setForm({
        email: '',
        employee_id: '',
        role: 'employee',
        data_scope: 'self',
        send_invitation: true
      });
      setSelectedEmployee(null);
      setSearchQuery('');
      setError(null);
      setFieldErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  /**
   * 过滤员工列表
   */
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees.slice(0, 10); // 限制显示数量
    
    const query = searchQuery.toLowerCase();
    return employees.filter(emp => 
      emp.employee_name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department_name?.toLowerCase().includes(query) ||
      emp.position_name?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [employees, searchQuery]);

  /**
   * 表单验证
   */
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (!form.email.trim()) {
      errors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    if (!form.employee_id.trim()) {
      errors.employee_id = '请选择关联员工';
    }
    
    if (!form.role.trim()) {
      errors.role = '请选择用户角色';
    }
    
    if (!form.data_scope.trim()) {
      errors.data_scope = '请选择数据范围';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      await onCreateUser(form);
      onSuccess();
      
    } catch (err) {
      console.error('[UserCreateModal] Failed to create user:', err);
      setError(err instanceof Error ? err.message : '创建用户失败');
    } finally {
      setLoading(false);
    }
  }, [form, validateForm, onCreateUser, onSuccess]);

  /**
   * 处理员工选择
   */
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setForm(prev => ({
      ...prev,
      employee_id: employee.employee_id,
      email: employee.email || prev.email
    }));
    setSearchQuery(employee.employee_name);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-full max-w-2xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5 text-primary" />
            创建新用户
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

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 员工选择 */}
          <div className="form-control">
            <label htmlFor="employee-search" className="label">
              <span className="label-text flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                关联员工 *
              </span>
            </label>
            
            {/* 搜索框 */}
            <div className="input-group">
              <input
                id="employee-search"
                name="employee_search"
                type="text"
                placeholder="搜索员工姓名、邮箱或部门..."
                className="input input-bordered flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                aria-describedby={!selectedEmployee ? "employee-search-help" : fieldErrors.employee_id ? "employee-error" : undefined}
                aria-invalid={!!fieldErrors.employee_id}
                role="combobox"
                aria-expanded={!!(searchQuery && filteredEmployees.length > 0)}
                aria-autocomplete="list"
              />
              <button 
                type="button" 
                className="btn btn-square"
                aria-label="搜索员工"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
            
            {!selectedEmployee && !fieldErrors.employee_id && (
              <div id="employee-search-help" className="label">
                <span className="label-text-alt">请输入员工信息以搜索并选择关联员工</span>
              </div>
            )}
            {fieldErrors.employee_id && (
              <div id="employee-error" className="label">
                <span className="label-text-alt text-error">{fieldErrors.employee_id}</span>
              </div>
            )}

            {/* 员工列表 */}
            {searchQuery && filteredEmployees.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto border border-base-300 rounded-lg">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.employee_id}
                    className="p-3 hover:bg-base-200 cursor-pointer border-b border-base-300 last:border-b-0"
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{employee.employee_name}</div>
                        <div className="text-sm text-base-content/70">
                          {employee.department_name} - {employee.position_name}
                        </div>
                        {employee.email && (
                          <div className="text-xs text-base-content/60">{employee.email}</div>
                        )}
                      </div>
                      <button 
                        type="button"
                        className="btn btn-xs btn-primary"
                        onClick={() => handleEmployeeSelect(employee)}
                      >
                        选择
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 已选择的员工 */}
            {selectedEmployee && (
              <div className="mt-2 p-3 bg-base-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedEmployee.employee_name}</div>
                    <div className="text-sm text-base-content/70">
                      {selectedEmployee.department_name} - {selectedEmployee.position_name}
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setForm(prev => ({ ...prev, employee_id: '', email: '' }));
                      setSearchQuery('');
                    }}
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 邮箱地址 */}
          <div className="form-control">
            <label htmlFor="user-email" className="label">
              <span className="label-text flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4" />
                邮箱地址 *
              </span>
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              placeholder="user@example.com"
              className="input input-bordered"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              required
              autoComplete="email"
              aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
              aria-invalid={!!fieldErrors.email}
            />
            {!fieldErrors.email && (
              <div id="email-help" className="label">
                <span className="label-text-alt">用于登录系统和接收通知邮件</span>
              </div>
            )}
            {fieldErrors.email && (
              <div id="email-error" className="label">
                <span className="label-text-alt text-error">{fieldErrors.email}</span>
              </div>
            )}
          </div>

          {/* 用户角色 */}
          <div className="form-control">
            <label htmlFor="user-role" className="label">
              <span className="label-text flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" />
                用户角色 *
              </span>
            </label>
            <select
              id="user-role"
              name="role"
              className="select select-bordered"
              value={form.role}
              onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
              required
              aria-describedby={fieldErrors.role ? "role-error" : "role-help"}
              aria-invalid={!!fieldErrors.role}
            >
              {availableRoles.map(role => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            {!fieldErrors.role && (
              <div id="role-help" className="label">
                <span className="label-text-alt">角色决定用户的系统权限级别</span>
              </div>
            )}
            {fieldErrors.role && (
              <div id="role-error" className="label">
                <span className="label-text-alt text-error">{fieldErrors.role}</span>
              </div>
            )}
          </div>

          {/* 数据范围 */}
          <div className="form-control">
            <label htmlFor="user-data-scope" className="label">
              <span className="label-text flex items-center gap-2">
                <BuildingOfficeIcon className="w-4 h-4" />
                数据范围 *
              </span>
            </label>
            <select
              id="user-data-scope"
              name="data_scope"
              className="select select-bordered"
              value={form.data_scope}
              onChange={(e) => setForm(prev => ({ ...prev, data_scope: e.target.value }))}
              required
              aria-describedby={fieldErrors.data_scope ? "data-scope-error" : "data-scope-help"}
              aria-invalid={!!fieldErrors.data_scope}
            >
              <option value="self">仅个人数据</option>
              <option value="team">团队数据</option>
              <option value="department">部门数据</option>
              <option value="all">全部数据</option>
            </select>
            {!fieldErrors.data_scope && (
              <div id="data-scope-help" className="label">
                <span className="label-text-alt">限制用户可以访问的数据范围</span>
              </div>
            )}
            {fieldErrors.data_scope && (
              <div id="data-scope-error" className="label">
                <span className="label-text-alt text-error">{fieldErrors.data_scope}</span>
              </div>
            )}
          </div>

          {/* 生效时间范围 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label htmlFor="effective-from" className="label">
                <span className="label-text">生效时间</span>
              </label>
              <input
                id="effective-from"
                name="effective_from"
                type="datetime-local"
                className="input input-bordered"
                value={form.effective_from}
                onChange={(e) => setForm(prev => ({ ...prev, effective_from: e.target.value }))}
                aria-describedby="effective-from-help"
              />
              <div id="effective-from-help" className="label">
                <span className="label-text-alt">用户权限开始生效的时间，留空表示立即生效</span>
              </div>
            </div>
            
            <div className="form-control">
              <label htmlFor="effective-until" className="label">
                <span className="label-text">失效时间</span>
              </label>
              <input
                id="effective-until"
                name="effective_until"
                type="datetime-local"
                className="input input-bordered"
                value={form.effective_until}
                onChange={(e) => setForm(prev => ({ ...prev, effective_until: e.target.value }))}
                aria-describedby="effective-until-help"
              />
              <div id="effective-until-help" className="label">
                <span className="label-text-alt">用户权限失效时间，留空表示永不失效</span>
              </div>
            </div>
          </div>

          {/* 发送邀请 */}
          <div className="form-control">
            <label htmlFor="send-invitation" className="label cursor-pointer">
              <span className="label-text">发送邀请邮件</span>
              <input
                id="send-invitation"
                name="send_invitation"
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={form.send_invitation}
                onChange={(e) => setForm(prev => ({ ...prev, send_invitation: e.target.checked }))}
                aria-describedby="invitation-help"
              />
            </label>
            <div id="invitation-help" className="label">
              <span className="label-text-alt">
                勾选后将向新用户发送包含登录信息的邀请邮件
              </span>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  创建中...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  创建用户
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}