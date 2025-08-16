import React, { useState, useEffect } from 'react';
import { useEmployeeDetail } from '@/hooks/employee/useEmployeeDetail';
import { useEmployeeFormOptions } from '@/hooks/employee/useEmployeeFullCreate';
import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/core';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { EmployeeBasicInfo, EmployeeBankAccount, EmployeeEducation } from '@/types/employee';
import {
  UserCircleIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  EnvelopeIcon,
  MapPinIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// 模态框模式类型
type EmployeeModalMode = 'view' | 'edit' | 'create';

// Tab类型定义
type TabType = 'basic' | 'contact' | 'organization' | 'banking' | 'education';

interface EmployeeModalProps {
  mode: EmployeeModalMode;
  employeeId?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (employee?: any) => void;
}

// 员工基础数据表单类型
interface EmployeeFormData {
  employee_name: string;
  id_number?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  hire_date: string;
  employment_status: 'active' | 'inactive' | 'terminated';
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  home_address?: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
  work_location?: string;
  employee_type?: string;
}

export function EmployeeDetailModalPro({
  mode,
  employeeId,
  open,
  onClose,
  onSuccess
}: EmployeeModalProps) {
  const { addToast } = useToast();
  const { dialogState, loading: confirmLoading, hideConfirm, confirmDelete } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_name: '',
    hire_date: '',
    employment_status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 维护教育和银行账户的本地状态
  const [localBankAccounts, setLocalBankAccounts] = useState<Partial<EmployeeBankAccount>[]>([]);
  const [localEducation, setLocalEducation] = useState<Partial<EmployeeEducation>[]>([]);

  // 使用hook系统
  const employeeList = useEmployeeList();
  const { data: formOptions, isLoading: isLoadingOptions } = useEmployeeFormOptions();
  
  // 只在编辑/查看模式下获取员工详情
  const shouldLoadEmployee = mode !== 'create' && employeeId;
  const effectiveEmployeeId = (shouldLoadEmployee && employeeId) ? employeeId : '';
  const employeeDetail = useEmployeeDetail(effectiveEmployeeId);
  
  // 安全地解构数据
  const employee = employeeDetail?.employee || null;
  const bankAccounts = employeeDetail?.bankAccounts || [];
  const education = employeeDetail?.education || [];
  const contactInfo = employeeDetail?.contactInfo || {};
  const isLoadingEmployee = employeeDetail?.loading?.isLoading || false;
  
  // 初始化表单数据
  useEffect(() => {
    if (mode !== 'create' && employee) {
      const emp = employee as EmployeeBasicInfo;
      
      setFormData({
        employee_name: emp.employee_name || '',
        id_number: emp.id_number,
        gender: emp.gender as 'male' | 'female' | 'other',
        date_of_birth: emp.date_of_birth,
        hire_date: emp.hire_date || '',
        employment_status: (emp.employment_status as 'active' | 'inactive' | 'terminated') || 'active',
        mobile_phone: contactInfo.mobile_phone,
        email: contactInfo.personal_email,
        work_email: contactInfo.work_email,
        personal_email: contactInfo.personal_email,
        department_id: (emp as any).department_id,
        position_id: (emp as any).position_id,
        manager_id: (emp as any).manager_id,
        work_location: (emp as any).work_location,
        employee_type: (emp as any).employee_type,
      });
      
      // 设置银行账户和教育背景
      setLocalBankAccounts(bankAccounts);
      setLocalEducation(education);
    } else if (mode === 'create') {
      setFormData({
        employee_name: '',
        hire_date: new Date().toISOString().split('T')[0],
        employment_status: 'active'
      });
      setLocalBankAccounts([]);
      setLocalEducation([]);
    }
  }, [
    mode, 
    employeeId,
    employee?.employee_id,
    employee?.employee_name,
    employee?.id_number,
    employee?.gender,
    employee?.date_of_birth,
    employee?.hire_date,
    employee?.employment_status,
    contactInfo.mobile_phone,
    contactInfo.work_email,
    contactInfo.personal_email,
    bankAccounts,
    education
  ]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setActiveTab('basic');
      if (mode === 'create') {
        setFormData({
          employee_name: '',
          hire_date: new Date().toISOString().split('T')[0],
          employment_status: 'active'
        });
      }
    } else {
      setIsSubmitting(false);
    }
  }, [open, mode]);

  // 处理保存操作
  const handleSave = async () => {
    if (!formData.employee_name?.trim()) {
      addToast({ message: '请填写员工姓名', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        // 创建新员工
        const createData: any = {
          employee_name: formData.employee_name,
          id_number: formData.id_number,
          hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
          employment_status: formData.employment_status,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          mobile_phone: formData.mobile_phone,
          email: formData.email,
          work_email: formData.work_email,
          personal_email: formData.personal_email,
        };

        const { data, error } = await supabase
          .from('employees')
          .insert([createData])
          .select()
          .single();

        if (error) throw error;

        // 如果有银行账户信息，保存银行账户
        if (localBankAccounts.length > 0 && data) {
          const bankData = localBankAccounts
            .filter(account => account.account_number && account.bank_name)
            .map(account => ({
              account_holder_name: account.account_holder_name || formData.employee_name,
              account_number: account.account_number!,
              bank_name: account.bank_name!,
              branch_name: account.branch_name,
              effective_start_date: new Date().toISOString().split('T')[0],
              employee_id: data.id
            }));
          if (bankData.length > 0) {
            await supabase.from('employee_bank_accounts').insert(bankData);
          }
        }

        // 如果有教育背景信息，保存教育背景
        if (localEducation.length > 0 && data) {
          const eduData = localEducation
            .filter(edu => edu.degree && edu.institution_name)
            .map(edu => ({
              degree: edu.degree!,
              institution_name: edu.institution_name!,
              field_of_study: edu.field_of_study,
              graduation_date: edu.graduation_date,
              notes: edu.notes,
              employee_id: data.id
            }));
          if (eduData.length > 0) {
            await supabase.from('employee_education').insert(eduData);
          }
        }

        addToast({ message: '员工创建成功', type: 'success' });
        if (onSuccess) onSuccess(data);
        onClose();
      } else if (mode === 'edit') {
        // 更新员工信息
        const updateData: any = {
          employee_name: formData.employee_name,
          id_number: formData.id_number,
          hire_date: formData.hire_date,
          employment_status: formData.employment_status,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
        };

        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', employeeId!);

        if (error) throw error;

        // 更新联系信息 - 需要分别处理不同类型的联系方式
        const contactTypes = [
          { type: 'mobile_phone', value: formData.mobile_phone },
          { type: 'work_email', value: formData.work_email },
          { type: 'personal_email', value: formData.personal_email }
        ];

        for (const contact of contactTypes) {
          if (contact.value) {
            await supabase
              .from('employee_contacts')
              .upsert({
                employee_id: employeeId!,
                contact_type: contact.type as any,
                contact_details: contact.value,
                is_primary: true
              }, {
                onConflict: 'employee_id,contact_type'
              });
          }
        }

        addToast({ message: '员工信息更新成功', type: 'success' });
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      addToast({ 
        message: error.message || '保存失败，请重试', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab配置
  const tabs = [
    { id: 'basic', label: '基础信息', icon: UserCircleIcon },
    { id: 'contact', label: '联系方式', icon: PhoneIcon },
    { id: 'organization', label: '组织信息', icon: BuildingOfficeIcon, hideOnCreate: true },
    { id: 'banking', label: '银行账户', icon: CreditCardIcon },
    { id: 'education', label: '教育背景', icon: AcademicCapIcon },
  ];

  // 状态标签组件
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      active: { color: 'badge-success', text: '在职' },
      inactive: { color: 'badge-warning', text: '离职' },
      terminated: { color: 'badge-error', text: '终止' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'badge-ghost', text: status };
    return <span className={`badge ${config.color}`}>{config.text}</span>;
  };

  // 信息组件
  const InfoField = ({ 
    label, 
    value, 
    icon: Icon, 
    editable = false, 
    type = 'text',
    options = [],
    onChange,
    required = false,
    placeholder = '',
    colSpan = 1
  }: any) => {
    const isViewMode = mode === 'view' || (!editable && mode !== 'create');
    
    return (
      <div className={`col-span-${colSpan}`}>
        <label className="flex items-center gap-2 text-sm font-medium text-base-content/70 mb-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {required && <span className="text-error">*</span>}
        </label>
        {isViewMode ? (
          <div className="px-3 py-2 bg-base-200/50 rounded-lg min-h-[2.5rem] flex items-center">
            <span className={cn("text-base-content", !value && "text-base-content/50")}>
              {value || '-'}
            </span>
          </div>
        ) : type === 'select' ? (
          <select 
            className="select select-bordered w-full" 
            value={value || ''} 
            onChange={onChange}
            required={required}
          >
            <option value="">{placeholder || '请选择'}</option>
            {options.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            type="date"
            className="input input-bordered w-full"
            value={value || ''}
            onChange={onChange}
            required={required}
          />
        ) : type === 'textarea' ? (
          <textarea
            className="textarea textarea-bordered w-full"
            value={value || ''}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            rows={3}
          />
        ) : (
          <input
            type={type}
            className="input input-bordered w-full"
            value={value || ''}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  // 基础信息Tab - 员工基本信息
  const BasicInfoTab = () => (
    <div className="space-y-6">
      {/* 基础信息区块 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <UserCircleIcon className="w-5 h-5 text-primary" />
          基础信息
        </h5>
        <div className="grid grid-cols-2 gap-6">
          <InfoField
            label="员工姓名"
            value={formData.employee_name}
            icon={UserCircleIcon}
            editable={mode !== 'view'}
            required
            placeholder="请输入员工姓名"
            onChange={(e: any) => setFormData({...formData, employee_name: e.target.value})}
          />
          <InfoField
            label="身份证号"
            value={formData.id_number}
            icon={IdentificationIcon}
            editable={mode !== 'view'}
            placeholder="请输入身份证号"
            onChange={(e: any) => setFormData({...formData, id_number: e.target.value})}
          />
          <InfoField
            label="性别"
            value={formData.gender}
            type="select"
            options={[
              { value: 'male', label: '男' },
              { value: 'female', label: '女' },
              { value: 'other', label: '其他' }
            ]}
            editable={mode !== 'view'}
            onChange={(e: any) => setFormData({...formData, gender: e.target.value})}
          />
          <InfoField
            label="出生日期"
            value={formData.date_of_birth}
            icon={CalendarDaysIcon}
            type="date"
            editable={mode !== 'view'}
            onChange={(e: any) => setFormData({...formData, date_of_birth: e.target.value})}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* 雇佣信息区块 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <BriefcaseIcon className="w-5 h-5 text-primary" />
          雇佣信息
        </h5>
        <div className="grid grid-cols-2 gap-6">
          <InfoField
            label="入职日期"
            value={formData.hire_date}
            icon={CalendarDaysIcon}
            type="date"
            editable={mode !== 'view'}
            required
            onChange={(e: any) => setFormData({...formData, hire_date: e.target.value})}
          />
          <InfoField
            label="雇佣状态"
            value={formData.employment_status}
            type="select"
            options={[
              { value: 'active', label: '在职' },
              { value: 'inactive', label: '离职' },
              { value: 'terminated', label: '终止' }
            ]}
            editable={mode !== 'view'}
            required
            onChange={(e: any) => setFormData({...formData, employment_status: e.target.value})}
          />
        </div>
      </div>
    </div>
  );

  // 联系方式Tab
  const ContactInfoTab = () => (
    <div className="space-y-6">
      {/* 联系方式区块 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <PhoneIcon className="w-5 h-5 text-primary" />
          联系方式
        </h5>
        <div className="grid grid-cols-2 gap-6">
          <InfoField
            label="手机号码"
            value={formData.mobile_phone}
            icon={PhoneIcon}
            editable={mode !== 'view'}
            placeholder="请输入手机号码"
            onChange={(e: any) => setFormData({...formData, mobile_phone: e.target.value})}
          />
          <InfoField
            label="工作邮箱"
            value={formData.work_email}
            icon={EnvelopeIcon}
            type="email"
            editable={mode !== 'view'}
            placeholder="请输入工作邮箱"
            onChange={(e: any) => setFormData({...formData, work_email: e.target.value})}
          />
          <InfoField
            label="个人邮箱"
            value={formData.personal_email}
            icon={EnvelopeIcon}
            type="email"
            editable={mode !== 'view'}
            placeholder="请输入个人邮箱"
            onChange={(e: any) => setFormData({...formData, personal_email: e.target.value})}
          />
          <InfoField
            label="家庭地址"
            value={formData.home_address}
            icon={MapPinIcon}
            editable={mode !== 'view'}
            placeholder="请输入家庭地址"
            colSpan={2}
            onChange={(e: any) => setFormData({...formData, home_address: e.target.value})}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* 紧急联系人 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <ExclamationCircleIcon className="w-5 h-5 text-primary" />
          紧急联系人
        </h5>
        <div className="grid grid-cols-2 gap-6">
          <InfoField
            label="联系人姓名"
            value={formData.emergency_contact}
            editable={mode !== 'view'}
            placeholder="请输入紧急联系人姓名"
            onChange={(e: any) => setFormData({...formData, emergency_contact: e.target.value})}
          />
          <InfoField
            label="联系人电话"
            value={formData.emergency_phone}
            icon={PhoneIcon}
            editable={mode !== 'view'}
            placeholder="请输入紧急联系人电话"
            onChange={(e: any) => setFormData({...formData, emergency_phone: e.target.value})}
          />
        </div>
      </div>
    </div>
  );

  // 组织信息Tab
  const OrganizationInfoTab = () => {
    // 直接从员工数据中获取已经包含的名称字段
    const emp = employee as any;
    
    return (
      <div className="space-y-6">
        {/* 职位信息 */}
        <div className="space-y-4">
          <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
            <BriefcaseIcon className="w-5 h-5 text-primary" />
            职位信息
          </h5>
          <div className="grid grid-cols-2 gap-6">
            <InfoField
              label="部门"
              value={emp?.department_name || '-'}
              icon={BuildingOfficeIcon}
              editable={false}
            />
            <InfoField
              label="职位"
              value={emp?.position_name || '-'}
              icon={BriefcaseIcon}
              editable={false}
            />
            <InfoField
              label="人员类别"
              value={emp?.category_name || '-'}
              icon={UserGroupIcon}
              editable={false}
            />
            <InfoField
              label="工作地点"
              value={emp?.work_location || '-'}
              icon={MapPinIcon}
              editable={false}
            />
            <InfoField
              label="职级"
              value={emp?.rank_name || '-'}
              icon={CheckBadgeIcon}
              editable={false}
            />
            <InfoField
              label="入职日期"
              value={emp?.hire_date ? new Date(emp.hire_date).toLocaleDateString('zh-CN') : '-'}
              icon={CalendarDaysIcon}
              editable={false}
            />
            <InfoField
              label="工龄"
              value={emp?.years_of_service ? `${Math.floor(emp.years_of_service)} 年` : '-'}
              icon={ClockIcon}
              editable={false}
            />
            <InfoField
              label="状态"
              value={emp?.status_display || '-'}
              icon={UserCircleIcon}
              editable={false}
            />
          </div>
        </div>

        {/* 历史记录 - 暂时保留结构，待后续实现 */}
        {emp?.assignment_history && emp.assignment_history.length > 0 && (
          <>
            <div className="divider"></div>
            <div className="space-y-4">
              <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
                <ClockIcon className="w-5 h-5 text-primary" />
                历史记录
              </h5>
              <div className="space-y-2">
                {emp.assignment_history.map((history: any, index: number) => (
                  <div key={index} className="p-3 bg-base-200/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {history.department_name} - {history.position_name}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {history.start_date} 至 {history.end_date || '至今'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // 银行账户Tab
  const BankingTab = () => {
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [newBankAccount, setNewBankAccount] = useState<Partial<EmployeeBankAccount>>({});
    const [isAddingBank, setIsAddingBank] = useState(false);
    
    const displayBankAccounts = mode === 'create' ? localBankAccounts : bankAccounts;
    
    const handleAddBank = () => {
      if (mode === 'create') {
        // 创建模式下，添加到本地状态
        const newAccount: Partial<EmployeeBankAccount> = {
          id: `temp-${Date.now()}`,
          ...newBankAccount,
          effective_start_date: new Date().toISOString().split('T')[0]
        };
        setLocalBankAccounts([...localBankAccounts, newAccount]);
      } else {
        // 编辑模式下，直接保存到数据库
        handleSaveBankAccount(newBankAccount);
      }
      setNewBankAccount({});
      setIsAddingBank(false);
    };
    
    const handleSaveBankAccount = async (account: Partial<EmployeeBankAccount>) => {
      if (mode === 'view') return;
      
      try {
        if (mode === 'create') {
          // 创建模式下更新本地状态
          const updatedAccounts = localBankAccounts.map(acc => 
            acc.id === account.id ? account : acc
          );
          setLocalBankAccounts(updatedAccounts);
        } else {
          // 编辑模式下保存到数据库
          const saveData = {
            account_holder_name: account.account_holder_name || formData.employee_name,
            account_number: account.account_number!,
            bank_name: account.bank_name!,
            branch_name: account.branch_name,
            effective_start_date: account.effective_start_date || new Date().toISOString().split('T')[0],
            employee_id: employeeId!
          };
          
          if (account.id && !account.id.startsWith('temp-')) {
            // 更新现有账户
            await supabase
              .from('employee_bank_accounts')
              .update(saveData)
              .eq('id', account.id);
          } else {
            // 新增账户
            await supabase
              .from('employee_bank_accounts')
              .insert([saveData]);
          }
          
          addToast({ message: '银行账户保存成功', type: 'success' });
          // 刷新数据 - employeeDetail hook可能没有refetch方法
          // 如果需要刷新，应该通过其他方式
        }
        setEditingBankId(null);
      } catch (error) {
        console.error('保存银行账户失败:', error);
        addToast({ message: '保存失败', type: 'error' });
      }
    };
    
    const handleDeleteBank = async (accountId: string) => {
      if (mode === 'view') return;
      
      await confirmDelete('这个银行账户', async () => {
        try {
          if (mode === 'create' || accountId.startsWith('temp-')) {
            // 创建模式下，从本地状态删除
            setLocalBankAccounts(localBankAccounts.filter(acc => acc.id !== accountId));
          } else {
            // 编辑模式下，从数据库删除
            await supabase
              .from('employee_bank_accounts')
              .delete()
              .eq('id', accountId);
            
            addToast({ message: '银行账户删除成功', type: 'success' });
            // 刷新数据 - employeeDetail hook可能没有refetch方法
            // 如果需要刷新，应该通过其他方式
          }
        } catch (error) {
          console.error('删除银行账户失败:', error);
          addToast({ message: '删除失败', type: 'error' });
          throw error;
        }
      });
    };
    
    return (
      <div className="space-y-6">
        {/* 银行账户列表 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-base-300">
            <h5 className="font-semibold text-base flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-primary" />
              银行账户信息
            </h5>
            {mode !== 'view' && !isAddingBank && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setIsAddingBank(true)}
              >
                添加账户
              </button>
            )}
          </div>
          
          {/* 新增账户表单 */}
          {isAddingBank && (
            <div className="p-4 bg-base-200/30 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="账户名称"
                  value={newBankAccount.account_holder_name}
                  placeholder="请输入账户名称"
                  editable={true}
                  onChange={(e: any) => setNewBankAccount({...newBankAccount, account_holder_name: e.target.value})}
                />
                <InfoField
                  label="银行名称"
                  value={newBankAccount.bank_name}
                  placeholder="请输入银行名称"
                  editable={true}
                  required
                  onChange={(e: any) => setNewBankAccount({...newBankAccount, bank_name: e.target.value})}
                />
                <InfoField
                  label="账号"
                  value={newBankAccount.account_number}
                  placeholder="请输入银行账号"
                  editable={true}
                  required
                  onChange={(e: any) => setNewBankAccount({...newBankAccount, account_number: e.target.value})}
                />
                <InfoField
                  label="开户行"
                  value={newBankAccount.branch_name}
                  placeholder="请输入开户行"
                  editable={true}
                  onChange={(e: any) => setNewBankAccount({...newBankAccount, branch_name: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setIsAddingBank(false);
                    setNewBankAccount({});
                  }}
                >
                  取消
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleAddBank}
                  disabled={!newBankAccount.bank_name || !newBankAccount.account_number}
                >
                  保存
                </button>
              </div>
            </div>
          )}
          
          {/* 账户列表 */}
          {displayBankAccounts.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              暂无银行账户信息
            </div>
          ) : (
            <div className="space-y-3">
              {displayBankAccounts.map((account: any) => (
                <div key={account.id} className="p-4 bg-base-200/30 rounded-lg">
                  {editingBankId === account.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField
                          label="账户名称"
                          value={account.account_holder_name}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayBankAccounts.map((acc: any) => 
                              acc.id === account.id ? {...acc, account_holder_name: e.target.value} : acc
                            );
                            mode === 'create' ? setLocalBankAccounts(updated) : null;
                          }}
                        />
                        <InfoField
                          label="银行名称"
                          value={account.bank_name}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayBankAccounts.map((acc: any) => 
                              acc.id === account.id ? {...acc, bank_name: e.target.value} : acc
                            );
                            mode === 'create' ? setLocalBankAccounts(updated) : null;
                          }}
                        />
                        <InfoField
                          label="账号"
                          value={account.account_number}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayBankAccounts.map((acc: any) => 
                              acc.id === account.id ? {...acc, account_number: e.target.value} : acc
                            );
                            mode === 'create' ? setLocalBankAccounts(updated) : null;
                          }}
                        />
                        <InfoField
                          label="开户行"
                          value={account.branch_name}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayBankAccounts.map((acc: any) => 
                              acc.id === account.id ? {...acc, branch_name: e.target.value} : acc
                            );
                            mode === 'create' ? setLocalBankAccounts(updated) : null;
                          }}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditingBankId(null)}
                        >
                          取消
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveBankAccount(account)}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        <div>
                          <span className="text-sm text-base-content/60">账户名称：</span>
                          <span className="ml-2">{account.account_holder_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-sm text-base-content/60">银行：</span>
                          <span className="ml-2">{account.bank_name}</span>
                        </div>
                        <div>
                          <span className="text-sm text-base-content/60">账号：</span>
                          <span className="ml-2">{account.account_number}</span>
                        </div>
                        <div>
                          <span className="text-sm text-base-content/60">开户行：</span>
                          <span className="ml-2">{account.branch_name || '-'}</span>
                        </div>
                      </div>
                      {mode !== 'view' && (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditingBankId(account.id)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-sm btn-error btn-ghost"
                            onClick={() => handleDeleteBank(account.id)}
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 教育背景Tab
  const EducationTab = () => {
    const [editingEduId, setEditingEduId] = useState<string | null>(null);
    const [newEducation, setNewEducation] = useState<Partial<EmployeeEducation>>({});
    const [isAddingEducation, setIsAddingEducation] = useState(false);
    
    const displayEducation = mode === 'create' ? localEducation : education;
    
    const handleAddEducation = () => {
      if (mode === 'create') {
        // 创建模式下，添加到本地状态
        const newEdu: Partial<EmployeeEducation> = {
          id: `temp-${Date.now()}`,
          ...newEducation
        };
        setLocalEducation([...localEducation, newEdu]);
      } else {
        // 编辑模式下，直接保存到数据库
        handleSaveEducation(newEducation);
      }
      setNewEducation({});
      setIsAddingEducation(false);
    };
    
    const handleSaveEducation = async (edu: Partial<EmployeeEducation>) => {
      if (mode === 'view') return;
      
      try {
        if (mode === 'create') {
          // 创建模式下更新本地状态
          const updatedEducation = localEducation.map(e => 
            e.id === edu.id ? edu : e
          );
          setLocalEducation(updatedEducation);
        } else {
          // 编辑模式下保存到数据库
          const saveData = {
            degree: edu.degree!,
            institution_name: edu.institution_name!,
            field_of_study: edu.field_of_study,
            graduation_date: edu.graduation_date,
            notes: edu.notes,
            employee_id: employeeId!
          };
          
          if (edu.id && !edu.id.startsWith('temp-')) {
            // 更新现有记录
            await supabase
              .from('employee_education')
              .update(saveData)
              .eq('id', edu.id);
          } else {
            // 新增记录
            await supabase
              .from('employee_education')
              .insert([saveData]);
          }
          
          addToast({ message: '教育背景保存成功', type: 'success' });
          // 刷新数据 - employeeDetail hook可能没有refetch方法
          // 如果需要刷新，应该通过其他方式
        }
        setEditingEduId(null);
      } catch (error) {
        console.error('保存教育背景失败:', error);
        addToast({ message: '保存失败', type: 'error' });
      }
    };
    
    const handleDeleteEducation = async (eduId: string) => {
      if (mode === 'view') return;
      
      await confirmDelete('这条教育背景', async () => {
        try {
        if (mode === 'create' || eduId.startsWith('temp-')) {
          // 创建模式下，从本地状态删除
          setLocalEducation(localEducation.filter(e => e.id !== eduId));
        } else {
          // 编辑模式下，从数据库删除
          await supabase
            .from('employee_education')
            .delete()
            .eq('id', eduId);
          
          addToast({ message: '教育背景删除成功', type: 'success' });
          // 刷新数据 - employeeDetail hook可能没有refetch方法
          // 如果需要刷新，应该通过其他方式
        }
        } catch (error) {
          console.error('删除教育背景失败:', error);
          addToast({ message: '删除失败', type: 'error' });
          throw error;
        }
      });
    };
    
    return (
      <div className="space-y-6">
        {/* 教育背景列表 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-base-300">
            <h5 className="font-semibold text-base flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-primary" />
              教育背景
            </h5>
            {mode !== 'view' && !isAddingEducation && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setIsAddingEducation(true)}
              >
                添加教育经历
              </button>
            )}
          </div>
          
          {/* 新增教育背景表单 */}
          {isAddingEducation && (
            <div className="p-4 bg-base-200/30 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="学校名称"
                  value={newEducation.institution_name}
                  placeholder="请输入学校名称"
                  editable={true}
                  required
                  onChange={(e: any) => setNewEducation({...newEducation, institution_name: e.target.value})}
                />
                <InfoField
                  label="学历"
                  value={newEducation.degree}
                  type="select"
                  options={[
                    { value: '高中', label: '高中' },
                    { value: '大专', label: '大专' },
                    { value: '本科', label: '本科' },
                    { value: '硕士', label: '硕士' },
                    { value: '博士', label: '博士' },
                  ]}
                  editable={true}
                  required
                  onChange={(e: any) => setNewEducation({...newEducation, degree: e.target.value})}
                />
                <InfoField
                  label="专业"
                  value={newEducation.field_of_study}
                  placeholder="请输入专业"
                  editable={true}
                  onChange={(e: any) => setNewEducation({...newEducation, field_of_study: e.target.value})}
                />
                <InfoField
                  label="毕业时间"
                  value={newEducation.graduation_date}
                  type="date"
                  editable={true}
                  onChange={(e: any) => setNewEducation({...newEducation, graduation_date: e.target.value})}
                />
              </div>
              <InfoField
                label="备注"
                value={newEducation.notes}
                type="textarea"
                placeholder="请输入备注信息"
                editable={true}
                colSpan={2}
                onChange={(e: any) => setNewEducation({...newEducation, notes: e.target.value})}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setIsAddingEducation(false);
                    setNewEducation({});
                  }}
                >
                  取消
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleAddEducation}
                  disabled={!newEducation.institution_name || !newEducation.degree}
                >
                  保存
                </button>
              </div>
            </div>
          )}
          
          {/* 教育背景列表 */}
          {displayEducation.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              暂无教育背景信息
            </div>
          ) : (
            <div className="space-y-3">
              {displayEducation.map((edu: any) => (
                <div key={edu.id} className="p-4 bg-base-200/30 rounded-lg">
                  {editingEduId === edu.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField
                          label="学校名称"
                          value={edu.institution_name}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayEducation.map((ed: any) => 
                              ed.id === edu.id ? {...ed, institution_name: e.target.value} : ed
                            );
                            mode === 'create' ? setLocalEducation(updated) : null;
                          }}
                        />
                        <InfoField
                          label="学历"
                          value={edu.degree}
                          type="select"
                          options={[
                            { value: '高中', label: '高中' },
                            { value: '大专', label: '大专' },
                            { value: '本科', label: '本科' },
                            { value: '硕士', label: '硕士' },
                            { value: '博士', label: '博士' },
                          ]}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayEducation.map((ed: any) => 
                              ed.id === edu.id ? {...ed, degree: e.target.value} : ed
                            );
                            mode === 'create' ? setLocalEducation(updated) : null;
                          }}
                        />
                        <InfoField
                          label="专业"
                          value={edu.field_of_study}
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayEducation.map((ed: any) => 
                              ed.id === edu.id ? {...ed, field_of_study: e.target.value} : ed
                            );
                            mode === 'create' ? setLocalEducation(updated) : null;
                          }}
                        />
                        <InfoField
                          label="毕业时间"
                          value={edu.graduation_date}
                          type="date"
                          editable={true}
                          onChange={(e: any) => {
                            const updated = displayEducation.map((ed: any) => 
                              ed.id === edu.id ? {...ed, graduation_date: e.target.value} : ed
                            );
                            mode === 'create' ? setLocalEducation(updated) : null;
                          }}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditingEduId(null)}
                        >
                          取消
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveEducation(edu)}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="font-medium">{edu.institution_name}</span>
                          <span className="badge badge-primary">{edu.degree}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-base-content/60">专业：</span>
                            <span className="ml-2">{edu.field_of_study || '-'}</span>
                          </div>
                          <div>
                            <span className="text-base-content/60">毕业时间：</span>
                            <span className="ml-2">{edu.graduation_date || '-'}</span>
                          </div>
                        </div>
                        {edu.notes && (
                          <div className="mt-2 text-sm">
                            <span className="text-base-content/60">备注：</span>
                            <span className="ml-2">{edu.notes}</span>
                          </div>
                        )}
                      </div>
                      {mode !== 'view' && (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditingEduId(edu.id)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-sm btn-error btn-ghost"
                            onClick={() => handleDeleteEducation(edu.id)}
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };


  if (!open) return null;

  return (
    <>
      <dialog className={cn("modal", { "modal-open": open })}>
        <div className="modal-box max-w-6xl max-h-[92vh] p-0 overflow-hidden">
        {/* Enhanced Modal Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-300">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                {mode === 'create' && (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <UserCircleIcon className="w-6 h-6 text-primary" />
                    </div>
                    新增员工
                  </>
                )}
                {mode === 'edit' && (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                      <UserCircleIcon className="w-6 h-6 text-warning" />
                    </div>
                    编辑员工信息
                  </>
                )}
                {mode === 'view' && (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                      <UserCircleIcon className="w-6 h-6 text-info" />
                    </div>
                    员工详情
                  </>
                )}
              </h3>
              {employee?.employee_name && (
                <p className="text-sm text-base-content/60 mt-1 ml-13">
                  {employee.employee_name} · {employee.employee_id}
                </p>
              )}
            </div>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area with Sidebar Navigation */}
        <div className="flex h-[calc(92vh-8rem)]">
          {/* Sidebar Navigation */}
          <div className="w-56 bg-base-200/30 border-r border-base-300 p-4">
            <ul className="space-y-1">
              {tabs
                .filter(tab => !tab.hideOnCreate || mode !== 'create')
                .map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all",
                          "hover:bg-base-300/50",
                          activeTab === tab.id && "bg-primary/10 text-primary font-medium"
                        )}
                        onClick={() => setActiveTab(tab.id as TabType)}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{tab.label}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingEmployee && mode !== 'create' ? (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                {activeTab === 'basic' && <BasicInfoTab />}
                {activeTab === 'contact' && <ContactInfoTab />}
                {activeTab === 'organization' && mode !== 'create' && <OrganizationInfoTab />}
                {activeTab === 'banking' && <BankingTab />}
                {activeTab === 'education' && <EducationTab />}
              </>
            )}
          </div>
        </div>

        {/* Enhanced Modal Footer */}
        <div className="border-t border-base-300 p-4 bg-base-200/30">
          <div className="flex justify-between items-center">
            <div className="text-sm text-base-content/60">
              {mode === 'create' && '请填写必要信息以创建新员工'}
              {mode === 'edit' && '修改后请点击保存按钮'}
              {mode === 'view' && '查看模式'}
            </div>
            <div className="flex gap-2">
              {(mode === 'edit' || mode === 'create') && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <span className="loading loading-spinner loading-xs mr-2"></span>}
                  {mode === 'create' ? '创建员工' : '保存更改'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>关闭</button>
      </form>
    </dialog>

    {/* 确认对话框 */}
    <ConfirmDialog
      open={dialogState.open}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      confirmVariant={dialogState.confirmVariant}
      onConfirm={dialogState.onConfirm || (() => {})}
      onCancel={hideConfirm}
      loading={confirmLoading}
    />
  </>
  );
}