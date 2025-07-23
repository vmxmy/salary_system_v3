import React, { useState, useEffect } from 'react';
import type { 
  Employee, 
  EmployeeWithDetails, 
  EmployeePersonalDetails,
  EmployeeContact,
  EmployeeBankAccount
} from '../../types/employee_new';
import { useEmployeeLookups } from '../../hooks/useEmployeeLookups';
import LoadingSpinner from '../common/LoadingSpinner';

interface EmployeeFormProps {
  employee?: EmployeeWithDetails | null;
  onSubmit: (data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

interface FormData {
  // 基本信息
  full_name: string;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string;
  id_number_encrypted: string; // 加密的身份证号
  hire_date: string;
  first_work_date: string;
  current_status: 'active' | 'inactive' | 'terminated';
  employment_status: 'active' | 'inactive' | 'on_leave';
  
  // 组织信息
  department_id: string;
  position_id: string;
  position_text: string;
  job_level_text: string;
  personnel_category_id: string;
  
  // 个人详情
  education_level: string;
  interrupted_service_years: string;
  social_security_number: string;
  housing_fund_number: string;
  political_status: string;
  marital_status: string;
  
  // 联系方式
  phone_number: string; // 加密的手机号
  email: string; // 加密的邮箱
  address: string; // 加密的地址
  
  // 银行信息
  bank_name: string; // 加密的银行名称
  account_number: string; // 加密的银行账号
  account_holder_name: string; // 加密的账户持有人姓名
  account_type: string;
  is_primary: boolean;
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
  const { departments, positions, personnelCategories, loading: lookupsLoading } = useEmployeeLookups();
  
  const [formData, setFormData] = useState<FormData>({
    // 基本信息
    full_name: '',
    gender: '',
    date_of_birth: '',
    id_number_encrypted: '',
    hire_date: '',
    first_work_date: '',
    current_status: 'active',
    employment_status: 'active',
    
    // 组织信息
    department_id: '',
    position_id: '',
    position_text: '',
    job_level_text: '',
    personnel_category_id: '',
    
    // 个人详情
    education_level: '',
    interrupted_service_years: '',
    social_security_number: '',
    housing_fund_number: '',
    political_status: '',
    marital_status: '',
    
    // 联系方式
    phone_number: '',
    email: '',
    address: '',
    
    // 银行信息
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    account_type: '',
    is_primary: true
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // 初始化表单数据
  useEffect(() => {
    if (employee) {
      setFormData({
        // 基本信息
        full_name: employee.full_name || '',
        gender: (employee.gender as 'male' | 'female' | 'other') || '',
        date_of_birth: employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '',
        id_number_encrypted: '', // 加密字段，不直接显示原文
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        first_work_date: employee.first_work_date ? employee.first_work_date.split('T')[0] : '',
        current_status: (employee.current_status as 'active' | 'inactive' | 'terminated') || 'active',
        employment_status: (employee.employment_status as 'active' | 'inactive' | 'on_leave') || 'active',
        
        // 组织信息
        department_id: employee.department_id || '',
        position_id: employee.position_id || '',
        position_text: employee.position_text || '',
        job_level_text: employee.job_level_text || '',
        personnel_category_id: employee.personnel_category_id || '',
        
        // 个人详情
        education_level: employee.education_level || '',
        interrupted_service_years: employee.interrupted_service_years?.toString() || '',
        social_security_number: employee.social_security_number || '',
        housing_fund_number: employee.housing_fund_number || '',
        political_status: employee.political_status || '',
        marital_status: employee.marital_status || '',
        
        // 联系方式
        phone_number: '', // 加密字段，不直接显示原文
        email: '', // 加密字段，不直接显示原文
        address: '', // 加密字段，不直接显示原文
        
        // 银行信息
        bank_name: '', // 加密字段，不直接显示原文
        account_number: '', // 加密字段，不直接显示原文
        account_holder_name: '', // 加密字段，不直接显示原文
        account_type: employee.account_type || '',
        is_primary: true
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

    if (!formData.hire_date) {
      newErrors.hire_date = '入职日期不能为空';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
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
      employee: {
        full_name: formData.full_name.trim(),
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        hire_date: formData.hire_date,
        first_work_date: formData.first_work_date || null,
        current_status: formData.current_status,
        employment_status: formData.employment_status,
        department_id: formData.department_id || null,
        position_id: formData.position_id || null,
        position_text: formData.position_text || null,
        job_level_text: formData.job_level_text || null,
        personnel_category_id: formData.personnel_category_id || null,
      },
      personalDetails: {
        education_level: formData.education_level || null,
        interrupted_service_years: formData.interrupted_service_years ? 
          parseInt(formData.interrupted_service_years) : null,
        social_security_number: formData.social_security_number || null,
        housing_fund_number: formData.housing_fund_number || null,
        political_status: formData.political_status || null,
        marital_status: formData.marital_status || null,
      },
      contacts: [
        {
          contact_type: 'mobile_phone' as const,
          contact_value_encrypted: formData.phone_number, // 应该是加密后的值
          is_primary: true,
        },
        {
          contact_type: 'work_email' as const,
          contact_value_encrypted: formData.email, // 应该是加密后的值
          is_primary: true,
        },
        {
          contact_type: 'address' as const,
          contact_value_encrypted: formData.address, // 应该是加密后的值
          is_primary: true,
        }
      ].filter(contact => contact.contact_value_encrypted),
      bankAccounts: [
        {
          bank_name_encrypted: formData.bank_name, // 应该是加密后的值
          account_number_encrypted: formData.account_number, // 应该是加密后的值
          account_holder_name_encrypted: formData.account_holder_name, // 应该是加密后的值
          account_type: formData.account_type || null,
          is_primary: formData.is_primary,
        }
      ].filter(account => account.bank_name_encrypted || account.account_number_encrypted)
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

              <FormField label="性别" required error={errors.gender}>
                <select
                  className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value as any)}
                >
                  <option value="">请选择性别</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
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

              <FormField label="入职日期" required error={errors.hire_date}>
                <input
                  type="date"
                  className={`input input-bordered w-full ${errors.hire_date ? 'input-error' : ''}`}
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                />
              </FormField>

              <FormField label="首次工作日期" error={errors.first_work_date}>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.first_work_date}
                  onChange={(e) => handleInputChange('first_work_date', e.target.value)}
                />
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

              <FormField label="职位描述" error={errors.position_text}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.position_text}
                  onChange={(e) => handleInputChange('position_text', e.target.value)}
                  placeholder="请输入职位描述"
                />
              </FormField>

              <FormField label="职级" error={errors.job_level_text}>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.job_level_text}
                  onChange={(e) => handleInputChange('job_level_text', e.target.value)}
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
                  onChange={(e) => handleInputChange('current_status', e.target.value as any)}
                >
                  <option value="active">在职</option>
                  <option value="inactive">待岗</option>
                  <option value="terminated">离职</option>
                </select>
              </FormField>

              <FormField label="就业状态" error={errors.employment_status}>
                <select
                  className="select select-bordered w-full"
                  value={formData.employment_status}
                  onChange={(e) => handleInputChange('employment_status', e.target.value as any)}
                >
                  <option value="active">活跃</option>
                  <option value="inactive">非活跃</option>
                  <option value="on_leave">休假</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* 个人详情 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">个人详情</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* 联系方式 */}
          <div className="border-b border-base-300 pb-6">
            <h3 className="text-lg font-semibold mb-4">联系方式</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="电话号码" error={errors.phone_number}>
                <input
                  type="tel"
                  className={`input input-bordered w-full ${errors.phone_number ? 'input-error' : ''}`}
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="请输入电话号码"
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

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                  />
                  <span className="label-text">设为主要账户</span>
                </label>
              </div>
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