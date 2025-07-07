import React, { useState, useEffect } from 'react';
import { Employee, EmployeeWithDetails } from '../../types/employee';
import { useEmployeeLookups } from '../../hooks/useEmployeeLookups';
import LoadingSpinner from '../common/LoadingSpinner';

interface EmployeeFormProps {
  employee?: EmployeeWithDetails | null;
  onSubmit: (data: Partial<Employee>) => void;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

interface FormData {
  name: string;
  employee_number: string;
  gender: string;
  hire_date: string;
  phone_number: string;
  email: string;
  id_number: string;
  education_level: string;
  housing_fund_number: string;
  department_id: string;
  position_id: string;
  personnel_category_id: string;
  is_active: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false
}) => {
  const { departments, positions, personnelCategories, loading: lookupsLoading } = useEmployeeLookups();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    employee_number: '',
    gender: '',
    hire_date: '',
    phone_number: '',
    email: '',
    id_number: '',
    education_level: '',
    housing_fund_number: '',
    department_id: '',
    position_id: '',
    personnel_category_id: '',
    is_active: true
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // 初始化表单数据
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        employee_number: employee.employee_number || '',
        gender: employee.gender || '',
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        phone_number: employee.phone_number || '',
        email: employee.email || '',
        id_number: employee.id_number || '',
        education_level: employee.education_level || '',
        housing_fund_number: employee.housing_fund_number || '',
        department_id: employee.department_id?.toString() || '',
        position_id: employee.position_id?.toString() || '',
        personnel_category_id: employee.personnel_category_id?.toString() || '',
        is_active: employee.is_active ?? true
      });
    }
  }, [employee]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    }

    if (!formData.employee_number.trim()) {
      newErrors.employee_number = '工号不能为空';
    }

    if (!formData.gender) {
      newErrors.gender = '请选择性别';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (formData.phone_number && !/^1[3-9]\d{9}$/.test(formData.phone_number)) {
      newErrors.phone_number = '请输入有效的手机号码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: Partial<Employee> = {
      name: formData.name.trim(),
      employee_number: formData.employee_number.trim(),
      gender: formData.gender as any,
      hire_date: formData.hire_date || null,
      phone_number: formData.phone_number.trim() || null,
      email: formData.email.trim() || null,
      id_number: formData.id_number.trim() || null,
      education_level: formData.education_level.trim() || null,
      housing_fund_number: formData.housing_fund_number.trim() || null,
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
      position_id: formData.position_id ? parseInt(formData.position_id) : null,
      personnel_category_id: formData.personnel_category_id ? parseInt(formData.personnel_category_id) : null,
      is_active: formData.is_active
    };

    onSubmit(submitData);
  };

  if (lookupsLoading) {
    return <LoadingSpinner text="加载表单数据..." />;
  }

  const FormField = ({ 
    label, 
    required = false, 
    error, 
    children 
  }: { 
    label: string; 
    required?: boolean; 
    error?: string; 
    children: React.ReactNode;
  }) => (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      {children}
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-6">
          {isEdit ? '编辑员工信息' : '新建员工'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="姓名" required error={errors.name}>
                <input
                  type="text"
                  className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入姓名"
                />
              </FormField>

              <FormField label="工号" required error={errors.employee_number}>
                <input
                  type="text"
                  className={`input input-bordered w-full ${errors.employee_number ? 'input-error' : ''}`}
                  value={formData.employee_number}
                  onChange={(e) => handleInputChange('employee_number', e.target.value)}
                  placeholder="请输入工号"
                />
              </FormField>

              <FormField label="性别" required error={errors.gender}>
                <select
                  className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <option value="">请选择性别</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </FormField>

              <FormField label="入职日期" error={errors.hire_date}>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                />
              </FormField>

              <FormField label="身份证号" error={errors.id_number}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.id_number}
                  onChange={(e) => handleInputChange('id_number', e.target.value)}
                  placeholder="请输入身份证号"
                />
              </FormField>

              <FormField label="教育程度" error={errors.education_level}>
                <select
                  className="select select-bordered w-full"
                  value={formData.education_level}
                  onChange={(e) => handleInputChange('education_level', e.target.value)}
                >
                  <option value="">请选择教育程度</option>
                  <option value="小学">小学</option>
                  <option value="初中">初中</option>
                  <option value="高中">高中</option>
                  <option value="中专">中专</option>
                  <option value="大专">大专</option>
                  <option value="本科">本科</option>
                  <option value="硕士">硕士</option>
                  <option value="博士">博士</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* 组织信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">组织信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="部门" error={errors.department_id}>
                <select
                  className="select select-bordered w-full"
                  value={formData.department_id}
                  onChange={(e) => handleInputChange('department_id', e.target.value)}
                >
                  <option value="">请选择部门</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="职位" error={errors.position_id}>
                <select
                  className="select select-bordered w-full"
                  value={formData.position_id}
                  onChange={(e) => handleInputChange('position_id', e.target.value)}
                >
                  <option value="">请选择职位</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="人员类别" error={errors.personnel_category_id}>
                <select
                  className="select select-bordered w-full"
                  value={formData.personnel_category_id}
                  onChange={(e) => handleInputChange('personnel_category_id', e.target.value)}
                >
                  <option value="">请选择人员类别</option>
                  {personnelCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">联系信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="手机号码" error={errors.phone_number}>
                <input
                  type="tel"
                  className={`input input-bordered w-full ${errors.phone_number ? 'input-error' : ''}`}
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="请输入手机号码"
                />
              </FormField>

              <FormField label="电子邮箱" error={errors.email}>
                <input
                  type="email"
                  className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="请输入邮箱地址"
                />
              </FormField>

              <FormField label="公积金账号" error={errors.housing_fund_number}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.housing_fund_number}
                  onChange={(e) => handleInputChange('housing_fund_number', e.target.value)}
                  placeholder="请输入公积金账号"
                />
              </FormField>
            </div>
          </div>

          {/* 状态信息 */}
          <div className="pb-6">
            <h3 className="text-lg font-semibold mb-4">状态信息</h3>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                />
                <span className="label-text">在职状态</span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-6 border-t border-base-300">
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
              className="btn btn-primary"
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm"></span>}
              {isEdit ? '保存更改' : '创建员工'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;