import React, { useState, useEffect } from 'react';
import { useEmployeeDetail } from '@/hooks/employee/useEmployeeDetail';
import { useEmployeeFormOptions } from '@/hooks/employee/useEmployeeFullCreate';
import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import type { EmployeeBasicInfo, EmployeeBankAccount, EmployeeEducation } from '@/types/employee';

// 模态框模式类型
type EmployeeModalMode = 'view' | 'edit' | 'create';

// Tab类型定义
type TabType = 'basic' | 'contact' | 'organization' | 'banking' | 'education' | 'actions';

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
}


export function EmployeeModal({
  mode,
  employeeId,
  open,
  onClose,
  onSuccess
}: EmployeeModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_name: '',
    hire_date: '',
    employment_status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 新增：维护教育和银行账户的本地状态
  const [localBankAccounts, setLocalBankAccounts] = useState<Partial<EmployeeBankAccount>[]>([]);
  const [localEducation, setLocalEducation] = useState<Partial<EmployeeEducation>[]>([]);

  // 调试：打印接收到的 props - 每次渲染都会执行
  console.log('[EmployeeModal] Component rendered with props:', { 
    mode, 
    employeeId, 
    open,
    timestamp: new Date().toISOString() 
  });

  // 使用新的hook系统
  const employeeList = useEmployeeList();
  const { data: formOptions, isLoading: isLoadingOptions } = useEmployeeFormOptions();
  
  // 只在编辑/查看模式下获取员工详情
  const shouldLoadEmployee = mode !== 'create' && employeeId;
  // 确保传递有效的 employeeId 给 hook
  const effectiveEmployeeId = (shouldLoadEmployee && employeeId) ? employeeId : '';
  console.log('[EmployeeModal] Effective employeeId for hook:', effectiveEmployeeId);
  
  const employeeDetail = useEmployeeDetail(effectiveEmployeeId);
  
  // 安全地解构数据，确保有默认值
  const employee = employeeDetail?.employee || null;
  const bankAccounts = employeeDetail?.bankAccounts || [];
  const education = employeeDetail?.education || [];
  const contactInfo = employeeDetail?.contactInfo || { mobile_phone: '', work_email: '', personal_email: '' };
  const isLoadingEmployee = employeeDetail?.loading?.isLoading || false;
  
  // 调试教育数据
  console.log('[EmployeeModal] Education data from hook:', {
    education: employeeDetail?.education,
    educationLength: employeeDetail?.education?.length,
    isLoadingEducation: employeeDetail?.loading?.isLoadingEducation,
    rawEmployeeDetail: employeeDetail
  });

  // 调试信息
  console.log('EmployeeDetailModal Debug:', {
    mode,
    employeeId,
    shouldLoadEmployee,
    isLoadingEmployee,
    hasEmployee: !!employee,
    hasEmployeeDetail: !!employeeDetail,
    employee: employee && typeof employee === 'object' && 'employee_name' in employee ? { name: employee.employee_name, id: (employee as any).id || employeeId } : null,
    currentFormData: formData,
    activeTab,
    open
  });

  // 初始化表单数据 - 使用具体字段值作为依赖，避免对象引用变化
  useEffect(() => {
    console.log('FormData useEffect:', { mode, hasEmployee: !!employee, employeeId });
    
    if (mode !== 'create' && employee) {
      const emp = employee as EmployeeBasicInfo;
      console.log('Setting formData from employee:', emp);
      console.log('Contact info from hook:', contactInfo);
      
      const newFormData = {
        employee_name: emp.employee_name || '',
        id_number: emp.id_number,
        gender: emp.gender as 'male' | 'female' | 'other',
        date_of_birth: emp.date_of_birth,
        hire_date: emp.hire_date || '',
        employment_status: (emp.employment_status as 'active' | 'inactive' | 'terminated') || 'active',
        // 使用新hook提供的contactInfo而不是employee对象中的字段
        mobile_phone: contactInfo.mobile_phone,
        email: contactInfo.personal_email, // 映射到personal_email
        work_email: contactInfo.work_email,
        personal_email: contactInfo.personal_email,
      };
      
      console.log('New formData:', newFormData);
      setFormData(newFormData);
    } else if (mode === 'create') {
      setFormData({
        employee_name: '',
        hire_date: '',
        employment_status: 'active'
      });
    }
  }, [
    mode, 
    employeeId,
    // 使用具体的字段值而不是整个对象
    employee?.employee_id,
    employee?.employee_name,
    employee?.id_number,
    employee?.gender,
    employee?.date_of_birth,
    employee?.hire_date,
    employee?.employment_status,
    contactInfo.mobile_phone,
    contactInfo.work_email,
    contactInfo.personal_email
  ]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setActiveTab('basic');
      if (mode === 'create') {
        setFormData({
          employee_name: '',
          hire_date: '',
          employment_status: 'active'
        });
      }
    } else {
      setIsSubmitting(false);
    }
  }, [open, mode]);

  // 处理保存操作
  const handleSave = async () => {
    console.log('handleSave called, activeTab:', activeTab, 'mode:', mode);
    
    // 创建模式下，一次性保存所有数据（基础信息、银行账户、教育背景）
    if (mode === 'create') {
      await handleBasicInfoSave(); // 这个函数内部已经包含了所有tab的数据
      return;
    }
    
    // 编辑模式下，根据当前标签页保存对应的数据
    switch (activeTab) {
      case 'basic':
      case 'contact':
      case 'organization':
        // 这三个标签页共享基本信息
        await handleBasicInfoSave();
        break;
      case 'banking':
        // 保存银行账户信息
        await handleSaveBankAccounts();
        break;
      case 'education':
        // 保存教育背景信息
        await handleSaveEducation();
        break;
      default:
        break;
    }
  };

  // 处理基础信息保存
  const handleBasicInfoSave = async () => {
    console.log('handleBasicInfoSave called');
    console.log('Current mode:', mode);
    console.log('Employee ID:', employeeId);
    console.log('Form data:', formData);
    console.log('Employee detail:', employeeDetail);
    
    if (!formData.employee_name?.trim()) {
      addToast({ message: '请填写员工姓名', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        // 准备完整的创建数据，包括组织信息、银行账户和教育背景
        const createData: any = {
          employee_name: formData.employee_name,
          id_number: formData.id_number,
          hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
          employment_status: formData.employment_status as 'active' | 'inactive',
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          mobile_phone: formData.mobile_phone,
          email: formData.email,
          work_email: formData.work_email,
          personal_email: formData.personal_email,
        };

        // 注释掉组织信息，因为创建时不再收集这些数据
        // // 添加组织分配信息
        // if (formData.department_id && formData.position_id) {
        //   createData.organizational_assignment = {
        //     department_id: formData.department_id,
        //     position_id: formData.position_id,
        //     start_date: new Date().toISOString().split('T')[0],
        //   };
        // }

        // // 添加人员类别信息
        // if (formData.category_id) {
        //   createData.category_assignment = {
        //     employee_category_id: formData.category_id,
        //     effective_start_date: new Date().toISOString().split('T')[0],
        //   };
        // }

        // 添加银行账户信息（过滤掉不完整的记录）
        const validBankAccounts = localBankAccounts.filter(account => 
          account.account_number && account.bank_name
        );
        if (validBankAccounts.length > 0) {
          createData.bank_accounts = validBankAccounts.map(account => ({
            account_holder_name: account.account_holder_name || formData.employee_name,
            account_number: account.account_number,
            bank_name: account.bank_name,
            branch_name: account.branch_name || '',
            is_primary: account.is_primary || false,
            effective_start_date: new Date().toISOString().split('T')[0],
          }));
        }

        // 添加教育背景信息（只要求degree字段必填）
        const validEducation = localEducation.filter(edu => 
          edu.degree && edu.degree.trim() !== ''
        );
        if (validEducation.length > 0) {
          createData.education = validEducation.map(edu => ({
            institution_name: edu.institution_name || '',
            degree: edu.degree,
            field_of_study: edu.field_of_study || '',
            graduation_date: edu.graduation_date || null,
            notes: edu.notes || '',
          }));
        }

        // 使用createFull方法创建完整的员工信息
        await employeeList.actions.createFull(createData);
        addToast({ message: '员工创建成功', type: 'success' });
        onSuccess?.();
        onClose();
      } else if (mode === 'edit' && employeeId) {
        console.log('Entering edit mode save');
        console.log('employeeDetail:', employeeDetail);
        console.log('employeeDetail.actions:', employeeDetail?.actions);
        console.log('updateBasicInfo function:', employeeDetail?.actions?.updateBasicInfo);
        
        if (!employeeDetail?.actions?.updateBasicInfo) {
          console.error('updateBasicInfo is not available!');
          addToast({ message: '更新功能不可用', type: 'error' });
          return;
        }
        
        // 使用新的多表更新方法
        console.log('Calling updateBasicInfo with data:', {
          employee_name: formData.employee_name,
          id_number: formData.id_number,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          employment_status: formData.employment_status,
          mobile_phone: formData.mobile_phone,
          work_email: formData.work_email,
          personal_email: formData.personal_email,
        });
        
        const updateResult = await employeeDetail.actions.updateBasicInfo({
          // employees 表字段
          employee_name: formData.employee_name,
          id_number: formData.id_number,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          employment_status: formData.employment_status,
          
          // employee_contacts 表字段
          mobile_phone: formData.mobile_phone,
          work_email: formData.work_email,
          personal_email: formData.personal_email,
        });
        
        console.log('Update completed, result:', updateResult);
        addToast({ message: '员工信息更新成功', type: 'success' });
        
        console.log('Calling onSuccess callback');
        onSuccess?.();
        
        console.log('Calling onClose to close modal');
        onClose();
        
        console.log('All post-update actions completed');
      }
    } catch (error) {
      console.error('保存失败 - Error details:', error);
      console.error('Error stack:', (error as any)?.stack);
      addToast({ 
        message: mode === 'create' ? '员工创建失败' : `员工更新失败: ${(error as any)?.message || '未知错误'}`, 
        type: 'error'
      });
    } finally {
      console.log('Finally block - setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };


  // 处理银行账户保存
  const handleSaveBankAccounts = async (accounts?: Partial<EmployeeBankAccount>[]) => {
    if (!employeeId) return;
    
    // 如果没有传递参数，使用当前的 localBankAccounts 状态
    const dataToSave = accounts || localBankAccounts;
    
    setIsSubmitting(true);
    try {
      // 这里可以实现批量更新逻辑
      // 暂时使用单个更新的方式
      for (const account of dataToSave) {
        if (account.id) {
          // 更新现有账户
          await employeeDetail.actions.updateBankAccount({
            accountId: account.id,
            updates: account
          });
        } else if (account.bank_name && account.account_number) {
          // 添加新账户
          await employeeDetail.actions.addBankAccount({
            bank_name: account.bank_name!,
            account_number: account.account_number!,
            branch_name: account.branch_name || null,
            is_primary: account.is_primary || false,
            account_holder_name: formData.employee_name,
            effective_start_date: new Date().toISOString().split('T')[0],
            effective_end_date: null
          });
        }
      }
      addToast({ message: '银行账户更新成功', type: 'success' });
    } catch (error) {
      console.error('保存银行账户失败:', error);
      addToast({ message: '保存银行账户失败', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理教育背景保存
  const handleSaveEducation = async (educations?: Partial<EmployeeEducation>[]) => {
    if (!employeeId) return;
    
    // 如果没有传递参数，使用当前的 localEducation 状态
    const dataToSave = educations || localEducation;
    
    setIsSubmitting(true);
    try {
      // 这里可以实现批量更新逻辑
      // 暂时使用单个更新的方式
      for (const education of dataToSave) {
        if (education.id) {
          // 更新现有教育背景
          await employeeDetail.actions.updateEducation({
            educationId: education.id,
            updates: education
          });
        } else if (education.institution_name && education.degree) {
          // 添加新教育背景
          await employeeDetail.actions.addEducation({
            institution_name: education.institution_name!,
            degree: education.degree!,
            field_of_study: education.field_of_study || null,
            graduation_date: education.graduation_date || null,
            notes: null
          });
        }
      }
      addToast({ message: '教育背景更新成功', type: 'success' });
    } catch (error) {
      console.error('保存教育背景失败:', error);
      addToast({ message: '保存教育背景失败', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!employeeId) return;
    
    if (!confirm('确定要删除此员工吗？此操作将删除员工的所有相关数据且无法撤销。')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await employeeList.actions.delete(employeeId);
      addToast({ message: '员工删除成功', type: 'success' });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('员工删除失败:', error);
      addToast({ message: '员工删除失败', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载状态 - 只在模态框打开时显示
  if (open && ((shouldLoadEmployee && isLoadingEmployee) || isLoadingOptions)) {
    return (
      <dialog className={cn("modal", { "modal-open": open })}>
        <div className="modal-box">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <p className="text-base-content/70">
              {isLoadingEmployee ? '正在加载员工信息...' : '正在加载表单选项...'}
            </p>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </dialog>
    );
  }

  // 员工不存在 - 只在确实应该加载员工但没找到时显示
  if (open && shouldLoadEmployee && !employee && !isLoadingEmployee) {
    return (
      <dialog className={cn("modal", { "modal-open": open })}>
        <div className="modal-box">
          <div className="flex items-center mb-4">
            <div className="alert alert-warning">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-bold">员工不存在</h3>
                <div className="text-xs">员工ID: {employeeId}</div>
              </div>
            </div>
          </div>
          <p className="text-base-content/70">未找到该员工信息，可能已被删除或ID不正确。</p>
          <div className="modal-action">
            <button className="btn btn-outline" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </dialog>
    );
  }

  // 不渲染未打开的模态框
  if (!open) {
    return null;
  }

  const emp = employee as EmployeeBasicInfo;

  return (
    <dialog className={cn("modal", { "modal-open": open })}>
      <div className="modal-box max-w-5xl max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {mode === 'create' ? '新增员工' : mode === 'edit' ? '编辑员工' : '员工详情'}
            {emp?.employee_name && ` - ${emp.employee_name}`}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs Container */}
        <div className="flex flex-col flex-1">
          {/* Tabs Navigation */}
          <div className="tabs tabs-lifted tabs-lg">
            <button 
              className={cn("tab", { "tab-active": activeTab === 'basic' })}
              onClick={() => setActiveTab('basic')}
            >
              <span className="mr-2">👤</span>
              基础信息
            </button>
            
            <button 
              className={cn("tab", { "tab-active": activeTab === 'contact' })}
              onClick={() => setActiveTab('contact')}
            >
              <span className="mr-2">📞</span>
              联系方式
            </button>

            {mode !== 'create' && (
              <button 
                className={cn("tab", { "tab-active": activeTab === 'organization' })}
                onClick={() => setActiveTab('organization')}
              >
                <span className="mr-2">🏢</span>
                组织信息
              </button>
            )}

            <button 
              className={cn("tab", { "tab-active": activeTab === 'banking' })}
              onClick={() => setActiveTab('banking')}
            >
              <span className="mr-2">🏦</span>
              银行账户
            </button>

            <button 
              className={cn("tab", { "tab-active": activeTab === 'education' })}
              onClick={() => setActiveTab('education')}
            >
              <span className="mr-2">🎓</span>
              教育背景
            </button>

            {mode !== 'create' && (
              <button 
                className={cn("tab", { "tab-active": activeTab === 'actions' })}
                onClick={() => setActiveTab('actions')}
              >
                <span className="mr-2">⚙️</span>
                操作
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="bg-base-100 border border-base-300 rounded-box rounded-tl-none p-6 min-h-[400px] max-h-[50vh] overflow-y-auto">
          {/* Tab content rendering debug: activeTab = {activeTab} */}
          
          {/* 基础信息 Tab */}
          {activeTab === 'basic' && (
            <BasicInfoTab 
              formData={formData}
              setFormData={setFormData}
              mode={mode}
              isSubmitting={isSubmitting}
              onSave={handleBasicInfoSave}
            />
          )}

          {/* 联系方式 Tab */}
          {activeTab === 'contact' && (
            <ContactInfoTab 
              formData={formData}
              setFormData={setFormData}
              mode={mode}
              isSubmitting={isSubmitting}
              onSave={handleBasicInfoSave}
            />
          )}

          {/* 组织信息 Tab */}
          {activeTab === 'organization' && mode !== 'create' && (
            <OrganizationInfoTab employee={emp} />
          )}

          {/* 银行账户 Tab */}
          {activeTab === 'banking' && (
            <BankingTab 
              bankAccounts={mode === 'create' ? localBankAccounts as EmployeeBankAccount[] : bankAccounts as EmployeeBankAccount[]}
              mode={mode === 'create' ? 'edit' : mode}
              isLoading={mode === 'create' ? false : employeeDetail?.loading?.isLoadingBankAccounts}
              onDataChange={setLocalBankAccounts}
              isSubmitting={isSubmitting}
            />
          )}

          {/* 教育背景 Tab */}
          {activeTab === 'education' && (
            <>
              {console.log('[EducationTab] Rendering with:', {
                education: mode === 'create' ? localEducation : education,
                educationLength: mode === 'create' ? localEducation?.length : education?.length,
                isLoading: mode === 'create' ? false : employeeDetail?.loading?.isLoadingEducation,
                mode: mode === 'create' ? 'edit' : mode,
                employeeId
              })}
              <EducationTab 
                education={mode === 'create' ? localEducation as EmployeeEducation[] : education as EmployeeEducation[]}
                mode={mode === 'create' ? 'edit' : mode}
                isLoading={mode === 'create' ? false : employeeDetail?.loading?.isLoadingEducation}
                onSave={handleSaveEducation}
                onDataChange={setLocalEducation}
                isSubmitting={isSubmitting}
              />
            </>
          )}

          {/* 操作 Tab */}
          {activeTab === 'actions' && mode !== 'create' && (
            <ActionsTab 
              mode={mode}
              onDelete={handleDelete}
              isSubmitting={isSubmitting}
              employeeList={employeeList}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-action mt-6">
          {/* 编辑和创建模式下显示保存按钮（在左边） */}
          {(mode === 'edit' || mode === 'create') && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSubmitting}
              title={mode === 'create' ? '保存所有标签页的信息并创建员工' : '保存当前标签页的更改'}
            >
              {isSubmitting && <span className="loading loading-spinner loading-xs mr-2"></span>}
              {mode === 'create' ? '创建员工' : '保存更改'}
            </button>
          )}

          {/* 关闭按钮始终在右边 */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            关闭
          </button>
        </div>
        </div>
      </div>
      
      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>关闭</button>
      </form>
    </dialog>
  );
}

// ============ Tab Components ============

// 基础信息Tab
interface BasicInfoTabProps {
  formData: EmployeeFormData;
  setFormData: (data: EmployeeFormData) => void;
  mode: EmployeeModalMode;
  isSubmitting: boolean;
  onSave: () => void;
}

function BasicInfoTab({ formData, setFormData, mode, isSubmitting, onSave }: BasicInfoTabProps) {
  console.log('BasicInfoTab rendered with formData:', formData);
  
  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">员工姓名 *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={formData.employee_name || ''}
            onChange={(e) => handleInputChange('employee_name', e.target.value)}
            disabled={mode === 'view'}
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">身份证号</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={formData.id_number || ''}
            onChange={(e) => handleInputChange('id_number', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">性别</span>
          </label>
          <select
            className="select select-bordered"
            value={formData.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            disabled={mode === 'view'}
          >
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">出生日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={formData.date_of_birth || ''}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">入职日期 *</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={formData.hire_date || ''}
            onChange={(e) => handleInputChange('hire_date', e.target.value)}
            disabled={mode === 'view'}
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">在职状态</span>
          </label>
          <select
            className="select select-bordered"
            value={formData.employment_status || 'active'}
            onChange={(e) => handleInputChange('employment_status', e.target.value)}
            disabled={mode === 'view'}
          >
            <option value="active">在职</option>
            <option value="inactive">离职</option>
            <option value="terminated">解聘</option>
          </select>
        </div>
      </div>

    </div>
  );
}

// 联系方式Tab
interface ContactInfoTabProps {
  formData: EmployeeFormData;
  setFormData: (data: EmployeeFormData) => void;
  mode: EmployeeModalMode;
  isSubmitting: boolean;
  onSave: () => void;
}

function ContactInfoTab({ formData, setFormData, mode, isSubmitting, onSave }: ContactInfoTabProps) {
  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">手机号</span>
          </label>
          <input
            type="tel"
            className="input input-bordered"
            value={formData.mobile_phone || ''}
            onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">邮箱</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">工作邮箱</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            value={formData.work_email || ''}
            onChange={(e) => handleInputChange('work_email', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">个人邮箱</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            value={formData.personal_email || ''}
            onChange={(e) => handleInputChange('personal_email', e.target.value)}
            disabled={mode === 'view'}
          />
        </div>
      </div>

    </div>
  );
}

// 组织信息Tab
interface OrganizationInfoTabProps {
  employee: EmployeeBasicInfo;
}


function OrganizationInfoTab({ employee }: OrganizationInfoTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">部门</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={employee?.department_name || ''}
            disabled
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">职位</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={employee?.position_name || ''}
            disabled
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">职级</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={employee?.rank_name || ''}
            disabled
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">人员类别</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={employee?.category_name || ''}
            disabled
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">职位开始日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={employee?.job_start_date || ''}
            disabled
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">类别开始日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={employee?.category_start_date || ''}
            disabled
          />
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">组织信息说明</h3>
          <div className="text-xs">组织信息通过员工分配表单独管理，此处仅显示当前有效的组织分配信息。</div>
        </div>
      </div>
    </div>
  );
}

// 银行账户Tab - 使用常规编辑模式
interface BankingTabProps {
  bankAccounts: EmployeeBankAccount[];
  mode: EmployeeModalMode;
  isLoading?: boolean;
  onSave?: (accounts: Partial<EmployeeBankAccount>[]) => void;
  onDataChange?: (accounts: Partial<EmployeeBankAccount>[]) => void;
  isSubmitting?: boolean;
}

function BankingTab({ 
  bankAccounts, 
  mode, 
  isLoading = false,
  onSave,
  onDataChange,
  isSubmitting = false
}: BankingTabProps) {
  const [localAccounts, setLocalAccounts] = React.useState<Partial<EmployeeBankAccount>[]>([]);
  
  // 初始化本地状态
  React.useEffect(() => {
    if (bankAccounts.length > 0) {
      setLocalAccounts(bankAccounts);
      onDataChange?.(bankAccounts);
    } else {
      // 如果没有账户，添加一个空的主账户
      const emptyAccount = [{
        bank_name: '',
        account_number: '',
        branch_name: '',
        is_primary: true
      }];
      setLocalAccounts(emptyAccount);
      onDataChange?.(emptyAccount);
    }
  }, [bankAccounts]);

  const handleInputChange = (index: number, field: keyof EmployeeBankAccount, value: string | boolean) => {
    const updated = [...localAccounts];
    updated[index] = { ...updated[index], [field]: value };
    
    // 如果设置为主账户，取消其他账户的主账户状态
    if (field === 'is_primary' && value === true) {
      updated.forEach((acc, i) => {
        if (i !== index) {
          acc.is_primary = false;
        }
      });
    }
    
    setLocalAccounts(updated);
    onDataChange?.(updated);
  };

  const handleAddAccount = () => {
    setLocalAccounts([...localAccounts, {
      bank_name: '',
      account_number: '',
      branch_name: '',
      is_primary: localAccounts.length === 0
    }]);
  };

  const handleRemoveAccount = (index: number) => {
    const updated = localAccounts.filter((_, i) => i !== index);
    // 如果删除的是主账户且还有其他账户，将第一个设为主账户
    if (localAccounts[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    setLocalAccounts(updated);
  };

  const handleSave = () => {
    // 过滤掉空账户
    const validAccounts = localAccounts.filter(acc => 
      acc.bank_name && acc.account_number
    );
    onSave?.(validAccounts);
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">银行账户信息</h4>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-md mr-2"></div>
          <span className="text-base-content/70">加载银行账户信息...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {localAccounts.map((account, index) => (
            <div key={index} className="card bg-base-200 shadow-sm">
              <div className="card-body p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">银行名称 *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={account.bank_name || ''}
                      onChange={(e) => handleInputChange(index, 'bank_name', e.target.value)}
                      disabled={mode === 'view'}
                      placeholder="请输入银行名称"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">账号 *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={account.account_number || ''}
                      onChange={(e) => handleInputChange(index, 'account_number', e.target.value)}
                      disabled={mode === 'view'}
                      placeholder="请输入银行账号"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">支行名称</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={account.branch_name || ''}
                      onChange={(e) => handleInputChange(index, 'branch_name', e.target.value)}
                      disabled={mode === 'view'}
                      placeholder="请输入支行名称"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">设为主账户</span>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={account.is_primary || false}
                        onChange={(e) => handleInputChange(index, 'is_primary', e.target.checked)}
                        disabled={mode === 'view'}
                      />
                    </label>
                    {mode !== 'view' && localAccounts.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-error mt-2"
                        onClick={() => handleRemoveAccount(index)}
                      >
                        删除此账户
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {mode !== 'view' && (
            <div className="flex justify-start">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleAddAccount}
              >
                添加银行账户
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 教育背景Tab - 使用常规编辑模式
interface EducationTabProps {
  education: EmployeeEducation[];
  mode: EmployeeModalMode;
  isLoading?: boolean;
  onSave?: (educations: Partial<EmployeeEducation>[]) => void;
  onDataChange?: (educations: Partial<EmployeeEducation>[]) => void;
  isSubmitting?: boolean;
}

function EducationTab({ 
  education, 
  mode, 
  isLoading = false,
  onSave,
  onDataChange,
  isSubmitting = false
}: EducationTabProps) {
  const [localEducation, setLocalEducation] = React.useState<Partial<EmployeeEducation>[]>([]);
  
  // 初始化本地状态
  React.useEffect(() => {
    if (education.length > 0) {
      setLocalEducation(education);
      onDataChange?.(education);
    } else {
      // 如果没有教育背景，添加一个空的记录
      const emptyEducation = [{
        institution_name: '',
        degree: '',
        field_of_study: '',
        graduation_date: ''
      }];
      setLocalEducation(emptyEducation);
      onDataChange?.(emptyEducation);
    }
  }, [education]);

  const handleInputChange = (index: number, field: keyof EmployeeEducation, value: string) => {
    const updated = [...localEducation];
    updated[index] = { ...updated[index], [field]: value };
    setLocalEducation(updated);
    onDataChange?.(updated);
  };

  const handleAddEducation = () => {
    setLocalEducation([...localEducation, {
      institution_name: '',
      degree: '',
      field_of_study: '',
      graduation_date: ''
    }]);
  };

  const handleRemoveEducation = (index: number) => {
    const updated = localEducation.filter((_, i) => i !== index);
    // 如果删除后没有记录，添加一个空记录
    if (updated.length === 0) {
      updated.push({
        institution_name: '',
        degree: '',
        field_of_study: '',
        graduation_date: ''
      });
    }
    setLocalEducation(updated);
  };

  const handleSave = () => {
    // 过滤掉空记录
    const validEducation = localEducation.filter(edu => 
      edu.institution_name && edu.degree
    );
    onSave?.(validEducation);
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">教育背景信息</h4>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-md mr-2"></div>
          <span className="text-base-content/70">加载教育背景信息...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {localEducation.length === 0 ? (
            <div className="alert alert-info">
              <span>暂无教育背景信息</span>
            </div>
          ) : (
            localEducation.map((edu, index) => (
              <div key={index} className="card bg-base-200 shadow-sm">
              <div className="card-body p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">学校名称 *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={edu.institution_name || ''}
                      onChange={(e) => handleInputChange(index, 'institution_name', e.target.value)}
                      disabled={mode === 'view'}
                      placeholder="请输入学校名称"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">学位 *</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={edu.degree || ''}
                      onChange={(e) => handleInputChange(index, 'degree', e.target.value)}
                      disabled={mode === 'view'}
                    >
                      <option value="">请选择学位</option>
                      <option value="博士学位">博士学位</option>
                      <option value="硕士学位">硕士学位</option>
                      <option value="学士学位">学士学位</option>
                      <option value="大专">大专</option>
                      <option value="高中">高中</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">专业</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={edu.field_of_study || ''}
                      onChange={(e) => handleInputChange(index, 'field_of_study', e.target.value)}
                      disabled={mode === 'view'}
                      placeholder="请输入专业"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">毕业日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={edu.graduation_date || ''}
                      onChange={(e) => handleInputChange(index, 'graduation_date', e.target.value)}
                      disabled={mode === 'view'}
                    />
                    {mode !== 'view' && localEducation.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-error mt-2"
                        onClick={() => handleRemoveEducation(index)}
                      >
                        删除此记录
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}

          {mode !== 'view' && (
            <div className="flex justify-start">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleAddEducation}
              >
                添加教育背景
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 操作Tab
interface ActionsTabProps {
  mode: EmployeeModalMode;
  onDelete: () => void;
  isSubmitting: boolean;
  employeeList: any;
}

function ActionsTab({ mode, onDelete, isSubmitting, employeeList }: ActionsTabProps) {
  return (
    <div className="space-y-6">
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-bold">危险操作</h3>
          <div className="text-xs">以下操作将会永久删除员工数据，且无法撤销，请谨慎操作。</div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title text-error">删除员工</h4>
          <p className="text-sm text-gray-600 mb-4">
            删除员工将会：
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-6">
            <li>永久删除员工基础信息</li>
            <li>删除所有银行账户信息</li>
            <li>删除所有教育背景信息</li>
            <li>删除所有组织分配记录</li>
            <li>删除所有薪资记录（如果配置了CASCADE删除）</li>
          </ul>
          
          <div className="card-actions justify-end">
            <button
              className="btn btn-error"
              onClick={onDelete}
              disabled={isSubmitting || employeeList.loading?.isDeleting}
            >
              {(isSubmitting || employeeList.loading?.isDeleting) && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              确认删除员工
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 保持原有的导出名称兼容性
export { EmployeeModal as EmployeeDetailModal };
export default EmployeeModal;