import React, { useState, useEffect } from 'react';
import type { Employee, EmployeeWithDetails } from '../../types/employee';
import { useEmployeeLookups } from '../../hooks/useEmployeeLookups';
import LoadingSpinner from '../common/LoadingSpinner';

interface EmployeeFormProps {
  employee?: EmployeeWithDetails | null;
  onSubmit: (data: Partial<Employee> & { 
    education_level?: string; 
    phone_number?: string; 
    email?: string; 
    address?: string;
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    account_holder_name?: string;
    position?: string;
    position_id?: string;
    job_level?: string;
    interrupted_service_years?: number;
    social_security_number?: string;
    housing_fund_number?: string;
    political_status?: string;
    marital_status?: string;
    id_number?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

interface FormData {
  // 基本信息
  full_name: string;
  gender: string;
  date_of_birth: string;
  id_number: string;
  education_level: string;
  
  // 组织信息
  department_id: string;
  position_id: string;
  position: string;
  job_level: string;
  personnel_category_id: string;
  current_status: string;
  
  // 联系信息
  phone_number: string;
  email: string;
  address: string;
  
  // 银行信息
  bank_name: string;
  account_number: string;
  account_type: string;
  account_holder_name: string;
  
  // 工作履历
  first_work_date: string;
  hire_date: string;
  interrupted_service_years: string;
  
  // 其他信息
  social_security_number: string;
  housing_fund_number: string;
  political_status: string;
  marital_status: string;
}

// FormField组件移到组件外部，避免重复渲染
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

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false
}) => {
  const { departments, personnelCategories, loading: lookupsLoading } = useEmployeeLookups();
  
  const [formData, setFormData] = useState<FormData>({
    // 基本信息
    full_name: '',
    gender: '',
    date_of_birth: '',
    id_number: '',
    education_level: '',
    
    // 组织信息
    department_id: '',
    position_id: '',
    position: '',
    job_level: '',
    personnel_category_id: '',
    current_status: 'active',
    
    // 联系信息
    phone_number: '',
    email: '',
    address: '',
    
    // 银行信息
    bank_name: '',
    account_number: '',
    account_type: '',
    account_holder_name: '',
    
    // 工作履历
    first_work_date: '',
    hire_date: '',
    interrupted_service_years: '',
    
    // 其他信息
    social_security_number: '',
    housing_fund_number: '',
    political_status: '',
    marital_status: ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // 初始化表单数据
  useEffect(() => {
    if (employee) {
      setFormData({
        // 基本信息
        full_name: employee.full_name || '',
        gender: employee.gender || '',
        date_of_birth: employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '',
        id_number: employee.id_number || employee.id_number_reference || '',
        education_level: employee.education_level || '',
        
        // 组织信息
        department_id: employee.department_id?.toString() || '',
        position_id: employee.position_id?.toString() || '',
        position: employee.position || '',
        job_level: employee.job_level || '',
        personnel_category_id: employee.personnel_category_id?.toString() || '',
        current_status: employee.current_status || 'active',
        
        // 联系信息
        phone_number: employee.phone_number || '',
        email: employee.email || '',
        address: employee.address || '',
        
        // 银行信息
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        account_type: employee.account_type || '',
        account_holder_name: employee.account_holder_name || '',
        
        // 工作履历
        first_work_date: employee.first_work_date ? employee.first_work_date.split('T')[0] : '',
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        interrupted_service_years: employee.interrupted_service_years?.toString() || '',
        
        // 其他信息
        social_security_number: employee.social_security_number || '',
        housing_fund_number: employee.housing_fund_number || '',
        political_status: employee.political_status || '',
        marital_status: employee.marital_status || ''
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

    if (!formData.full_name.trim()) {
      newErrors.full_name = '姓名不能为空';
    }

    if (!formData.gender) {
      newErrors.gender = '请选择性别';
    }

    if (!formData.id_number.trim()) {
      newErrors.id_number = '身份证号不能为空';
    } else if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X|x)$/.test(formData.id_number)) {
      newErrors.id_number = '请输入有效的身份证号';
    }

    if (!formData.hire_date) {
      newErrors.hire_date = '入职日期不能为空';
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

    const submitData: Partial<Employee> & { 
      education_level?: string; 
      phone_number?: string; 
      email?: string; 
      address?: string;
      bank_name?: string;
      account_number?: string;
      account_type?: string;
      account_holder_name?: string;
      position?: string;
      position_id?: string;
      job_level?: string;
      interrupted_service_years?: number;
      social_security_number?: string;
      housing_fund_number?: string;
      political_status?: string;
      marital_status?: string;
    } = {
      // 基本信息
      full_name: formData.full_name.trim(),
      gender: formData.gender as any,
      date_of_birth: formData.date_of_birth || null,
      id_number: formData.id_number.trim(),
      
      // 组织信息
      department_id: formData.department_id || null,
      personnel_category_id: formData.personnel_category_id || null,
      current_status: formData.current_status as any,
      
      // 工作履历
      hire_date: formData.hire_date,
      first_work_date: formData.first_work_date || null,
      
      // 需要更新到其他表的字段
      education_level: formData.education_level || undefined,
      phone_number: formData.phone_number || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      bank_name: formData.bank_name || undefined,
      account_number: formData.account_number || undefined,
      account_type: formData.account_type || undefined,
      account_holder_name: formData.account_holder_name || undefined,
      position: formData.position || undefined,
      position_id: formData.position_id || undefined,
      job_level: formData.job_level || undefined,
      interrupted_service_years: formData.interrupted_service_years ? parseFloat(formData.interrupted_service_years) : undefined,
      social_security_number: formData.social_security_number || undefined,
      housing_fund_number: formData.housing_fund_number || undefined,
      political_status: formData.political_status || undefined,
      marital_status: formData.marital_status || undefined
    };

    onSubmit(submitData);
  };

  if (lookupsLoading) {
    return <LoadingSpinner text="加载表单数据..." />;
  }

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
              <FormField label="姓名" required error={errors.full_name}>
                <input
                  type="text"
                  className={`input input-bordered w-full ${errors.full_name ? 'input-error' : ''}`}
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="请输入姓名"
                />
              </FormField>

              <FormField label="身份证号" required error={errors.id_number}>
                <input
                  type="text"
                  className={`input input-bordered w-full ${errors.id_number ? 'input-error' : ''}`}
                  value={formData.id_number}
                  onChange={(e) => handleInputChange('id_number', e.target.value)}
                  placeholder="请输入18位身份证号"
                  maxLength={18}
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

              <FormField label="出生日期" error={errors.date_of_birth}>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                />
              </FormField>

              <FormField label="教育程度" error={errors.education_level}>
                <select
                  className="select select-bordered w-full"
                  value={formData.education_level}
                  onChange={(e) => handleInputChange('education_level', e.target.value)}
                >
                  <option value="">请选择教育程度</option>
                  <option value="小学毕业">小学毕业</option>
                  <option value="初中毕业">初中毕业</option>
                  <option value="高中毕业">高中毕业</option>
                  <option value="中专毕业">中专毕业</option>
                  <option value="大学专科毕业">大学专科毕业</option>
                  <option value="大学本科毕业">大学本科毕业</option>
                  <option value="硕士学位研究生">硕士学位研究生</option>
                  <option value="博士学位研究生">博士学位研究生</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* 组织信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">组织信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField label="职位" error={errors.position}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="请输入职位"
                />
              </FormField>

              <FormField label="职级" error={errors.job_level}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.job_level}
                  onChange={(e) => handleInputChange('job_level', e.target.value)}
                  placeholder="请输入职级"
                />
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

              <FormField label="在职状态" error={errors.current_status}>
                <select
                  className="select select-bordered w-full"
                  value={formData.current_status}
                  onChange={(e) => handleInputChange('current_status', e.target.value)}
                >
                  <option value="active">在职</option>
                  <option value="inactive">待岗</option>
                  <option value="terminated">离职</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">联系信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="电话号码" error={errors.phone_number}>
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

              <FormField label="联系地址" error={errors.address}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="请输入联系地址"
                />
              </FormField>
            </div>
          </div>

          {/* 银行信息 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">银行信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="开户银行" error={errors.bank_name}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  placeholder="请输入开户银行"
                />
              </FormField>

              <FormField label="银行账号" error={errors.account_number}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder={isEdit && !formData.account_number ? "数据需要重新输入完整银行账号" : "请输入银行账号"}
                />
                {isEdit && !formData.account_number && (
                  <div className="text-sm text-warning mt-1">
                    💡 为保护隐私，请重新输入完整银行账号
                  </div>
                )}
              </FormField>

              <FormField label="账户类型" error={errors.account_type}>
                <select
                  className="select select-bordered w-full"
                  value={formData.account_type}
                  onChange={(e) => handleInputChange('account_type', e.target.value)}
                >
                  <option value="">请选择账户类型</option>
                  <option value="储蓄卡">储蓄卡</option>
                  <option value="信用卡">信用卡</option>
                  <option value="存折">存折</option>
                </select>
              </FormField>

              <FormField label="账户名称" error={errors.account_holder_name}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.account_holder_name}
                  onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                  placeholder="请输入账户名称"
                />
              </FormField>
            </div>
          </div>

          {/* 工作履历 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">工作履历</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="首次工作日期" error={errors.first_work_date}>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.first_work_date}
                  onChange={(e) => handleInputChange('first_work_date', e.target.value)}
                />
              </FormField>

              <FormField label="入职日期" required error={errors.hire_date}>
                <input
                  type="date"
                  className={`input input-bordered w-full ${errors.hire_date ? 'input-error' : ''}`}
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                />
              </FormField>

              <FormField label="工龄间断年限" error={errors.interrupted_service_years}>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.interrupted_service_years}
                  onChange={(e) => handleInputChange('interrupted_service_years', e.target.value)}
                  placeholder="请输入工龄间断年限"
                  min="0"
                  step="0.1"
                />
              </FormField>
            </div>
          </div>

          {/* 其他信息 */}
          <div className="pb-6">
            <h3 className="text-lg font-semibold mb-4">其他信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="社保账号" error={errors.social_security_number}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.social_security_number}
                  onChange={(e) => handleInputChange('social_security_number', e.target.value)}
                  placeholder="请输入社保账号"
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

              <FormField label="政治面貌" error={errors.political_status}>
                <select
                  className="select select-bordered w-full"
                  value={formData.political_status}
                  onChange={(e) => handleInputChange('political_status', e.target.value)}
                >
                  <option value="">请选择政治面貌</option>
                  <option value="中共党员">中共党员</option>
                  <option value="中共预备党员">中共预备党员</option>
                  <option value="共青团员">共青团员</option>
                  <option value="民主党派">民主党派</option>
                  <option value="群众">群众</option>
                </select>
              </FormField>

              <FormField label="婚姻状况" error={errors.marital_status}>
                <select
                  className="select select-bordered w-full"
                  value={formData.marital_status}
                  onChange={(e) => handleInputChange('marital_status', e.target.value)}
                >
                  <option value="">请选择婚姻状况</option>
                  <option value="未婚">未婚</option>
                  <option value="已婚">已婚</option>
                  <option value="离异">离异</option>
                  <option value="丧偶">丧偶</option>
                </select>
              </FormField>
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