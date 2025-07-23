import React, { useState } from 'react';
import type { EmployeeEducation } from '../../types/employee_new';

interface EducationFormProps {
  education?: EmployeeEducation | null;
  onSave: (data: Omit<EmployeeEducation, 'id' | 'created_at'> | Partial<EmployeeEducation>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const EducationForm: React.FC<EducationFormProps> = ({ 
  education, 
  onSave, 
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    institution_name: education?.institution_name || '',
    degree: education?.degree || '',
    field_of_study: education?.field_of_study || '',
    graduation_date: education?.graduation_date || '',
    notes: education?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.institution_name.trim()) {
      newErrors.institution_name = '毕业院校不能为空';
    }
    
    if (!formData.degree.trim()) {
      newErrors.degree = '学位不能为空';
    }
    
    if (!formData.field_of_study.trim()) {
      newErrors.field_of_study = '专业不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      institution_name: formData.institution_name.trim(),
      degree: formData.degree.trim(),
      field_of_study: formData.field_of_study.trim(),
      graduation_date: formData.graduation_date || null,
      notes: formData.notes.trim() || null
    };
    
    onSave(isEditing && education ? 
      { id: education.id, ...submitData } : 
      submitData as Omit<EmployeeEducation, 'id' | 'created_at'>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              毕业院校 <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.institution_name ? 'input-error' : ''}`}
            value={formData.institution_name}
            onChange={(e) => handleInputChange('institution_name', e.target.value)}
            placeholder="请输入毕业院校"
          />
          {errors.institution_name && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.institution_name}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              学位 <span className="text-error">*</span>
            </span>
          </label>
          <select
            className={`select select-bordered w-full ${errors.degree ? 'select-error' : ''}`}
            value={formData.degree}
            onChange={(e) => handleInputChange('degree', e.target.value)}
          >
            <option value="">请选择学位</option>
            <option value="学士">学士</option>
            <option value="硕士">硕士</option>
            <option value="博士">博士</option>
            <option value="专科">专科</option>
            <option value="其他">其他</option>
          </select>
          {errors.degree && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.degree}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              专业 <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.field_of_study ? 'input-error' : ''}`}
            value={formData.field_of_study}
            onChange={(e) => handleInputChange('field_of_study', e.target.value)}
            placeholder="请输入专业"
          />
          {errors.field_of_study && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.field_of_study}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">毕业日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={formData.graduation_date}
            onChange={(e) => handleInputChange('graduation_date', e.target.value)}
          />
        </div>

        <div className="form-control md:col-span-2">
          <label className="label">
            <span className="label-text font-medium">备注</span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="请输入备注信息"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          {isEditing ? '保存更改' : '添加教育背景'}
        </button>
      </div>
    </form>
  );
};

export default EducationForm;