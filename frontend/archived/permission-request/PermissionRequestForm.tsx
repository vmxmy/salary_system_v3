/**
 * 权限申请表单组件
 * 
 * 功能特性：
 * - 智能权限搜索
 * - 表单验证
 * - 申请类型选择
 * - 业务理由填写
 * - 临时权限期限设置
 * - 附件上传
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissionDefinition } from '@/hooks/permissions';
import { usePermissionRequest } from '@/hooks/permissions/usePermissionRequest';
import type {
  PermissionRequestFormData,
  PermissionRequestType,
  RequestUrgency
} from '@/types/permission-request';

interface PermissionRequestFormProps {
  onSubmit: (data: PermissionRequestFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  preSelectedPermissionId?: string;
}

interface FormErrors {
  permission_id?: string;
  reason?: string;
  business_justification?: string;
  duration_days?: string;
  temp_start_date?: string;
  temp_end_date?: string;
}

export const PermissionRequestForm: React.FC<PermissionRequestFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  preSelectedPermissionId
}) => {
  const { t } = useTranslation();
  const { getAvailablePermissions } = usePermissionDefinition();
  
  // 表单状态
  const [formData, setFormData] = useState<PermissionRequestFormData>({
    permission_id: preSelectedPermissionId || '',
    request_type: 'grant',
    reason: '',
    urgency: 'medium'
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // 获取可申请的权限列表
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const permissions = await getAvailablePermissions();
        setAvailablePermissions(permissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };
    
    loadPermissions();
  }, [getAvailablePermissions]);

  // 过滤权限列表
  const filteredPermissions = useMemo(() => {
    if (!searchTerm) return availablePermissions;
    
    return availablePermissions.filter(permission =>
      permission.permission_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availablePermissions, searchTerm]);

  // 表单验证
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.permission_id) {
      newErrors.permission_id = '请选择权限';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = '请填写申请理由';
    } else if (formData.reason.length < 10) {
      newErrors.reason = '申请理由至少10个字符';
    }

    if (formData.request_type === 'temporary') {
      if (!formData.duration_days || formData.duration_days <= 0) {
        newErrors.duration_days = '请设置有效的权限期限';
      } else if (formData.duration_days > 365) {
        newErrors.duration_days = '临时权限期限不能超过365天';
      }

      if (formData.temp_start_date && formData.temp_end_date) {
        const startDate = new Date(formData.temp_start_date);
        const endDate = new Date(formData.temp_end_date);
        
        if (startDate >= endDate) {
          newErrors.temp_end_date = '结束时间必须晚于开始时间';
        }
        
        if (startDate < new Date()) {
          newErrors.temp_start_date = '开始时间不能早于当前时间';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 处理表单提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit permission request:', error);
    }
  }, [formData, validateForm, onSubmit]);

  // 处理字段变更
  const handleFieldChange = useCallback((
    field: keyof PermissionRequestFormData,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);

  // 处理申请类型变更
  const handleRequestTypeChange = useCallback((type: PermissionRequestType) => {
    setFormData(prev => ({
      ...prev,
      request_type: type,
      duration_days: type === 'temporary' ? 7 : undefined,
      temp_start_date: type === 'temporary' ? new Date() : undefined,
      temp_end_date: undefined
    }));
  }, []);

  // 获取选中权限的信息
  const selectedPermission = useMemo(() => {
    return availablePermissions.find(p => p.permission_id === formData.permission_id);
  }, [availablePermissions, formData.permission_id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 权限选择 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">
            申请权限 <span className="text-error">*</span>
          </span>
        </label>
        
        {/* 权限搜索 */}
        <div className="input-group mb-2">
          <input
            type="text"
            placeholder="搜索权限..."
            className="input input-bordered flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="btn btn-ghost">
            🔍
          </span>
        </div>

        {/* 权限下拉选择 */}
        <select
          className={`select select-bordered w-full ${errors.permission_id ? 'select-error' : ''}`}
          value={formData.permission_id}
          onChange={(e) => handleFieldChange('permission_id', e.target.value)}
          disabled={loading}
        >
          <option value="">请选择权限</option>
          {filteredPermissions.map(permission => (
            <option key={permission.permission_id} value={permission.permission_id}>
              {permission.permission_name}
              {permission.description && ` - ${permission.description}`}
            </option>
          ))}
        </select>
        
        {errors.permission_id && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.permission_id}</span>
          </label>
        )}

        {/* 权限详情 */}
        {selectedPermission && (
          <div className="alert alert-info mt-2">
            <div>
              <h4 className="font-medium">{selectedPermission.permission_name}</h4>
              <p className="text-sm opacity-70">{selectedPermission.description}</p>
              <div className="flex gap-2 mt-1">
                <span className="badge badge-sm">{selectedPermission.resource_type}</span>
                <span className="badge badge-sm badge-outline">{selectedPermission.action}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 申请类型 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">申请类型</span>
        </label>
        <div className="flex gap-4">
          <label className="label cursor-pointer">
            <input
              type="radio"
              name="request_type"
              className="radio radio-primary"
              checked={formData.request_type === 'grant'}
              onChange={() => handleRequestTypeChange('grant')}
              disabled={loading}
            />
            <span className="label-text ml-2">永久权限</span>
          </label>
          <label className="label cursor-pointer">
            <input
              type="radio"
              name="request_type"
              className="radio radio-primary"
              checked={formData.request_type === 'temporary'}
              onChange={() => handleRequestTypeChange('temporary')}
              disabled={loading}
            />
            <span className="label-text ml-2">临时权限</span>
          </label>
        </div>
      </div>

      {/* 临时权限设置 */}
      {formData.request_type === 'temporary' && (
        <div className="bg-base-200 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-sm">临时权限设置</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">权限期限（天）</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                className={`input input-bordered ${errors.duration_days ? 'input-error' : ''}`}
                value={formData.duration_days || ''}
                onChange={(e) => handleFieldChange('duration_days', parseInt(e.target.value) || undefined)}
                disabled={loading}
              />
              {errors.duration_days && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.duration_days}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">紧急程度</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.urgency}
                onChange={(e) => handleFieldChange('urgency', e.target.value as RequestUrgency)}
                disabled={loading}
              >
                <option value="low">低</option>
                <option value="medium">中等</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">开始时间</span>
              </label>
              <input
                type="datetime-local"
                className={`input input-bordered ${errors.temp_start_date ? 'input-error' : ''}`}
                value={formData.temp_start_date ? new Date(formData.temp_start_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFieldChange('temp_start_date', e.target.value ? new Date(e.target.value) : undefined)}
                disabled={loading}
              />
              {errors.temp_start_date && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.temp_start_date}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">结束时间</span>
              </label>
              <input
                type="datetime-local"
                className={`input input-bordered ${errors.temp_end_date ? 'input-error' : ''}`}
                value={formData.temp_end_date ? new Date(formData.temp_end_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFieldChange('temp_end_date', e.target.value ? new Date(e.target.value) : undefined)}
                disabled={loading}
              />
              {errors.temp_end_date && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.temp_end_date}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 申请理由 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">
            申请理由 <span className="text-error">*</span>
          </span>
        </label>
        <textarea
          className={`textarea textarea-bordered h-24 ${errors.reason ? 'textarea-error' : ''}`}
          placeholder="请详细说明申请此权限的理由和用途..."
          value={formData.reason}
          onChange={(e) => handleFieldChange('reason', e.target.value)}
          disabled={loading}
        />
        <div className="label">
          <span className="label-text-alt">{formData.reason.length}/500</span>
          {errors.reason && (
            <span className="label-text-alt text-error">{errors.reason}</span>
          )}
        </div>
      </div>

      {/* 高级选项 */}
      <div className="collapse collapse-arrow bg-base-200">
        <input
          type="checkbox"
          checked={showAdvancedOptions}
          onChange={(e) => setShowAdvancedOptions(e.target.checked)}
        />
        <div className="collapse-title text-sm font-medium">
          高级选项
        </div>
        <div className="collapse-content space-y-4">
          {/* 业务说明 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">业务说明</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-20"
              placeholder="详细的业务背景和使用场景说明..."
              value={formData.business_justification || ''}
              onChange={(e) => handleFieldChange('business_justification', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 预期使用 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">预期使用</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="描述如何使用此权限..."
              value={formData.expected_usage || ''}
              onChange={(e) => handleFieldChange('expected_usage', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 通知设置 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">通知设置</span>
            </label>
            <div className="flex gap-4">
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.notification_email !== false}
                  onChange={(e) => handleFieldChange('notification_email', e.target.checked)}
                  disabled={loading}
                />
                <span className="label-text ml-2">邮件通知</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.notification_in_app !== false}
                  onChange={(e) => handleFieldChange('notification_in_app', e.target.checked)}
                  disabled={loading}
                />
                <span className="label-text ml-2">应用内通知</span>
              </label>
            </div>
          </div>

          {/* 标签 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">标签</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="添加标签，用逗号分隔..."
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          type="submit"
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          disabled={loading}
        >
          {loading ? '提交中...' : '提交申请'}
        </button>
      </div>
    </form>
  );
};

export default PermissionRequestForm;