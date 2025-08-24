import { useState } from 'react';
import { PayrollDetailModalModern } from '@/components/payroll/PayrollDetailModalModern';
import { ModernButton } from '@/components/common/ModernButton';

/**
 * PayrollDetailModalModern 测试页面
 * 用于独立测试现代化薪资详情模态框的显示效果
 */
export default function PayrollDetailModalModernTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);

  // 真实的薪资记录数据（从数据库获取）
  const testPayrollData = [
    {
      id: 'abefd5a5-0664-4fd6-8384-15f664577a60',
      employeeName: '郑偲',
      grossPay: 15100.00,
      totalDeductions: 5363.72,
      netPay: 9736.28
    },
    {
      id: '8968e677-c647-4345-b688-5d2b586bb261',
      employeeName: '周湜杰',
      grossPay: 10185.00,
      totalDeductions: 3145.16,
      netPay: 7039.84
    },
    {
      id: '4b55f958-733e-4dae-afe9-e69cfda45eaa',
      employeeName: '宋方圆',
      grossPay: 8880.00,
      totalDeductions: 2620.49,
      netPay: 6259.51
    }
  ];

  const openModal = (payrollId: string) => {
    setSelectedPayrollId(payrollId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayrollId(null);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h1 className="card-title text-2xl font-bold mb-6">
              🧪 PayrollDetailModalModern 测试页面
            </h1>

            <div className="space-y-6">
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-bold">测试说明</h3>
                  <div className="text-sm">
                    点击下面的按钮来测试 PayrollDetailModalModern 的不同显示效果。
                    请确保数据库中有对应的薪资记录数据。
                  </div>
                </div>
              </div>

              <div className="divider">测试选项</div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testPayrollData.map((payroll, index) => (
                  <div key={payroll.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      <h3 className="card-title text-lg">
                        {payroll.employeeName}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-success">应发: ¥{payroll.grossPay.toLocaleString()}</p>
                        <p className="text-error">扣除: ¥{payroll.totalDeductions.toLocaleString()}</p>
                        <p className="text-primary font-semibold">实发: ¥{payroll.netPay.toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-base-content/50 font-mono mt-2 truncate">
                        {payroll.id}
                      </p>
                      <div className="card-actions justify-end mt-4">
                        <ModernButton
                          variant="primary"
                          size="sm"
                          onClick={() => openModal(payroll.id)}
                        >
                          查看详情
                        </ModernButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider">功能特色</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">🎨 现代化特性</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>标签化界面设计，信息分层清晰</li>
                    <li>使用现代化组件 (InfoCard, StatCard, DataGrid)</li>
                    <li>响应式布局，适配各种屏幕尺寸</li>
                    <li>改进的扣除项目显示逻辑 (负数显示为退款)</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">📊 标签页功能</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>薪资概览:</strong> 核心数据和员工信息</li>
                    <li><strong>薪资明细:</strong> 按类别分组的收入扣除</li>
                    <li><strong>五险一金:</strong> 保险详情和缴费信息</li>
                    <li><strong>个人所得税:</strong> 税务相关信息</li>
                    <li><strong>职务信息:</strong> 员工职位数据</li>
                  </ul>
                </div>
              </div>

              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-bold">注意事项</h3>
                  <div className="text-sm">
                    如果模态框显示"暂无数据"，请确保：
                    <br />• 数据库中有对应ID的薪资记录
                    <br />• 薪资记录包含薪资明细项目
                    <br />• 可以在控制台查看网络请求和错误信息
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PayrollDetailModalModern 组件 */}
      <PayrollDetailModalModern
        payrollId={selectedPayrollId}
        open={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}