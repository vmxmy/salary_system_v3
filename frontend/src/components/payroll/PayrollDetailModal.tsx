import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AccordionSection, AccordionContent } from '@/components/common/AccordionSection';
import { DetailField } from '@/components/common/DetailField';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { PayrollStatus, type PayrollStatusType, useEmployeeInsuranceDetails } from '@/hooks/payroll';
import { useEmployeeCategoryByPeriod } from '@/hooks/payroll/useEmployeeCategory';
import { useEmployeePositionByPeriod, useEmployeePositionHistory, useAssignEmployeePosition } from '@/hooks/payroll/useEmployeePosition';
import { useDepartmentList } from '@/hooks/department/useDepartments';
import { useEmployeePositions } from '@/hooks/payroll/useEmployeePosition';
import { useEmployeeContributionBasesByPeriod } from '@/hooks/payroll/useContributionBase';
import { useBatchInsuranceCalculation } from '@/hooks/insurance/useBatchInsuranceCalculation';
import { usePayrollCalculation } from '@/hooks/payroll/usePayrollCalculation';
import { CalculationProgressModal, INSURANCE_CALCULATION_STEPS, PAYROLL_CALCULATION_STEPS } from './CalculationProgressModal';
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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [payrollData, setPayrollData] = useState<PayrollDetailData | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItemDetail[]>([]);
  // contributionBases现在从hook中获取，不需要单独的state
  const [taxItems, setTaxItems] = useState<TaxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  // 计算功能相关状态
  const [showCalculationProgress, setShowCalculationProgress] = useState(false);
  const [calculationSteps, setCalculationSteps] = useState<any[]>([]);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [currentCalculationStep, setCurrentCalculationStep] = useState<string>('');

  // 计算hooks
  const { calculateBatchInsurance } = useBatchInsuranceCalculation();
  const { calculateBatch: calculatePayrollBatch } = usePayrollCalculation();
  
  // 使用hook获取五险一金数据
  const { data: insuranceDetails = [], isLoading: insuranceLoading } = useEmployeeInsuranceDetails(payrollId || '');
  
  // 使用hook获取缴费基数数据
  const [employeeId, setEmployeeId] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const { data: contributionBasesData = [], isLoading: basesLoading } = useEmployeeContributionBasesByPeriod(employeeId, periodId);

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

      // 从薪资明细中筛选个税项目（在获取薪资明细后处理）
      setTaxItems([]);

      // 获取薪资明细项
      try {
        console.log('开始获取薪资明细，payrollId:', payrollId);
        const { data: items, error: itemsError } = await supabase
          .from('view_payroll_unified')
          .select('*')
          .eq('payroll_id', payrollId)
          .not('item_id', 'is', null)
          .order('category', { ascending: true })
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
              category_display_name: items[0]?.category,
              component_name: items[0]?.component_name,
              amount: items[0]?.amount
            }
          } : null
        });
        setPayrollItems(items as PayrollItemDetail[]);
        
        // 从薪资明细中筛选个税项目
        const taxRelatedItems = (items as PayrollItemDetail[]).filter(item => 
          item.category === 'personal_tax' || 
          item.component_name.includes('个人所得税') ||
          item.component_name.includes('个税')
        );
        
        const taxItems: TaxItem[] = taxRelatedItems.map(item => ({
          item_id: item.item_id,
          component_name: item.component_name,
          amount: item.amount,
          item_notes: item.item_notes
        }));
        
        setTaxItems(taxItems);
        console.log('筛选出的个税项目:', taxItems);
      } catch (itemError) {
        console.error('获取薪资明细失败:', itemError);
        setPayrollItems([]);
        setTaxItems([]);
      }

      // Note: 职务信息现在由JobTab组件中的hooks直接获取
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

  // 重置状态
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open]);

  // 单个薪资记录五险一金计算
  const handleCalculateInsurance = useCallback(async () => {
    if (!payrollData?.employee_id || !payrollData?.period_id) {
      showError('缺少必要信息，无法进行五险一金计算');
      return;
    }

    try {
      setShowCalculationProgress(true);
      setCalculationSteps(INSURANCE_CALCULATION_STEPS.map(step => ({ ...step, status: 'pending' })));
      setCalculationProgress(0);

      // Step 1: 准备计算数据
      setCurrentCalculationStep('insurance_prepare');
      setCalculationSteps(prev => prev.map(step => 
        step.id === 'insurance_prepare' 
          ? { ...step, status: 'running', message: '正在准备员工五险一金计算数据...' }
          : step
      ));
      setCalculationProgress(20);

      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟准备时间

      // Step 2: 执行计算
      setCurrentCalculationStep('insurance_calculate');
      setCalculationSteps(prev => prev.map(step => {
        if (step.id === 'insurance_prepare') return { ...step, status: 'completed' };
        if (step.id === 'insurance_calculate') return { ...step, status: 'running', message: '正在计算五险一金...' };
        return step;
      }));
      setCalculationProgress(60);

      // 调用单个员工计算
      await calculateBatchInsurance({
        periodId: payrollData.period_id!,
        employeeIds: [payrollData.employee_id!],
        saveToDatabase: true
      });

      // Step 3: 保存结果
      setCurrentCalculationStep('insurance_save');
      setCalculationSteps(prev => prev.map(step => {
        if (step.id === 'insurance_calculate') return { ...step, status: 'completed' };
        if (step.id === 'insurance_save') return { ...step, status: 'running', message: '正在保存计算结果...' };
        return step;
      }));
      setCalculationProgress(90);

      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存时间

      // 完成
      setCalculationSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
      setCalculationProgress(100);

      showSuccess('五险一金重算完成');
      
      // 刷新数据
      await fetchPayrollData();

    } catch (error) {
      console.error('五险一金计算失败:', error);
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: '计算失败' } : step
      ));
      showError('五险一金计算失败');
    }
  }, [payrollData, calculateBatchInsurance, showSuccess, showError, fetchPayrollData]);

  // 单个薪资记录薪资汇总计算
  const handleCalculatePayroll = useCallback(async () => {
    if (!payrollData?.employee_id || !payrollData?.period_id) {
      showError('缺少必要信息，无法进行薪资汇总计算');
      return;
    }

    try {
      setShowCalculationProgress(true);
      setCalculationSteps(PAYROLL_CALCULATION_STEPS.map(step => ({ ...step, status: 'pending' })));
      setCalculationProgress(0);

      // Step 1: 准备计算数据
      setCurrentCalculationStep('payroll_prepare');
      setCalculationSteps(prev => prev.map(step => 
        step.id === 'payroll_prepare' 
          ? { ...step, status: 'running', message: '正在准备员工薪资汇总计算数据...' }
          : step
      ));
      setCalculationProgress(20);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: 执行计算
      setCurrentCalculationStep('payroll_calculate');
      setCalculationSteps(prev => prev.map(step => {
        if (step.id === 'payroll_prepare') return { ...step, status: 'completed' };
        if (step.id === 'payroll_calculate') return { ...step, status: 'running', message: '正在计算薪资汇总...' };
        return step;
      }));
      setCalculationProgress(60);

      // 调用单个员工薪资计算
      await calculatePayrollBatch([payrollData.id], true);

      // Step 3: 保存结果
      setCurrentCalculationStep('payroll_save');
      setCalculationSteps(prev => prev.map(step => {
        if (step.id === 'payroll_calculate') return { ...step, status: 'completed' };
        if (step.id === 'payroll_save') return { ...step, status: 'running', message: '正在保存计算结果...' };
        return step;
      }));
      setCalculationProgress(90);

      await new Promise(resolve => setTimeout(resolve, 500));

      // 完成
      setCalculationSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
      setCalculationProgress(100);

      showSuccess('薪资汇总重算完成');
      
      // 刷新数据
      await fetchPayrollData();

    } catch (error) {
      console.error('薪资汇总计算失败:', error);
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: '计算失败' } : step
      ));
      showError('薪资汇总计算失败');
    }
  }, [payrollData, calculatePayrollBatch, showSuccess, showError, fetchPayrollData]);

  // 单个薪资记录全部重算
  const handleCalculateAll = useCallback(async () => {
    if (!payrollData?.employee_id || !payrollData?.period_id) {
      showError('缺少必要信息，无法进行全部重算');
      return;
    }

    try {
      setShowCalculationProgress(true);
      const allSteps = [...INSURANCE_CALCULATION_STEPS, ...PAYROLL_CALCULATION_STEPS];
      setCalculationSteps(allSteps.map(step => ({ ...step, status: 'pending' })));
      setCalculationProgress(0);

      const employee = { employee_id: payrollData.employee_id, period_id: payrollData.period_id };

      // 五险一金计算流程
      for (let i = 0; i < INSURANCE_CALCULATION_STEPS.length; i++) {
        const step = INSURANCE_CALCULATION_STEPS[i];
        setCurrentCalculationStep(step.id);
        
        setCalculationSteps(prev => prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'running', message: `正在${step.name}...` }
            : s
        ));

        if (step.id === 'insurance_calculate') {
          await calculateBatchInsurance({
            periodId: payrollData.period_id!,
            employeeIds: [payrollData.employee_id!],
            saveToDatabase: true
          });
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setCalculationSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'completed' } : s
        ));
        setCalculationProgress(((i + 1) / (allSteps.length)) * 50); // 前50%
      }

      // 薪资汇总计算流程
      for (let i = 0; i < PAYROLL_CALCULATION_STEPS.length; i++) {
        const step = PAYROLL_CALCULATION_STEPS[i];
        setCurrentCalculationStep(step.id);
        
        setCalculationSteps(prev => prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'running', message: `正在${step.name}...` }
            : s
        ));

        if (step.id === 'payroll_calculate') {
          await calculatePayrollBatch([payrollData.id], true);
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setCalculationSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'completed' } : s
        ));
        setCalculationProgress(50 + ((i + 1) / PAYROLL_CALCULATION_STEPS.length) * 50); // 后50%
      }

      setCalculationProgress(100);
      showSuccess('全部重算完成');
      
      // 刷新数据
      await fetchPayrollData();

    } catch (error) {
      console.error('全部重算失败:', error);
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: '计算失败' } : step
      ));
      showError('全部重算失败');
    }
  }, [payrollData, calculateBatchInsurance, calculatePayrollBatch, showSuccess, showError, fetchPayrollData]);

  // Tab配置
  const tabs = [
    { id: 'overview', label: '薪资概览', icon: CurrencyDollarIcon },
    { id: 'breakdown', label: '收入明细', icon: CalculatorIcon },
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
                  <p className="text-xl font-bold text-error font-mono">
                    -{formatCurrency(payrollData.total_deductions)}
                  </p>
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
        <div className="modal-box max-w-6xl max-h-[92vh] p-0 overflow-hidden">
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

            {/* 计算按钮组 */}
            {payrollData && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-base-content/70">
                  单个薪资记录计算操作
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCalculateInsurance}
                    disabled={isLoading}
                    className="btn btn-info btn-sm gap-2"
                    title="重算该员工的五险一金"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    重算五险一金
                  </button>

                  <button
                    onClick={handleCalculatePayroll}
                    disabled={isLoading}
                    className="btn btn-warning btn-sm gap-2"
                    title="重算该员工的薪资汇总"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                    </svg>
                    重算薪资汇总
                  </button>

                  <button
                    onClick={handleCalculateAll}
                    disabled={isLoading}
                    className="btn btn-accent btn-sm gap-2"
                    title="重算该员工的全部数据（五险一金+薪资汇总）"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重算全部
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Content Area with Sidebar Navigation */}
          <div className="flex h-[calc(92vh-8rem)]">
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
              {(isLoading || insuranceLoading || basesLoading) ? (
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
          <div className="border-t border-base-300 p-4 bg-base-200/30">
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

      {/* 计算进度模态框 */}
      <CalculationProgressModal
        isOpen={showCalculationProgress}
        onClose={() => setShowCalculationProgress(false)}
        title={
          currentCalculationStep?.includes('insurance') ? '五险一金计算进度' :
          currentCalculationStep?.includes('payroll') ? '薪资汇总计算进度' :
          '计算进度'
        }
        steps={calculationSteps}
        currentStep={currentCalculationStep}
        totalProgress={calculationProgress}
        allowCancel={false}
      />
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
  
  // 按 category 分组薪资项目
  const groupedItems = payrollItems.reduce((acc, item) => {
    const category = item.category;
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

  // 准备表格数据
  const incomeItems = useMemo(() => {
    return Object.entries(groupedItems)
      .filter(([, items]) => items[0]?.component_type === 'earning')
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
    columnHelper.accessor('category' as any, {
      header: '分类',
      cell: (info: any) => (
        <span className="text-xs text-base-content/70">
          {info.row.original.category || '未知分类'}
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


  // 创建收入表格实例
  const incomeTable = useReactTable({
    data: incomeItems,
    columns: incomeColumns,
    getCoreRowModel: getCoreRowModel(),
  });


  // 计算汇总
  const incomeTotal = useMemo(() => 
    incomeItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
    [incomeItems]
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
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-semibold font-mono text-primary">
            {formatCurrency(info.getValue() as number)}
          </span>
        </div>
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
      header: '税额',
      cell: info => (
        <div className="text-right">
          <span className="text-sm font-bold font-mono text-error">
            {formatCurrency(info.getValue())}
          </span>
        </div>
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
  ], []);

  // 创建表格实例
  const taxTable = useReactTable({
    data: taxItems,
    columns: taxColumns,
    getCoreRowModel: getCoreRowModel(),
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
    if (!editingRowId || !editingData || !employeeId || !periodId) return;

    setIsLoading(true);
    try {
      await assignPosition.mutateAsync({
        employeeId,
        positionId: editingData.position_id,
        departmentId: editingData.department_id,
        periodId,
        notes: editingData.notes
      });

      showSuccess('职务信息更新成功');
      setEditingRowId(null);
      setEditingData(null);
    } catch (error) {
      showError('职务信息更新失败');
      console.error('Update position error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [editingRowId, editingData, employeeId, periodId, assignPosition, showSuccess, showError]);

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
    if (!newRecordData || !employeeId || !periodId) return;
    if (!newRecordData.department_id || !newRecordData.position_id) {
      showError('请选择部门和职位');
      return;
    }

    setIsLoading(true);
    try {
      await assignPosition.mutateAsync({
        employeeId,
        positionId: newRecordData.position_id,
        departmentId: newRecordData.department_id,
        periodId,
        notes: newRecordData.notes
      });

      showSuccess('职务记录创建成功');
      setIsCreating(false);
      setNewRecordData(null);
    } catch (error) {
      showError('职务记录创建失败');
      console.error('Create position error:', error);
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