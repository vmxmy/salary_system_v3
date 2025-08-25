import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent } from '@/components/common/AccordionSection';
import { DetailField } from '@/components/common/DetailField';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { PayrollStatus, type PayrollStatusType, useEmployeeInsuranceDetails, usePayrollDetails } from '@/hooks/payroll';
import { useEmployeeCategoryByPeriod } from '@/hooks/payroll/useEmployeeCategory';
import { useEmployeePositionByPeriod, useEmployeePositionHistory, useAssignEmployeePosition } from '@/hooks/payroll/useEmployeePosition';
import { useDepartmentList } from '@/hooks/department/useDepartments';
import { useEmployeePositions } from '@/hooks/payroll/useEmployeePosition';
import { useEmployeeContributionBasesByPeriod } from '@/hooks/payroll/useContributionBase';
import { useUpdateEarning } from '@/hooks/payroll/usePayrollEarnings';
import { useSetContributionBase } from '@/hooks/payroll/useContributionBase';
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
import {
  UserCircleIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

// 薪资详情数据类型
interface PayrollDetailData {
  id: string;
  employee_id?: string;
  period_id?: string;
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
  item_id: string;
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  period_code: string;
  period_name: string;
  period_start: string;
  period_end: string;
  component_id: string;
  component_name: string;
  component_type: 'earning' | 'deduction';
  category: string;
  amount: number;
  item_notes?: string;
  gross_pay: number;
  net_pay: number;
  total_deductions: number;
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
  skip_reason?: string | null;
  insurance_type: {
    id: string;
    system_key: string;
    name: string;
    description: string;
  };
}

// 缴费基数数据类型 - 与 useContributionBase 兼容
interface ContributionBase {
  id: string;
  employee_id: string;
  employee_name?: string;
  id_number?: string;
  employment_status?: string;
  insurance_type_id: string;
  insurance_type_name: string;
  insurance_type_key: string;
  period_id: string | null;
  period_name?: string;
  contribution_base: number;
  base_period_year?: number;
  base_period_month?: number;
  base_period_display?: string;
  latest_contribution_base?: number;
  latest_is_applicable?: boolean;
  latest_adjusted_base?: number;
  latest_employee_rate?: number;
  latest_employer_rate?: number;
  latest_employee_amount?: number;
  latest_employer_amount?: number;
  base_last_updated?: string;
  // v3数据库中不存在的字段（向后兼容）
  adjusted_base?: number;
  adjustment_reason?: string;
  effective_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes?: string;
  // 保险规则相关
  insurance_rules?: {
    employee_rate: number;
    employer_rate: number;
    min_base: number;
    max_base: number;
    is_mandatory: boolean;
  };
}

// 个税项目数据类型（从薪资明细中筛选）
interface TaxItem {
  item_id: string;
  component_name: string;
  amount: number;
  item_notes?: string;
}

// 职务信息数据类型
interface JobInfo {
  // 当前薪资周期的员工身份类别
  employee_category?: {
    id: string;
    name: string;
    assigned_at: string;
  };
  // 职务历史记录
  job_history: Array<{
    id: string;
    employee_id: string;
    department_id: string;
    department_name: string;
    position_id: string;
    position_name: string;
    employment_status: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    notes?: string;
    created_at?: string;
    period_id?: string;
    period_name?: string;
  }>;
}

// Tab类型定义
type TabType = 'overview' | 'breakdown' | 'insurance' | 'contribution' | 'tax' | 'job';

// 个人扣缴类分类定义

// 薪资类别显示名称映射
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'personal_insurance': '个人五险一金',
  'personal_tax': '个人所得税',
  'basic_salary': '基本工资',
  'benefits': '津贴福利',
  'allowances': '津贴补贴',
  'bonuses': '奖金',
  'overtime': '加班费',
  'other_earnings': '其他收入',
  'other_deductions': '其他扣除',
  'employer_insurance': '单位社保',
  'housing_fund': '住房公积金',
  'pension_insurance': '养老保险',
  'medical_insurance': '医疗保险',
  'unemployment_insurance': '失业保险',
  'work_injury_insurance': '工伤保险',
  'maternity_insurance': '生育保险'
};

// 获取类别显示名称
const getCategoryDisplayName = (category: string): string => {
  return CATEGORY_DISPLAY_NAMES[category] || category || '未分类';
};

// 类别排序优先级 - 确保合理的显示顺序
const getCategorySortOrder = (category: string): number => {
  const orderMap: Record<string, number> = {
    'basic_salary': 1,
    'allowances': 2,
    'benefits': 3,
    'bonuses': 4,
    'overtime': 5,
    'other_earnings': 6,
    'personal_tax': 7,
    'personal_insurance': 8,
    'other_deductions': 9, // 确保其他扣除显示在合适位置
    'employer_insurance': 10
  };
  return orderMap[category] || 99;
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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [payrollData, setPayrollData] = useState<PayrollDetailData | null>(null);
  // payrollItems 和 taxItems 现在通过 useMemo 从 hook 数据计算得出
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError, showInfo } = useToast();


  // 使用hook获取五险一金数据
  const { data: insuranceDetails = [], isLoading: insuranceLoading } = useEmployeeInsuranceDetails(payrollId || '');

  // 使用hook获取薪资明细数据 - 替换手动获取
  const { data: payrollDetailsData, isLoading: payrollDetailsLoading } = usePayrollDetails(payrollId || '');

  // 使用hook获取缴费基数数据
  const [employeeId, setEmployeeId] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const { data: contributionBasesData = [], isLoading: basesLoading } = useEmployeeContributionBasesByPeriod(employeeId, periodId);

  // 获取薪资基本信息数据
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
        period_id: payrollData.period_id,
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

        // 设置员工ID和周期ID，让hooks自动获取数据
        if (payroll.employee_id) {
          setEmployeeId(payroll.employee_id);
        }
        if (payroll.period_id) {
          setPeriodId(payroll.period_id);
        }
      }

      // Note: 薪资明细现在由 usePayrollDetails hook 自动获取
      // Note: 职务信息现在由JobTab组件中的hooks直接获取
    } catch (err) {
      setIsError(true);
      setError(err as Error);
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [payrollId]);

  // 处理薪资明细数据转换
  const payrollItems = useMemo(() => {
    if (!payrollDetailsData) return [];
    
    // 转换数据格式以兼容现有组件
    return payrollDetailsData.map((item: any) => ({
      item_id: item.item_id,
      payroll_id: item.payroll_id,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      period_code: item.period_code,
      period_name: item.period_name,
      period_start: item.period_start,
      period_end: item.period_end,
      component_id: item.component_id,
      component_name: item.component_name,
      component_type: item.component_type,
      category: item.category,
      amount: item.amount,
      item_notes: item.item_notes,
      gross_pay: item.gross_pay,
      net_pay: item.net_pay,
      total_deductions: item.total_deductions,
    }));
  }, [payrollDetailsData]);

  // 从薪资明细中筛选个税项目
  const taxItems = useMemo(() => {
    const taxRelatedItems = payrollItems.filter(item =>
      item.category === 'personal_tax' ||
      item.component_name.includes('个人所得税') ||
      item.component_name.includes('个税')
    );

    return taxRelatedItems.map(item => ({
      item_id: item.item_id,
      component_name: item.component_name,
      amount: item.amount,
      item_notes: item.item_notes
    }));
  }, [payrollItems]);

  // 当payrollId变化时重新获取数据
  useEffect(() => {
    if (open && payrollId) {
      fetchPayrollData();
    }
  }, [open, payrollId, fetchPayrollData]);



  // 重置状态
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open]);

  // 单个薪资记录五险一金计算


  // Tab配置
  const tabs = [
    { id: 'overview', label: '薪资概览', icon: CurrencyDollarIcon },
    { id: 'breakdown', label: '薪资明细', icon: CalculatorIcon },
    { id: 'insurance', label: '五险一金', icon: ShieldCheckIcon },
    { id: 'contribution', label: '缴费基数', icon: CreditCardIcon },
    { id: 'tax', label: '个人所得税', icon: DocumentTextIcon },
    { id: 'job', label: '职务信息', icon: BriefcaseIcon },
  ];


  // 薪资概览Tab - 薪资汇总优先显示
  const OverviewTab = () => {
    if (!payrollData) return null;

    return (
      <div className="space-y-6">
        {/* 薪资汇总 - 移到顶部 */}
        <div className="space-y-4">
          <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
            <CurrencyDollarIcon className="w-5 h-5 text-primary" />
            薪资汇总
          </h5>
          <div className="grid grid-cols-3 gap-4">
            {/* 应发工资 */}
            <div className="bg-success/5 rounded-lg p-4 border border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-success/80 font-medium">{String(t('payroll:grossPay'))}</p>
                  <p className="text-xl font-bold text-success font-mono">
                    {formatCurrency(payrollData.gross_pay)}
                  </p>
                </div>
              </div>
            </div>

            {/* 扣除合计 */}
            <div className="bg-error/5 rounded-lg p-4 border border-error/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-error/80 font-medium">{String(t('payroll:totalDeductions'))}</p>
                  {payrollData.total_deductions < 0 ? (
                    <div>
                      <p className="text-xl font-bold text-green-600 font-mono">
                        +{formatCurrency(Math.abs(payrollData.total_deductions))}
                      </p>
                      <p className="text-xs text-green-600/70 mt-0.5">净退款</p>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-error font-mono">
                      -{formatCurrency(payrollData.total_deductions)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 实发工资 - 突出显示 */}
            <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-primary/80 font-medium">{String(t('payroll:netPay'))}</p>
                  <p className="text-2xl font-bold text-primary font-mono">
                    {formatCurrency(payrollData.net_pay)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* 薪资基本信息 - 移到下面 */}
        <div className="space-y-4">
          <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
            <UserCircleIcon className="w-5 h-5 text-primary" />
            薪资基本信息
          </h5>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">员工姓名</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg">
                {payrollData.employee?.employee_name || '-'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">身份证号</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg">
                {payrollData.employee?.id_number || '-'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">薪资期间</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg">
                {formatDate(payrollData.pay_period_start)} 至 {formatDate(payrollData.pay_period_end)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">发薪日期</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg">
                {formatDate(payrollData.pay_date)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">薪资状态</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg">
                <PayrollStatusBadge status={payrollData.status} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">薪资ID</label>
              <div className="px-3 py-2 bg-base-200/50 rounded-lg font-mono text-sm">
                {payrollData.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      <dialog className={cn("modal", { "modal-open": open })}>
        <div className="modal-box max-w-6xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
          {/* Enhanced Modal Header */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CurrencyDollarIcon className="w-6 h-6 text-primary" />
                  </div>
                  薪资详情
                </h3>
                {payrollData && (
                  <p className="text-sm text-base-content/60 mt-1 ml-13">
                    {payrollData.employee?.employee_name || String(t('payroll:payrollDetails'))} · {formatDate(payrollData.pay_date)}
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
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <div className="w-56 bg-base-200/30 border-r border-base-300 p-4">
              <ul className="space-y-1">
                {tabs.map((tab) => {
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
              {(isLoading || insuranceLoading || basesLoading || payrollDetailsLoading) ? (
                <div className="flex items-center justify-center h-full">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-error text-lg font-medium mb-2">加载失败</p>
                  <p className="text-base-content/60 text-sm">{error?.message}</p>
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && <OverviewTab />}
                  {activeTab === 'breakdown' && payrollData && (
                    <PayrollBreakdownTab
                      payrollItems={payrollItems}
                      payroll={payrollData}
                    />
                  )}
                  {activeTab === 'insurance' && (
                    <InsuranceTab insuranceDetails={insuranceDetails} />
                  )}
                  {activeTab === 'contribution' && (
                    <ContributionTab contributionBases={contributionBasesData} />
                  )}
                  {activeTab === 'tax' && (
                    <TaxTab taxItems={taxItems} />
                  )}
                  {activeTab === 'job' && payrollData && (
                    <JobTab
                      employeeId={payrollData.employee_id}
                      payrollId={payrollData.id}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Enhanced Modal Footer */}
          <div className="flex-shrink-0 border-t border-base-300 p-4 bg-base-200/30">
            <div className="flex justify-between items-center">
              <div className="text-sm text-base-content/60">
                查看薪资详情信息
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClose}
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

    </>
  );
}

// 薪资明细Tab组件
interface PayrollBreakdownTabProps {
  payrollItems: PayrollItemDetail[];
  payroll: PayrollDetailData;
}

function PayrollBreakdownTab({ payrollItems, payroll }: PayrollBreakdownTabProps) {
  const { t } = useTranslation(['payroll', 'common']);

  // 定义薪资明细标签页要显示的类别
  const BREAKDOWN_TAB_CATEGORIES = [
    'basic_salary',      // 基本工资
    'benefits',          // 津贴福利  
    'allowances',        // 津贴补贴
    'bonuses',           // 奖金
    'overtime',          // 加班费
    'other_earnings',    // 其他收入
    'other_deductions'   // 其他扣除
  ];

  // 添加调试日志
  console.log('=== PayrollBreakdownTab 调试信息 ===');
  console.log('原始薪资项目数据 (payrollItems):', payrollItems);
  console.log('原始数据数量:', payrollItems.length);

  // 按 category 分组薪资项目，并过滤只显示指定类别
  const allGroupedItems = payrollItems.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PayrollItemDetail[]>);

  console.log('所有分组后的数据 (allGroupedItems):', allGroupedItems);
  console.log('所有类别:', Object.keys(allGroupedItems));
  console.log('需要显示的类别 (BREAKDOWN_TAB_CATEGORIES):', BREAKDOWN_TAB_CATEGORIES);

  // 检查 other_deductions 类别
  if (allGroupedItems['other_deductions']) {
    console.log('找到 other_deductions 类别，数量:', allGroupedItems['other_deductions'].length);
    console.log('other_deductions 明细:', allGroupedItems['other_deductions']);
  } else {
    console.log('未找到 other_deductions 类别');
  }

  // 过滤并排序分组数据，只保留薪资明细页面需要的类别
  const filteredEntries = Object.entries(allGroupedItems)
    .filter(([category]) => {
      const included = BREAKDOWN_TAB_CATEGORIES.includes(category);
      console.log(`类别 ${category} ${included ? '已包含' : '已过滤'}`);
      return included;
    });

  console.log('过滤后的条目:', filteredEntries.map(([cat, items]) => `${cat}(${items.length}项)`));

  const groupedItems = filteredEntries
    .sort(([categoryA], [categoryB]) => {
      return getCategorySortOrder(categoryA) - getCategorySortOrder(categoryB);
    })
    .reduce((acc, [category, items]) => {
      acc[category] = items;
      return acc;
    }, {} as Record<string, PayrollItemDetail[]>);

  console.log('最终分组数据 (groupedItems):', groupedItems);
  console.log('最终显示的类别:', Object.keys(groupedItems));
  console.log('=== 调试信息结束 ===');

  // 计算各类别小计
  const categoryTotals = Object.entries(groupedItems).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + (item.amount || 0), 0),
    isDeduction: items[0]?.component_type === 'deduction'
  }));

  return (
    <div className="space-y-6">
      <PayrollBreakdownSection
        groupedItems={groupedItems}
        categoryTotals={categoryTotals}
        payroll={payroll}
      />
    </div>
  );
}

// 五险一金Tab组件
interface InsuranceTabProps {
  insuranceDetails: InsuranceDetail[];
}

function InsuranceTab({ insuranceDetails }: InsuranceTabProps) {
  return (
    <div className="space-y-6">
      <InsuranceDetailsSection insuranceDetails={insuranceDetails} />
    </div>
  );
}

// 缴费基数Tab组件
interface ContributionTabProps {
  contributionBases: ContributionBase[];
}

function ContributionTab({ contributionBases }: ContributionTabProps) {
  return (
    <div className="space-y-6">
      <ContributionBaseSection contributionBases={contributionBases} />
    </div>
  );
}

// 个税Tab组件
interface TaxTabProps {
  taxItems: TaxItem[];
}

function TaxTab({ taxItems }: TaxTabProps) {
  return (
    <div className="space-y-6">
      <TaxDetailsSection taxItems={taxItems} />
    </div>
  );
}

// 职务信息Tab组件
interface JobTabProps {
  employeeId?: string;
  payrollId?: string;
}

function JobTab({ employeeId, payrollId }: JobTabProps) {
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [allPeriodsMap, setAllPeriodsMap] = useState<Map<string, any>>(new Map());

  // 从薪资记录获取周期ID，并预加载所有周期信息
  useEffect(() => {
    const fetchPeriodInfo = async () => {
      if (!payrollId) return;

      try {
        // 从薪资记录中获取period_id
        const { data: payrollData } = await supabase
          .from('payrolls')
          .select('period_id')
          .eq('id', payrollId)
          .single();

        if (payrollData?.period_id) {
          setPeriodId(payrollData.period_id);

          // 获取所有周期信息（用于历史记录日期显示）
          const { data: allPeriodsData } = await supabase
            .from('payroll_periods')
            .select('id, period_name, period_start, period_end, period_year, period_month');

          if (allPeriodsData) {
            const periodsMap = new Map();
            allPeriodsData.forEach(period => {
              periodsMap.set(period.id, period);
            });
            setAllPeriodsMap(periodsMap);
          }
        }
      } catch (error) {
        console.warn('Failed to get period info from payroll:', error);
        setPeriodId(undefined);
        setAllPeriodsMap(new Map());
      }
    };

    fetchPeriodInfo();
  }, [payrollId]);

  // 严格查询当前薪资周期的数据 - 只有当periodId存在时才查询
  const shouldQuery = !!(employeeId && periodId);

  const {
    data: employeeCategory,
    isLoading: categoryLoading,
    error: categoryError
  } = useEmployeeCategoryByPeriod(employeeId || '', periodId);

  const {
    data: currentPosition,
    isLoading: positionLoading,
    error: positionError
  } = useEmployeePositionByPeriod(employeeId || '', periodId);

  // 严格按当前薪资周期获取职务历史 - 只显示该周期的记录
  const {
    data: allJobHistory,
    isLoading: historyLoading,
    error: historyError
  } = useEmployeePositionHistory(employeeId || '');

  // 显示所有职务历史记录（已解决重复数据问题）
  const jobHistory = useMemo(() => {
    if (!allJobHistory) return [];

    // 显示所有历史记录，按周期时间倒序排列（优先使用period_name中的日期信息）
    return allJobHistory.sort((a, b) => {
      // 如果有周期信息，按周期排序
      if (a.period_name && b.period_name) {
        return b.period_name.localeCompare(a.period_name);
      }
      // 否则保持原有顺序
      return 0;
    });
  }, [allJobHistory]);

  // 构建jobInfo对象 - 包含所有历史记录，使用对应周期的日期范围
  const jobInfo: JobInfo | null = useMemo(() => {
    if (!employeeId) return null;

    return {
      employee_category: employeeCategory ? {
        id: employeeCategory.id,
        name: employeeCategory.category_name,
        assigned_at: employeeCategory.effective_date || new Date().toISOString()
      } : undefined,
      // 显示所有职务历史记录，每个记录使用其对应薪资周期的日期范围
      job_history: jobHistory.map(job => {
        // 从周期映射中获取对应的周期信息
        const periodInfo = job.period_id ? allPeriodsMap.get(job.period_id) : null;
        const startDate = periodInfo ? periodInfo.period_start : '';
        const endDate = periodInfo ? periodInfo.period_end : undefined;

        return {
          id: job.id,
          employee_id: job.employee_id,
          department_id: job.department_id,
          department_name: job.department_name,
          position_id: job.position_id,
          position_name: job.position_name,
          employment_status: 'active', // Hook数据中没有此字段，设为默认值
          start_date: startDate,
          end_date: endDate,
          period_id: job.period_id,
          period_name: job.period_name,
          is_current: job.is_active,
          notes: undefined, // Hook数据中没有此字段
          created_at: undefined // Hook数据中没有此字段
        };
      })
    };
  }, [employeeId, employeeCategory, jobHistory, allPeriodsMap]);

  const isLoading = categoryLoading || positionLoading || historyLoading;
  const hasError = categoryError || positionError || historyError;

  // 如果没有薪资周期ID，显示无法查询
  if (!periodId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <BriefcaseIcon className="w-8 h-8 text-warning" />
        </div>
        <p className="text-warning text-sm">无法获取薪资周期信息</p>
        <p className="text-base-content/40 text-xs mt-2">
          无法确定当前薪资记录对应的周期，无法查询职务信息
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <BriefcaseIcon className="w-8 h-8 text-error" />
        </div>
        <p className="text-error text-sm">加载职务信息失败</p>
        <p className="text-base-content/40 text-xs mt-2">
          {categoryError?.message || positionError?.message || historyError?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobInfoSection jobInfo={jobInfo} periodId={periodId} employeeId={employeeId} />
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
  const { showSuccess, showError } = useToast();

  // 使用薪资项目更新 hook
  const updateEarningMutation = useUpdateEarning();

  // 内联编辑状态管理
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // 组件渲染追踪
  console.log('[PayrollBreakdownSection] 🎨 组件渲染:', {
    timestamp: new Date().toISOString(),
    editingItemId,
    groupCount: Object.keys(groupedItems || {}).length
  });

  // 开始编辑
  const handleStartEdit = useCallback((itemId: string, currentAmount: number) => {
    console.log('[PayrollBreakdownSection] 🎯 开始编辑薪资项目:', {
      itemId,
      currentAmount,
      editingItemId: editingItemId
    });

    // 使用函数式状态更新确保获取最新状态
    setEditingItemId(prevId => {
      console.log('[PayrollBreakdownSection] 🔄 状态更新函数执行:', {
        prevId,
        newId: itemId
      });
      return itemId;
    });

    setEditingAmount(Math.abs(currentAmount).toString());

    // 添加状态更新后的验证
    setTimeout(() => {
      console.log('[PayrollBreakdownSection] ✅ 状态更新后验证:', {
        newEditingItemId: itemId,
        stateUpdated: true
      });
    }, 100);
  }, []);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setEditingAmount('');
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(async (item: PayrollItemDetail, currentEditingAmount?: string) => {
    // 优先使用传入的当前编辑金额，避免闭包问题
    const amountToSave = currentEditingAmount ?? editingAmount;

    if (!amountToSave.trim()) {
      showError('金额不能为空');
      return;
    }

    const newAmount = parseFloat(amountToSave);
    if (isNaN(newAmount) || newAmount < 0) {
      showError('请输入有效的金额');
      return;
    }

    // 如果金额没有变化，直接取消编辑
    if (Math.abs(newAmount - Math.abs(item.amount)) < 0.01) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      console.log('[PayrollBreakdownSection] 🔧 保存薪资明细项目:', {
        itemId: item.item_id,
        payrollId: item.payroll_id,
        componentName: item.component_name,
        oldAmount: item.amount,
        newAmount: newAmount,
        componentType: item.component_type
      });

      // 使用 hook 更新薪资明细项目
      await updateEarningMutation.mutateAsync({
        earningId: item.item_id,
        data: {
          amount: newAmount
        }
      });

      console.log('[PayrollBreakdownSection] ✅ 薪资明细项目更新成功');
      showSuccess('薪资明细更新成功');

      // 成功后取消编辑状态
      handleCancelEdit();

    } catch (error) {
      console.error('更新薪资明细失败:', error);
      showError('更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [showError, showSuccess, handleCancelEdit, updateEarningMutation]);

  // 可编辑金额单元格组件
  const EditableAmountCell = ({
    item,
    isEarning,
    currentEditingId,
    tableInfo
  }: {
    item: PayrollItemDetail;
    isEarning: boolean;
    currentEditingId?: string | null;
    tableInfo?: any; // 添加table信息参数
  }) => {
    const actualEditingId = currentEditingId ?? editingItemId;
    const isEditing = actualEditingId === item.item_id;
    const amount = item.amount;
    const absAmount = Math.abs(amount);

    // 调试：检查编辑状态判断
    const shouldLog = actualEditingId === item.item_id || Math.random() < 0.1; // 只记录编辑中的单元格或10%随机采样
    if (shouldLog) {
      console.log(`[EditableAmountCell] ${isEditing ? '✅ EDITING' : '🧩'} 渲染状态检查:`, {
        itemId: item.item_id,
        editingItemId,
        currentEditingId,
        actualEditingId,
        isEditing,
        comparison: `${actualEditingId} === ${item.item_id} = ${actualEditingId === item.item_id}`,
        componentName: item.component_name,
        timestamp: new Date().toISOString()
      });
    }

    if (isEditing) {
      // 从 table meta 获取最新的 editingAmount，避免闭包问题
      const { editingAmount: metaEditingAmount } = tableInfo?.table?.options?.meta || {};
      const currentEditingAmount = metaEditingAmount ?? editingAmount;

      // 调试：检查输入框的值
      console.log('[EditableAmountCell] 📝 输入框渲染状态:', {
        itemId: item.item_id,
        closureEditingAmount: editingAmount,
        metaEditingAmount: metaEditingAmount,
        currentEditingAmount: currentEditingAmount,
        itemAmount: item.amount,
        absAmount,
        hasTableInfo: !!tableInfo
      });

      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentEditingAmount}
            onChange={(e) => {
              // 调试：检查输入事件
              console.log('[EditableAmountCell] 🎯 输入事件:', {
                value: e.target.value,
                itemId: item.item_id,
                hasTableInfo: !!tableInfo,
                hasTable: !!tableInfo?.table,
                hasMeta: !!tableInfo?.table?.options?.meta,
                metaKeys: tableInfo?.table?.options?.meta ? Object.keys(tableInfo.table.options.meta) : 'none'
              });

              // 从 table meta 获取 setEditingAmount，避免闭包问题
              const { setEditingAmount: metaSetEditingAmount } = tableInfo?.table?.options?.meta || {};
              if (metaSetEditingAmount) {
                console.log('[EditableAmountCell] 🚀 使用 meta setEditingAmount');
                metaSetEditingAmount(e.target.value);
              } else {
                console.log('[EditableAmountCell] ⚠️ 降级到闭包 setEditingAmount');
                // 降级到闭包版本（应该不会执行到这里）
                setEditingAmount(e.target.value);
              }
            }}
            className="input input-sm input-bordered w-24 text-right font-mono"
            step="0.01"
            min="0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit(item, currentEditingAmount);
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
          />
          <div className="flex items-center gap-1">
            <button
              className="btn btn-xs btn-success"
              onClick={() => handleSaveEdit(item, currentEditingAmount)}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="loading loading-xs loading-spinner"></span>
              ) : (
                '✓'
              )}
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    // 非编辑状态的显示
    const displayContent = isEarning ? (
      <span className="text-sm font-semibold font-mono text-green-600">
        +{formatCurrency(absAmount)}
      </span>
    ) : amount < 0 ? (
      <div>
        <span className="text-sm font-semibold font-mono text-green-600">
          +{formatCurrency(absAmount)}
        </span>
        <div className="text-xs text-green-600/70 mt-0.5">退款</div>
      </div>
    ) : (
      <span className="text-sm font-semibold font-mono text-red-600">
        -{formatCurrency(absAmount)}
      </span>
    );

    return (
      <div
        className="flex items-center justify-between group cursor-pointer hover:bg-base-200/50 p-1 -m-1 rounded"
        onClick={() => handleStartEdit(item.item_id, amount)}
        title="点击编辑金额"
      >
        <div className="text-right flex-1">
          {displayContent}
        </div>
        <button className="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 ml-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  };

  // 准备表格数据
  const incomeItems = useMemo(() => {
    console.log('🔍 PayrollBreakdownSection - 计算收入项目');
    console.log('原始 groupedItems:', groupedItems);

    const incomeResult = Object.entries(groupedItems)
      .filter(([category, items]) => {
        const isEarning = items[0]?.component_type === 'earning';
        console.log(`类别 ${category}: ${items.length} 项, 第一项类型: ${items[0]?.component_type}, 是否收入: ${isEarning}`);
        return isEarning;
      })
      .flatMap(([category, items]) => {
        console.log(`收入类别 ${category} 包含项目:`, items.map(item => ({
          name: item.component_name,
          amount: item.amount,
          type: item.component_type
        })));
        return items;
      });

    console.log('最终收入项目数量:', incomeResult.length);
    console.log('收入项目详情:', incomeResult);
    return incomeResult;
  }, [groupedItems]);

  // 准备扣除项目数据
  const deductionItems = useMemo(() => {
    console.log('🔍 PayrollBreakdownSection - 计算扣除项目');

    const deductionResult = Object.entries(groupedItems)
      .filter(([category, items]) => {
        const isDeduction = items[0]?.component_type === 'deduction';
        console.log(`类别 ${category}: ${items.length} 项, 第一项类型: ${items[0]?.component_type}, 是否扣除: ${isDeduction}`);
        return isDeduction;
      })
      .flatMap(([category, items]) => {
        console.log(`扣除类别 ${category} 包含项目:`, items.map(item => ({
          name: item.component_name,
          amount: item.amount,
          type: item.component_type
        })));
        return items;
      });

    console.log('最终扣除项目数量:', deductionResult.length);
    console.log('扣除项目详情:', deductionResult);
    return deductionResult;
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
    columnHelper.accessor('category' as any, {
      header: '分类',
      cell: (info: any) => (
        <span className="text-xs text-base-content/70">
          {getCategoryDisplayName(info.row.original.category) || '未知分类'}
        </span>
      )
    }),
    columnHelper.accessor('amount' as any, {
      header: () => (
        <div className="text-right flex items-center justify-end gap-1">
          金额
          <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      ),
      cell: (info: any) => {
        // 从 table meta 获取当前状态，避免闭包问题
        const { editingItemId: currentEditingId } = info.table.options.meta || {};
        return (
          <EditableAmountCell
            item={info.row.original as PayrollItemDetail}
            isEarning={true}
            currentEditingId={currentEditingId}
            tableInfo={info}
          />
        );
      }
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

  // 定义扣除项目表格列
  const deductionColumns = useMemo(() => [
    columnHelper.accessor('component_name' as any, {
      header: '项目名称',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    columnHelper.accessor('category' as any, {
      header: '分类',
      cell: (info: any) => (
        <span className="text-xs text-base-content/70">
          {getCategoryDisplayName(info.row.original.category) || '未知分类'}
        </span>
      )
    }),
    columnHelper.accessor('amount' as any, {
      header: () => (
        <div className="text-right flex items-center justify-end gap-1">
          金额
          <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      ),
      cell: (info: any) => {
        // 从 table meta 获取当前状态，避免闭包问题
        const { editingItemId: currentEditingId } = info.table.options.meta || {};
        return (
          <EditableAmountCell
            item={info.row.original as PayrollItemDetail}
            isEarning={false}
            currentEditingId={currentEditingId}
            tableInfo={info}
          />
        );
      }
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
  ], []); // 移除状态依赖，现在通过 table meta 动态获取

  // 创建收入表格实例
  const incomeTable = useReactTable({
    data: incomeItems,
    columns: incomeColumns,
    meta: {
      editingItemId,
      editingAmount,
      setEditingAmount,
      isSaving,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit
    },
    getCoreRowModel: getCoreRowModel(),
  });

  // 创建扣除表格实例
  const deductionTable = useReactTable({
    data: deductionItems,
    columns: deductionColumns,
    meta: {
      editingItemId,
      editingAmount,
      setEditingAmount,
      isSaving,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit
    },
    getCoreRowModel: getCoreRowModel(),
  });

  // 计算汇总
  const incomeTotal = useMemo(() =>
    incomeItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
    [incomeItems]
  );

  const deductionTotal = useMemo(() => {
    // 计算实际扣除总额（正数扣除 - 负数退款）
    const totalDeductions = deductionItems.reduce((sum, item) => sum + item.amount, 0);
    return totalDeductions;
  }, [deductionItems]);


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

      {/* 扣除项目表格 */}
      {deductionItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-red-700">扣除项目</h3>
            </div>
            <div className={`text-sm font-semibold ${deductionTotal < 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              合计: {deductionTotal < 0 ? '+' : '-'}{formatCurrency(Math.abs(deductionTotal))}
              {deductionTotal < 0 && <span className="ml-1 text-xs">(净退款)</span>}
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
    insuranceColumnHelper.accessor(row => row.insurance_type?.name, {
      id: 'insurance_type_name',
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
  const { showSuccess, showError } = useToast();

  // 使用缴费基数更新 hook
  const setContributionBaseMutation = useSetContributionBase();

  // 内联编辑状态管理
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [editingBaseAmount, setEditingBaseAmount] = useState<string>('');
  const [isSavingBase, setIsSavingBase] = useState(false);

  // 开始编辑缴费基数
  const handleStartEditBase = useCallback((baseId: string, currentAmount: number) => {
    console.log('[ContributionBaseSection] 🎯 开始编辑缴费基数:', {
      baseId,
      currentAmount
    });

    setEditingBaseId(baseId);
    setEditingBaseAmount(Math.abs(currentAmount).toString());
  }, []);

  // 取消编辑
  const handleCancelEditBase = useCallback(() => {
    setEditingBaseId(null);
    setEditingBaseAmount('');
  }, []);

  // 保存编辑
  const handleSaveEditBase = useCallback(async (base: ContributionBase, currentEditingAmount?: string) => {
    // 优先使用传入的当前编辑金额，避免闭包问题
    const amountToSave = currentEditingAmount ?? editingBaseAmount;

    if (!amountToSave.trim()) {
      showError('缴费基数不能为空');
      return;
    }

    const newAmount = parseFloat(amountToSave);
    if (isNaN(newAmount) || newAmount < 0) {
      showError('请输入有效的缴费基数');
      return;
    }

    // 如果金额没有变化，直接取消编辑
    if (Math.abs(newAmount - Math.abs(base.latest_contribution_base || base.contribution_base)) < 0.01) {
      handleCancelEditBase();
      return;
    }

    setIsSavingBase(true);
    try {
      console.log('[ContributionBaseSection] 🔧 保存缴费基数:', {
        baseId: base.id,
        employeeId: base.employee_id,
        insuranceTypeId: base.insurance_type_id,
        periodId: base.period_id,
        oldAmount: base.latest_contribution_base || base.contribution_base,
        newAmount: newAmount
      });

      // 使用 hook 更新缴费基数
      await setContributionBaseMutation.mutateAsync({
        employeeId: base.employee_id,
        insuranceTypeId: base.insurance_type_id,
        periodId: base.period_id || '',
        contributionBase: newAmount
      });

      console.log('[ContributionBaseSection] ✅ 缴费基数更新成功');
      showSuccess('缴费基数更新成功');

      // 成功后取消编辑状态
      handleCancelEditBase();

    } catch (error) {
      console.error('更新缴费基数失败:', error);
      showError('更新失败，请重试');
    } finally {
      setIsSavingBase(false);
    }
  }, [showError, showSuccess, handleCancelEditBase, setContributionBaseMutation, editingBaseAmount]);

  // 可编辑缴费基数单元格组件
  const EditableBaseAmountCell = ({
    base,
    currentEditingId,
    tableInfo
  }: {
    base: ContributionBase;
    currentEditingId?: string | null;
    tableInfo?: any;
  }) => {
    const actualEditingId = currentEditingId ?? editingBaseId;
    const isEditing = actualEditingId === base.id;
    const amount = base.latest_contribution_base || base.contribution_base;

    if (isEditing) {
      // 从 table meta 获取最新的 editingBaseAmount，避免闭包问题
      const { editingBaseAmount: metaEditingAmount } = tableInfo?.table?.options?.meta || {};
      const currentEditingAmount = metaEditingAmount ?? editingBaseAmount;

      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentEditingAmount}
            onChange={(e) => {
              // 从 table meta 获取 setEditingBaseAmount，避免闭包问题
              const { setEditingBaseAmount: metaSetEditingAmount } = tableInfo?.table?.options?.meta || {};
              if (metaSetEditingAmount) {
                metaSetEditingAmount(e.target.value);
              } else {
                setEditingBaseAmount(e.target.value);
              }
            }}
            className="input input-sm input-bordered w-24 text-right font-mono"
            step="0.01"
            min="0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEditBase(base, currentEditingAmount);
              } else if (e.key === 'Escape') {
                handleCancelEditBase();
              }
            }}
          />
          <div className="flex items-center gap-1">
            <button
              className="btn btn-xs btn-success"
              onClick={() => handleSaveEditBase(base, currentEditingAmount)}
              disabled={isSavingBase}
            >
              {isSavingBase ? (
                <span className="loading loading-xs loading-spinner"></span>
              ) : (
                '✓'
              )}
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={handleCancelEditBase}
              disabled={isSavingBase}
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-between group cursor-pointer hover:bg-base-200/50 p-1 -m-1 rounded"
        onClick={() => handleStartEditBase(base.id, amount)}
        title="点击编辑缴费基数"
      >
        <div className="text-right flex-1">
          <span className="text-sm font-semibold font-mono text-primary">
            {formatCurrency(amount)}
          </span>
        </div>
        <button className="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 ml-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  };

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
    contributionColumnHelper.accessor('latest_contribution_base' as keyof ContributionBase, {
      header: () => <div className="text-right">缴费基数</div>,
      cell: ({ row, table }) => (
        <EditableBaseAmountCell
          base={row.original}
          currentEditingId={editingBaseId}
          tableInfo={{ table }}
        />
      )
    }),
    contributionColumnHelper.accessor('latest_employee_rate' as keyof ContributionBase, {
      header: () => <div className="text-right">个人费率</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-mono text-info">
            {((info.getValue() as number || 0) * 100).toFixed(2)}%
          </span>
        </div>
      )
    }),
    contributionColumnHelper.accessor('latest_employer_rate' as keyof ContributionBase, {
      header: () => <div className="text-right">单位费率</div>,
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-mono text-success">
            {((info.getValue() as number || 0) * 100).toFixed(2)}%
          </span>
        </div>
      )
    }),
    contributionColumnHelper.display({
      id: 'total_rate',
      header: () => <div className="text-right">合计费率</div>,
      cell: ({ row }) => {
        const employeeRate = row.original.latest_employee_rate || 0;
        const employerRate = row.original.latest_employer_rate || 0;
        const totalRate = employeeRate + employerRate;
        return (
          <div className="text-right">
            <span className="text-sm font-semibold font-mono">
              {(totalRate * 100).toFixed(2)}%
            </span>
          </div>
        );
      }
    }),
    contributionColumnHelper.accessor('base_period_display' as keyof ContributionBase, {
      header: '月份',
      cell: info => (
        <span className="text-sm text-base-content/70">
          {info.getValue() as React.ReactNode}
        </span>
      )
    }),
    contributionColumnHelper.accessor('base_last_updated' as keyof ContributionBase, {
      header: '更新时间',
      cell: info => (
        <span className="text-sm text-base-content/60">
          {formatDate(String(info.getValue() || ''))}
        </span>
      )
    })
  ], [editingBaseId, handleStartEditBase, handleCancelEditBase, handleSaveEditBase, editingBaseAmount]);

  // 创建表格实例
  const contributionTable = useReactTable({
    data: contributionBases,
    columns: contributionColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      editingBaseId,
      editingBaseAmount,
      setEditingBaseAmount,
      isSavingBase,
      handleStartEditBase,
      handleCancelEditBase,
      handleSaveEditBase,
    },
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

    // 获取当前有效的基数（视图已过滤出最新数据）
    const currentBases = Object.entries(grouped).map(([type, bases]) => {
      // 取每个类型的第一个基数（视图已确保是最新的）
      return bases[0]?.latest_contribution_base || 0;
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
// 创建个税项目列辅助器
const taxItemColumnHelper = createColumnHelper<TaxItem>();

// 个税详情组件
interface TaxDetailsSectionProps {
  taxItems: TaxItem[];
}

function TaxDetailsSection({ taxItems }: TaxDetailsSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);
  const { showSuccess, showError } = useToast();

  // 使用薪资项目更新 hook
  const updateEarningMutation = useUpdateEarning();

  // 内联编辑状态管理
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [editingTaxAmount, setEditingTaxAmount] = useState<string>('');
  const [isSavingTax, setIsSavingTax] = useState(false);

  // 开始编辑个税项目
  const handleStartEditTax = useCallback((taxId: string, currentAmount: number) => {
    console.log('[TaxDetailsSection] 🎯 开始编辑个税项目:', {
      taxId,
      currentAmount
    });

    setEditingTaxId(taxId);
    setEditingTaxAmount(Math.abs(currentAmount).toString());
  }, []);

  // 取消编辑
  const handleCancelEditTax = useCallback(() => {
    setEditingTaxId(null);
    setEditingTaxAmount('');
  }, []);

  // 保存编辑
  const handleSaveEditTax = useCallback(async (taxItem: TaxItem, currentEditingAmount?: string) => {
    // 优先使用传入的当前编辑金额，避免闭包问题
    const amountToSave = currentEditingAmount ?? editingTaxAmount;

    if (!amountToSave.trim()) {
      showError('税额不能为空');
      return;
    }

    const newAmount = parseFloat(amountToSave);
    if (isNaN(newAmount) || newAmount < 0) {
      showError('请输入有效的税额');
      return;
    }

    // 如果金额没有变化，直接取消编辑
    if (Math.abs(newAmount - Math.abs(taxItem.amount)) < 0.01) {
      handleCancelEditTax();
      return;
    }

    setIsSavingTax(true);
    try {
      console.log('[TaxDetailsSection] 🔧 保存个税项目:', {
        itemId: taxItem.item_id,
        oldAmount: taxItem.amount,
        newAmount: newAmount
      });

      // 使用 hook 更新个税项目
      await updateEarningMutation.mutateAsync({
        earningId: taxItem.item_id,
        data: {
          amount: newAmount
        }
      });

      console.log('[TaxDetailsSection] ✅ 个税项目更新成功');
      showSuccess('个税项目更新成功');

      // 成功后取消编辑状态
      handleCancelEditTax();

    } catch (error) {
      console.error('更新个税项目失败:', error);
      showError('更新失败，请重试');
    } finally {
      setIsSavingTax(false);
    }
  }, [showError, showSuccess, handleCancelEditTax, updateEarningMutation, editingTaxAmount]);

  // 可编辑个税金额单元格组件
  const EditableTaxAmountCell = ({
    taxItem,
    currentEditingId,
    tableInfo
  }: {
    taxItem: TaxItem;
    currentEditingId?: string | null;
    tableInfo?: any;
  }) => {
    const actualEditingId = currentEditingId ?? editingTaxId;
    const isEditing = actualEditingId === taxItem.item_id;
    const amount = taxItem.amount;

    if (isEditing) {
      // 从 table meta 获取最新的 editingTaxAmount，避免闭包问题
      const { editingTaxAmount: metaEditingAmount } = tableInfo?.table?.options?.meta || {};
      const currentEditingAmount = metaEditingAmount ?? editingTaxAmount;

      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentEditingAmount}
            onChange={(e) => {
              // 从 table meta 获取 setEditingTaxAmount，避免闭包问题
              const { setEditingTaxAmount: metaSetEditingAmount } = tableInfo?.table?.options?.meta || {};
              if (metaSetEditingAmount) {
                metaSetEditingAmount(e.target.value);
              } else {
                setEditingTaxAmount(e.target.value);
              }
            }}
            className="input input-sm input-bordered w-24 text-right font-mono"
            step="0.01"
            min="0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEditTax(taxItem, currentEditingAmount);
              } else if (e.key === 'Escape') {
                handleCancelEditTax();
              }
            }}
          />
          <div className="flex items-center gap-1">
            <button
              className="btn btn-xs btn-success"
              onClick={() => handleSaveEditTax(taxItem, currentEditingAmount)}
              disabled={isSavingTax}
            >
              {isSavingTax ? (
                <span className="loading loading-xs loading-spinner"></span>
              ) : (
                '✓'
              )}
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={handleCancelEditTax}
              disabled={isSavingTax}
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-between group cursor-pointer hover:bg-base-200/50 p-1 -m-1 rounded"
        onClick={() => handleStartEditTax(taxItem.item_id, amount)}
        title="点击编辑税额"
      >
        <div className="text-right flex-1">
          <span className="text-sm font-bold font-mono text-error">
            {formatCurrency(amount)}
          </span>
        </div>
        <button className="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 ml-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  };

  // 定义表格列
  const taxColumns = useMemo(() => [
    taxItemColumnHelper.accessor('component_name', {
      header: '税目名称',
      cell: info => (
        <span className="text-sm font-medium text-base-content">
          {info.getValue()}
        </span>
      )
    }),
    taxItemColumnHelper.accessor('amount', {
      header: () => <div className="text-right">税额</div>,
      cell: ({ row, table }) => (
        <EditableTaxAmountCell
          taxItem={row.original}
          currentEditingId={editingTaxId}
          tableInfo={{ table }}
        />
      )
    }),
    taxItemColumnHelper.accessor('item_notes', {
      header: '备注',
      cell: info => (
        <span className="text-sm text-base-content/60">
          {info.getValue() || '-'}
        </span>
      )
    })
  ], [editingTaxId, handleStartEditTax, handleCancelEditTax, handleSaveEditTax, editingTaxAmount]);

  // 创建表格实例
  const taxTable = useReactTable({
    data: taxItems,
    columns: taxColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      editingTaxId,
      setEditingTaxId,
      editingTaxAmount,
      setEditingTaxAmount,
    },
  });

  // 计算个税总额
  const totalTaxAmount = taxItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  if (!taxItems.length) {
    return (
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <DocumentTextIcon className="w-5 h-5 text-primary" />
          个人所得税明细
        </h5>
        <div className="text-center py-8 text-base-content/60">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
          <p>本期无个人所得税扣缴记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 个税概览 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <DocumentTextIcon className="w-5 h-5 text-primary" />
          个人所得税明细
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-error/10 to-error/5 rounded-lg p-4">
            <div className="text-sm text-base-content/70 mb-1">个税总额</div>
            <div className="text-xl font-bold text-error">
              {formatCurrency(totalTaxAmount)}
            </div>
          </div>
          <div className="bg-gradient-to-r from-info/10 to-info/5 rounded-lg p-4">
            <div className="text-sm text-base-content/70 mb-1">税目数量</div>
            <div className="text-xl font-bold text-info">
              {taxItems.length} 项
            </div>
          </div>
        </div>
      </div>

      {/* 个税明细表格 */}
      <div className="space-y-4">
        <h6 className="font-medium text-sm text-base-content/80">详细税目信息</h6>

        <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-300">
          <table className="table table-zebra w-full">
            <thead>
              {taxTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="bg-base-200 text-base-content font-semibold text-xs">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {taxTable.getRowModel().rows.map(row => (
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

// 创建职务历史列辅助器
const jobHistoryColumnHelper = createColumnHelper<JobInfo['job_history'][0]>();

// 职务信息详情组件
interface JobInfoSectionProps {
  jobInfo: JobInfo | null;
  periodId?: string; // 添加周期ID信息用于显示
  employeeId?: string; // 添加员工ID用于编辑
}

function JobInfoSection({ jobInfo, periodId, employeeId }: JobInfoSectionProps) {
  const { t } = useTranslation(['payroll', 'common']);

  // 编辑状态管理
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{
    department_id: string;
    position_id: string;
    notes?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 新建状态管理
  const [isCreating, setIsCreating] = useState(false);
  const [newRecordData, setNewRecordData] = useState<{
    department_id: string;
    position_id: string;
    notes?: string;
  } | null>(null);

  // 获取部门和职位数据
  const { data: departments } = useDepartmentList();
  const { data: positions } = useEmployeePositions();
  const assignPosition = useAssignEmployeePosition();
  const { showSuccess, showError } = useToast();

  // 编辑处理函数
  const handleStartEdit = useCallback((row: JobInfo['job_history'][0]) => {
    setEditingRowId(row.id);
    setEditingData({
      department_id: row.department_id,
      position_id: row.position_id,
      notes: row.notes || ''
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRowId(null);
    setEditingData(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingRowId || !editingData || !employeeId) {
      console.warn('[PayrollDetailModal] 保存编辑缺少必要参数:', { editingRowId, editingData, employeeId });
      return;
    }

    // 🔍 关键修复：找到被编辑记录的原始 period_id
    const editingRecord = jobInfo?.job_history.find(record => record.id === editingRowId);
    const targetPeriodId = editingRecord?.period_id;

    if (!targetPeriodId) {
      console.error('[PayrollDetailModal] 无法找到被编辑记录的 period_id:', { editingRowId, jobInfo: jobInfo?.job_history });
      showError('无法确定职务记录所属周期，请刷新页面重试');
      return;
    }

    console.log('[PayrollDetailModal] 🎯 修复后的职务信息编辑:', {
      editingRowId,
      employeeId,
      originalPeriodId: targetPeriodId, // 使用记录本身的 period_id
      currentViewPeriodId: periodId, // 当前查看的薪资记录 period_id 
      editingData: {
        position_id: editingData.position_id,
        department_id: editingData.department_id,
        notes: editingData.notes
      }
    });

    setIsLoading(true);
    try {
      const mutationParams = {
        employeeId,
        positionId: editingData.position_id,
        departmentId: editingData.department_id,
        periodId: targetPeriodId, // 🔧 使用记录本身的 period_id，不是当前视图的
        notes: editingData.notes
      };

      console.log('[PayrollDetailModal] 调用 assignPosition.mutateAsync 参数:', mutationParams);

      const result = await assignPosition.mutateAsync(mutationParams);

      console.log('[PayrollDetailModal] assignPosition.mutateAsync 执行结果:', result);

      showSuccess('职务信息更新成功');
      setEditingRowId(null);
      setEditingData(null);
    } catch (error) {
      console.error('[PayrollDetailModal] 职务信息更新失败:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        editingData,
        employeeId,
        targetPeriodId
      });
      showError(`职务信息更新失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [editingRowId, editingData, employeeId, periodId, jobInfo, assignPosition, showSuccess, showError]);

  // 新建记录处理函数
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewRecordData({
      department_id: '',
      position_id: '',
      notes: ''
    });
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewRecordData(null);
  }, []);

  const handleSaveCreate = useCallback(async () => {
    if (!newRecordData || !employeeId || !periodId) {
      console.warn('[PayrollDetailModal] 创建职务记录缺少必要参数:', { newRecordData, employeeId, periodId });
      return;
    }
    if (!newRecordData.department_id || !newRecordData.position_id) {
      showError('请选择部门和职位');
      return;
    }

    console.log('[PayrollDetailModal] 🆕 开始创建新职务记录:', {
      employeeId,
      targetPeriodId: periodId, // 使用当前查看的薪资记录 period_id
      newRecordData: {
        position_id: newRecordData.position_id,
        department_id: newRecordData.department_id,
        notes: newRecordData.notes
      }
    });

    setIsLoading(true);
    try {
      const mutationParams = {
        employeeId,
        positionId: newRecordData.position_id,
        departmentId: newRecordData.department_id,
        periodId, // 🔧 对于新建，使用当前查看的薪资记录的 period_id
        notes: newRecordData.notes
      };

      console.log('[PayrollDetailModal] 创建职务记录参数:', mutationParams);

      const result = await assignPosition.mutateAsync(mutationParams);

      console.log('[PayrollDetailModal] 创建职务记录结果:', result);

      showSuccess('职务记录创建成功');
      setIsCreating(false);
      setNewRecordData(null);
    } catch (error) {
      console.error('[PayrollDetailModal] 创建职务记录失败:', {
        error,
        newRecordData,
        employeeId,
        periodId
      });
      showError('职务记录创建失败');
    } finally {
      setIsLoading(false);
    }
  }, [newRecordData, employeeId, periodId, assignPosition, showSuccess, showError]);

  // 定义职务历史表格列
  const jobHistoryColumns = useMemo(() => [
    jobHistoryColumnHelper.accessor('department_name', {
      header: '部门',
      cell: info => {
        const row = info.row.original;
        const isEditing = editingRowId === row.id;

        if (isEditing && editingData) {
          return (
            <select
              value={editingData.department_id}
              onChange={(e) => setEditingData(prev => prev ? {
                ...prev,
                department_id: e.target.value
              } : null)}
              className="select select-sm select-bordered w-full max-w-xs"
            >
              <option value="">选择部门</option>
              {departments?.filter(dept => dept.id).map(dept => (
                <option key={dept.id} value={dept.id!}>{dept.name}</option>
              ))}
            </select>
          );
        }

        return (
          <span className="text-sm font-medium text-base-content">
            {info.getValue()}
          </span>
        );
      }
    }),
    jobHistoryColumnHelper.accessor('position_name', {
      header: '职位',
      cell: info => {
        const row = info.row.original;
        const isEditing = editingRowId === row.id;

        if (isEditing && editingData) {
          return (
            <select
              value={editingData.position_id}
              onChange={(e) => setEditingData(prev => prev ? {
                ...prev,
                position_id: e.target.value
              } : null)}
              className="select select-sm select-bordered w-full max-w-xs"
            >
              <option value="">选择职位</option>
              {positions?.filter(pos => pos.id).map(pos => (
                <option key={pos.id} value={pos.id!}>{pos.name}</option>
              ))}
            </select>
          );
        }

        return (
          <span className="text-sm font-medium text-base-content">
            {info.getValue()}
          </span>
        );
      }
    }),
    jobHistoryColumnHelper.accessor('period_name', {
      header: '薪资周期',
      cell: info => (
        <span className="text-sm font-medium text-primary">
          {info.getValue() || '-'}
        </span>
      )
    }),
    jobHistoryColumnHelper.accessor('employment_status', {
      header: '就业状态',
      cell: info => (
        <span className="badge badge-sm badge-ghost">
          {info.getValue()}
        </span>
      )
    }),
    jobHistoryColumnHelper.accessor('start_date', {
      header: '开始日期',
      cell: info => (
        <span className="text-sm text-base-content/70">
          {formatDate(info.getValue())}
        </span>
      )
    }),
    jobHistoryColumnHelper.accessor('end_date', {
      header: '结束日期',
      cell: info => {
        const endDate = info.getValue();
        const isCurrent = info.row.original.is_current;
        return (
          <span className={cn(
            "text-sm",
            isCurrent ? "text-success font-medium" : "text-base-content/70"
          )}>
            {endDate ? formatDate(endDate) : (isCurrent ? '至今' : '-')}
          </span>
        );
      }
    }),
    jobHistoryColumnHelper.accessor('is_current', {
      header: '当前职位',
      cell: info => (
        <div className="flex items-center justify-center">
          {info.getValue() ? (
            <span className="badge badge-success badge-sm">当前</span>
          ) : (
            <span className="text-base-content/30">-</span>
          )}
        </div>
      )
    }),
    jobHistoryColumnHelper.accessor('notes', {
      header: '备注',
      cell: info => {
        const row = info.row.original;
        const isEditing = editingRowId === row.id;

        if (isEditing && editingData) {
          return (
            <input
              type="text"
              value={editingData.notes || ''}
              onChange={(e) => setEditingData(prev => prev ? {
                ...prev,
                notes: e.target.value
              } : null)}
              className="input input-sm input-bordered w-full"
              placeholder="输入备注"
            />
          );
        }

        return (
          <span className="text-sm text-base-content/60">
            {info.getValue() || '-'}
          </span>
        );
      }
    }),
    // 操作列
    jobHistoryColumnHelper.display({
      id: 'actions',
      header: '操作',
      cell: info => {
        const row = info.row.original;
        const isEditing = editingRowId === row.id;

        if (isEditing) {
          return (
            <div className="flex gap-1">
              <button
                onClick={handleSaveEdit}
                disabled={isLoading || !editingData?.department_id || !editingData?.position_id}
                className="btn btn-xs btn-success"
                title="保存"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="btn btn-xs btn-ghost"
                title="取消"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        }

        return (
          <div className="flex gap-1">
            <button
              onClick={() => handleStartEdit(row)}
              className="btn btn-xs btn-ghost text-primary"
              title="编辑"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        );
      }
    })
  ], [editingRowId, editingData, isLoading, departments, positions, handleStartEdit, handleCancelEdit, handleSaveEdit]);

  // 创建职务历史表格实例
  const jobHistoryTable = useReactTable({
    data: jobInfo?.job_history || [],
    columns: jobHistoryColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!jobInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
          <BriefcaseIcon className="w-8 h-8 text-base-content/30" />
        </div>
        <p className="text-base-content/60 text-sm">
          {periodId ? `当前薪资周期暂无职务信息` : '暂无职务信息'}
        </p>
        <p className="text-base-content/40 text-xs mt-2">
          该员工在当前薪资周期内未分配身份类别或职务记录
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 员工身份类别 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <UserCircleIcon className="w-5 h-5 text-primary" />
          员工身份类别
        </h5>

        {jobInfo.employee_category ? (
          <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-lg p-4 border border-primary/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">身份类别</label>
                <div className="px-3 py-2 bg-base-100 rounded-lg border">
                  <span className="text-base font-medium text-primary">
                    {jobInfo.employee_category.name}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">分配时间</label>
                <div className="px-3 py-2 bg-base-100 rounded-lg border">
                  <span className="text-base text-base-content">
                    {formatDate(jobInfo.employee_category.assigned_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-base-200/30 rounded-lg">
            <UserCircleIcon className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
            <p className="text-base-content/60 text-sm">
              {periodId ? `当前薪资周期内未分配身份类别` : '该薪资周期内未分配身份类别'}
            </p>
          </div>
        )}
      </div>

      {/* 职务历史记录 */}
      <div className="space-y-4">
        <h5 className="font-semibold text-base flex items-center gap-2 pb-2 border-b border-base-300">
          <BriefcaseIcon className="w-5 h-5 text-primary" />
          职务历史记录
        </h5>

        {jobInfo.job_history.length > 0 ? (
          <div className="space-y-4">
            {/* 当前职位概览 */}
            {(() => {
              const currentJob = jobInfo.job_history.find(job => job.is_current);
              return currentJob ? (
                <div className="bg-gradient-to-r from-success/5 via-success/3 to-transparent rounded-lg p-4 border border-success/10">
                  <h6 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    当前职位
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-base-content/60 mb-1">部门</p>
                      <p className="text-base font-semibold text-success">
                        {currentJob.department_name}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-base-content/60 mb-1">职位</p>
                      <p className="text-base font-semibold text-success">
                        {currentJob.position_name}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-base-content/60 mb-1">任职时间</p>
                      <p className="text-base font-semibold text-success">
                        {formatDate(currentJob.start_date)} 至今
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* 职务历史表格 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <BriefcaseIcon className="w-4 h-4" />
                  </div>
                  <h6 className="text-sm font-semibold text-primary">职务变更历史</h6>
                </div>

                {/* 添加新记录按钮 */}
                {employeeId && periodId && !isCreating && (
                  <button
                    onClick={handleStartCreate}
                    className="btn btn-primary btn-xs"
                    title="添加新的职务记录"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加记录
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    {jobHistoryTable.getHeaderGroups().map(headerGroup => (
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
                    {jobHistoryTable.getRowModel().rows.map(row => (
                      <tr key={row.id} className={cn(
                        "hover:bg-base-100/50",
                        row.original.is_current && "bg-success/5"
                      )}>
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

              {/* 新建记录表单（在表格下方显示） */}
              {isCreating && (
                <div className="bg-base-100 rounded-lg p-4 border border-primary/20 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      添加新的职务记录
                    </h6>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* 部门选择 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-base-content/70">部门 *</label>
                      <select
                        value={newRecordData?.department_id || ''}
                        onChange={(e) => setNewRecordData(prev => prev ? {
                          ...prev,
                          department_id: e.target.value
                        } : null)}
                        className="select select-bordered w-full"
                      >
                        <option value="">选择部门</option>
                        {departments?.filter(dept => dept.id).map(dept => (
                          <option key={dept.id} value={dept.id!}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 职位选择 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-base-content/70">职位 *</label>
                      <select
                        value={newRecordData?.position_id || ''}
                        onChange={(e) => setNewRecordData(prev => prev ? {
                          ...prev,
                          position_id: e.target.value
                        } : null)}
                        className="select select-bordered w-full"
                      >
                        <option value="">选择职位</option>
                        {positions?.filter(pos => pos.id).map(pos => (
                          <option key={pos.id} value={pos.id!}>{pos.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 备注 */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium text-base-content/70">备注</label>
                    <textarea
                      value={newRecordData?.notes || ''}
                      onChange={(e) => setNewRecordData(prev => prev ? {
                        ...prev,
                        notes: e.target.value
                      } : null)}
                      className="textarea textarea-bordered w-full"
                      placeholder="请输入备注信息（可选）"
                      rows={2}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelCreate}
                      disabled={isLoading}
                      className="btn btn-ghost btn-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveCreate}
                      disabled={isLoading || !newRecordData?.department_id || !newRecordData?.position_id}
                      className="btn btn-primary btn-sm"
                    >
                      {isLoading ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <>保存</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 无职务记录时的显示和创建界面 */}
            {!isCreating ? (
              <div className="text-center py-8 bg-base-200/30 rounded-lg">
                <BriefcaseIcon className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
                <p className="text-base-content/60 text-sm">
                  {periodId ? `当前薪资周期暂无职务记录` : '暂无职务历史记录'}
                </p>
                <p className="text-base-content/40 text-xs mt-2 mb-4">
                  该员工在当前薪资周期内未创建职务分配记录
                </p>
                {employeeId && periodId && (
                  <button
                    onClick={handleStartCreate}
                    className="btn btn-primary btn-sm"
                    title="创建职务记录"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建职务记录
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <div className="flex items-center justify-between mb-4">
                  <h6 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建新的职务记录
                  </h6>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 部门选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70">部门 *</label>
                    <select
                      value={newRecordData?.department_id || ''}
                      onChange={(e) => setNewRecordData(prev => prev ? {
                        ...prev,
                        department_id: e.target.value
                      } : null)}
                      className="select select-bordered w-full"
                    >
                      <option value="">选择部门</option>
                      {departments?.filter(dept => dept.id).map(dept => (
                        <option key={dept.id} value={dept.id!}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 职位选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70">职位 *</label>
                    <select
                      value={newRecordData?.position_id || ''}
                      onChange={(e) => setNewRecordData(prev => prev ? {
                        ...prev,
                        position_id: e.target.value
                      } : null)}
                      className="select select-bordered w-full"
                    >
                      <option value="">选择职位</option>
                      {positions?.filter(pos => pos.id).map(pos => (
                        <option key={pos.id} value={pos.id!}>{pos.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 备注 */}
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-base-content/70">备注</label>
                  <textarea
                    value={newRecordData?.notes || ''}
                    onChange={(e) => setNewRecordData(prev => prev ? {
                      ...prev,
                      notes: e.target.value
                    } : null)}
                    className="textarea textarea-bordered w-full"
                    placeholder="请输入备注信息（可选）"
                    rows={2}
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelCreate}
                    disabled={isLoading}
                    className="btn btn-ghost btn-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveCreate}
                    disabled={isLoading || !newRecordData?.department_id || !newRecordData?.position_id}
                    className="btn btn-primary btn-sm"
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>保存</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}