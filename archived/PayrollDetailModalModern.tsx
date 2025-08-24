import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { TabbedModal } from '@/components/common/ResponsiveModal';
import { InfoCard, StatCard, DataGrid, FieldDisplay } from '@/components/common/CardLayouts';
import { usePayrollDetails, usePayrolls, useEmployeeInsuranceDetails } from '@/hooks/payroll/usePayroll';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  CurrencyDollarIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

// Types (same as original)
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
  status: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PayrollItemDetail {
  item_id: string;
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  period_code?: string;
  period_name?: string;
  period_start?: string;
  period_end?: string;
  component_id: string;
  component_name: string;
  component_type: 'earning' | 'deduction';
  category_name?: string;
  category?: string; // 兼容性字段
  amount: number;
  item_notes?: string;
  gross_pay: number;
  net_pay: number;
  total_deductions: number;
}

interface PayrollDetailModalModernProps {
  payrollId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PayrollDetailModalModern({ 
  payrollId, 
  open, 
  onClose 
}: PayrollDetailModalModernProps) {
  const { t } = useTranslation(['payroll', 'common']);
  
  // 使用 hooks 获取数据
  const { 
    data: payrollItems = [], 
    isLoading, 
    error 
  } = usePayrollDetails(payrollId || '');
  
  // 获取薪资汇总信息（用于基本信息显示）
  const { 
    data: payrollsData 
  } = usePayrolls({ 
    page: 1, 
    pageSize: 1000 // 暂时使用大数值获取所有数据，后续可优化为单个查询
  });

  // 从薪资列表中找到当前薪资的基本信息
  const payrollData = useMemo(() => {
    if (!payrollId || !payrollsData?.data) return null;
    
    const found = payrollsData.data.find(p => p.payroll_id === payrollId);
    if (!found) return null;
    
    return {
      id: found.payroll_id,
      employee_id: found.employee_id,
      pay_period_start: found.pay_period_start || '',
      pay_period_end: found.pay_period_end || '',
      pay_date: found.pay_date,
      status: found.status,
      gross_pay: found.gross_pay,
      total_deductions: found.total_deductions,
      net_pay: found.net_pay,
      employee: found.employee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as PayrollDetailData;
  }, [payrollId, payrollsData]);

  // 类别名称映射 - 将英文类别名转换为更友好的中文名称
  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'basic_salary': '基础薪资',
      'allowances': '津贴补贴', 
      'bonuses': '奖金',
      'overtime': '加班费',
      'other_earnings': '其他收入',
      'personal_insurance': '个人社保',
      'employer_insurance': '单位社保',
      'personal_tax': '个人所得税',
      'other_deductions': '其他扣除',
      'housing_fund': '住房公积金',
      'pension_insurance': '养老保险',
      'medical_insurance': '医疗保险',
      'unemployment_insurance': '失业保险',
      'work_injury_insurance': '工伤保险',
      'maternity_insurance': '生育保险'
    };
    return categoryMap[category] || category || '未分类';
  };

  // 类别排序优先级 - 确保合理的显示顺序
  const getCategorySortOrder = (category: string): number => {
    const orderMap: Record<string, number> = {
      'basic_salary': 1,
      'allowances': 2,
      'bonuses': 3,
      'overtime': 4,
      'other_earnings': 5,
      'personal_tax': 6,
      'personal_insurance': 7,
      'other_deductions': 8, // 确保其他扣除显示在合适位置
      'employer_insurance': 9
    };
    return orderMap[category] || 99;
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const grouped = payrollItems.reduce((acc, item) => {
      const category = (item as any).category_name || item.category || '未分类';
      if (!acc[category]) {
        acc[category] = [];
      }
      // 转换数据格式以匹配 PayrollItemDetail 接口
      const convertedItem: PayrollItemDetail = {
        item_id: (item as any).item_id || '',
        payroll_id: item.payroll_id || '',
        employee_id: item.employee_id || '',
        employee_name: item.employee_name || '',
        component_id: item.component_id || '',
        component_name: item.component_name || '',
        component_type: (item as any).component_type || 'earning',
        category_name: (item as any).category_name,
        category: item.category || '',
        amount: item.amount || 0,
        item_notes: (item as any).item_notes,
        gross_pay: item.gross_pay || 0,
        net_pay: item.net_pay || 0,
        total_deductions: item.total_deductions || 0
      };
      acc[category].push(convertedItem);
      return acc;
    }, {} as Record<string, PayrollItemDetail[]>);

    // 按类别优先级排序
    const sortedEntries = Object.entries(grouped).sort(([categoryA], [categoryB]) => {
      return getCategorySortOrder(categoryA) - getCategorySortOrder(categoryB);
    });

    return Object.fromEntries(sortedEntries);
  }, [payrollItems]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const income = payrollItems
      .filter(item => (item as any).component_type === 'earning')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const deductions = payrollItems
      .filter(item => (item as any).component_type === 'deduction')
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      income,
      deductions,
      itemCount: payrollItems.length
    };
  }, [payrollItems]);

  // Tab definitions
  const tabs = [
    {
      id: 'overview',
      label: '薪资概览',
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      content: (
        <OverviewTab 
          payrollData={payrollData} 
          statistics={statistics}
          isLoading={isLoading}
        />
      )
    },
    {
      id: 'breakdown',
      label: '薪资明细',
      icon: <CalculatorIcon className="w-4 h-4" />,
      content: (
        <BreakdownTab 
          groupedItems={groupedItems}
          isLoading={isLoading}
          getCategoryDisplayName={getCategoryDisplayName}
        />
      )
    },
    {
      id: 'insurance',
      label: '五险一金',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      content: <InsuranceTab payrollId={payrollId} />
    },
    {
      id: 'tax',
      label: '个人所得税',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      content: <TaxTab payrollItems={Object.values(groupedItems).flat()} />
    },
    {
      id: 'job',
      label: '职务信息',
      icon: <BriefcaseIcon className="w-4 h-4" />,
      content: <JobTab employeeId={payrollData?.employee_id} />
    }
  ];

  return (
    <TabbedModal
      open={open}
      onClose={onClose}
      title="薪资详情"
      tabs={tabs}
      variant="default"
      footer={
        <div className="flex justify-between items-center">
          <div className="text-sm text-base-content/60">
            {payrollData?.employee?.employee_name} · {formatDate(payrollData?.pay_date || '')}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      }
    />
  );
}

// Enhanced Overview Tab with Modern Cards
function OverviewTab({ 
  payrollData, 
  statistics,
  isLoading 
}: { 
  payrollData: PayrollDetailData | null;
  statistics: { income: number; deductions: number; itemCount: number };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <StatCard
              key={i}
              title="Loading..."
              value="--"
              loading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!payrollData) return null;

  return (
    <div className="space-y-6">
      {/* Salary Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="应发工资"
          value={formatCurrency(payrollData.gross_pay)}
          variant="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
            </svg>
          }
        />
        
        <StatCard
          title="扣除合计"
          value={
            payrollData.total_deductions < 0 
              ? `+${formatCurrency(Math.abs(payrollData.total_deductions))}` 
              : formatCurrency(payrollData.total_deductions)
          }
          variant={payrollData.total_deductions < 0 ? "success" : "error"}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          }
        />
        
        <StatCard
          title="实发工资"
          value={formatCurrency(payrollData.net_pay)}
          variant="primary"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Employee Basic Information */}
      <InfoCard
        title="员工基本信息"
        icon={<UserCircleIcon className="w-6 h-6" />}
        variant="default"
      >
        <DataGrid columns={2}>
          <FieldDisplay
            label="员工姓名"
            value={payrollData.employee?.employee_name}
          />
          <FieldDisplay
            label="身份证号"
            value={payrollData.employee?.id_number}
            copyable
          />
          <FieldDisplay
            label="薪资期间"
            value={`${formatDate(payrollData.pay_period_start)} 至 ${formatDate(payrollData.pay_period_end)}`}
          />
          <FieldDisplay
            label="发薪日期"
            value={formatDate(payrollData.pay_date)}
          />
          <FieldDisplay
            label="薪资状态"
            value={
              <span className={`badge badge-sm ${
                payrollData.status === 'paid' ? 'badge-success' :
                payrollData.status === 'approved' ? 'badge-info' :
                'badge-warning'
              }`}>
                {payrollData.status === 'paid' ? '已支付' :
                 payrollData.status === 'approved' ? '已审批' : '草稿'}
              </span>
            }
          />
          <FieldDisplay
            label="薪资ID"
            value={payrollData.id}
            copyable
            variant="muted"
          />
        </DataGrid>
      </InfoCard>

      {/* Statistics Summary */}
      <InfoCard
        title="数据统计"
        icon={<CalculatorIcon className="w-6 h-6" />}
        variant="info"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-base-200/50 rounded-lg">
            <div className="text-2xl font-bold text-success">
              {formatCurrency(statistics.income)}
            </div>
            <div className="text-sm text-base-content/60">收入项目</div>
          </div>
          <div className="text-center p-4 bg-base-200/50 rounded-lg">
            <div className={`text-2xl font-bold ${
              statistics.deductions < 0 ? 'text-success' : 'text-error'
            }`}>
              {statistics.deductions < 0 ? '+' : '-'}{formatCurrency(Math.abs(statistics.deductions))}
            </div>
            <div className="text-sm text-base-content/60">
              {statistics.deductions < 0 ? '退款项目' : '扣除项目'}
            </div>
          </div>
          <div className="text-center p-4 bg-base-200/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {statistics.itemCount}
            </div>
            <div className="text-sm text-base-content/60">明细项目</div>
          </div>
        </div>
      </InfoCard>
    </div>
  );
}

// Modern Breakdown Tab
function BreakdownTab({ 
  groupedItems,
  isLoading,
  getCategoryDisplayName
}: { 
  groupedItems: Record<string, PayrollItemDetail[]>;
  isLoading: boolean;
  getCategoryDisplayName: (category: string) => string;
}) {
  if (isLoading) {
    return <div className="flex justify-center py-8">
      <span className="loading loading-spinner loading-lg"></span>
    </div>;
  }

  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className="text-center py-12">
        <CalculatorIcon className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
        <p className="text-base-content/60">暂无薪资明细数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, items]) => {
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const isDeduction = items[0]?.component_type === 'deduction';
        
        return (
          <InfoCard
            key={category}
            title={getCategoryDisplayName(category)}
            subtitle={`${items.length} 项明细`}
            variant={isDeduction ? 'error' : 'success'}
            icon={
              isDeduction ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 7.5 12 7.5s1.536.219 2.121.659" />
                </svg>
              )
            }
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-base-200/50 rounded-lg">
                <span className="font-medium">小计</span>
                <span className={`font-bold ${
                  isDeduction 
                    ? (total < 0 ? 'text-success' : 'text-error')
                    : 'text-success'
                }`}>
                  {isDeduction 
                    ? (total < 0 ? '+' : '-')
                    : '+'
                  }{formatCurrency(Math.abs(total))}
                </span>
              </div>
              
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.item_id} className="flex justify-between items-center py-2 border-b border-base-200 last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{item.component_name}</div>
                      {item.item_notes && (
                        <div className="text-xs text-base-content/60">{item.item_notes}</div>
                      )}
                    </div>
                    <span className={`font-mono text-sm ${
                      isDeduction 
                        ? (item.amount < 0 ? 'text-success' : 'text-error')
                        : 'text-success'
                    }`}>
                      {isDeduction 
                        ? (item.amount < 0 ? '+' : '-')
                        : '+'
                      }{formatCurrency(Math.abs(item.amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </InfoCard>
        );
      })}
    </div>
  );
}

// Five insurance tab component
function InsuranceTab({ payrollId }: { payrollId: string | null }) {
  const { 
    data: insuranceData = [], 
    isLoading, 
    error 
  } = useEmployeeInsuranceDetails(payrollId || '');

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <InfoCard
        title="五险一金详情"
        icon={<ShieldCheckIcon className="w-6 h-6" />}
        variant="error"
      >
        <p className="text-error">加载五险一金信息失败</p>
      </InfoCard>
    );
  }

  if (insuranceData.length === 0) {
    return (
      <InfoCard
        title="五险一金详情"
        icon={<ShieldCheckIcon className="w-6 h-6" />}
      >
        <p className="text-center py-8 text-base-content/60">暂无五险一金数据</p>
      </InfoCard>
    );
  }

  return (
    <div className="space-y-6">
      {insuranceData.map((insurance) => (
        <InfoCard
          key={insurance.id}
          title={insurance.insurance_type?.name || '未知保险类型'}
          subtitle={`缴费基数: ${formatCurrency(insurance.contribution_base)}`}
          icon={<ShieldCheckIcon className="w-6 h-6" />}
          variant="info"
        >
          <DataGrid columns={2}>
            <FieldDisplay
              label="个人费率"
              value={`${(insurance.employee_rate * 100).toFixed(2)}%`}
            />
            <FieldDisplay
              label="单位费率"
              value={`${(insurance.employer_rate * 100).toFixed(2)}%`}
            />
            <FieldDisplay
              label="个人缴费"
              value={formatCurrency(insurance.employee_amount)}
            />
            <FieldDisplay
              label="单位缴费"
              value={formatCurrency(insurance.employer_amount)}
            />
            <FieldDisplay
              label="缴费基数"
              value={formatCurrency(insurance.contribution_base)}
            />
            <FieldDisplay
              label="调整基数"
              value={formatCurrency(insurance.adjusted_base)}
            />
          </DataGrid>
          {insurance.skip_reason && (
            <div className="mt-4 p-3 bg-warning/10 rounded-lg">
              <p className="text-sm text-warning">跳过原因: {insurance.skip_reason}</p>
            </div>
          )}
        </InfoCard>
      ))}
    </div>
  );
}

function TaxTab({ payrollItems }: { payrollItems: PayrollItemDetail[] }) {
  const taxItems = payrollItems.filter(item => 
    (item.category_name || item.category) === 'personal_tax' || 
    item.component_name?.includes('个人所得税') ||
    item.component_name?.includes('个税')
  );

  return (
    <InfoCard
      title="个人所得税详情"
      icon={<DocumentTextIcon className="w-6 h-6" />}
    >
      {taxItems.length > 0 ? (
        <div className="space-y-2">
          {taxItems.map((item) => (
            <div key={item.item_id} className="flex justify-between py-2 border-b border-base-200">
              <span>{item.component_name}</span>
              <span className="font-mono text-error">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-base-content/60">本期无个人所得税扣缴记录</p>
      )}
    </InfoCard>
  );
}

function JobTab({ employeeId }: { employeeId?: string }) {
  return (
    <InfoCard
      title="职务信息"
      icon={<BriefcaseIcon className="w-6 h-6" />}
    >
      <p>职务信息正在加载...</p>
    </InfoCard>
  );
}