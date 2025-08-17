import { useState } from 'react';
import { PayrollCompletenessStat } from './PayrollCompletenessStat';
import { PayrollCompletenessModal } from './PayrollCompletenessModal';
import { usePayrollPeriodCompleteness } from '@/hooks/payroll/usePayrollPeriodCompleteness';

/**
 * 四要素完整度统计组件使用示例
 * 展示三种不同的显示模式
 */
export function PayrollCompletenessStatExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 假设我们有一个周期ID
  const periodId = 'example-period-id';
  const { data: completeness, isLoading } = usePayrollPeriodCompleteness(periodId);
  
  if (isLoading) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }
  
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">四要素完整度统计组件示例</h2>
      
      {/* 默认版本 - 适合用在仪表板 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">默认版本（Default）</h3>
        <p className="text-sm text-base-content/60 mb-4">
          适合用在仪表板、概览页面，显示基本统计信息和迷你指示器
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PayrollCompletenessStat
            completeness={completeness || null}
            variant="default"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>
      
      {/* 紧凑版本 - 适合用在列表或空间有限的地方 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">紧凑版本（Compact）</h3>
        <p className="text-sm text-base-content/60 mb-4">
          适合用在列表页面、侧边栏等空间有限的地方
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <PayrollCompletenessStat
            completeness={completeness || null}
            variant="compact"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>
      
      {/* 详细版本 - 适合用在详情页或需要更多信息的地方 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">详细版本（Detailed）</h3>
        <p className="text-sm text-base-content/60 mb-4">
          适合用在详情页面、报告页面等需要展示完整信息的地方
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PayrollCompletenessStat
            completeness={completeness || null}
            variant="detailed"
            showPeriodName={true}
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>
      
      {/* 多个统计卡片组合示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">组合使用示例</h3>
        <p className="text-sm text-base-content/60 mb-4">
          在仪表板中与其他统计卡片组合使用
        </p>
        <div className="stats shadow w-full">
          {/* 员工总数 */}
          <div className="stat">
            <div className="stat-figure text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div className="stat-title">员工总数</div>
            <div className="stat-value">{completeness?.total_employees || 0}</div>
            <div className="stat-desc">活跃员工</div>
          </div>
          
          {/* 四要素完整度 */}
          <div className="stat">
            <div className="stat-figure">
              <div className={`radial-progress ${
                (completeness?.overall_completeness_percentage || 0) === 100 ? 'text-success' :
                (completeness?.overall_completeness_percentage || 0) >= 80 ? 'text-info' :
                (completeness?.overall_completeness_percentage || 0) >= 50 ? 'text-warning' :
                'text-error'
              }`} 
              style={{ "--value": completeness?.overall_completeness_percentage || 0, "--size": "4rem" } as React.CSSProperties}>
                <span className="text-base font-bold">{completeness?.overall_completeness_percentage || 0}%</span>
              </div>
            </div>
            <div className="stat-title">四要素完整度</div>
            <div className="stat-value">
              {completeness?.complete_employees_count || 0}/{completeness?.total_employees || 0}
            </div>
            <div className="stat-desc">
              {completeness?.metadata_status === 'complete' ? '✓ 可计算薪资' : '⚠ 数据不完整'}
            </div>
          </div>
          
          {/* 周期状态 */}
          <div className="stat">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="stat-title">周期状态</div>
            <div className="stat-value text-2xl">{completeness?.period_status || 'draft'}</div>
            <div className="stat-desc">{completeness?.period_name}</div>
          </div>
        </div>
      </div>
      
      {/* 完整度详情模态框 */}
      <PayrollCompletenessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        completeness={completeness || null}
        onImportData={(element) => {
          console.log('Import data for:', element);
          // 处理导入逻辑
        }}
      />
    </div>
  );
}