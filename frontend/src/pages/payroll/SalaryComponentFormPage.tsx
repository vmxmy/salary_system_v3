import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSalaryComponents } from '../../hooks/usePayroll';
import type { SalaryComponent } from '../../types/employee_new';

const SalaryComponentFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const { components, loading, error, createComponent, updateComponent } = useSalaryComponents();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'earning' as 'earning' | 'deduction',
    description: '',
    is_taxable: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 如果是编辑模式，加载现有数据
  useEffect(() => {
    if (isEditing && !loading && components.length > 0) {
      const component = components.find(c => c.id === id);
      if (component) {
        setFormData({
          name: component.name,
          type: component.type as 'earning' | 'deduction',
          description: component.description || '',
          is_taxable: component.is_taxable
        });
      }
    }
  }, [id, isEditing, components, loading]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
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
    
    if (!formData.name.trim()) {
      newErrors.name = '组件名称不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        // 更新薪资组件
        const success = await updateComponent(id!, {
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || null,
          is_taxable: formData.is_taxable
        });
        
        if (success) {
          navigate('/payroll/components');
        }
      } else {
        // 创建薪资组件
        const newComponent = await createComponent({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || null,
          is_taxable: formData.is_taxable
        });
        
        if (newComponent) {
          navigate('/payroll/components');
        }
      }
    } catch (err) {
      console.error('保存薪资组件失败:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isEditing && error) {
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>加载薪资组件失败: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/payroll/components')}
          className="btn btn-ghost btn-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? '编辑薪资组件' : '新建薪资组件'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="space-y-4">
            {/* 组件名称 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  组件名称 <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入组件名称"
              />
              {errors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.name}</span>
                </label>
              )}
            </div>

            {/* 组件类型 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  组件类型 <span className="text-error">*</span>
                </span>
              </label>
              <div className="flex gap-4">
                <label className="cursor-pointer label gap-2">
                  <input
                    type="radio"
                    name="type"
                    className="radio radio-primary"
                    checked={formData.type === 'earning'}
                    onChange={() => handleInputChange('type', 'earning')}
                  />
                  <span className="label-text">收入项</span>
                </label>
                <label className="cursor-pointer label gap-2">
                  <input
                    type="radio"
                    name="type"
                    className="radio radio-primary"
                    checked={formData.type === 'deduction'}
                    onChange={() => handleInputChange('type', 'deduction')}
                  />
                  <span className="label-text">扣除项</span>
                </label>
              </div>
            </div>

            {/* 是否应税 */}
            <div className="form-control">
              <label className="cursor-pointer label gap-2 justify-start">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.is_taxable}
                  onChange={(e) => handleInputChange('is_taxable', e.target.checked)}
                />
                <span className="label-text">应税项目</span>
              </label>
            </div>

            {/* 描述 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">描述</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="请输入组件描述（可选）"
                rows={3}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end mt-6 pt-4 border-t border-base-200">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/payroll/components')}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm mr-2"></span>}
              {isEditing ? '保存更改' : '创建组件'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SalaryComponentFormPage;