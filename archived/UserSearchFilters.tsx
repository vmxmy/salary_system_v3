/**
 * 用户搜索过滤器组件
 * 
 * 提供用户搜索和筛选功能，基于 DaisyUI 5 设计
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useDebounce } from '@/hooks/useDebounce';
import type { UserSearchFilters } from '@/types/user-management';

export interface UserSearchFiltersProps {
  filters: UserSearchFilters;
  onFiltersChange: (filters: UserSearchFilters) => void;
  departments?: DepartmentOption[]; // 由父组件通过Hook传递
  roles?: RoleOption[]; // 由父组件通过Hook传递
}

interface DepartmentOption {
  name: string;
}

interface RoleOption {
  role_code: string;
  role_name: string;
}

export function UserSearchFilters({ 
  filters, 
  onFiltersChange, 
  departments: providedDepartments, 
  roles: providedRoles 
}: UserSearchFiltersProps) {
  const { t } = useTranslation('admin');
  
  // 本地状态管理
  const [localFilters, setLocalFilters] = useState<UserSearchFilters>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 选项数据
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 防抖搜索
  const debouncedSearch = useDebounce(localFilters.search || '', 500);

  // 同步本地过滤器到父组件
  useEffect(() => {
    const updatedFilters = { ...localFilters };
    if (debouncedSearch !== filters.search) {
      updatedFilters.search = debouncedSearch;
    }
    onFiltersChange(updatedFilters);
  }, [debouncedSearch, localFilters, onFiltersChange, filters.search]);

  // 初始化部门选项
  const initializeDepartments = useCallback(() => {
    if (providedDepartments) {
      setDepartments(providedDepartments);
    } else {
      // 如果没有提供部门数据，设置空数组
      setDepartments([]);
    }
  }, [providedDepartments]);

  // 初始化角色选项  
  const initializeRoles = useCallback(() => {
    if (providedRoles) {
      setRoleOptions(providedRoles);
    } else {
      // 如果没有提供角色数据，设置默认角色选项
      const defaultRoles: RoleOption[] = [
        { role_code: 'employee', role_name: '员工' },
        { role_code: 'manager', role_name: '管理员' },
        { role_code: 'hr_manager', role_name: 'HR管理员' },
        { role_code: 'admin', role_name: '系统管理员' }
      ];
      setRoleOptions(defaultRoles);
    }
  }, [providedRoles]);

  // 初始化数据
  useEffect(() => {
    setLoading(true);
    initializeDepartments();
    initializeRoles();
    setLoading(false);
  }, [initializeDepartments, initializeRoles]);

  // 处理过滤器变化
  const handleFilterChange = useCallback((key: keyof UserSearchFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  // 清除过滤器
  const clearFilters = useCallback(() => {
    const emptyFilters: UserSearchFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  // 检查是否有活动过滤器
  const hasActiveFilters = useMemo(() => {
    return Object.values(localFilters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  }, [localFilters]);

  // 检查是否有高级过滤器
  const hasAdvancedFilters = useMemo(() => {
    return Boolean(
      localFilters.has_employee !== undefined ||
      localFilters.created_after ||
      localFilters.created_before
    );
  }, [localFilters]);

  // 自动展开高级过滤器
  useEffect(() => {
    if (hasAdvancedFilters) {
      setShowAdvanced(true);
    }
  }, [hasAdvancedFilters]);

  return (
    <div className="space-y-4">
      {/* 基本搜索过滤器 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 搜索框 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('common.search')}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className="input input-bordered w-full pr-10"
              placeholder={t('user.searchPlaceholder')}
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 角色筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('user.role')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFilters.role || ''}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            disabled={loading}
          >
            <option value="">{t('user.allRoles')}</option>
            {roleOptions.map(role => (
              <option key={role.role_code} value={role.role_code}>
                {role.role_name}
              </option>
            ))}
          </select>
        </div>

        {/* 状态筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('user.status')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as any)}
          >
            <option value="">{t('user.allStatuses')}</option>
            <option value="active">{t('user.status.active')}</option>
            <option value="inactive">{t('user.status.inactive')}</option>
            <option value="suspended">{t('user.status.suspended')}</option>
          </select>
        </div>

        {/* 部门筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('user.department')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFilters.department || ''}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            disabled={loading}
          >
            <option value="">{t('user.allDepartments')}</option>
            {departments.map(dept => (
              <option key={dept.name} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 高级过滤器 */}
      <div className="collapse collapse-arrow bg-base-200/30">
        <input
          type="checkbox"
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
        />
        <div className="collapse-title text-base font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          {t('common.advancedFilters')}
          {hasAdvancedFilters && (
            <span className="badge badge-primary badge-sm ml-2">
              {t('common.active')}
            </span>
          )}
        </div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {/* 员工关联状态 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t('user.employeeLink')}</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={localFilters.has_employee === undefined ? '' : localFilters.has_employee ? 'true' : 'false'}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : e.target.value === 'true';
                  handleFilterChange('has_employee', value);
                }}
              >
                <option value="">{t('user.anyEmployeeStatus')}</option>
                <option value="true">{t('user.hasEmployee')}</option>
                <option value="false">{t('user.noEmployee')}</option>
              </select>
            </div>

            {/* 创建日期范围 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t('user.createdAfter')}</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={localFilters.created_after || ''}
                onChange={(e) => handleFilterChange('created_after', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t('user.createdBefore')}</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={localFilters.created_before || ''}
                onChange={(e) => handleFilterChange('created_before', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 过滤器操作按钮 */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {/* 活动过滤器标签 */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              <span>{t('common.filtersActive')}</span>
              
              {/* 显示具体的过滤器 */}
              <div className="flex flex-wrap gap-1">
                {localFilters.search && (
                  <span className="badge badge-ghost badge-sm">
                    {t('common.search')}: "{localFilters.search}"
                  </span>
                )}
                {localFilters.role && (
                  <span className="badge badge-ghost badge-sm">
                    {t('user.role')}: {roleOptions.find(r => r.role_code === localFilters.role)?.role_name || localFilters.role}
                  </span>
                )}
                {localFilters.status && (
                  <span className="badge badge-ghost badge-sm">
                    {t('user.status')}: {t(`user.status.${localFilters.status}`)}
                  </span>
                )}
                {localFilters.department && (
                  <span className="badge badge-ghost badge-sm">
                    {t('user.department')}: {localFilters.department}
                  </span>
                )}
                {localFilters.has_employee !== undefined && (
                  <span className="badge badge-ghost badge-sm">
                    {localFilters.has_employee ? t('user.hasEmployee') : t('user.noEmployee')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('common.clearFilters')}
            </button>
          )}
          
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              initializeDepartments();
              initializeRoles();
            }}
            disabled={loading}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('common.refresh')}
          </button>
        </div>
      </div>
    </div>
  );
}