import { useState, useEffect, useCallback } from 'react';
import { useEmployee, useDepartments, usePositions, usePersonnelCategories, useUpdateEmployee, useCreateEmployee, useDeleteEmployee } from '@/hooks/useEmployees';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent, AccordionFormGroup } from '@/components/common/AccordionSection';
import { NativeTreeSelect } from '@/components/common/NativeTreeSelect';
import { DetailField, FieldGroup } from '@/components/common/DetailField';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { employeeService } from '@/services/employee.service';
import { cn } from '@/lib/utils';
import type { EmployeeEducation } from '@/types/employee';

// 员工数据类型 (支持新增和编辑)
interface EmployeeData {
  employee_id?: string; // 新增时为空
  full_name?: string;
  gender?: string;
  date_of_birth?: string;
  id_number?: string;
  hire_date?: string;
  department_name?: string;
  position_name?: string;
  category_name?: string;
  employment_status?: string;
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
  primary_bank_account?: string;
  bank_name?: string;
  branch_name?: string;
  // 工作信息变更生效日期
  job_change_effective_date?: string;
}

// 模态框模式类型
type EmployeeModalMode = 'view' | 'edit' | 'create';

interface EmployeeModalProps {
  mode: EmployeeModalMode;
  employeeId?: string | null; // 仅在view/edit模式需要
  open: boolean;
  onClose: () => void;
  onSuccess?: (employee?: any) => void; // 创建/更新成功回调
}

// 默认员工数据模板
const INITIAL_EMPLOYEE_DATA: EmployeeData = {
  full_name: '',
  gender: '',
  date_of_birth: '',
  id_number: '',
  hire_date: new Date().toISOString().split('T')[0], // 默认今天
  department_name: '',
  position_name: '',
  category_name: '',
  employment_status: 'active',
  mobile_phone: '',
  work_email: '',
  personal_email: '',
  primary_bank_account: '',
  bank_name: '',
  branch_name: ''
};

export function EmployeeModal({ 
  mode,
  employeeId, 
  open, 
  onClose,
  onSuccess
}: EmployeeModalProps) {
  const { t } = useTranslation(['employee', 'common']);
  const [isEditing, setIsEditing] = useState(mode === 'create' || mode === 'edit');
  const [editDataRef, setEditDataRef] = useState<EmployeeData | null>(null);
  const updateEmployeeMutation = useUpdateEmployee();
  const createEmployeeMutation = useCreateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  // 移除自定义样式系统，使用标准DaisyUI

  // 获取员工数据 (仅在view/edit模式且有employeeId时)
  const { 
    data: employee, 
    isLoading, 
    isError, 
    error 
  } = useEmployee(employeeId || '');

  // 当进入编辑模式时，初始化编辑数据；退出编辑模式时清理数据
  useEffect(() => {
    if (isEditing && employee && !editDataRef) {
      setEditDataRef(employee);
    } else if (!isEditing && editDataRef) {
      setEditDataRef(null);
    }
  }, [isEditing, employee, editDataRef]);

  // 根据模式确定要显示的数据
  const displayData = mode === 'create' ? INITIAL_EMPLOYEE_DATA : employee;

  // 处理关闭动画
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 同步 isEditing 状态到模式变化
  useEffect(() => {
    setIsEditing(mode === 'create' || mode === 'edit');
  }, [mode]);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, handleClose]);

  // 数据验证函数
  const validateData = useCallback((data: EmployeeData): boolean => {
    if (mode === 'create') {
      // 创建模式的必填字段验证
      const requiredFields = [
        { field: 'full_name', label: '姓名' },
        { field: 'gender', label: '性别' },
        { field: 'date_of_birth', label: '出生日期' },
        { field: 'hire_date', label: '入职日期' },
        { field: 'department_name', label: '部门' },
        { field: 'position_name', label: '职位' }
      ];

      for (const { field, label } of requiredFields) {
        if (!data[field as keyof EmployeeData]?.toString().trim()) {
          showError(`${label}为必填项`);
          return false;
        }
      }

      // 身份证号码格式验证
      if (data.id_number && !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(data.id_number)) {
        showError('身份证号码格式不正确');
        return false;
      }

      // 手机号码格式验证
      if (data.mobile_phone && !/^1[3-9]\d{9}$/.test(data.mobile_phone)) {
        showError('手机号码格式不正确');
        return false;
      }

      // 邮箱格式验证
      if (data.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.work_email)) {
        showError('邮箱格式不正确');
        return false;
      }
    }
    return true;
  }, [mode, showError]);

  // 统一的保存逻辑
  const handleSave = useCallback(async () => {
    console.log('handleSave called', { mode, isEditing, editDataRef, employee });
    
    if (!editDataRef) {
      console.error('No edit data available');
      return;
    }

    // 数据验证
    if (!validateData(editDataRef)) {
      return;
    }

    try {
      if (mode === 'create') {
        // 创建新员工
        const newEmployee = await createEmployeeMutation.mutateAsync(editDataRef);
        showSuccess('员工创建成功');
        onSuccess?.(newEmployee);
        handleClose();
      } else if ((mode === 'edit' || (mode === 'view' && isEditing)) && employee?.employee_id) {
        // 更新现有员工 - 计算变更字段
        const updates: any = {};
        
        // 基本信息
        if (editDataRef.full_name !== employee.full_name) updates.full_name = editDataRef.full_name;
        if (editDataRef.gender !== employee.gender) updates.gender = editDataRef.gender;
        if (editDataRef.date_of_birth !== employee.date_of_birth) updates.date_of_birth = editDataRef.date_of_birth;
        if (editDataRef.id_number !== employee.id_number) updates.id_number = editDataRef.id_number;
        if (editDataRef.hire_date !== employee.hire_date) updates.hire_date = editDataRef.hire_date;
        
        // 联系信息
        if (editDataRef.mobile_phone !== employee.mobile_phone) updates.mobile_phone = editDataRef.mobile_phone;
        if (editDataRef.work_email !== employee.work_email) updates.work_email = editDataRef.work_email;
        if (editDataRef.personal_email !== employee.personal_email) updates.personal_email = editDataRef.personal_email;
        
        // 银行信息
        if (editDataRef.primary_bank_account !== employee.primary_bank_account) updates.primary_bank_account = editDataRef.primary_bank_account;
        if (editDataRef.bank_name !== employee.bank_name) updates.bank_name = editDataRef.bank_name;
        if (editDataRef.branch_name !== employee.branch_name) updates.branch_name = editDataRef.branch_name;
        
        // 工作信息
        if (editDataRef.department_name !== employee.department_name) updates.department_name = editDataRef.department_name;
        if (editDataRef.position_name !== employee.position_name) updates.position_name = editDataRef.position_name;
        if (editDataRef.category_name !== employee.category_name) updates.category_name = editDataRef.category_name;
        if (editDataRef.employment_status !== employee.employment_status) updates.employment_status = editDataRef.employment_status;
        
        // 如果有工作信息更新，添加生效日期
        if (updates.department_name || updates.position_name || updates.category_name) {
          updates.job_change_effective_date = editDataRef.job_change_effective_date || new Date().toISOString().split('T')[0];
        }

        // 如果有更新，执行保存
        if (Object.keys(updates).length > 0) {
          await updateEmployeeMutation.mutateAsync({
            employeeId: employee.employee_id,
            updates
          });
          showSuccess(String(t('employee:message.updateSuccess')));
          onSuccess?.();
        } else {
          showInfo(String(t('employee:message.noChangesDetected')));
        }
        
        // 退出编辑模式
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save employee data:', error);
      const errorMessage = error instanceof Error ? error.message : String(t('common:message.operationFailed'));
      if (mode === 'create') {
        showError(`员工创建失败: ${errorMessage}`);
      } else {
        showError(`${String(t('employee:message.saveFailed'))}: ${errorMessage}`);
      }
    }
  }, [mode, editDataRef, employee, validateData, createEmployeeMutation, updateEmployeeMutation, showSuccess, showError, showInfo, onSuccess, handleClose, t]);

  // 处理删除员工
  const handleDelete = useCallback(async () => {
    if (!employee?.employee_id) return;
    
    try {
      await deleteEmployeeMutation.mutateAsync(employee.employee_id);
      showSuccess('员工删除成功');
      setShowDeleteConfirm(false);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      showError(`员工删除失败: ${errorMessage}`);
    }
  }, [employee?.employee_id, deleteEmployeeMutation, showSuccess, showError, onSuccess, handleClose]);

  // 获取模态框配置
  const getModalConfig = () => {
    switch (mode) {
      case 'create':
        return {
          title: '新增员工',
          subtitle: '填写员工基本信息',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          ),
          primaryButton: '创建员工',
          secondaryButton: '取消'
        };
      case 'edit':
        return {
          title: `编辑 ${displayData?.full_name || '员工'}`,
          subtitle: displayData?.employee_id ? `员工编号: ${displayData.employee_id}` : '',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          ),
          primaryButton: '保存更改',
          secondaryButton: '取消'
        };
      case 'view':
      default:
        return {
          title: displayData?.full_name || '员工详情',
          subtitle: [
            displayData?.employee_id && `员工编号: ${displayData.employee_id}`,
            displayData?.department_name,
            displayData?.position_name
          ].filter(Boolean).join(' • '),
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          primaryButton: '编辑',
          secondaryButton: '关闭'
        };
    }
  };

  const modalConfig = getModalConfig();

  // 如果模态框未打开，不渲染
  if (!open) return null;

  return (
    <dialog className={cn("modal", open && "modal-open")}>
      <div className="modal-box w-11/12 max-w-4xl max-h-[95vh] p-0 modal-compact">
        {/* 优化的紧凑头部设计 */}
        <div className="sticky top-0 z-10 bg-base-100/95 backdrop-blur-md border-b border-base-200/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* 紧凑头像/图标容器 */}
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/12 to-primary/6 text-primary flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-primary/10">
                  {modalConfig.icon}
                </div>
                {/* 模式指示器 */}
                {mode !== 'view' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary ring-2 ring-base-100"></div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-base-content truncate">
                  {modalConfig.title}
                </h2>
                {modalConfig.subtitle && (
                  <p className="text-xs text-base-content/60 truncate mt-0.5">
                    {modalConfig.subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {/* 编辑状态指示器和操作 */}
            <div className="flex items-center gap-2 ml-3">
              {isEditing && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/20">
                  <div className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">编辑中</span>
                </div>
              )}
              
              {/* 紧凑关闭按钮 */}
              <button 
                className="btn btn-xs btn-circle btn-ghost hover:bg-base-200" 
                onClick={handleClose}
                aria-label={String(t('common:close'))}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* 优化的紧凑内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading && <LoadingScreen />}
          
          {isError && (
            <div className="alert alert-error alert-sm my-3">
              <svg className="w-5 h-5 stroke-current shrink-0" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {String(t('common:error.loadFailed'))}: {(error as Error)?.message}
              </span>
            </div>
          )}

          {(employee || mode === 'create') && (
            <EmployeeDetailContent 
              employee={(employee || displayData) as EmployeeData} 
              isEditing={isEditing || mode === 'create'}
              onEditDataChange={setEditDataRef}
            />
          )}
        </div>

        {/* 优化的粘性底部操作栏 */}
        <div className="sticky bottom-0 z-10 bg-base-100/95 backdrop-blur-md border-t border-base-200/60">
          <div className="flex items-center justify-between px-4 py-3">
            {/* 左侧危险操作 - 紧凑布局 */}
            <div>
              {isEditing && mode !== 'create' && employee?.employee_id && (
                <button
                  className="btn btn-sm btn-error btn-outline hover:btn-error"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteEmployeeMutation.isPending}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                  <span className="hidden sm:inline">删除</span>
                </button>
              )}
            </div>

            {/* 右侧主要操作 - 紧凑按钮组 */}
            <div className="flex items-center gap-2">
              {/* 根据状态显示不同的按钮组合 */}
              {mode === 'view' && !isEditing && (
                <>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleClose}
                  >
                    关闭
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsEditing(true)}
                    disabled={!employee}
                  >
                    <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                      />
                    </svg>
                    <span className="hidden sm:inline">编辑</span>
                  </button>
                </>
              )}

              {(mode === 'view' && isEditing) && (
                <>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                    <span className="hidden sm:inline">取消</span>
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                    disabled={!employee || updateEmployeeMutation.isPending}
                  >
                    {updateEmployeeMutation.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="hidden sm:inline ml-1">保存中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={1.5} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                        <span className="hidden sm:inline">保存</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {mode === 'create' && (
                <>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleClose}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                    disabled={createEmployeeMutation.isPending}
                  >
                    {createEmployeeMutation.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="hidden sm:inline ml-1">创建中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={1.5} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                        <span className="hidden sm:inline">创建</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* DaisyUI 模态框背景 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>

      {/* 紧凑删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm p-0">
            {/* 紧凑头部 */}
            <div className="p-4 border-b border-base-200/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-base text-error">确认删除员工</h3>
              </div>
            </div>
            
            {/* 紧凑内容 */}
            <div className="p-4">
              <p className="text-sm text-base-content/80">
                确定要删除员工 <span className="font-medium text-base-content">{employee?.full_name}</span> 吗？
              </p>
              <div className="alert alert-warning mt-3 p-3">
                <svg className="w-4 h-4 stroke-current shrink-0" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-xs">此操作将删除所有相关数据，且无法恢复</span>
              </div>
            </div>
            
            {/* 紧凑操作按钮 */}
            <div className="flex justify-end gap-2 p-4 pt-0">
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteEmployeeMutation.isPending}
              >
                取消
              </button>
              <button 
                className="btn btn-sm btn-error" 
                onClick={handleDelete}
                disabled={deleteEmployeeMutation.isPending}
              >
                {deleteEmployeeMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

// Also export as EmployeeDetailModal for proper naming
export { EmployeeModal as EmployeeDetailModal };

// 员工详情内容组件接口
interface EmployeeDetailContentProps {
  employee: EmployeeData;
  isEditing: boolean;
  onEditDataChange?: (editData: EmployeeData) => void;
}

function EmployeeDetailContent({ employee, isEditing, onEditDataChange }: EmployeeDetailContentProps) {
  const { t } = useTranslation(['employee']);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic']));
  const [editData, setEditData] = useState<EmployeeData>(employee);
  const [educationRecords, setEducationRecords] = useState<EmployeeEducation[]>([]);
  const [isLoadingEducation, setIsLoadingEducation] = useState(false);
  const { showSuccess, showError } = useToast();
  
  // 从API获取选项数据
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions(); 
  const { data: categoryTree = [], isLoading: categoriesLoading } = usePersonnelCategories();


  // 转换为下拉选项格式
  const departmentOptions = departments.map(name => ({ value: name, label: name }));
  const positionOptions = positions.map(name => ({ value: name, label: name }));

  // 当员工数据更新时，同步编辑数据和加载教育信息
  useEffect(() => {
    setEditData(employee);
    if (employee.employee_id) {
      loadEducationRecords(employee.employee_id);
    }
  }, [employee]);

  // 加载教育信息
  const loadEducationRecords = async (employeeId: string) => {
    setIsLoadingEducation(true);
    try {
      const records = await employeeService.getEmployeeEducation(employeeId);
      setEducationRecords(records);
    } catch (error) {
      console.error('Failed to load education records:', error);
      showError(String(t('employee:education.loadFailed')));
    } finally {
      setIsLoadingEducation(false);
    }
  };

  // 创建教育记录
  const handleCreateEducation = async (education: Omit<EmployeeEducation, 'id' | 'created_at' | 'employee_id'>) => {
    if (!employee.employee_id) return;
    
    try {
      const newRecord = await employeeService.createEmployeeEducation({
        ...education,
        employee_id: employee.employee_id
      });
      setEducationRecords(prev => [...prev, newRecord]);
      showSuccess(String(t('employee:education.createSuccess')));
    } catch (error) {
      console.error('Failed to create education record:', error);
      showError(String(t('employee:education.createFailed')));
    }
  };

  // 更新教育记录
  const handleUpdateEducation = async (id: string, updates: Partial<EmployeeEducation>) => {
    try {
      const updatedRecord = await employeeService.updateEmployeeEducation(id, updates);
      setEducationRecords(prev => prev.map(record => 
        record.id === id ? updatedRecord : record
      ));
      showSuccess(String(t('employee:education.updateSuccess')));
    } catch (error) {
      console.error('Failed to update education record:', error);
      showError(String(t('employee:education.updateFailed')));
    }
  };

  // 删除教育记录
  const handleDeleteEducation = async (id: string) => {
    try {
      await employeeService.deleteEmployeeEducation(id);
      setEducationRecords(prev => prev.filter(record => record.id !== id));
      showSuccess(String(t('employee:education.deleteSuccess')));
    } catch (error) {
      console.error('Failed to delete education record:', error);
      showError(String(t('employee:education.deleteFailed')));
    }
  };

  // 将编辑数据同步到父组件
  useEffect(() => {
    onEditDataChange?.(editData);
  }, [editData, onEditDataChange]);

  // 更新编辑数据
  const updateEditData = (field: keyof EmployeeData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };


  return (
    <div className="space-y-3">
      {/* 基本信息手风琴 - 紧凑样式 */}
      <AccordionSection
        id="basic"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
        title={String(t('employee:sections.basicInfo'))}
        isOpen={openSections.has('basic')}
        onToggle={toggleSection}
        isEditing={isEditing}
        className="compact-accordion"
      >
        <AccordionContent>
          <DetailField 
            label={String(t('employee:fields.fullName'))} 
            value={isEditing ? editData.full_name : employee.full_name}
            isEditing={isEditing}
            onChange={(value) => updateEditData('full_name', value)}
          />
          <DetailField 
            label={String(t('employee:fields.gender'))} 
            value={isEditing ? editData.gender : employee.gender}
            isEditing={isEditing}
            onChange={(value) => updateEditData('gender', value)}
            type="select"
            options={[
              { value: '男', label: '男' },
              { value: '女', label: '女' }
            ]}
          />
          <DetailField 
            label={String(t('employee:fields.birthDate'))} 
            value={isEditing ? editData.date_of_birth : employee.date_of_birth}
            type="date"
            isEditing={isEditing}
            onChange={(value) => updateEditData('date_of_birth', value)}
          />
          <DetailField 
            label={String(t('employee:fields.idNumber'))} 
            value={isEditing ? editData.id_number : employee.id_number}
            sensitive
            isEditing={isEditing}
            onChange={(value) => updateEditData('id_number', value)}
          />
          <DetailField 
            label={String(t('employee:fields.employeeId'))} 
            value={isEditing ? editData.employee_id : employee.employee_id}
            isEditing={false} // 员工编号不允许编辑
          />
          <DetailField 
            label={String(t('employee:fields.hireDate'))} 
            value={isEditing ? editData.hire_date : employee.hire_date}
            type="date"
            isEditing={isEditing}
            onChange={(value) => updateEditData('hire_date', value)}
          />
        </AccordionContent>
      </AccordionSection>

      {/* 工作信息手风琴 - 紧凑样式 */}
      <AccordionSection
        id="job"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        title={String(t('employee:sections.jobInfo'))}
        isOpen={openSections.has('job')}
        onToggle={toggleSection}
        isEditing={isEditing}
        className="compact-accordion"
      >
        <AccordionContent>
          <DetailField 
            label={String(t('employee:fields.department'))} 
            value={isEditing ? editData.department_name : employee.department_name}
            type={isEditing ? 'select' : 'text'}
            isEditing={isEditing}
            onChange={(value) => updateEditData('department_name', value)}
            options={departmentOptions}
          />
          <DetailField 
            label={String(t('employee:fields.position'))} 
            value={isEditing ? editData.position_name : employee.position_name}
            type={isEditing ? 'select' : 'text'}
            isEditing={isEditing}
            onChange={(value) => updateEditData('position_name', value)}
            options={positionOptions}
          />
          {isEditing ? (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{String(t('employee:fields.category'))}</span>
              </label>
              <NativeTreeSelect
                data={categoryTree}
                value={editData.category_name}
                onChange={(value) => updateEditData('category_name', value)}
                placeholder="请选择人员类别"
                disabled={categoriesLoading}
              />
            </div>
          ) : (
            <DetailField 
              label={String(t('employee:fields.category'))} 
              value={employee.category_name}
              type="text"
              isEditing={false}
            />
          )}
          <DetailField 
            label={String(t('employee:fields.employmentStatus'))} 
            value={isEditing ? editData.employment_status : employee.employment_status}
            type={isEditing ? 'select' : 'status'}
            isEditing={isEditing}
            onChange={(value) => updateEditData('employment_status', value)}
            options={[
              { value: 'active', label: String(t('employee:status.active')) },
              { value: 'inactive', label: String(t('employee:status.inactive')) },
              { value: 'on_leave', label: String(t('employee:status.onLeave')) }
            ]}
          />
          {/* 工作信息变更生效日期 */}
          {isEditing && (
            <DetailField 
              label="变更生效日期" 
              value={editData.job_change_effective_date || new Date().toISOString().split('T')[0]}
              type="date"
              isEditing={isEditing}
              onChange={(value) => updateEditData('job_change_effective_date', value)}
            />
          )}
        </AccordionContent>
      </AccordionSection>

      {/* 联系信息手风琴 - 紧凑样式 */}
      <AccordionSection
        id="contact"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        title={String(t('employee:sections.contactInfo'))}
        isOpen={openSections.has('contact')}
        onToggle={toggleSection}
        isEditing={isEditing}
        className="compact-accordion"
      >
        <AccordionContent>
          <DetailField 
            label={String(t('employee:fields.mobilePhone'))} 
            value={isEditing ? editData.mobile_phone : employee.mobile_phone}
            type="phone"
            isEditing={isEditing}
            onChange={(value) => updateEditData('mobile_phone', value)}
          />
          <DetailField 
            label={String(t('employee:fields.email'))} 
            value={isEditing ? (editData.work_email || editData.personal_email) : (employee.work_email || employee.personal_email || employee.email)}
            type="email"
            isEditing={isEditing}
            onChange={(value) => updateEditData('work_email', value)}
          />
        </AccordionContent>
      </AccordionSection>

      {/* 银行信息手风琴 - 紧凑样式 */}
      {(employee.primary_bank_account || employee.bank_name || isEditing) && (
        <AccordionSection
          id="bank"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          title={String(t('employee:sections.bankInfo'))}
          isOpen={openSections.has('bank')}
          onToggle={toggleSection}
          isEditing={isEditing}
          className="compact-accordion"
        >
          <AccordionContent>
            <DetailField 
              label={String(t('employee:fields.bankAccount'))} 
              value={isEditing ? editData.primary_bank_account : employee.primary_bank_account}
              sensitive
              isEditing={isEditing}
              onChange={(value) => updateEditData('primary_bank_account', value)}
            />
            <DetailField 
              label={String(t('employee:fields.bankName'))} 
              value={isEditing ? editData.bank_name : employee.bank_name}
              isEditing={isEditing}
              onChange={(value) => updateEditData('bank_name', value)}
            />
            {(employee.branch_name || isEditing) && (
              <DetailField 
                label={String(t('employee:fields.branchName'))} 
                value={isEditing ? editData.branch_name : employee.branch_name}
                isEditing={isEditing}
                onChange={(value) => updateEditData('branch_name', value)}
              />
            )}
          </AccordionContent>
        </AccordionSection>
      )}

      {/* 教育信息手风琴 - 紧凑样式 */}
      <AccordionSection
        id="education"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l9-5-9-5-9 5 9 5zm0 0v6.756" />
          </svg>
        }
        title={String(t('employee:sections.educationInfo'))}
        isOpen={openSections.has('education')}
        onToggle={toggleSection}
        isEditing={isEditing}
        variant="form"
        className="compact-accordion"
      >
        <EducationSection
          educationRecords={educationRecords}
          isLoading={isLoadingEducation}
          isEditing={isEditing}
          onCreateEducation={handleCreateEducation}
          onUpdateEducation={handleUpdateEducation}
          onDeleteEducation={handleDeleteEducation}
        />
      </AccordionSection>
    </div>
  );
}


// 教育信息展示组件
interface EducationSectionProps {
  educationRecords: EmployeeEducation[];
  isLoading: boolean;
  isEditing: boolean;
  onCreateEducation: (education: Omit<EmployeeEducation, 'id' | 'created_at' | 'employee_id'>) => Promise<void>;
  onUpdateEducation: (id: string, updates: Partial<EmployeeEducation>) => Promise<void>;
  onDeleteEducation: (id: string) => Promise<void>;
}

function EducationSection({
  educationRecords,
  isLoading,
  isEditing,
  onCreateEducation,
  onUpdateEducation,
  onDeleteEducation
}: EducationSectionProps) {
  const { t } = useTranslation(['employee', 'common']);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEducation, setNewEducation] = useState({
    institution_name: '',
    degree: '',
    field_of_study: '',
    graduation_date: '',
    notes: ''
  });

  const handleAdd = async () => {
    if (!newEducation.institution_name || !newEducation.degree || !newEducation.field_of_study || !newEducation.graduation_date) {
      return;
    }

    await onCreateEducation(newEducation);
    setNewEducation({
      institution_name: '',
      degree: '',
      field_of_study: '',
      graduation_date: '',
      notes: ''
    });
    setIsAddingNew(false);
  };

  const handleCancelAdd = () => {
    setNewEducation({
      institution_name: '',
      degree: '',
      field_of_study: '',
      graduation_date: '',
      notes: ''
    });
    setIsAddingNew(false);
  };

  const degreeOptions = employeeService.getDegreeOptions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 现有教育记录 */}
      {educationRecords.length === 0 && !isAddingNew && !isEditing && (
        <div className="text-base text-center py-8 text-base-content/60">
          {String(t('employee:education.noData'))}
        </div>
      )}

      {educationRecords.map((record) => (
        <EducationCard
          key={record.id}
          record={record}
          isEditing={isEditing}
          onUpdate={onUpdateEducation}
          onDelete={onDeleteEducation}
          degreeOptions={degreeOptions}
        />
      ))}

      {/* 紧凑添加按钮 - 只在编辑模式下显示 */}
      {isEditing && educationRecords.length > 0 && !isAddingNew && (
        <div className="mt-3">
          <button
            className="btn btn-primary btn-xs"
            onClick={() => setIsAddingNew(true)}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            {String(t('employee:education.add'))}
          </button>
        </div>
      )}

      {/* 没有记录时的紧凑添加按钮 */}
      {isEditing && !educationRecords.length && !isAddingNew && (
        <div className="text-center py-6">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsAddingNew(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            {String(t('employee:education.add'))}
          </button>
        </div>
      )}

      {/* 新增教育记录表单 */}
      {isAddingNew && isEditing && (
        <AccordionFormGroup
          title={String(t('employee:education.add'))}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          <FieldGroup>
            <DetailField
              label={String(t('employee:education.institution'))}
              value={newEducation.institution_name}
              isEditing={true}
              onChange={(value) => setNewEducation(prev => ({ ...prev, institution_name: value }))}
              placeholder={String(t('employee:education.unknownInstitution'))}
              required
            />
            <DetailField
              label={String(t('employee:education.degree'))}
              value={newEducation.degree}
              type="select"
              isEditing={true}
              onChange={(value) => setNewEducation(prev => ({ ...prev, degree: value }))}
              options={degreeOptions}
              placeholder={String(t('employee:education.highSchoolOrBelow'))}
              required
            />
            <DetailField
              label={String(t('employee:education.major'))}
              value={newEducation.field_of_study}
              isEditing={true}
              onChange={(value) => setNewEducation(prev => ({ ...prev, field_of_study: value }))}
              placeholder={String(t('employee:education.unspecifiedMajor'))}
              required
            />
            <DetailField
              label={String(t('employee:education.graduationDate'))}
              value={newEducation.graduation_date}
              type="date"
              isEditing={true}
              onChange={(value) => setNewEducation(prev => ({ ...prev, graduation_date: value }))}
              required
            />
          </FieldGroup>
          <FieldGroup columns={1}>
            <DetailField
              label={String(t('employee:education.notes'))}
              value={newEducation.notes}
              type="textarea"
              isEditing={true}
              onChange={(value) => setNewEducation(prev => ({ ...prev, notes: value }))}
              placeholder={String(t('employee:education.notesPlaceholder'))}
              rows={3}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-3 border-t border-base-200/60">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCancelAdd}
            >
              取消
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAdd}
              disabled={!newEducation.institution_name || !newEducation.degree || !newEducation.field_of_study || !newEducation.graduation_date}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              保存
            </button>
          </div>
        </AccordionFormGroup>
      )}

      {/* 紧凑化添加按钮 */}
      {isEditing && !isAddingNew && educationRecords.length === 0 && (
        <button
          className="btn btn-secondary btn-xs w-full"
          onClick={() => setIsAddingNew(true)}
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          添加教育信息
        </button>
      )}
    </div>
  );
}

// 教育记录卡片组件
interface EducationCardProps {
  record: EmployeeEducation;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<EmployeeEducation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  degreeOptions: Array<{ value: string; label: string }>;
}

function EducationCard({
  record,
  isEditing,
  onUpdate,
  onDelete,
  degreeOptions
}: EducationCardProps) {
  const { t } = useTranslation(['employee', 'common']);
  const [editData, setEditData] = useState(record);
  const [isDeleting, setIsDeleting] = useState(false);

  // 当record变化时更新editData
  useEffect(() => {
    setEditData(record);
  }, [record]);

  const handleUpdate = (field: string, value: string) => {
    const updates = { ...editData, [field]: value };
    setEditData(updates);
    // 实时更新到父组件
    onUpdate(record.id, updates);
  };

  const handleDelete = async () => {
    if (confirm(String(t('employee:education.confirmDelete')))) {
      setIsDeleting(true);
      await onDelete(record.id);
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <AccordionFormGroup
        title={String(t('employee:education.edit'))}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
      >
        <FieldGroup>
          <DetailField
            label={String(t('employee:education.institution'))}
            value={editData.institution_name}
            isEditing={true}
            onChange={(value) => handleUpdate('institution_name', value)}
          />
          <DetailField
            label={String(t('employee:education.degree'))}
            value={editData.degree}
            type="select"
            isEditing={true}
            onChange={(value) => handleUpdate('degree', value)}
            options={degreeOptions}
          />
          <DetailField
            label={String(t('employee:education.major'))}
            value={editData.field_of_study}
            isEditing={true}
            onChange={(value) => handleUpdate('field_of_study', value)}
          />
          <DetailField
            label={String(t('employee:education.graduationDate'))}
            value={editData.graduation_date}
            type="date"
            isEditing={true}
            onChange={(value) => handleUpdate('graduation_date', value)}
          />
        </FieldGroup>
        <FieldGroup columns={1}>
          <DetailField
            label={String(t('employee:education.notes'))}
            value={editData.notes || ''}
            type="textarea"
            isEditing={true}
            onChange={(value) => handleUpdate('notes', value)}
            rows={3}
          />
        </FieldGroup>
        <div className="flex justify-end gap-2 pt-3 border-t border-base-200/60">
          <button
            className="btn btn-error btn-xs"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                {String(t('common:deleting'))}
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {String(t('common:delete'))}
              </>
            )}
          </button>
        </div>
      </AccordionFormGroup>
    );
  }

  return (
    <AccordionFormGroup
      title={String(t('employee:education.title'))}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      }
    >
      <FieldGroup>
        <DetailField
          label={String(t('employee:education.institution'))}
          value={record.institution_name}
        />
        <DetailField
          label={String(t('employee:education.degree'))}
          value={record.degree}
        />
        <DetailField
          label={String(t('employee:education.major'))}
          value={record.field_of_study}
        />
        <DetailField
          label={String(t('employee:education.graduationDate'))}
          value={record.graduation_date}
          type="date"
        />
      </FieldGroup>
      {record.notes && (
        <FieldGroup columns={1}>
          <DetailField
            label={String(t('employee:education.notes'))}
            value={record.notes}
            type="textarea"
          />
        </FieldGroup>
      )}
    </AccordionFormGroup>
  );
}