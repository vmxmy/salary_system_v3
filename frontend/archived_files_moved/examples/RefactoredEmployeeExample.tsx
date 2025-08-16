/**
 * 重构后Hook使用示例组件
 * 展示新Hook架构的使用方法和最佳实践
 */

import React, { useState, useMemo } from 'react';
import { 
  useEmployeeList, 
  useEmployeeForm, 
  useDepartments, 
  usePositions,
  usePersonnelCategories
} from '@/hooks';
import type { EmployeeFilters, EmployeeSorting } from '@/hooks/employee';

/**
 * 员工列表示例组件
 * 展示如何使用重构后的Hook
 */
export function RefactoredEmployeeListExample() {
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortConfig, setSortConfig] = useState<EmployeeSorting>({
    field: 'employee_name',
    order: 'asc'
  });

  // 构建筛选条件
  const filters = useMemo((): EmployeeFilters => ({
    search: searchTerm,
    department: selectedDepartment || undefined,
    employment_status: 'active' // 只显示在职员工
  }), [searchTerm, selectedDepartment]);

  // 使用新的员工Hook
  const { 
    employees, 
    statistics,
    loading, 
    error,
    actions,
    utils 
  } = useEmployeeList();

  // 获取部门选项（用于筛选下拉框）
  const { departments } = useDepartments();

  // 客户端数据处理
  const processedEmployees = useMemo(() => {
    let result = employees;
    
    // 应用筛选
    if (Object.values(filters).some(Boolean)) {
      result = utils.filterEmployees(result, filters);
    }
    
    // 应用排序
    result = utils.sortEmployees(result, sortConfig);
    
    return result;
  }, [employees, filters, sortConfig, utils]);

  // 处理删除操作
  const handleDelete = (employeeId: string) => {
    if (confirm('确定要删除这个员工吗？')) {
      actions.delete(employeeId);
    }
  };

  // 处理批量删除
  const handleBatchDelete = (employeeIds: string[]) => {
    if (confirm(`确定要删除选中的 ${employeeIds.length} 个员工吗？`)) {
      actions.batchDelete(employeeIds);
    }
  };

  // 错误处理
  if (error) {
    return (
      <div className="alert alert-error">
        <p>加载员工列表失败，请稍后重试</p>
        <button 
          className="btn btn-sm" 
          onClick={actions.refresh}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">总员工数</div>
            <div className="stat-value">{statistics.total}</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">在职员工</div>
            <div className="stat-value text-success">{statistics.active}</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">停职员工</div>
            <div className="stat-value text-warning">{statistics.inactive}</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">已离职</div>
            <div className="stat-value text-error">{statistics.terminated}</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选工具栏 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="form-control flex-1">
              <input
                type="text"
                placeholder="搜索员工姓名、邮箱或手机号..."
                className="input input-bordered"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* 部门筛选 */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">所有部门</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 刷新按钮 */}
            <button 
              className={`btn btn-outline ${loading.isRefetching ? 'loading' : ''}`}
              onClick={actions.refresh}
              disabled={loading.isRefetching}
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 员工表格 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {loading.isInitialLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSortConfig(prev => ({
                          field: 'employee_name',
                          order: prev.field === 'employee_name' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        姓名
                        {sortConfig.field === 'employee_name' && (
                          <span className="ml-1">
                            {sortConfig.order === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th>部门</th>
                    <th>职位</th>
                    <th>状态</th>
                    <th>入职日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {processedEmployees.map(employee => (
                    <tr key={employee.employee_id}>
                      <td>
                        <div>
                          <div className="font-bold">{employee.employee_name}</div>
                          <div className="text-sm opacity-50">{employee.email}</div>
                        </div>
                      </td>
                      <td>{employee.department_name || '-'}</td>
                      <td>{employee.position_name || '-'}</td>
                      <td>
                        <div className={`badge ${
                          employee.employment_status === 'active' 
                            ? 'badge-success' 
                            : employee.employment_status === 'inactive'
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}>
                          {employee.employment_status === 'active' 
                            ? '在职' 
                            : employee.employment_status === 'inactive'
                            ? '停职'
                            : '离职'
                          }
                        </div>
                      </td>
                      <td>
                        {employee.hire_date 
                          ? new Date(employee.hire_date).toLocaleDateString('zh-CN')
                          : '-'
                        }
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-xs">
                            查看
                          </button>
                          <button className="btn btn-ghost btn-xs">
                            编辑
                          </button>
                          <button 
                            className={`btn btn-ghost btn-xs text-error ${
                              loading.isDeleting ? 'loading' : ''
                            }`}
                            onClick={() => handleDelete(employee.employee_id)}
                            disabled={loading.isDeleting}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {processedEmployees.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-base-content/60">没有找到匹配的员工</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 员工表单示例组件
 * 展示如何使用员工表单Hook
 */
export function RefactoredEmployeeFormExample() {
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  // 使用员工表单Hook
  const {
    formData,
    validation,
    isFormValid,
    isDirty,
    isSubmitting,
    options,
    actions
  } = useEmployeeForm({
    mode,
    enableRealtimeValidation: true,
    onSuccess: (employee) => {
      alert(`员工${mode === 'create' ? '创建' : '更新'}成功：${employee.employee_name}`);
      if (mode === 'create') {
        // 创建成功后可以导航到列表页面或详情页面
        console.log('导航到员工列表页面');
      }
    },
    onError: (error) => {
      console.error('表单提交失败:', error);
    }
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">
            {mode === 'create' ? '新增员工' : '编辑员工'}
          </h2>

          <form onSubmit={(e) => {
            e.preventDefault();
            actions.submitForm();
          }}>
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="divider">基本信息</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 员工姓名 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">员工姓名 *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${
                      validation.employee_name ? 'input-error' : ''
                    }`}
                    value={formData.employee_name || ''}
                    onChange={(e) => actions.updateField('employee_name', e.target.value)}
                    placeholder="请输入员工姓名"
                  />
                  {validation.employee_name && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.employee_name}
                      </span>
                    </label>
                  )}
                </div>

                {/* 身份证号 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">身份证号 *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${
                      validation.id_number ? 'input-error' : ''
                    }`}
                    value={formData.id_number || ''}
                    onChange={(e) => actions.updateField('id_number', e.target.value)}
                    placeholder="请输入身份证号"
                  />
                  {validation.id_number && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.id_number}
                      </span>
                    </label>
                  )}
                </div>

                {/* 性别 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">性别 *</span>
                  </label>
                  <select
                    className={`select select-bordered ${
                      validation.gender ? 'select-error' : ''
                    }`}
                    value={formData.gender || ''}
                    onChange={(e) => actions.updateField('gender', e.target.value)}
                  >
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                  {validation.gender && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.gender}
                      </span>
                    </label>
                  )}
                </div>

                {/* 入职日期 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">入职日期 *</span>
                  </label>
                  <input
                    type="date"
                    className={`input input-bordered ${
                      validation.hire_date ? 'input-error' : ''
                    }`}
                    value={formData.hire_date || ''}
                    onChange={(e) => actions.updateField('hire_date', e.target.value)}
                  />
                  {validation.hire_date && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.hire_date}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* 联系信息 */}
              <div className="divider">联系信息</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 手机号 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">手机号</span>
                  </label>
                  <input
                    type="tel"
                    className={`input input-bordered ${
                      validation.mobile_phone ? 'input-error' : ''
                    }`}
                    value={formData.mobile_phone || ''}
                    onChange={(e) => actions.updateField('mobile_phone', e.target.value)}
                    placeholder="请输入手机号"
                  />
                  {validation.mobile_phone && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.mobile_phone}
                      </span>
                    </label>
                  )}
                </div>

                {/* 邮箱 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">邮箱</span>
                  </label>
                  <input
                    type="email"
                    className={`input input-bordered ${
                      validation.email ? 'input-error' : ''
                    }`}
                    value={formData.email || ''}
                    onChange={(e) => actions.updateField('email', e.target.value)}
                    placeholder="请输入邮箱地址"
                  />
                  {validation.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {validation.email}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* 组织信息 */}
              <div className="divider">组织信息</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 部门 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">部门</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.department_id || ''}
                    onChange={(e) => actions.updateField('department_id', e.target.value)}
                  >
                    <option value="">请选择部门</option>
                    {options.departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 职位 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">职位</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.position_id || ''}
                    onChange={(e) => actions.updateField('position_id', e.target.value)}
                  >
                    <option value="">请选择职位</option>
                    {options.positions.map(pos => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 按钮组 */}
              <div className="divider"></div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={actions.resetForm}
                  disabled={!isDirty || isSubmitting}
                >
                  重置
                </button>
                
                <button
                  type="submit"
                  className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting 
                    ? '提交中...' 
                    : mode === 'create' 
                    ? '创建员工' 
                    : '更新员工'
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook组合示例
 * 展示如何组合多个Hook实现复杂功能
 */
export function RefactoredEmployeeManagementExample() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">员工管理系统 - Hook重构示例</h1>
      
      {/* 标签页 */}
      <div className="tabs tabs-boxed mb-6">
        <a 
          className={`tab ${activeTab === 'list' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          员工列表
        </a>
        <a 
          className={`tab ${activeTab === 'form' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          员工表单
        </a>
      </div>

      {/* 内容区域 */}
      {activeTab === 'list' && <RefactoredEmployeeListExample />}
      {activeTab === 'form' && <RefactoredEmployeeFormExample />}
    </div>
  );
}