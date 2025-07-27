import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent, AccordionFormGroup } from '@/components/common/AccordionSection';
import { DetailField, FieldGroup } from '@/components/common/DetailField';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { payrollService, PayrollStatus, type PayrollStatusType } from '@/services/payroll.service';
import { cn, cardEffects, iconContainer } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Database } from '@/types/supabase';

// 薪资详情数据类型
interface PayrollDetailData {
  id: string;
  employee_id?: string;
  employee?: {
    id: string;
    full_name: string;
    id_number: string;
  };
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatusType;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 薪资明细项数据类型
interface PayrollItemDetail {
  payroll_id: string;
  component_id: string;
  component_name: string;
  component_type: 'earnings' | 'deductions';
  category: string;
  category_display_name: string;
  category_sort_order: number;
  amount: number;
  calculation_method?: string;
  notes?: string;
}

// 五险一金详情数据类型
interface InsuranceDetail {
  id: string;
  payroll_id: string;
  employee_id: string;
  insurance_type_id: string;
  calculation_date: string;
  is_applicable: boolean;
  contribution_base: number;
  adjusted_base: number;
  employee_rate: number;
  employer_rate: number;
  employee_amount: number;
  employer_amount: number;
  skip_reason?: string;
  insurance_type: {
    id: string;
    system_key: string;
    name: string;
    description: string;
  };
}

// 缴费基数数据类型
interface ContributionBase {
  employee_id: string;
  full_name: string;
  id_number: string;
  employment_status: string;
  insurance_type_id: string;
  insurance_type_name: string;
  insurance_type_key: string;
  month: string;
  month_string: string;
  year: number;
  month_number: number;
  contribution_base: number;
  effective_start_date: string;
  effective_end_date?: string;
}

interface PayrollDetailModalProps {
  payrollId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PayrollDetailModal({ 
  payrollId, 
  open, 
  onClose 
}: PayrollDetailModalProps) {
  const { t } = useTranslation(['payroll', 'common']);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDataRef, setEditDataRef] = useState<PayrollDetailData | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollDetailData | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItemDetail[]>([]);
  const [insuranceDetails, setInsuranceDetails] = useState<InsuranceDetail[]>([]);
  const [contributionBases, setContributionBases] = useState<ContributionBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  // 获取薪资详情数据
  const fetchPayrollData = useCallback(async () => {
    if (!payrollId) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // 获取薪资基本信息
      const { data: payrolls } = await payrollService.getPayrolls({
        page: 1,
        pageSize: 1000
      });
      
      const payroll = payrolls.find(p => p.id === payrollId);
      if (payroll) {
        setPayrollData(payroll as PayrollDetailData);

        // 获取五险一金详情
        const insurance = await payrollService.getEmployeeInsuranceDetails(payrollId);
        setInsuranceDetails(insurance as InsuranceDetail[]);

        // 获取缴费基数信息（基于薪资期间）
        if (payroll.employee_id) {
          const yearMonth = payroll.pay_period_start.substring(0, 7); // YYYY-MM
          const bases = await payrollService.getEmployeeContributionBases(
            payroll.employee_id, 
            yearMonth
          );
          setContributionBases(bases as ContributionBase[]);
        }
      }

      // 获取薪资明细项
      const items = await payrollService.getPayrollDetails(payrollId);
      setPayrollItems(items as PayrollItemDetail[]);
    } catch (err) {
      setIsError(true);
      setError(err as Error);
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [payrollId]);

  // 当payrollId变化时重新获取数据
  useEffect(() => {
    if (open && payrollId) {
      fetchPayrollData();
    }
  }, [open, payrollId, fetchPayrollData]);

  // 处理关闭动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // 动画持续时间
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
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, handleClose]);

  // 保存薪资数据
  const handleSave = useCallback(async () => {
    if (!payrollData?.id || !editDataRef) {
      console.error('No payroll ID or edit data available for update');
      return;
    }

    try {
      // 准备更新数据，只包含有变化的字段
      const updates: any = {};
      
      // 基本信息
      if (editDataRef.pay_period_start !== payrollData.pay_period_start) {
        updates.pay_period_start = editDataRef.pay_period_start;
      }
      if (editDataRef.pay_period_end !== payrollData.pay_period_end) {
        updates.pay_period_end = editDataRef.pay_period_end;
      }
      if (editDataRef.pay_date !== payrollData.pay_date) {
        updates.pay_date = editDataRef.pay_date;
      }
      if (editDataRef.status !== payrollData.status) {
        updates.status = editDataRef.status;
      }
      if (editDataRef.notes !== payrollData.notes) {
        updates.notes = editDataRef.notes;
      }

      // 如果有更新，执行保存
      if (Object.keys(updates).length > 0) {
        await payrollService.updatePayroll(payrollData.id, updates);
        showSuccess(t('payroll:message.updateSuccess'));
        // 重新获取数据
        await fetchPayrollData();
      } else {
        showInfo(t('payroll:message.noChangesDetected'));
      }
      
      // 退出编辑模式
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save payroll data:', error);
      const errorMessage = error instanceof Error ? error.message : t('common:message.operationFailed');
      showError(`${t('payroll:message.saveFailed')}: ${errorMessage}`);
    }
  }, [payrollData, editDataRef, showSuccess, showInfo, showError, t, fetchPayrollData]);

  // 如果模态框未打开，不渲染
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
            cardEffects.modern,
            'overflow-hidden transition-all duration-300 ease-out',
            'border border-base-200/60',
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
            'bg-gradient-to-r from-base-50/50 via-base-100/80 to-base-50/50',
            'border-b border-base-200/60'
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                iconContainer.modern('primary', 'xl'),
                'flex-shrink-0'
              )}>
                <svg 
                  className="w-7 h-7" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={cn("text-base", "text-base-content")}>
                  {payrollData?.employee?.full_name ? 
                    `${payrollData.employee.full_name} - ${t('payroll:payrollDetails')}` : 
                    t('payroll:payrollDetails')
                  }
                </h2>
                <p className={cn("text-base", "text-base-content/60 mt-1")}>
                  {payrollData?.id && `${t('payroll:payrollId')}: ${payrollData.id}`}
                  {payrollData?.employee?.id_number && ` • ${payrollData.employee.id_number}`}
                  {payrollData && ` • ${formatDate(payrollData.pay_date)}`}
                </p>
              </div>
            </div>
            
            {/* 现代化关闭按钮 */}
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0"
              aria-label={t('common:close')}
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
            'bg-gradient-to-b from-base-50/20 to-base-100/60'
          )}>
            {isLoading && <LoadingScreen />}
            
            {isError && (
              <div className={cn(
                'alert border-0 rounded-xl',
                'bg-gradient-to-r from-error/10 to-error/5',
                'border border-error/20',
                'shadow-[0_4px_12px_-2px_rgba(239,68,68,0.15)]'
              )}>
                <div className={iconContainer.modern('error', 'md')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-error font-medium">
                  {t('common:error.loadFailed')}: {error?.message}
                </span>
              </div>
            )}

            {payrollData && (
              <PayrollDetailContent 
                payroll={payrollData}
                payrollItems={payrollItems}
                insuranceDetails={insuranceDetails}
                contributionBases={contributionBases}
                isEditing={isEditing}
                onEditDataChange={setEditDataRef}
              />
            )}
          </div>

          {/* 现代化模态框底部 */}
          <div className={cn(
            'relative z-10 flex items-center justify-end gap-3 p-6',
            'bg-gradient-to-r from-base-50/50 via-base-100/80 to-base-50/50',
            'border-t border-base-200/60'
          )}>
            <ModernButton
              variant="ghost"
              size="md"
              onClick={handleClose}
            >
              {t('common:close')}
            </ModernButton>
            {isEditing && (
              <ModernButton
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={!payrollData}
                className="min-w-[120px]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
                {t('common:save')}
              </ModernButton>
            )}
            <ModernButton
              variant={isEditing ? "secondary" : "primary"}
              size="md"
              onClick={() => {
                setIsEditing(!isEditing);
              }}
              disabled={!payrollData}
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
                  {t('payroll:cancelEdit')}
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
                  {t('common:edit')}
                </>
              )}
            </ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// 薪资详情内容组件接口
interface PayrollDetailContentProps {
  payroll: PayrollDetailData;
  payrollItems: PayrollItemDetail[];
  insuranceDetails: InsuranceDetail[];
  contributionBases: ContributionBase[];
  isEditing: boolean;
  onEditDataChange?: (editData: PayrollDetailData) => void;
}

function PayrollDetailContent({ 
  payroll, 
  payrollItems, 
  insuranceDetails,
  contributionBases,
  isEditing, 
  onEditDataChange 
}: PayrollDetailContentProps) {
  const { t } = useTranslation(['payroll', 'common']);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic', 'summary', 'insurance', 'contribution']));
  const [editData, setEditData] = useState<PayrollDetailData>(payroll);

  // 当薪资数据更新时，同步编辑数据
  useEffect(() => {
    setEditData(payroll);
  }, [payroll]);

  // 将编辑数据同步到父组件
  useEffect(() => {
    onEditDataChange?.(editData);
  }, [editData, onEditDataChange]);

  // 更新编辑数据
  const updateEditData = (field: keyof PayrollDetailData, value: string) => {
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

  // 按分类分组薪资项目
  const groupedItems = payrollItems.reduce((acc, item) => {
    const category = item.category_display_name || item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PayrollItemDetail[]>);

  // 计算各类别小计
  const categoryTotals = Object.entries(groupedItems).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + (item.amount || 0), 0),
    isDeduction: items[0]?.component_type === 'deductions'
  }));

  return (
    <div className="space-y-4">
      {/* 基本信息手风琴 */}
      <AccordionSection
        id="basic"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title={t('payroll:sections.basicInfo')}
        isOpen={openSections.has('basic')}
        onToggle={toggleSection}
        isEditing={isEditing}
      >
        <AccordionContent>
          <DetailField 
            label={t('payroll:employee')} 
            value={payroll.employee?.full_name || t('common:unknown')}
            isEditing={false} // 员工信息不允许编辑
          />
          <DetailField 
            label={t('payroll:periodStart')} 
            value={isEditing ? editData.pay_period_start : payroll.pay_period_start}
            type="date"
            isEditing={isEditing}
            onChange={(value) => updateEditData('pay_period_start', value)}
          />
          <DetailField 
            label={t('payroll:periodEnd')} 
            value={isEditing ? editData.pay_period_end : payroll.pay_period_end}
            type="date"
            isEditing={isEditing}
            onChange={(value) => updateEditData('pay_period_end', value)}
          />
          <DetailField 
            label={t('payroll:payDate')} 
            value={isEditing ? editData.pay_date : payroll.pay_date}
            type="date"
            isEditing={isEditing}
            onChange={(value) => updateEditData('pay_date', value)}
          />
          <DetailField 
            label={t('common:common.status')} 
            value={isEditing ? editData.status : payroll.status}
            type={isEditing ? 'select' : 'status'}
            isEditing={isEditing}
            onChange={(value) => updateEditData('status', value as PayrollStatusType)}
            options={[
              { value: PayrollStatus.DRAFT, label: t('payroll:status.draft') },
              { value: PayrollStatus.CALCULATING, label: t('payroll:status.calculating') },
              { value: PayrollStatus.CALCULATED, label: t('payroll:status.calculated') },
              { value: PayrollStatus.APPROVED, label: t('payroll:status.approved') },
              { value: PayrollStatus.PAID, label: t('payroll:status.paid') },
              { value: PayrollStatus.CANCELLED, label: t('payroll:status.cancelled') }
            ]}
            renderValue={!isEditing ? () => <PayrollStatusBadge status={payroll.status} size="sm" /> : undefined}
          />
          <DetailField 
            label={t('payroll:notes')} 
            value={isEditing ? (editData.notes || '') : (payroll.notes || '')}
            type="textarea"
            isEditing={isEditing}
            onChange={(value) => updateEditData('notes', value)}
            placeholder={t('payroll:notesPlaceholder')}
            rows={3}
          />
        </AccordionContent>
      </AccordionSection>

      {/* 薪资汇总手风琴 */}
      <AccordionSection
        id="summary"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
        title={t('payroll:sections.summary')}
        isOpen={openSections.has('summary')}
        onToggle={toggleSection}
        isEditing={isEditing}
      >
        <AccordionContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 应发工资卡片 */}
            <div className={cn(
              cardEffects.modern,
              'p-4 bg-gradient-to-br from-success/5 to-success/10',
              'border border-success/20'
            )}>
              <div className="flex items-center gap-3">
                <div className={iconContainer.modern('success', 'md')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
                  </svg>
                </div>
                <div>
                  <p className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:grossPay')}
                  </p>
                  <p className={cn("text-base", "text-success font-mono")}>
                    {formatCurrency(payroll.gross_pay)}
                  </p>
                </div>
              </div>
            </div>

            {/* 扣除合计卡片 */}
            <div className={cn(
              cardEffects.modern,
              'p-4 bg-gradient-to-br from-warning/5 to-warning/10',
              'border border-warning/20'
            )}>
              <div className="flex items-center gap-3">
                <div className={iconContainer.modern('warning', 'md')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                </div>
                <div>
                  <p className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:totalDeductions')}
                  </p>
                  <p className={cn("text-base", "text-warning font-mono")}>
                    -{formatCurrency(payroll.total_deductions)}
                  </p>
                </div>
              </div>
            </div>

            {/* 实发工资卡片 */}
            <div className={cn(
              cardEffects.modern,
              'p-4 bg-gradient-to-br from-primary/5 to-primary/10',
              'border border-primary/20'
            )}>
              <div className="flex items-center gap-3">
                <div className={iconContainer.modern('primary', 'md')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H3.75m15.75 0h.375c.621 0 1.125.504 1.125 1.125v.375m-1.5 0H18A.75.75 0 0118 4.5v.75m3.75 0v.75c0 .414-.336.75-.75.75H21v.75c0 .414-.336.75-.75.75H20.25v-1.5m1.5 0H21v-1.125c0-.621-.504-1.125-1.125-1.125H18.75" />
                  </svg>
                </div>
                <div>
                  <p className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:netPay')}
                  </p>
                  <p className={cn("text-base", "text-primary font-mono")}>
                    {formatCurrency(payroll.net_pay)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionSection>

      {/* 薪资明细手风琴 */}
      <AccordionSection
        id="breakdown"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        title={t('payroll:payrollBreakdown')}
        isOpen={openSections.has('breakdown')}
        onToggle={toggleSection}
        isEditing={isEditing}
        variant="form"
      >
        <PayrollBreakdownSection
          groupedItems={groupedItems}
          categoryTotals={categoryTotals}
          isEditing={isEditing}
        />
      </AccordionSection>

      {/* 五险一金手风琴 */}
      <AccordionSection
        id="insurance"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
        title={t('payroll:sections.insurance')}
        isOpen={openSections.has('insurance')}
        onToggle={toggleSection}
        isEditing={isEditing}
        variant="form"
      >
        <InsuranceDetailsSection
          insuranceDetails={insuranceDetails}
          isEditing={isEditing}
        />
      </AccordionSection>

      {/* 缴费基数手风琴 */}
      <AccordionSection
        id="contribution"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title={t('payroll:sections.contributionBase')}
        isOpen={openSections.has('contribution')}
        onToggle={toggleSection}
        isEditing={isEditing}
        variant="form"
      >
        <ContributionBaseSection
          contributionBases={contributionBases}
          isEditing={isEditing}
        />
      </AccordionSection>
    </div>
  );
}

// 薪资明细展示组件
interface PayrollBreakdownSectionProps {
  groupedItems: Record<string, PayrollItemDetail[]>;
  categoryTotals: Array<{
    category: string;
    total: number;
    isDeduction: boolean;
  }>;
  isEditing: boolean;
}

function PayrollBreakdownSection({
  groupedItems,
  categoryTotals,
  isEditing
}: PayrollBreakdownSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className={cn("text-base", "text-center py-8 text-base-content/60")}>
        {t('payroll:noPayrollItems')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, items]) => {
        const categoryTotal = categoryTotals.find(ct => ct.category === category);
        const isDeduction = categoryTotal?.isDeduction || false;
        
        return (
          <AccordionFormGroup
            key={category}
            title={category}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isDeduction 
                    ? "M20 12H4M12 4v16" // 减号图标用于扣除项
                    : "M12 6v6m0 0v6m0-6h6m-6 0H6" // 加号图标用于收入项
                  } 
                />
              </svg>
            }
          >
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.component_id}-${index}`} className="flex justify-between items-center py-2 border-b border-base-200/40 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-base-content">
                      {item.component_name}
                    </p>
                    {item.calculation_method && (
                      <p className="text-xs text-base-content/60 mt-1">
                        {item.calculation_method}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-base-content/50 mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "font-mono font-medium",
                      isDeduction ? "text-error" : "text-success"
                    )}>
                      {isDeduction && "-"}{formatCurrency(Math.abs(item.amount))}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* 分类小计 */}
              <div className="flex justify-between items-center pt-3 border-t border-base-300/60 font-semibold">
                <span className="text-base-content">
                  {category} {t('payroll:subtotal')}
                </span>
                <span className={cn(
                  "font-mono text-lg",
                  isDeduction ? "text-error" : "text-success"
                )}>
                  {isDeduction && "-"}{formatCurrency(Math.abs(categoryTotal?.total || 0))}
                </span>
              </div>
            </div>
          </AccordionFormGroup>
        );
      })}
    </div>
  );
}

// 五险一金详情组件
interface InsuranceDetailsSectionProps {
  insuranceDetails: InsuranceDetail[];
  isEditing: boolean;
}

function InsuranceDetailsSection({
  insuranceDetails,
  isEditing
}: InsuranceDetailsSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  if (insuranceDetails.length === 0) {
    return (
      <div className={cn("text-base", "text-center py-8 text-base-content/60")}>
        {t('payroll:noInsuranceDetails')}
      </div>
    );
  }

  // 按保险类型分组
  const groupedInsurance = insuranceDetails.reduce((acc, detail) => {
    const key = detail.insurance_type?.name || detail.insurance_type?.system_key || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(detail);
    return acc;
  }, {} as Record<string, InsuranceDetail[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedInsurance).map(([insuranceType, details]) => (
        <AccordionFormGroup
          key={insuranceType}
          title={insuranceType}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          {details.map((detail, index) => (
            <div key={`${detail.id}-${index}`} className="space-y-3">
              {/* 是否适用状态 */}
              <div className="flex items-center justify-between p-3 bg-base-50/50 rounded-lg border border-base-200/40">
                <span className="text-sm font-medium text-base-content/80">
                  {t('payroll:insurance.applicableStatus')}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    detail.is_applicable 
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-warning/10 text-warning border border-warning/20"
                  )}>
                    {detail.is_applicable ? t('common:applicable') : t('common:notApplicable')}
                  </span>
                  {!detail.is_applicable && detail.skip_reason && (
                    <span className="text-xs text-base-content/60">
                      ({detail.skip_reason})
                    </span>
                  )}
                </div>
              </div>

              {detail.is_applicable && (
                <>
                  {/* 缴费基数信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.contributionBase')}
                        value={formatCurrency(detail.contribution_base)}
                        variant="amount"
                        isEditing={false}
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.adjustedBase')}
                        value={formatCurrency(detail.adjusted_base)}
                        variant="amount"
                        isEditing={false}
                      />
                    </FieldGroup>
                  </div>

                  {/* 费率信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.employeeRate')}
                        value={`${(detail.employee_rate * 100).toFixed(2)}%`}
                        variant="text"
                        isEditing={false}
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.employerRate')}
                        value={`${(detail.employer_rate * 100).toFixed(2)}%`}
                        variant="text"
                        isEditing={false}
                      />
                    </FieldGroup>
                  </div>

                  {/* 缴费金额 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.employeeAmount')}
                        value={formatCurrency(detail.employee_amount)}
                        variant="amount"
                        className="text-error font-semibold"
                        isEditing={false}
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <DetailField
                        label={t('payroll:insurance.employerAmount')}
                        value={formatCurrency(detail.employer_amount)}
                        variant="amount"
                        className="text-info font-semibold"
                        isEditing={false}
                      />
                    </FieldGroup>
                  </div>

                  {/* 计算日期 */}
                  <FieldGroup>
                    <DetailField
                      label={t('payroll:insurance.calculationDate')}
                      value={formatDate(detail.calculation_date)}
                      variant="text"
                      isEditing={false}
                    />
                  </FieldGroup>
                </>
              )}
            </div>
          ))}
        </AccordionFormGroup>
      ))}
    </div>
  );
}

// 缴费基数详情组件
interface ContributionBaseSectionProps {
  contributionBases: ContributionBase[];
  isEditing: boolean;
}

function ContributionBaseSection({
  contributionBases,
  isEditing
}: ContributionBaseSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  if (contributionBases.length === 0) {
    return (
      <div className={cn("text-base", "text-center py-8 text-base-content/60")}>
        {t('payroll:noContributionBase')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contributionBases.map((base, index) => (
        <AccordionFormGroup
          key={`${base.insurance_type_id}-${index}`}
          title={base.insurance_type_name}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup>
                <DetailField
                  label={t('payroll:contributionBase.month')}
                  value={base.month_string}
                  variant="text"
                  isEditing={false}
                />
              </FieldGroup>
              <FieldGroup>
                <DetailField
                  label={t('payroll:contributionBase.employmentStatus')}
                  value={base.employment_status}
                  variant="text"
                  isEditing={false}
                />
              </FieldGroup>
            </div>

            {/* 缴费基数 */}
            <FieldGroup>
              <DetailField
                label={t('payroll:contributionBase.amount')}
                value={formatCurrency(base.contribution_base)}
                variant="amount"
                className="text-primary font-bold text-lg"
                isEditing={false}
              />
            </FieldGroup>

            {/* 有效期 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup>
                <DetailField
                  label={t('payroll:contributionBase.effectiveStartDate')}
                  value={formatDate(base.effective_start_date)}
                  variant="text"
                  isEditing={false}
                />
              </FieldGroup>
              <FieldGroup>
                <DetailField
                  label={t('payroll:contributionBase.effectiveEndDate')}
                  value={base.effective_end_date ? formatDate(base.effective_end_date) : t('common:ongoing')}
                  variant="text"
                  isEditing={false}
                />
              </FieldGroup>
            </div>
          </div>
        </AccordionFormGroup>
      ))}
    </div>
  );
}