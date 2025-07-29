import { useState, useEffect, useCallback } from 'react';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { 
  useDepartment, 
  useDepartmentTree,
  useDepartmentEmployees,
  useDepartmentPayrollStats,
  useUpdateDepartment,
  useCreateDepartment,
  useDeleteDepartment,
  DEPARTMENT_KEYS
} from '@/hooks/useDepartments';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent, AccordionFormGroup } from '@/components/common/AccordionSection';
import { DetailField, FieldGroup } from '@/components/common/DetailField';
import { ModernButton } from '@/components/common/ModernButton';
import { DepartmentSalaryChart } from './DepartmentSalaryChart';
import { DepartmentEmployeePanel } from './DepartmentEmployeePanel';
import { DepartmentPayrollAnalysis } from './DepartmentPayrollAnalysis';
import { useToast } from '@/contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Department, DepartmentFormData, DepartmentPayrollStatistics, DepartmentEmployee, DepartmentWithDetails } from '@/types/department';

interface DepartmentDetailModalProps {
  departmentId?: string | null;
  open: boolean;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
}

export function DepartmentDetailModal({ 
  departmentId, 
  open, 
  onClose,
  mode: initialMode = 'view' 
}: DepartmentDetailModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [editData, setEditData] = useState<DepartmentFormData>({
    name: '',
    parent_department_id: null
  });
  
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic']));
  const { showSuccess, showError, showInfo } = useToast();
  const queryClient = useQueryClient();

  // DaisyUI classes for styling

  // 获取部门数据
  const { 
    data: department, 
    isLoading, 
    isError, 
    error 
  } = useDepartment(departmentId || '');

  // 获取部门树数据（用于父部门选择）
  const { data: departmentTree = [] } = useDepartmentTree();

  // 获取部门员工列表
  const { 
    data: employees = [],
    isLoading: isLoadingEmployees 
  } = useDepartmentEmployees(departmentId || '');

  // 获取部门薪资统计
  const { 
    data: payrollStats = [],
    isLoading: isLoadingPayroll 
  } = useDepartmentPayrollStats();

  // 更新部门mutation
  const updateDepartmentMutation = useUpdateDepartment();
  const createDepartmentMutation = useCreateDepartment();
  const deleteDepartmentMutation = useDeleteDepartment();

  // 初始化编辑数据
  useEffect(() => {
    if (department && initialMode !== 'create') {
      setEditData({
        name: department.name,
        parent_department_id: department.parent_department_id
      });
    } else if (initialMode === 'create') {
      setEditData({
        name: '',
        parent_department_id: null
      });
      setIsEditing(true);
    }
  }, [department, initialMode]);

  // 处理关闭动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, handleClose]);

  // 处理保存
  const handleSave = useCallback(async () => {
    try {
      if (initialMode === 'create') {
        // 创建新部门
        await createDepartmentMutation.mutateAsync(editData);
        showSuccess('部门创建成功');
        handleClose();
      } else if (departmentId) {
        // 更新现有部门
        await updateDepartmentMutation.mutateAsync({
          id: departmentId,
          updates: editData
        });
        showSuccess('部门更新成功');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save department:', error);
      showError(error instanceof Error ? error.message : '操作失败');
    }
  }, [initialMode, departmentId, editData, createDepartmentMutation, updateDepartmentMutation, showSuccess, showError, handleClose]);

  // 处理删除
  const handleDelete = useCallback(async () => {
    if (!departmentId || initialMode === 'create') return;
    
    if (confirm('确定要删除该部门吗？删除后无法恢复。')) {
      try {
        await deleteDepartmentMutation.mutateAsync(departmentId);
        showSuccess('部门删除成功');
        handleClose();
      } catch (error) {
        console.error('Failed to delete department:', error);
        showError(error instanceof Error ? error.message : '删除失败');
      }
    }
  }, [departmentId, initialMode, deleteDepartmentMutation, showSuccess, showError, handleClose]);

  // 切换部分展开/折叠
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

  // 获取父部门选项
  const parentDepartmentOptions = departmentTree
    .filter(dept => dept.id !== departmentId) // 排除自己
    .map(dept => ({
      value: dept.id,
      label: dept.full_path || dept.name
    }));

  // 获取最新薪资统计
  const latestPayrollStat = payrollStats[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 现代化背景遮罩 */}
      <div 
        className={cn(
          'fixed inset-0 transition-all duration-300 ease-out',
          'bg-gradient-to-br from-black/40 via-black/60 to-black/40',
          'backdrop-blur-sm',
          isClosing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />
      
      {/* 现代化模态框容器 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={cn(
            'relative w-full max-w-5xl mx-auto',
            'card bg-base-100 shadow-xl',
            'overflow-hidden transition-all duration-300 ease-out',
            isClosing 
              ? 'opacity-0 scale-95 translate-y-8' 
              : 'opacity-100 scale-100 translate-y-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 现代化模态框背景光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:animate-[shimmer_2s_ease-in-out] pointer-events-none" />
          
          {/* 现代化模态框头部 */}
          <div className={cn(
            'relative z-10 flex items-center justify-between p-6',
            'bg-gradient-to-r from-background-secondary/50 via-background-primary/80 to-background-secondary/50',
            'border-b border-border-subtle'
          )}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BuildingOfficeIcon className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-text-primary">
                  {initialMode === 'create' ? '新建部门' : (department?.name || '部门详情')}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {initialMode === 'create' ? '填写部门信息以创建新部门' : (
                    <>
                      {department?.id && `部门ID: ${department.id}`}
                      {department?.parent_department_id && departmentTree.find(d => d.id === department.parent_department_id) && 
                        ` • 上级部门: ${departmentTree.find(d => d.id === department.parent_department_id)?.name}`
                      }
                      {employees.length > 0 && ` • 员工数: ${employees.length}`}
                    </>
                  )}
                </p>
              </div>
            </div>
            
            {/* 现代化关闭按钮 */}
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0"
              aria-label="关闭"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </ModernButton>
          </div>

          {/* 现代化模态框内容 */}
          <div className={cn(
            'relative z-10 p-6 max-h-[70vh] overflow-y-auto',
            'bg-gradient-to-b from-background-secondary/20 to-background-primary/60'
          )}>
            {isLoading && <LoadingScreen />}
            
            {isError && initialMode !== 'create' && (
              <div className={cn(
                'alert border-0 rounded-xl',
                'bg-gradient-to-r from-error/10 to-error/5',
                'border border-error/20',
                'shadow-[0_4px_12px_-2px_rgba(239,68,68,0.15)]'
              )}>
                <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-error font-medium">
                  加载失败: {(error as Error)?.message}
                </span>
              </div>
            )}

            {(department || initialMode === 'create') && (
              <DepartmentDetailContent 
                department={department}
                isEditing={isEditing}
                editData={editData}
                onEditDataChange={setEditData}
                parentDepartmentOptions={parentDepartmentOptions}
                employees={employees}
                payrollStats={latestPayrollStat}
                isLoadingEmployees={isLoadingEmployees}
                isLoadingPayroll={isLoadingPayroll}
                openSections={openSections}
                onToggleSection={toggleSection}
                mode={initialMode}
              />
            )}
          </div>

          {/* 现代化模态框底部 */}
          <div className={cn(
            'relative z-10 flex items-center justify-between gap-3 p-6',
            'bg-gradient-to-r from-background-secondary/50 via-background-primary/80 to-background-secondary/50',
            'border-t border-border-subtle'
          )}>
            {/* 左侧删除按钮 */}
            <div>
              {initialMode !== 'create' && isEditing && (
                <ModernButton
                  variant="danger"
                  size="md"
                  onClick={handleDelete}
                  disabled={deleteDepartmentMutation.isPending}
                >
                  {deleteDepartmentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                        />
                      </svg>
                      删除部门
                    </>
                  )}
                </ModernButton>
              )}
            </div>

            {/* 右侧操作按钮 */}
            <div className="flex items-center gap-3">
              <ModernButton
                variant="ghost"
                size="md"
                onClick={handleClose}
              >
                {initialMode === 'create' && isEditing ? '取消' : '关闭'}
              </ModernButton>
              
              {isEditing && (
                <ModernButton
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  disabled={
                    !editData.name || 
                    updateDepartmentMutation.isPending || 
                    createDepartmentMutation.isPending
                  }
                  className="min-w-[120px]"
                >
                  {updateDepartmentMutation.isPending || createDepartmentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                      {initialMode === 'create' ? '创建' : '保存'}
                    </>
                  )}
                </ModernButton>
              )}
              
              {initialMode !== 'create' && (
                <ModernButton
                  variant={isEditing ? "secondary" : "primary"}
                  size="md"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={!department}
                  className="min-w-[120px]"
                >
                  {isEditing ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M6 18L18 6M6 6l12 12" 
                        />
                      </svg>
                      取消编辑
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                        />
                      </svg>
                      编辑
                    </>
                  )}
                </ModernButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 部门详情内容组件
interface DepartmentDetailContentProps {
  department?: DepartmentWithDetails | null;
  isEditing: boolean;
  editData: DepartmentFormData;
  onEditDataChange: (data: DepartmentFormData) => void;
  parentDepartmentOptions: Array<{ value: string; label: string }>;
  employees: DepartmentEmployee[];
  payrollStats?: DepartmentPayrollStatistics;
  isLoadingEmployees: boolean;
  isLoadingPayroll: boolean;
  openSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  initialMode: 'view' | 'edit' | 'create';
}

function DepartmentDetailContent({ 
  department,
  isEditing,
  editData,
  onEditDataChange,
  parentDepartmentOptions,
  employees,
  payrollStats,
  isLoadingEmployees,
  isLoadingPayroll,
  openSections,
  onToggleSection,
  initialMode
}: DepartmentDetailContentProps) {
  // 更新编辑数据
  const updateEditData = (field: keyof DepartmentFormData, value: any) => {
    onEditDataChange({
      ...editData,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      {/* 基本信息孔雀屏 */}
      <AccordionSection
        id="basic"
        icon={<BuildingOfficeIcon className="w-5 h-5" />}
        title="基本信息"
        isOpen={openSections.has('basic')}
        onToggle={onToggleSection}
        isEditing={isEditing}
      >
        <AccordionContent>
          <DetailField 
            label="部门名称" 
            value={isEditing ? editData.name : department?.name}
            isEditing={isEditing}
            onChange={(value) => updateEditData('name', value)}
            required
            placeholder="请输入部门名称"
          />
          <DetailField 
            label="上级部门" 
            value={isEditing ? editData.parent_department_id : department?.parent_department_id}
            isEditing={isEditing}
            onChange={(value) => updateEditData('parent_department_id', value || null)}
            type="select"
            options={[
              { value: '', label: '无（顶级部门）' },
              ...parentDepartmentOptions
            ]}
          />
        </AccordionContent>
      </AccordionSection>

      {/* 部门层级关系孔雀屏 */}
      {initialMode !== 'create' && department && (
        <AccordionSection
          id="hierarchy"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
          title="层级关系"
          isOpen={openSections.has('hierarchy')}
          onToggle={onToggleSection}
        >
          <AccordionContent>
            <FieldGroup>
              <DetailField 
                label="部门层级" 
                value={`第 ${department.level || 1} 级`}
                type="text"
              />
              <DetailField 
                label="完整路径" 
                value={department.full_path || department.name}
                type="text"
              />
            </FieldGroup>
            
            {/* 子部门信息 */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                子部门 ({department.children_count || 0})
              </h4>
              {department.children_count && department.children_count > 0 ? (
                <div className="space-y-2">
                  {/* TODO: 显示子部门列表 */}
                  <div className="text-sm text-text-secondary">
                    该部门下有 {department.children_count} 个子部门
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-secondary">
                  暂无子部门
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionSection>
      )}

      {/* 部门员工管理孔雀屏 */}
      {initialMode !== 'create' && department && (
        <AccordionSection
          id="employees"
          icon={<UsersIcon className="w-5 h-5" />}
          title={`部门员工管理 (${employees.length})`}
          isOpen={openSections.has('employees')}
          onToggle={onToggleSection}
        >
          <AccordionContent>
            <DepartmentEmployeePanel
              department={department}
              className="border-0 shadow-none"
            />
          </AccordionContent>
        </AccordionSection>
      )}

      {/* 薪资统计分析孔雀屏 */}
      {initialMode !== 'create' && department && (
        <AccordionSection
          id="payroll"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          title="薪资统计分析"
          isOpen={openSections.has('payroll')}
          onToggle={onToggleSection}
        >
          <AccordionContent>
            <DepartmentPayrollAnalysis
              department={department}
              className="border-0 shadow-none"
            />
          </AccordionContent>
        </AccordionSection>
      )}
    </div>
  );
}