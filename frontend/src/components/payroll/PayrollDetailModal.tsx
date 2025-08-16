import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent } from '@/components/common/AccordionSection';
import { DetailField } from '@/components/common/DetailField';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { PayrollStatus, type PayrollStatusType } from '@/hooks/payroll';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';

// 薪资详情数据类型
interface PayrollDetailData {
  id: string;
  employee_id?: string;
  employee?: {
    id: string;
    employee_name: string;
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
  component_type: 'earning' | 'deduction';
  component_category: 'basic_salary' | 'benefits' | 'personal_insurance' | 'employer_insurance' | 'personal_tax';
  category: string;
  category_display_name?: string;
  category_name: string;
  category_sort_order: number;
  amount: number;
  calculation_method?: string;
  notes?: string;
  item_notes?: string;
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
  employee_name: string;
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

// 个人扣缴类分类定义
const PERSONAL_DEDUCTION_CATEGORIES = ['personal_insurance', 'personal_tax'];

// 薪资类别显示名称映射
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'personal_insurance': '个人五险一金',
  'personal_tax': '个人所得税',
  'basic_salary': '基本工资',
  'benefits': '津贴福利'
};

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
      const { data: payrollData, error: payrollError } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .eq('payroll_id', payrollId)
        .single();
      
      if (payrollError) throw payrollError;
      
      const payroll = payrollData ? {
        id: payrollData.payroll_id,
        employee_id: payrollData.employee_id,
        employee_name: payrollData.employee_name,
        pay_period_start: payrollData.period_start,
        pay_period_end: payrollData.period_end,
        pay_date: payrollData.actual_pay_date || payrollData.scheduled_pay_date,
        status: payrollData.payroll_status,
        gross_pay: payrollData.gross_pay,
        total_deductions: payrollData.total_deductions,
        net_pay: payrollData.net_pay,
        employee: {
          id: payrollData.employee_id,
          employee_name: payrollData.employee_name,
          id_number: payrollData.id_number
        }
      } : null;
      if (payroll) {
        setPayrollData(payroll as unknown as PayrollDetailData);

        // 获取五险一金详情
        const { data: insurance, error: insuranceError } = await supabase
          .from('insurance_calculation_logs')
          .select(`
            id,
            payroll_id,
            employee_id,
            insurance_type_id,
            calculation_date,
            is_applicable,
            contribution_base,
            adjusted_base,
            employee_rate,
            employer_rate,
            employee_amount,
            employer_amount,
            skip_reason,
            insurance_type:insurance_types(
              id,
              system_key,
              name,
              description
            )
          `)
          .eq('payroll_id', payrollId)
          .order('insurance_type_id');
        
        if (insuranceError) throw insuranceError;
        setInsuranceDetails(insurance as unknown as InsuranceDetail[]);

        // 获取缴费基数信息（基于薪资期间）
        if (payroll.employee_id) {
          const yearMonth = payroll.pay_period_start.substring(0, 7); // YYYY-MM
          const { data: bases, error: baseError } = await supabase
            .from('view_employee_insurance_base_monthly_latest')
            .select('*')
            .eq('employee_id', payroll.employee_id)
            .eq('month_string', yearMonth)
            .order('insurance_type_key');
          
          if (baseError) throw baseError;
          setContributionBases(bases as ContributionBase[]);
        }
      }

      // 获取薪资明细项
      try {
        console.log('开始获取薪资明细，payrollId:', payrollId);
        const { data: items, error: itemsError } = await supabase
          .from('view_payroll_unified')
          .select('*')
          .eq('payroll_id', payrollId)
          .not('payroll_item_id', 'is', null)
          .order('category_sort_order', { ascending: true })
          .order('component_name', { ascending: true });
        
        if (itemsError) throw itemsError;
        console.log('原始获取的薪资明细数据:', {
          totalCount: items?.length || 0,
          rawData: items,
          dataStructure: items?.length > 0 ? {
            firstItem: items[0],
            fieldNames: Object.keys(items[0] || {}),
            sampleValues: {
              component_type: items[0]?.component_type,
              category: items[0]?.category,
              category_display_name: items[0]?.category_display_name,
              component_name: items[0]?.component_name,
              amount: items[0]?.amount
            }
          } : null
        });
        setPayrollItems(items as PayrollItemDetail[]);
      } catch (itemError) {
        console.error('获取薪资明细失败:', itemError);
        setPayrollItems([]);
      }
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
                  {payrollData?.employee?.employee_name || String(t('payroll:payrollDetails'))}
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
                aria-label={String(t('common:close'))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ModernButton>
            </div>
          </header>

          {/* 薪资汇总固定区域 - 紧凑优化 */}
          {payrollData && (
            <section className="px-4 py-3 bg-base-50/50 border-b border-base-200">
              <div className="grid grid-cols-3 gap-3">
                {/* 应发工资 */}
                <div className="bg-white rounded-lg p-3 border border-base-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-base-content/60">{String(t('payroll:grossPay'))}</p>
                      <p className="text-base font-semibold text-success font-mono">
                        {formatCurrency(payrollData.gross_pay)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 扣除合计 */}
                <div className="bg-white rounded-lg p-3 border border-base-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-base-content/60">{String(t('payroll:totalDeductions'))}</p>
                      <p className="text-base font-semibold text-error font-mono">
                        -{formatCurrency(payrollData.total_deductions)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 实发工资 - 突出显示 */}
                <div className="bg-primary/5 rounded-lg p-3 border-2 border-primary/20 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-primary/80 font-medium">{String(t('payroll:netPay'))}</p>
                      <p className="text-lg font-bold text-primary font-mono">
                        {formatCurrency(payrollData.net_pay)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 模态框详细内容 - 紧凑优化 */}
          <div className="max-h-[65vh] overflow-y-auto">
            {isLoading && <LoadingScreen />}
            
            {isError && (
              <div className="mx-4 mt-4 alert alert-error alert-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{String(t('common:error.loadFailed'))}: {error?.message}</span>
              </div>
            )}

            {payrollData && (
              <div className="px-4 py-3 form-compact">
                <PayrollDetailContent 
                  payroll={payrollData}
                  payrollItems={payrollItems}
                  insuranceDetails={insuranceDetails}
                  contributionBases={contributionBases}
                />
              </div>
            )}
          </div>

          {/* 优化后的底部操作区 - 紧凑优化 */}
          <footer className="px-4 py-3 border-t border-base-200 bg-base-50/30">
            <div className="flex items-center justify-end">
              <ModernButton variant="ghost" size="sm" onClick={handleClose}>
                {String(t('common:close'))}
              </ModernButton>
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
}

function PayrollDetailContent({ 
  payroll, 
  payrollItems, 
  insuranceDetails,
  contributionBases
}: PayrollDetailContentProps) {
  const { t } = useTranslation(['payroll', 'common']);
  // 优化默认展开状态：默认不展开任何手风琴，用户按需展开
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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

  // 按 component_category 分组薪资项目
  const groupedItems = payrollItems.reduce((acc, item) => {
    const category = item.component_category || item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PayrollItemDetail[]>);


  // 增强调试信息
  console.log('PayrollDetailContent 详细调试信息:', {
    payrollId: payroll.id,
    payrollItemsLength: payrollItems.length,
    payrollItemsRaw: payrollItems,
    groupedItemsKeys: Object.keys(groupedItems),
    groupedItemsDetail: groupedItems,
    // 检查 component_type 的值分布
    componentTypes: payrollItems.map(item => item.component_type),
    uniqueComponentTypes: [...new Set(payrollItems.map(item => item.component_type))],
    // 检查分类的值
    componentCategories: payrollItems.map(item => item.component_category),
    uniqueComponentCategories: [...new Set(payrollItems.map(item => item.component_category))],
    categoryNames: payrollItems.map(item => item.category_name),
    uniqueCategoryNames: [...new Set(payrollItems.map(item => item.category_name))],
    // 检查是否有earning和deduction项目
    earningItems: payrollItems.filter(item => item.component_type === 'earning'),
    allDeductionItems: payrollItems.filter(item => item.component_type === 'deduction'),
    personalDeductionItems: payrollItems.filter(item => 
      item.component_type === 'deduction' && 
      PERSONAL_DEDUCTION_CATEGORIES.includes(item.component_category)
    ),
    filteredDeductionCategories: [...new Set(payrollItems
      .filter(item => item.component_type === 'deduction' && PERSONAL_DEDUCTION_CATEGORIES.includes(item.component_category))
      .map(item => item.component_category))]
  });

  // 计算各类别小计
  const categoryTotals = Object.entries(groupedItems).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + (item.amount || 0), 0),
    isDeduction: items[0]?.component_type === 'deduction'
  }));

  return (
    <div className="space-y-4">
      {/* 薪资明细手风琴 */}
      <AccordionSection
        id="breakdown"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        title={String(t('payroll:payrollBreakdown'))}
        isOpen={openSections.has('breakdown')}
        onToggle={toggleSection}
        variant="form"
        className="compact-accordion"
      >
        <PayrollBreakdownSection
          groupedItems={groupedItems}
          categoryTotals={categoryTotals}
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
        title={String(t('payroll:sections.insurance'))}
        isOpen={openSections.has('insurance')}
        onToggle={toggleSection}
        variant="form"
        className="compact-accordion"
      >
        <InsuranceDetailsSection
          insuranceDetails={insuranceDetails}
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
        title={String(t('payroll:sections.contributionBase'))}
        isOpen={openSections.has('contribution')}
        onToggle={toggleSection}
        variant="form"
        className="compact-accordion"
      >
        <ContributionBaseSection
          contributionBases={contributionBases}
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
}

// 创建列辅助器
const columnHelper = createColumnHelper<PayrollItemDetail>();

function PayrollBreakdownSection({
  groupedItems,
  categoryTotals
}: PayrollBreakdownSectionProps & { payroll: PayrollDetailData }) {
  const { t } = useTranslation(['payroll', 'common']);

  // 准备表格数据
  const incomeItems = useMemo(() => {
    return Object.entries(groupedItems)
      .filter(([, items]) => items[0]?.component_type === 'earning')
      .flatMap(([, items]) => items);
  }, [groupedItems]);

  const deductionItems = useMemo(() => {
    return Object.entries(groupedItems)
      .filter(([category, items]) => 
        items[0]?.component_type === 'deduction' && 
        PERSONAL_DEDUCTION_CATEGORIES.includes(category)
      )
      .flatMap(([, items]) => items);
  }, [groupedItems]);

  // 定义收入项目表格列
  const incomeColumns = useMemo(() => [
    columnHelper.accessor('component_name' as any, {
      header: '项目名称',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    columnHelper.accessor('category_name' as any, {
      header: '分类',
      cell: (info: any) => (
        <span className="text-xs text-base-content/70">
          {info.row.original.category_name || 
           CATEGORY_DISPLAY_NAMES[info.row.original.component_category] || 
           info.row.original.component_category}
        </span>
      )
    }),
    columnHelper.accessor('amount' as any, {
      header: () => <div className="text-right">金额</div>,
      cell: (info: any) => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-green-600">
            +{formatCurrency(Math.abs(info.getValue()))}
          </span>
        </div>
      )
    }),
    columnHelper.accessor('calculation_method' as any, {
      header: '计算方式',
      cell: info => info.getValue() ? (
        <span className="text-xs text-base-content/60">
          {info.getValue() as React.ReactNode}
        </span>
      ) : (
        <span className="text-xs text-base-content/30">-</span>
      )
    }),
    columnHelper.accessor('notes' as any, {
      header: '备注',
      cell: info => info.getValue() ? (
        <span className="text-xs text-base-content/60">
          {info.getValue() as React.ReactNode}
        </span>
      ) : (
        <span className="text-xs text-base-content/30">-</span>
      )
    })
  ], []);

  // 定义扣缴项目表格列
  const deductionColumns = useMemo<ColumnDef<PayrollItemDetail>[]>(() => [
    columnHelper.accessor('component_name' as any, {
      header: '项目名称',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    columnHelper.accessor('category_name' as any, {
      header: '分类',
      cell: (info: any) => (
        <span className="text-xs text-base-content/70">
          {info.row.original.category_name || 
           CATEGORY_DISPLAY_NAMES[info.row.original.component_category] || 
           info.row.original.component_category}
        </span>
      )
    }),
    columnHelper.accessor('amount' as any, {
      header: () => <div className="text-right">金额</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-red-600">
            -{formatCurrency(Math.abs(info.getValue() as number))}
          </span>
        </div>
      )
    }),
    columnHelper.accessor('calculation_method' as any, {
      header: '计算方式',
      cell: info => info.getValue() ? (
        <span className="text-xs text-base-content/60">
          {info.getValue() as React.ReactNode}
        </span>
      ) : (
        <span className="text-xs text-base-content/30">-</span>
      )
    }),
    columnHelper.accessor('notes' as any, {
      header: '备注',
      cell: info => info.getValue() ? (
        <span className="text-xs text-base-content/60">
          {info.getValue() as React.ReactNode}
        </span>
      ) : (
        <span className="text-xs text-base-content/30">-</span>
      )
    })
  ], []);

  // 创建收入表格实例
  const incomeTable = useReactTable({
    data: incomeItems,
    columns: incomeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 创建扣缴表格实例
  const deductionTable = useReactTable({
    data: deductionItems,
    columns: deductionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 计算汇总
  const incomeTotal = useMemo(() => 
    incomeItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
    [incomeItems]
  );

  const deductionTotal = useMemo(() => 
    deductionItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
    [deductionItems]
  );

  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">暂无薪资明细数据</p>
        <p className="text-base-content/40 text-xs mt-2">
          请检查该薪资记录是否包含明细项目数据
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 收入项目表格 */}
      {incomeItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" 
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-green-700">收入项目</h3>
            </div>
            <div className="text-sm font-semibold text-green-600">
              合计: {formatCurrency(incomeTotal)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                {incomeTable.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="text-xs font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {incomeTable.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-base-100/50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 扣缴项目表格 */}
      {deductionItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-red-700">个人扣缴项目</h3>
            </div>
            <div className="text-sm font-semibold text-red-600">
              合计: -{formatCurrency(deductionTotal)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                {deductionTable.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="text-xs font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {deductionTable.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-base-100/50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 创建五险一金列辅助器
const insuranceColumnHelper = createColumnHelper<InsuranceDetail>();

// 五险一金详情组件
interface InsuranceDetailsSectionProps {
  insuranceDetails: InsuranceDetail[];
}

function InsuranceDetailsSection({
  insuranceDetails
}: InsuranceDetailsSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  // 定义表格列
  const insuranceColumns = useMemo(() => [
    insuranceColumnHelper.accessor('insurance_type.name' as keyof InsuranceDetail, {
      header: '保险类型',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {String(info.getValue() || info.row.original.insurance_type?.system_key || '未知')}
        </span>
      )
    }),
    insuranceColumnHelper.accessor('is_applicable' as keyof InsuranceDetail, {
      header: '适用状态',
      cell: info => (
        <div className="flex items-center gap-2">
          <span className={cn(
            "badge badge-sm",
            info.getValue() 
              ? "badge-success" 
              : "badge-warning"
          )}>
            {info.getValue() ? '适用' : '不适用'}
          </span>
          {!info.getValue() && info.row.original.skip_reason && (
            <span className="text-xs text-base-content/50">
              ({info.row.original.skip_reason})
            </span>
          )}
        </div>
      )
    }),
    insuranceColumnHelper.accessor('contribution_base' as keyof InsuranceDetail, {
      header: () => <div className="text-right">缴费基数</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-mono text-base-content">
            {formatCurrency(info.getValue() as number)}
          </span>
        </div>
      )
    }),
    insuranceColumnHelper.accessor('employee_rate' as keyof InsuranceDetail, {
      header: () => <div className="text-right">个人费率</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-mono text-base-content/70">
            {((info.getValue() as number) * 100).toFixed(2)}%
          </span>
        </div>
      )
    }),
    insuranceColumnHelper.accessor('employee_amount' as keyof InsuranceDetail, {
      header: () => <div className="text-right">个人缴费</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-red-600">
            -{formatCurrency((info.getValue() as number) || 0)}
          </span>
        </div>
      )
    }),
    insuranceColumnHelper.accessor('employer_rate' as keyof InsuranceDetail, {
      header: () => <div className="text-right">企业费率</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-mono text-base-content/70">
            {((info.getValue() as number) * 100).toFixed(2)}%
          </span>
        </div>
      )
    }),
    insuranceColumnHelper.accessor('employer_amount' as keyof InsuranceDetail, {
      header: () => <div className="text-right">企业缴费</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-blue-600">
            -{formatCurrency((info.getValue() as number) || 0)}
          </span>
        </div>
      )
    })
  ], []);

  // 创建表格实例
  const insuranceTable = useReactTable({
    data: insuranceDetails,
    columns: insuranceColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 计算总的个人和企业缴费
  const totalEmployeeContribution = useMemo(() => 
    insuranceDetails.reduce((sum, detail) => 
      sum + (detail.is_applicable ? detail.employee_amount : 0), 0
    ),
    [insuranceDetails]
  );
  
  const totalEmployerContribution = useMemo(() => 
    insuranceDetails.reduce((sum, detail) => 
      sum + (detail.is_applicable ? detail.employer_amount : 0), 0
    ),
    [insuranceDetails]
  );

  if (insuranceDetails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">{String(t('payroll:noInsuranceDetails'))}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 缴费汇总卡片 - 紧凑样式 */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-lg p-4 border border-primary/10">
        <h3 className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          缴费汇总
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">个人缴费合计</p>
            <p className="text-lg font-bold text-red-600 font-mono">
              -{formatCurrency(totalEmployeeContribution)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">企业缴费合计</p>
            <p className="text-lg font-bold text-blue-600 font-mono">
              -{formatCurrency(totalEmployerContribution)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">总缴费金额</p>
            <p className="text-lg font-bold text-primary font-mono">
              {formatCurrency(totalEmployeeContribution + totalEmployerContribution)}
            </p>
          </div>
        </div>
      </div>

      {/* 五险一金明细表格 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-primary">五险一金明细</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              {insuranceTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="text-xs font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {insuranceTable.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-base-100/50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 创建缴费基数列辅助器
const contributionColumnHelper = createColumnHelper<ContributionBase>();

// 缴费基数详情组件
interface ContributionBaseSectionProps {
  contributionBases: ContributionBase[];
}

function ContributionBaseSection({
  contributionBases
}: ContributionBaseSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  // 定义表格列
  const contributionColumns = useMemo(() => [
    contributionColumnHelper.accessor('insurance_type_name' as keyof ContributionBase, {
      header: '保险类型',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    contributionColumnHelper.accessor('month_string' as keyof ContributionBase, {
      header: '月份',
      cell: info => (
        <span className="text-sm text-base-content/70">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    contributionColumnHelper.accessor('employment_status' as keyof ContributionBase, {
      header: '就业状态',
      cell: info => (
        <span className="badge badge-sm badge-ghost">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    contributionColumnHelper.accessor('contribution_base' as keyof ContributionBase, {
      header: () => <div className="text-right">缴费基数</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-primary">
            {formatCurrency(info.getValue() as number)}
          </span>
        </div>
      )
    }),
    contributionColumnHelper.accessor('effective_start_date' as keyof ContributionBase, {
      header: '生效日期',
      cell: info => (
        <span className="text-sm text-base-content/60">
          {formatDate(String(info.getValue() || ''))}
        </span>
      )
    }),
    contributionColumnHelper.accessor('effective_end_date' as keyof ContributionBase, {
      header: '截止日期',
      cell: info => {
        const value = info.getValue();
        return value ? (
          <span className="text-sm text-base-content/60">
            {formatDate(String(value))}
          </span>
        ) : (
          <span className="badge badge-sm badge-success">当前有效</span>
        );
      }
    })
  ], []);

  // 创建表格实例
  const contributionTable = useReactTable({
    data: contributionBases,
    columns: contributionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 计算基数统计
  const baseStatistics = useMemo(() => {
    if (contributionBases.length === 0) return { average: 0, current: 0, types: 0 };
    
    // 按保险类型分组
    const grouped = contributionBases.reduce((acc, base) => {
      if (!acc[base.insurance_type_name]) {
        acc[base.insurance_type_name] = [];
      }
      acc[base.insurance_type_name].push(base);
      return acc;
    }, {} as Record<string, ContributionBase[]>);
    
    // 获取当前有效的基数
    const currentBases = Object.entries(grouped).map(([type, bases]) => {
      const current = bases.find(b => !b.effective_end_date);
      return current?.contribution_base || 0;
    }).filter(base => base > 0);
    
    return {
      average: currentBases.length > 0 
        ? currentBases.reduce((sum, base) => sum + base, 0) / currentBases.length 
        : 0,
      current: currentBases[0] || 0,
      types: Object.keys(grouped).length
    };
  }, [contributionBases]);

  if (contributionBases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-base-content/60 text-sm">{String(t('payroll:noContributionBase'))}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基数概览卡片 - 紧凑样式 */}
      <div className="bg-gradient-to-r from-info/5 via-info/3 to-transparent rounded-lg p-4 border border-info/10">
        <h3 className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          基数概览
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">平均缴费基数</p>
            <p className="text-lg font-bold text-info font-mono">
              {formatCurrency(baseStatistics.average)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">当前基数</p>
            <p className="text-lg font-bold text-success font-mono">
              {formatCurrency(baseStatistics.current)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/60 mb-1">保险类型数</p>
            <p className="text-lg font-bold text-primary">
              {baseStatistics.types}
            </p>
          </div>
        </div>
      </div>

      {/* 缴费基数明细表格 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-info">缴费基数历史</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              {contributionTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="text-xs font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {contributionTable.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-base-100/50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}