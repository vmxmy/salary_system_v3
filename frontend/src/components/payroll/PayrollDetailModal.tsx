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
            'bg-white rounded-lg shadow-xl overflow-hidden',
            'border border-base-200 transition-all duration-300 ease-out',
            isClosing 
              ? 'opacity-0 scale-95 translate-y-8' 
              : 'opacity-100 scale-100 translate-y-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* 优化后的模态框头部 */}
          <header className="px-6 py-4 border-b border-base-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-base-content">
                  {payrollData?.employee?.full_name || t('payroll:payrollDetails')}
                </h1>
                <div className="flex items-center gap-4 text-sm text-base-content/60">
                  {payrollData && (
                    <>
                      <span>{formatDate(payrollData.pay_date)}</span>
                      <PayrollStatusBadge status={payrollData.status} size="sm" />
                      <span className="font-mono">ID: {payrollData.id}</span>
                      {payrollData.employee?.id_number && (
                        <span>{payrollData.employee.id_number}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* 简化的关闭按钮 */}
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex-shrink-0"
                aria-label={t('common:close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ModernButton>
            </div>
          </header>

          {/* 薪资汇总固定区域 */}
          {payrollData && (
            <section className="px-6 py-4 bg-base-50/50 border-b border-base-200">
              <div className="grid grid-cols-3 gap-4">
                {/* 应发工资 */}
                <div className="bg-white rounded-lg p-4 border border-base-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-base-content/60">{t('payroll:grossPay')}</p>
                      <p className="text-lg font-semibold text-success font-mono">
                        {formatCurrency(payrollData.gross_pay)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 扣除合计 */}
                <div className="bg-white rounded-lg p-4 border border-base-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-base-content/60">{t('payroll:totalDeductions')}</p>
                      <p className="text-lg font-semibold text-error font-mono">
                        -{formatCurrency(payrollData.total_deductions)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 实发工资 - 突出显示 */}
                <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-primary/80 font-medium">{t('payroll:netPay')}</p>
                      <p className="text-xl font-bold text-primary font-mono">
                        {formatCurrency(payrollData.net_pay)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 模态框详细内容 */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && <LoadingScreen />}
            
            {isError && (
              <div className="mx-6 mt-6 alert alert-error">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('common:error.loadFailed')}: {error?.message}</span>
              </div>
            )}

            {payrollData && (
              <div className="px-6 py-4">
                <PayrollDetailContent 
                  payroll={payrollData}
                  payrollItems={payrollItems}
                  insuranceDetails={insuranceDetails}
                  contributionBases={contributionBases}
                  isEditing={isEditing}
                  onEditDataChange={setEditDataRef}
                />
              </div>
            )}
          </div>

          {/* 优化后的底部操作区 */}
          <footer className="px-6 py-4 border-t border-base-200 bg-base-50/30">
            <div className="flex items-center justify-between">
              {/* 左侧：状态信息 */}
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                    <span>编辑模式</span>
                  </div>
                )}
              </div>
              
              {/* 右侧：操作按钮 */}
              <div className="flex items-center gap-3">
                <ModernButton variant="ghost" onClick={handleClose}>
                  {t('common:close')}
                </ModernButton>
                
                {isEditing ? (
                  <>
                    <ModernButton 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                    >
                      {t('common:cancel')}
                    </ModernButton>
                    <ModernButton
                      variant="primary"
                      onClick={handleSave}
                      disabled={!payrollData}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('common:save')}
                    </ModernButton>
                  </>
                ) : (
                  <ModernButton
                    variant="primary"
                    onClick={() => setIsEditing(true)}
                    disabled={!payrollData}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {t('common:edit')}
                  </ModernButton>
                )}
              </div>
            </div>
          </footer>
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
  // 优化默认展开状态：只展开基本信息，其他按需展开
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic']));
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
        <AccordionContent variant="custom">
          {/* 员工信息卡片 - 突出显示 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-primary/2 rounded-lg border border-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {payroll.employee?.full_name || t('common:unknown')}
                </h3>
                <p className="text-sm text-base-content/60">
                  {payroll.employee?.id_number && `身份证：${payroll.employee.id_number}`}
                </p>
              </div>
            </div>
          </div>

          {/* 薪资期间信息组 */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-base-content/90 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              薪资期间
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* 状态和备注组 */}
          <div className="space-y-4">
            <h4 className="text-base font-medium text-base-content/90 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              状态信息
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                renderValue={!isEditing ? () => <PayrollStatusBadge status={payroll.status} size="sm" showIcon={false} /> : undefined}
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
          payroll={payroll}
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
  isEditing,
  payroll
}: PayrollBreakdownSectionProps & { payroll: PayrollDetailData }) {
  const { t } = useTranslation(['payroll', 'common']);

  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">{t('payroll:noPayrollItems')}</p>
      </div>
    );
  }

  // 分离收入项和扣除项
  const incomeCategories = Object.entries(groupedItems).filter(([, items]) => 
    items[0]?.component_type === 'earnings'
  );
  const deductionCategories = Object.entries(groupedItems).filter(([, items]) => 
    items[0]?.component_type === 'deductions'
  );

  const renderCategorySection = (categories: [string, PayrollItemDetail[]][], sectionType: 'income' | 'deduction') => {
    if (categories.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            sectionType === 'income' 
              ? "bg-success/10 text-success" 
              : "bg-error/10 text-error"
          )}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={sectionType === 'income' 
                  ? "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" 
                  : "M20 12H4"
                } 
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-base-content">
            {sectionType === 'income' ? '收入项目' : '扣除项目'}
          </h3>
        </div>

        {categories.map(([category, items]) => {
          const categoryTotal = categoryTotals.find(ct => ct.category === category);
          const isDeduction = sectionType === 'deduction';
          
          return (
            <div key={category} className={cn(
              "rounded-xl border transition-all duration-200",
              isDeduction 
                ? "bg-error/2 border-error/10 hover:bg-error/5" 
                : "bg-success/2 border-success/10 hover:bg-success/5"
            )}>
              {/* 分类头部 */}
              <div className="p-4 border-b border-current/10">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-base-content/90">{category}</h4>
                  <div className="text-right">
                    <div className={cn(
                      "text-lg font-bold font-mono",
                      isDeduction ? "text-error" : "text-success"
                    )}>
                      {isDeduction ? "-" : "+"}{formatCurrency(Math.abs(categoryTotal?.total || 0))}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {items.length} 个项目
                    </div>
                  </div>
                </div>
              </div>

              {/* 项目详情 */}
              <div className="p-4 space-y-3">
                {items.map((item, index) => (
                  <div key={`${item.component_id}-${index}`} className="group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-base-content truncate">
                            {item.component_name}
                          </p>
                          {item.amount > 0 && (
                            <div className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              isDeduction 
                                ? "bg-error/10 text-error" 
                                : "bg-success/10 text-success"
                            )}>
                              {formatCurrency(Math.abs(item.amount))}
                            </div>
                          )}
                        </div>
                        
                        {item.calculation_method && (
                          <p className="text-xs text-base-content/60 mb-1">
                            <span className="font-medium">计算方式：</span>
                            {item.calculation_method}
                          </p>
                        )}
                        
                        {item.notes && (
                          <p className="text-xs text-base-content/50">
                            <span className="font-medium">备注：</span>
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {index < items.length - 1 && (
                      <div className="border-b border-base-200/30 mt-3"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 使用数据库预计算的汇总金额，确保与置顶显示一致
  const totalIncome = payroll.gross_pay || 0;
  const totalDeduction = payroll.total_deductions || 0;
  const netSalary = payroll.net_pay || 0;

  return (
    <div className="space-y-6">
      {/* 薪资概览卡片 - 放在顶部突出显示 */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-xl p-6 border border-primary/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">应发工资</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">应扣金额</p>
            <p className="text-2xl font-bold text-error">-{formatCurrency(totalDeduction)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">实发工资</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(netSalary)}</p>
          </div>
        </div>
      </div>

      {/* 收入和扣除项目详情 */}
      <div className="space-y-8">
        {renderCategorySection(incomeCategories, 'income')}
        {renderCategorySection(deductionCategories, 'deduction')}
      </div>
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">{t('payroll:noInsuranceDetails')}</p>
      </div>
    );
  }

  // 按保险类型分组并计算总金额
  const groupedInsurance = insuranceDetails.reduce((acc, detail) => {
    const key = detail.insurance_type?.name || detail.insurance_type?.system_key || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(detail);
    return acc;
  }, {} as Record<string, InsuranceDetail[]>);

  // 计算总的个人和企业缴费
  const totalEmployeeContribution = insuranceDetails.reduce((sum, detail) => 
    sum + (detail.is_applicable ? detail.employee_amount : 0), 0
  );
  const totalEmployerContribution = insuranceDetails.reduce((sum, detail) => 
    sum + (detail.is_applicable ? detail.employer_amount : 0), 0
  );

  return (
    <div className="space-y-6">
      {/* 缴费汇总卡片 */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-xl p-6 border border-primary/10">
        <h3 className="text-base font-semibold text-base-content mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          缴费汇总
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">个人缴费合计</p>
            <p className="text-2xl font-bold text-error font-mono">
              {formatCurrency(totalEmployeeContribution)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">企业缴费合计</p>
            <p className="text-2xl font-bold text-info font-mono">
              {formatCurrency(totalEmployerContribution)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">总缴费金额</p>
            <p className="text-2xl font-bold text-primary font-mono">
              {formatCurrency(totalEmployeeContribution + totalEmployerContribution)}
            </p>
          </div>
        </div>
      </div>

      {/* 各项保险明细 */}
      <div className="space-y-6">
        {Object.entries(groupedInsurance).map(([insuranceType, details]) => {
        // 计算该保险类型的总额
        const totalEmployeeAmount = details.reduce((sum, detail) => 
          sum + (detail.is_applicable ? detail.employee_amount : 0), 0
        );
        const totalEmployerAmount = details.reduce((sum, detail) => 
          sum + (detail.is_applicable ? detail.employer_amount : 0), 0
        );

        return (
          <div key={insuranceType} className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/2 to-transparent overflow-hidden">
            {/* 保险类型头部 */}
            <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/2 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{insuranceType}</h3>
                    <p className="text-sm text-base-content/60">
                      个人缴费：<span className="font-mono text-error">{formatCurrency(totalEmployeeAmount)}</span>
                      <span className="mx-2">•</span>
                      企业缴费：<span className="font-mono text-info">{formatCurrency(totalEmployerAmount)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {details.map((detail, index) => (
              <div key={`${detail.id}-${index}`} className="p-6 space-y-6">
                {/* 适用状态 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-base-content/70">适用状态</span>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                      detail.is_applicable 
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-warning/10 text-warning border border-warning/20"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        detail.is_applicable ? "bg-success" : "bg-warning"
                      )} />
                      {detail.is_applicable ? '适用' : '不适用'}
                    </span>
                    {!detail.is_applicable && detail.skip_reason && (
                      <span className="text-xs text-base-content/60 bg-base-100 px-2 py-1 rounded">
                        {detail.skip_reason}
                      </span>
                    )}
                  </div>
                </div>

                {detail.is_applicable && (
                  <>
                    {/* 缴费基数信息卡片 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-base-50/50 rounded-lg border border-base-200/50">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary font-mono mb-1">
                            {formatCurrency(detail.contribution_base)}
                          </div>
                          <div className="text-sm text-base-content/60">缴费基数</div>
                        </div>
                      </div>
                      <div className="p-4 bg-base-50/50 rounded-lg border border-base-200/50">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary font-mono mb-1">
                            {formatCurrency(detail.adjusted_base)}
                          </div>
                          <div className="text-sm text-base-content/60">调整基数</div>
                        </div>
                      </div>
                    </div>

                    {/* 费率对比 */}
                    <div className="bg-base-50/30 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-base-content/80 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        费率明细
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 个人承担 */}
                        <div className="text-center p-3 bg-error/5 rounded-lg border border-error/10">
                          <div className="text-lg font-bold text-error font-mono mb-1">
                            {(detail.employee_rate * 100).toFixed(2)}%
                          </div>
                          <div className="text-sm text-base-content/60 mb-2">个人费率</div>
                          <div className="text-xl font-bold text-error font-mono">
                            {formatCurrency(detail.employee_amount)}
                          </div>
                        </div>

                        {/* 企业承担 */}
                        <div className="text-center p-3 bg-info/5 rounded-lg border border-info/10">
                          <div className="text-lg font-bold text-info font-mono mb-1">
                            {(detail.employer_rate * 100).toFixed(2)}%
                          </div>
                          <div className="text-sm text-base-content/60 mb-2">企业费率</div>
                          <div className="text-xl font-bold text-info font-mono">
                            {formatCurrency(detail.employer_amount)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 计算日期 */}
                    <div className="text-center text-xs text-base-content/50">
                      计算日期：{formatDate(detail.calculation_date)}
                    </div>
                  </>
                )}

                {index < details.length - 1 && (
                  <div className="border-b border-base-200/40"></div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      </div>
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">{t('payroll:noContributionBase')}</p>
      </div>
    );
  }

  // 按保险类型分组并按时间排序
  const groupedBases = contributionBases.reduce((acc, base) => {
    const key = base.insurance_type_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(base);
    return acc;
  }, {} as Record<string, ContributionBase[]>);

  // 对每个保险类型的基数按时间排序（最新在前）
  Object.keys(groupedBases).forEach(key => {
    groupedBases[key].sort((a, b) => 
      new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime()
    );
  });

  // 获取当前有效的基数（用于汇总展示）
  const currentBases = Object.entries(groupedBases).map(([type, bases]) => ({
    type,
    base: bases.find(b => !b.effective_end_date)?.contribution_base || 0
  }));

  // 计算基数平均值
  const averageBase = currentBases.length > 0 
    ? currentBases.reduce((sum, item) => sum + item.base, 0) / currentBases.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* 基数概览卡片 */}
      <div className="bg-gradient-to-r from-info/5 via-info/3 to-transparent rounded-xl p-6 border border-info/10">
        <h3 className="text-base font-semibold text-base-content mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          基数概览
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">平均缴费基数</p>
            <p className="text-2xl font-bold text-info font-mono">
              {formatCurrency(averageBase)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-base-content/60 mb-1">基数项目数</p>
            <p className="text-2xl font-bold text-primary">
              {Object.keys(groupedBases).length}
            </p>
          </div>
        </div>
      </div>

      {/* 各保险类型基数明细 */}
      <div className="space-y-6">
        {Object.entries(groupedBases).map(([insuranceType, bases]) => (
        <div key={insuranceType} className="rounded-xl border border-info/10 bg-gradient-to-r from-info/2 to-transparent overflow-hidden">
          {/* 保险类型头部 */}
          <div className="p-5 bg-gradient-to-r from-info/5 to-info/2 border-b border-info/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-info">{insuranceType}</h3>
                <p className="text-sm text-base-content/60">
                  {bases.length} 个缴费基数记录
                </p>
              </div>
            </div>
          </div>

          {/* 时间线展示 */}
          <div className="p-5">
            <div className="space-y-4">
              {bases.map((base, index) => {
                const isActive = !base.effective_end_date;
                const isLatest = index === 0;
                
                return (
                  <div key={`${base.insurance_type_id}-${index}`} className="relative">
                    {/* 时间线连接线 */}
                    {index < bases.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-px bg-gradient-to-b from-base-300/60 to-transparent"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* 时间线节点 */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 z-10",
                          isActive 
                            ? "bg-success border-success shadow-[0_0_12px_4px] shadow-success/30"
                            : isLatest
                            ? "bg-primary border-primary"
                            : "bg-base-300 border-base-300"
                        )} />
                        {isActive && (
                          <div className="mt-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                            当前
                          </div>
                        )}
                      </div>

                      {/* 基数信息卡片 */}
                      <div className={cn(
                        "flex-1 p-4 rounded-lg border transition-all duration-200",
                        isActive
                          ? "bg-success/5 border-success/20 ring-1 ring-success/10"
                          : "bg-base-50/30 border-base-200/50 hover:bg-base-50/50"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-sm font-medium text-base-content/80">
                                {base.month_string}
                              </div>
                              <div className="text-xs text-base-content/60">
                                {base.employment_status}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={cn(
                              "text-2xl font-bold font-mono",
                              isActive ? "text-success" : "text-primary"
                            )}>
                              {formatCurrency(base.contribution_base)}
                            </div>
                          </div>
                        </div>

                        {/* 有效期信息 */}
                        <div className="flex items-center justify-between text-xs text-base-content/60">
                          <span>
                            有效期：{formatDate(base.effective_start_date)}
                          </span>
                          <span>
                            {base.effective_end_date 
                              ? `至 ${formatDate(base.effective_end_date)}` 
                              : '持续有效'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}