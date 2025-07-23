import React, { useState, useEffect } from 'react';
import type { EmployeeJobHistory } from '../../types/employee_new';
import { useEmployeeLookups } from '../../hooks/useEmployeeLookups';

interface JobHistoryFormProps {
  jobHistory?: EmployeeJobHistory | null;
  onSave: (data: Omit<EmployeeJobHistory, 'id' | 'created_at'> | Partial<EmployeeJobHistory>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const JobHistoryForm: React.FC<JobHistoryFormProps> = ({ 
  jobHistory, 
  onSave, 
  onCancel,
  isEditing = false
}) => {
  const { departments, positions, jobRanks, loading: lookupsLoading } = useEmployeeLookups();
  
  const [formData, setFormData] = useState({
    department_id: jobHistory?.department_id || '',
    position_id: jobHistory?.position_id || '',
    rank_id: jobHistory?.rank_id || '',
    effective_start_date: jobHistory?.effective_start_date ? jobHistory.effective_start_date.split('T')[0] : '',
    effective_end_date: jobHistory?.effective_end_date ? jobHistory.effective_end_date.split('T')[0] : '',
    notes: jobHistory?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobHistory) {
      setFormData({
        department_id: jobHistory.department_id || '',
        position_id: jobHistory.position_id || '',
        rank_id: jobHistory.rank_id || '',
        effective_start_date: jobHistory.effective_start_date ? jobHistory.effective_start_date.split('T')[0] : '',
        effective_end_date: jobHistory.effective_end_date ? jobHistory.effective_end_date.split('T')[0] : '',
        notes: jobHistory.notes || ''
      });
    }
  }, [jobHistory]);

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
    
    if (!formData.department_id) {
      newErrors.department_id = '请选择部门';
    }
    
    if (!formData.position_id) {
      newErrors.position_id = '请选择职位';
    }
    
    if (!formData.rank_id) {
      newErrors.rank_id = '请选择职级';
    }
    
    if (!formData.effective_start_date) {
      newErrors.effective_start_date = '请选择生效开始日期';
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
      department_id: formData.department_id,
      position_id: formData.position_id,
      rank_id: formData.rank_id,
      effective_start_date: formData.effective_start_date,
      effective_end_date: formData.effective_end_date || null,
      notes: formData.notes.trim() || null
    };
    
    onSave(isEditing && jobHistory ? 
      { id: jobHistory.id, ...submitData } : 
      submitData as Omit<EmployeeJobHistory, 'id' | 'created_at'>
    );
  };

  if (lookupsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              部门 <span className="text-error">*</span>
            </span>
          </label>
          <select
            className={`select select-bordered w-full ${errors.department_id ? 'select-error' : ''}`}
            value={formData.department_id}
            onChange={(e) => handleInputChange('department_id', e.target.value)}
          >
            <option value="">请选择部门</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {errors.department_id && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.department_id}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              职位 <span className="text-error">*</span>
            </span>
          </label>
          <select
            className={`select select-bordered w-full ${errors.position_id ? 'select-error' : ''}`}
            value={formData.position_id}
            onChange={(e) => handleInputChange('position_id', e.target.value)}
          >
            <option value="">请选择职位</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.name}</option>
            ))}
          </select>
          {errors.position_id && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.position_id}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              职级 <span className="text-error">*</span>
            </span>
          </label>
          <select
            className={`select select-bordered w-full ${errors.rank_id ? 'select-error' : ''}`}
            value={formData.rank_id}
            onChange={(e) => handleInputChange('rank_id', e.target.value)}
          >
            <option value="">请选择职级</option>
            {jobRanks.map(rank => (
              <option key={rank.id} value={rank.id}>{rank.name}</option>
            ))}
          </select>
          {errors.rank_id && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.rank_id}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              生效开始日期 <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="date"
            className={`input input-bordered w-full ${errors.effective_start_date ? 'input-error' : ''}`}
            value={formData.effective_start_date}
            onChange={(e) => handleInputChange('effective_start_date', e.target.value)}
          />
          {errors.effective_start_date && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.effective_start_date}</span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">生效结束日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={formData.effective_end_date}
            onChange={(e) => handleInputChange('effective_end_date', e.target.value)}
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
            placeholder="请输入备注信息（如：晋升、调动等）"
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
          {isEditing ? '保存更改' : '添加工作履历'}
        </button>
      </div>
    </form>
  );
};

export default JobHistoryForm;