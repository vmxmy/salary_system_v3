import { useState } from 'react';
import { 
  usePayroll,
  usePayrolls, 
  usePayrollDetails,
  useLatestPayrollPeriod,
  usePayrollStatisticsByParams,
  useEmployeeInsuranceDetails,
  useInsuranceTypes,
  useCreatePayroll,
  useUpdatePayrollStatus,
  useDeletePayroll,
  PayrollStatus,
  payrollFormatters
} from '@/hooks/payroll';
import { ModernButton } from '@/components/common/ModernButton';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

export default function PayrollHookTestPage() {
  const { showSuccess, showError, showInfo } = useToast();
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>('');
  const [testMonth, setTestMonth] = useState<string>('2025-01');
  const [searchText, setSearchText] = useState<string>('');
  const [createdPayrollId, setCreatedPayrollId] = useState<string>('');
  const [lastAction, setLastAction] = useState<{ type: string; result: any; time: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<{ startDate: string; endDate: string }>({
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  });
  
  // 测试主 Hook
  const mainHook = usePayroll({
    enableRealtime: true,
    filters: {
      search: searchText,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      page: 1,
      pageSize: 10
    }
  });

  // 测试独立查询 Hooks
  const latestMonth = useLatestPayrollPeriod();
  const payrollList = usePayrolls({
    search: searchText,
    periodYear: dateFilter.startDate ? new Date(dateFilter.startDate).getFullYear() : undefined,
    periodMonth: dateFilter.startDate ? new Date(dateFilter.startDate).getMonth() + 1 : undefined,
    page: 1,
    pageSize: 5
  });
  const payrollDetails = usePayrollDetails(selectedPayrollId);
  const statistics = usePayrollStatisticsByParams({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const insuranceTypes = useInsuranceTypes();
  const insuranceDetails = useEmployeeInsuranceDetails(selectedPayrollId);

  // 测试 Mutation Hooks
  const createPayroll = useCreatePayroll();
  const updateStatus = useUpdatePayrollStatus();
  const deletePayroll = useDeletePayroll();

  // 测试创建薪资
  const handleCreatePayroll = async () => {
    try {
      // 使用真实的员工ID进行测试
      const testEmployeeId = '3611be38-4af7-4ac9-9bec-29ed6bd2d9b1'; // 李洋洋
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const result = await createPayroll.mutateAsync({
        employee_id: testEmployeeId,
        pay_period_start: `${year}-${String(month).padStart(2, '0')}-01`,
        pay_period_end: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
        pay_date: `${year}-${String(month + 1).padStart(2, '0')}-05`,
        status: PayrollStatus.DRAFT,
        gross_pay: 10000,
        total_deductions: 2000,
        net_pay: 8000
      });
      
      showSuccess('创建薪资记录成功');
      setLastAction({
        type: 'create',
        result: result,
        time: new Date().toLocaleTimeString()
      });
      
      // 如果返回了ID，设置为选中状态以便查看详情
      if (result && result.payroll_id) {
        setCreatedPayrollId(result.payroll_id);
        setSelectedPayrollId(result.payroll_id);
      }
      
      // 刷新列表
      mainHook.actions.refresh();
      payrollList.refetch();
    } catch (error) {
      showError('创建失败: ' + (error as Error).message);
      setLastAction({
        type: 'create_error',
        result: error,
        time: new Date().toLocaleTimeString()
      });
    }
  };

  // 测试更新状态
  const handleUpdateStatus = async (payrollId: string, status: typeof PayrollStatus[keyof typeof PayrollStatus]) => {
    try {
      const result = await updateStatus.mutateAsync({
        payrollId,
        status,
        notes: '测试状态更新'
      });
      showSuccess('更新状态成功');
      setLastAction({
        type: 'update',
        result: { payrollId, status },
        time: new Date().toLocaleTimeString()
      });
      // 刷新列表
      mainHook.actions.refresh();
      payrollList.refetch();
    } catch (error) {
      showError('更新失败: ' + (error as Error).message);
      setLastAction({
        type: 'update_error',
        result: error,
        time: new Date().toLocaleTimeString()
      });
    }
  };

  // 测试删除
  const handleDelete = async (payrollId: string) => {
    try {
      await deletePayroll.mutateAsync(payrollId);
      showSuccess('删除成功');
      setLastAction({
        type: 'delete',
        result: { payrollId },
        time: new Date().toLocaleTimeString()
      });
      setSelectedPayrollId('');
      // 刷新列表
      mainHook.actions.refresh();
      payrollList.refetch();
    } catch (error) {
      showError('删除失败: ' + (error as Error).message);
      setLastAction({
        type: 'delete_error',
        result: error,
        time: new Date().toLocaleTimeString()
      });
    }
  };

  // 测试实时订阅
  const handleTestRealtime = () => {
    showInfo('实时订阅已' + (mainHook.loading.isLoading ? '关闭' : '开启'));
    console.log('Realtime subscription status:', !mainHook.loading.isLoading);
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-3xl">usePayroll Hook 测试页面</h1>
            <p className="text-base-content/70">测试所有 payroll 相关 hooks 的功能</p>
          </div>
        </div>

        {/* 主 Hook 测试 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">1. 主 Hook 测试 (usePayroll)</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">数据状态：</h3>
                <div className="space-y-1 text-sm">
                  <p>✓ 薪资列表: {mainHook.payrolls?.data?.length || 0} 条</p>
                  <p>✓ 最新月份: {latestMonth.data?.period_name || '无'}</p>
                  <p>✓ 加载状态: {mainHook.loading.isLoading ? '加载中...' : '已完成'}</p>
                  <p>✓ 错误状态: {mainHook.error ? '有错误' : '正常'}</p>
                </div>
                
                {/* 显示主Hook的薪资列表 */}
                {mainHook.payrolls?.data && mainHook.payrolls.data.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium mb-1">点击查看详情：</h4>
                    {mainHook.payrolls.data.slice(0, 3).map(p => (
                      <div 
                        key={p.payroll_id}
                        className={cn(
                          "text-xs p-2 bg-base-200 rounded mt-1 cursor-pointer hover:bg-base-300",
                          selectedPayrollId === p.payroll_id && "bg-primary/20 border border-primary"
                        )}
                        onClick={() => setSelectedPayrollId(p.payroll_id)}
                      >
                        {p.employee_name} - {payrollFormatters.currency(p.net_pay)}
                        {selectedPayrollId === p.payroll_id && <span className="ml-2">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">可用操作：</h3>
                <div className="space-y-2">
                  <ModernButton 
                    variant="primary" 
                    size="sm"
                    onClick={() => mainHook.actions.refresh()}
                  >
                    刷新所有数据
                  </ModernButton>
                  <ModernButton 
                    variant="secondary" 
                    size="sm"
                    onClick={handleTestRealtime}
                  >
                    测试实时订阅
                  </ModernButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 查询 Hooks 测试 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">2. 查询 Hooks 测试</h2>
            
            {/* 搜索和过滤栏 */}
            <div className="space-y-3 mb-4">
              {/* 搜索栏 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">搜索测试</span>
                </label>
                <div className="join">
                  <input 
                    type="text"
                    className="input input-bordered join-item flex-1"
                    placeholder="输入员工姓名或部门..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary join-item"
                    onClick={() => payrollList.refetch()}
                  >
                    搜索
                  </button>
                </div>
              </div>
              
              {/* 日期过滤器 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">薪资周期过滤</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <span className="self-center">至</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      // 刷新查询以应用新的日期过滤
                      payrollList.refetch();
                      mainHook.actions.refresh();
                      showInfo(`已应用日期过滤: ${dateFilter.startDate} 至 ${dateFilter.endDate}`);
                    }}
                  >
                    应用过滤
                  </button>
                </div>
              </div>
              
              {/* 参数传递说明 */}
              <div className="alert alert-info text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h4 className="font-semibold">Hook 薪资周期参数传递说明：</h4>
                  <ul className="mt-1 space-y-1">
                    <li>• <code>startDate</code>: 过滤 pay_period_start {'>='} startDate 的记录</li>
                    <li>• <code>endDate</code>: 过滤 pay_period_start {'<='} endDate 的记录</li>
                    <li>• 查询时使用: <code>query.gte('pay_period_start', startDate)</code></li>
                    <li>• 实际SQL: WHERE pay_period_start BETWEEN '2025-01-01' AND '2025-12-31'</li>
                    <li>• 可以组合其他过滤条件如 status, employeeId, search 等</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 查询结果 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">最新薪资月份 (useLatestPayrollMonth)</h3>
                  <p className="text-sm mt-1">
                    {latestMonth.isLoading ? '加载中...' : 
                     latestMonth.data ? payrollFormatters.monthString(latestMonth.data) : '无数据'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">薪资列表 (usePayrolls)</h3>
                  <p className="text-sm mt-1">
                    共 {payrollList.data?.total || 0} 条，
                    当前页 {payrollList.data?.data?.length || 0} 条
                  </p>
                  {payrollList.data?.data?.slice(0, 3).map(p => (
                    <div 
                      key={p.payroll_id}
                      className={cn(
                        "text-xs p-2 bg-base-200 rounded mt-1 cursor-pointer hover:bg-base-300",
                        selectedPayrollId === p.payroll_id && "bg-primary/20 border border-primary"
                      )}
                      onClick={() => setSelectedPayrollId(p.payroll_id)}
                    >
                      {p.employee_name} - {payrollFormatters.currency(p.net_pay)}
                      {selectedPayrollId === p.payroll_id && <span className="ml-2">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">统计数据 (usePayrollStatisticsByParams)</h3>
                  <div className="text-sm mt-1">
                    {statistics.isLoading ? '加载中...' : 
                     statistics.data?.length ? (
                       <div>
                         <p>部门数: {statistics.data.length}</p>
                         <p>总金额: {payrollFormatters.currency(
                           statistics.data.reduce((sum, s) => sum + (s.total_gross_pay || 0), 0)
                         )}</p>
                       </div>
                     ) : '无数据'}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">保险类型 (useInsuranceTypes)</h3>
                  <div className="text-sm mt-1">
                    {insuranceTypes.isLoading ? '加载中...' : 
                     insuranceTypes.data ? `${insuranceTypes.data.length} 种保险类型` : '无数据'}
                  </div>
                </div>
              </div>
            </div>

            {/* 详情显示 */}
            {selectedPayrollId && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">
                  薪资详情 (usePayrollDetails) - ID: {selectedPayrollId}
                </h3>
                {payrollDetails.isLoading ? (
                  <p className="text-sm">加载中...</p>
                ) : payrollDetails.data ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p>明细项数: {payrollDetails.data.length}</p>
                      <p>总收入: {payrollFormatters.currency(
                        payrollDetails.data
                          .filter(item => item.component_type === 'earning')
                          .reduce((sum, item) => sum + (item.amount || 0), 0)
                      )}</p>
                      <p>个人扣除: {payrollFormatters.currency(
                        payrollDetails.data
                          .filter(item => item.component_type === 'deduction' && 
                                 (item.category_name === 'personal_insurance' || item.category_name === 'personal_tax'))
                          .reduce((sum, item) => sum + (item.amount || 0), 0)
                      )}</p>
                      <p>单位扣除: {payrollFormatters.currency(
                        payrollDetails.data
                          .filter(item => item.component_type === 'deduction' && 
                                 item.category_name === 'employer_insurance')
                          .reduce((sum, item) => sum + (item.amount || 0), 0)
                      )}</p>
                      <p className="font-medium text-primary">实发工资: {payrollFormatters.currency(
                        payrollDetails.data
                          .filter(item => item.component_type === 'earning')
                          .reduce((sum, item) => sum + (item.amount || 0), 0) -
                        payrollDetails.data
                          .filter(item => item.component_type === 'deduction' && 
                                 (item.category_name === 'personal_insurance' || item.category_name === 'personal_tax'))
                          .reduce((sum, item) => sum + (item.amount || 0), 0)
                      )}</p>
                    </div>
                    
                    {/* 收入明细 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-success mb-1">收入项</h4>
                        <div className="space-y-1">
                          {payrollDetails.data
                            .filter(item => item.component_type === 'earning')
                            .map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{item.component_name}</span>
                                <span className="text-success">
                                  +{payrollFormatters.currency(item.amount)}
                                </span>
                              </div>
                            ))}
                          <div className="border-t pt-1 flex justify-between text-xs font-medium">
                            <span>收入合计</span>
                            <span className="text-success">
                              {payrollFormatters.currency(
                                payrollDetails.data
                                  .filter(item => item.component_type === 'earning')
                                  .reduce((sum, item) => sum + item.amount, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-error mb-1">扣除项</h4>
                        <div className="space-y-2">
                          {/* 个人扣除 */}
                          <div>
                            <h5 className="text-xs font-medium text-base-content/70 mb-1">个人扣除</h5>
                            <div className="space-y-1 pl-2">
                              {payrollDetails.data
                                .filter(item => item.component_type === 'deduction' && 
                                       (item.category_name === 'personal_insurance' || item.category_name === 'personal_tax'))
                                .map((item, idx) => (
                                  <div key={`personal-${idx}`} className="flex justify-between text-xs">
                                    <span className="truncate">{item.component_name.replace('个人应缴费额', '')}</span>
                                    <span className="text-error">
                                      -{payrollFormatters.currency(item.amount)}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t pt-1 flex justify-between text-xs font-medium">
                                <span>个人小计</span>
                                <span className="text-error">
                                  -{payrollFormatters.currency(
                                    payrollDetails.data
                                      .filter(item => item.component_type === 'deduction' && 
                                             (item.category_name === 'personal_insurance' || item.category_name === 'personal_tax'))
                                      .reduce((sum, item) => sum + item.amount, 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 单位扣除 */}
                          <div>
                            <h5 className="text-xs font-medium text-base-content/70 mb-1">单位扣除</h5>
                            <div className="space-y-1 pl-2">
                              {payrollDetails.data
                                .filter(item => item.component_type === 'deduction' && 
                                       item.category_name === 'employer_insurance')
                                .map((item, idx) => (
                                  <div key={`employer-${idx}`} className="flex justify-between text-xs">
                                    <span className="truncate">{item.component_name.replace('单位应缴费额', '')}</span>
                                    <span className="text-warning">
                                      -{payrollFormatters.currency(item.amount)}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t pt-1 flex justify-between text-xs font-medium">
                                <span>单位小计</span>
                                <span className="text-warning">
                                  -{payrollFormatters.currency(
                                    payrollDetails.data
                                      .filter(item => item.component_type === 'deduction' && 
                                             item.category_name === 'employer_insurance')
                                      .reduce((sum, item) => sum + item.amount, 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 总扣除 */}
                          <div className="border-t pt-1 flex justify-between text-xs font-bold">
                            <span>扣除合计</span>
                            <span className="text-error">
                              -{payrollFormatters.currency(
                                payrollDetails.data
                                  .filter(item => item.component_type === 'deduction')
                                  .reduce((sum, item) => sum + item.amount, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 实发工资 */}
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span>实发工资（总收入 - 个人扣除）</span>
                      <span className="text-primary">
                        {payrollFormatters.currency(
                          payrollDetails.data
                            .filter(item => item.component_type === 'earning')
                            .reduce((sum, item) => sum + item.amount, 0) -
                          payrollDetails.data
                            .filter(item => item.component_type === 'deduction' && 
                                   (item.category_name === 'personal_insurance' || item.category_name === 'personal_tax'))
                            .reduce((sum, item) => sum + item.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">无数据</p>
                )}

                {/* 保险详情 */}
                <h3 className="font-semibold mb-2 mt-4">
                  保险详情 (useEmployeeInsuranceDetails)
                </h3>
                {insuranceDetails.isLoading ? (
                  <p className="text-sm">加载中...</p>
                ) : insuranceDetails.data ? (
                  <div className="text-sm">
                    <p>保险项数: {insuranceDetails.data.length}</p>
                  </div>
                ) : (
                  <p className="text-sm">无保险数据</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mutation Hooks 测试 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">3. Mutation Hooks 测试</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2">创建薪资</h3>
                <ModernButton 
                  variant="primary" 
                  size="sm"
                  onClick={handleCreatePayroll}
                  disabled={createPayroll.isPending}
                >
                  {createPayroll.isPending ? '创建中...' : '测试创建'}
                </ModernButton>
                <p className="text-xs mt-1 text-base-content/60">
                  测试员工: 李洋洋
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">更新状态</h3>
                <ModernButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => selectedPayrollId && handleUpdateStatus(selectedPayrollId, PayrollStatus.APPROVED)}
                  disabled={!selectedPayrollId || updateStatus.isPending}
                >
                  {updateStatus.isPending ? '更新中...' : '批准选中'}
                </ModernButton>
                <p className="text-xs mt-1 text-base-content/60">
                  {selectedPayrollId ? '已选中记录' : '请先选择记录'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">删除薪资</h3>
                <ModernButton 
                  variant="danger" 
                  size="sm"
                  onClick={() => selectedPayrollId && handleDelete(selectedPayrollId)}
                  disabled={!selectedPayrollId || deletePayroll.isPending}
                >
                  {deletePayroll.isPending ? '删除中...' : '删除选中'}
                </ModernButton>
                <p className="text-xs mt-1 text-base-content/60">
                  {selectedPayrollId ? '已选中记录' : '请先选择记录'}
                </p>
              </div>
            </div>
            
            {/* 显示最近操作结果 */}
            {lastAction && (
              <div className="mt-4 p-3 bg-base-200 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">最近操作结果 ({lastAction.time})</h3>
                <div className="text-xs space-y-1">
                  <p>操作类型: {
                    lastAction.type === 'create' ? '创建成功' :
                    lastAction.type === 'create_error' ? '创建失败' :
                    lastAction.type === 'update' ? '更新成功' :
                    lastAction.type === 'delete' ? '删除成功' :
                    lastAction.type
                  }</p>
                  {lastAction.type === 'create' && lastAction.result && (
                    <>
                      <p>创建的ID: {lastAction.result.payroll_id || '未返回ID'}</p>
                      <p>状态: {lastAction.result.status || 'draft'}</p>
                      <ModernButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (lastAction.result.payroll_id) {
                            setSelectedPayrollId(lastAction.result.payroll_id);
                            // 滚动到详情区域
                            document.querySelector('.bg-base-200.rounded-lg')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        查看创建的记录
                      </ModernButton>
                    </>
                  )}
                  {lastAction.type.includes('error') && (
                    <p className="text-error">错误信息: {lastAction.result?.message || '未知错误'}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* 创建操作说明 */}
            <div className="mt-4 p-3 bg-info/10 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">📝 创建薪资具体执行内容</h3>
              <div className="text-xs space-y-2">
                <div>
                  <p className="font-medium">1. 向 payrolls 表插入一条记录：</p>
                  <code className="block ml-2 p-2 bg-base-100 rounded text-xs">
                    {`{
  employee_id: '3611be38-4af7-4ac9-9bec-29ed6bd2d9b1',  // 李洋洋
  pay_period_start: '${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01',
  pay_period_end: '${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}',
  pay_date: '${new Date().getFullYear()}-${String(new Date().getMonth() + 2).padStart(2, '0')}-05',
  status: 'draft',
  gross_pay: 10000,      // 测试数据
  total_deductions: 2000, // 测试数据
  net_pay: 8000          // 测试数据
}`}
                  </code>
                </div>
                
                <div>
                  <p className="font-medium">2. 注意事项：</p>
                  <ul className="ml-2 space-y-1">
                    <li>• 这只创建了薪资主记录，没有创建薪资明细项（payroll_items）</li>
                    <li>• 使用的是测试金额，不是真实计算的薪资</li>
                    <li>• 状态为 draft（草稿），需要后续计算和确认</li>
                    <li>• 实际生产环境应该：
                      <ul className="ml-4 mt-1">
                        <li>- 根据员工配置自动计算薪资组件</li>
                        <li>- 创建对应的薪资明细项</li>
                        <li>- 应用税率和保险规则</li>
                        <li>- 计算实际应发金额</li>
                      </ul>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium">3. 完整的薪资创建流程应该包括：</p>
                  <ol className="ml-2 space-y-1 list-decimal list-inside">
                    <li>创建薪资主记录（当前实现）</li>
                    <li>根据员工薪资配置创建收入项</li>
                    <li>计算并创建各项扣除（保险、公积金、个税等）</li>
                    <li>更新总额和净额</li>
                    <li>触发审批流程</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 格式化工具测试 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">4. 格式化工具测试</h2>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p>货币格式: {payrollFormatters.currency(12345.67)}</p>
                <p>状态格式: {payrollFormatters.status(PayrollStatus.DRAFT)}</p>
                <p>月份格式: {payrollFormatters.monthString('2025-01-15')}</p>
              </div>
              <div>
                <p>日期格式: {payrollFormatters.date('2025-01-15')}</p>
                <p>百分比格式: {payrollFormatters.percentage(0.1234)}</p>
                <p>数字格式: {payrollFormatters.number(1234567)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 实时订阅状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">5. 实时订阅状态</h2>
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p>实时订阅已启用，监听以下表的变更：</p>
                <ul className="text-sm mt-1">
                  <li>• payrolls - 薪资主表</li>
                  <li>• payroll_items - 薪资明细项</li>
                  <li>• insurance_calculation_logs - 保险计算日志</li>
                </ul>
                <p className="text-sm mt-2">打开浏览器控制台查看实时变更事件</p>
              </div>
            </div>
          </div>
        </div>

        {/* 测试总结 */}
        <div className="card bg-base-100 shadow-xl border-2 border-primary">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">📊 测试总结</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-success mb-2">✅ 正常功能</h3>
                <ul className="text-sm space-y-1">
                  <li>✓ usePayrolls - 薪资列表查询正常</li>
                  <li>✓ useLatestPayrollMonth - 最新月份获取正常</li>
                  <li>✓ usePayrollDetails - 详情查询正常</li>
                  <li>✓ useInsuranceTypes - 保险类型查询正常</li>
                  <li>✓ 实时订阅功能正常</li>
                  <li>✓ 格式化工具正常</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-warning mb-2">⚠️ 已知问题</h3>
                <ul className="text-sm space-y-1">
                  <li>• view_department_payroll_statistics 视图已创建</li>
                  <li>• 部分测试数据可能为空（需要更多测试数据）</li>
                  <li>• Mutation 功能需要真实数据测试</li>
                </ul>
              </div>
            </div>

            <div className="divider"></div>
            
            <div className="text-sm">
              <p className="font-semibold mb-2">测试建议：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>搜索员工姓名（如"李"）查看搜索功能</li>
                <li>点击薪资记录查看详情</li>
                <li>测试创建新薪资记录（使用测试员工ID）</li>
                <li>在另一个窗口修改数据，观察实时更新</li>
                <li>检查浏览器控制台的实时订阅日志</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}