import React from 'react';
import { ThemeToggle, useTheme } from '@/components/common/ThemeToggle';
import { 
  FinancialBadge, 
  ProfitBadge, 
  LossBadge, 
  PendingBadge, 
  ApprovedBadge, 
  RejectedBadge,
  EmployeeStatusBadge,
  SalaryStatusBadge,
  PriorityBadge
} from '@/components/common/FinancialBadge';
import { FinancialCard } from '@/components/common/FinancialCard';

/**
 * 主题展示页面
 * 用于展示和测试财务系统的主题配色方案和组件样式
 */
export const ThemeShowcasePage: React.FC = () => {
  const { currentTheme, actualTheme, isLight, isDark } = useTheme();

  const sampleEmployeeData = [
    { id: 1, name: '张三', department: '财务部', salary: 12000, status: 'active' as const },
    { id: 2, name: '李四', department: '人事部', salary: 8500, status: 'probation' as const },
    { id: 3, name: '王五', department: '技术部', salary: 15000, status: 'leave' as const },
    { id: 4, name: '赵六', department: '市场部', salary: 9200, status: 'inactive' as const },
  ];

  const sampleFinancialData = [
    { item: '工资支出', amount: -125000, status: 'approved' as const },
    { item: '奖金收入', amount: 45000, status: 'pending' as const },
    { item: '福利费用', amount: -23000, status: 'rejected' as const },
    { item: '培训投入', amount: -8500, status: 'approved' as const },
  ];

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题和主题控制 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-base-content mb-2">
              财务系统主题展示
            </h1>
            <p className="text-base-content/70 text-lg">
              当前主题：{currentTheme} | 实际主题：{actualTheme}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle size="lg" showLabels />
          </div>
        </div>

        {/* 主题信息卡片 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-4">主题状态信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="text-sm text-base-content/60">当前设置</div>
              <div className="text-lg font-medium">{currentTheme}</div>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="text-sm text-base-content/60">实际主题</div>
              <div className="text-lg font-medium">{actualTheme}</div>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="text-sm text-base-content/60">主题模式</div>
              <div className="text-lg font-medium">
                {isLight ? '🌞 亮色模式' : '🌙 暗色模式'}
              </div>
            </div>
          </div>
        </div>

        {/* 色彩系统展示 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-6">色彩系统</h2>
          
          {/* 主要颜色 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">主要颜色</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-primary text-primary-content p-4 rounded-lg text-center">
                <div className="font-medium">Primary</div>
                <div className="text-sm opacity-80">主色</div>
              </div>
              <div className="bg-secondary text-secondary-content p-4 rounded-lg text-center">
                <div className="font-medium">Secondary</div>
                <div className="text-sm opacity-80">次要色</div>
              </div>
              <div className="bg-accent text-accent-content p-4 rounded-lg text-center">
                <div className="font-medium">Accent</div>
                <div className="text-sm opacity-80">强调色</div>
              </div>
              <div className="bg-success text-success-content p-4 rounded-lg text-center">
                <div className="font-medium">Success</div>
                <div className="text-sm opacity-80">成功</div>
              </div>
              <div className="bg-error text-error-content p-4 rounded-lg text-center">
                <div className="font-medium">Error</div>
                <div className="text-sm opacity-80">错误</div>
              </div>
            </div>
          </div>

          {/* 财务专用颜色 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">财务专用颜色</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                <div className="text-profit font-semibold">盈利/收入</div>
                <div className="text-sm text-base-content/60">Profit Color</div>
              </div>
              <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                <div className="text-loss font-semibold">亏损/支出</div>
                <div className="text-sm text-base-content/60">Loss Color</div>
              </div>
              <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                <div className="text-pending font-semibold">待处理</div>
                <div className="text-sm text-base-content/60">Pending Color</div>
              </div>
              <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                <div className="text-approved font-semibold">已批准</div>
                <div className="text-sm text-base-content/60">Approved Color</div>
              </div>
            </div>
          </div>
        </div>

        {/* 财务徽章展示 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-6">财务徽章系统</h2>
          
          {/* 基础徽章 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">基础财务状态</h3>
            <div className="flex flex-wrap gap-3">
              <ProfitBadge>盈利 ¥45,000</ProfitBadge>
              <LossBadge>亏损 ¥12,000</LossBadge>
              <PendingBadge>待审批</PendingBadge>
              <ApprovedBadge>已批准</ApprovedBadge>
              <RejectedBadge>已拒绝</RejectedBadge>
            </div>
          </div>

          {/* 员工状态 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">员工状态</h3>
            <div className="flex flex-wrap gap-3">
              <EmployeeStatusBadge status="active" />
              <EmployeeStatusBadge status="probation" />
              <EmployeeStatusBadge status="leave" />
              <EmployeeStatusBadge status="inactive" />
            </div>
          </div>

          {/* 优先级 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">优先级指示</h3>
            <div className="flex flex-wrap gap-3">
              <PriorityBadge priority="critical" />
              <PriorityBadge priority="high" />
              <PriorityBadge priority="medium" />
              <PriorityBadge priority="low" />
            </div>
          </div>

          {/* 不同尺寸 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">不同尺寸</h3>
            <div className="flex flex-wrap items-center gap-3">
              <FinancialBadge variant="profit" size="xs">XS</FinancialBadge>
              <FinancialBadge variant="profit" size="sm">SM</FinancialBadge>
              <FinancialBadge variant="profit" size="md">MD</FinancialBadge>
              <FinancialBadge variant="profit" size="lg">LG</FinancialBadge>
              <FinancialBadge variant="profit" size="xl">XL</FinancialBadge>
            </div>
          </div>
        </div>

        {/* 财务卡片展示 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-6">财务卡片组件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProfitCard
              title="总收入"
              actions={<button className="btn btn-sm btn-primary">查看详情</button>}
            >
              <div className="text-2xl font-bold text-profit">¥125,000</div>
              <div className="text-sm text-base-content/60">较上月增长 12%</div>
            </ProfitCard>
            
            <LossCard
              title="总支出"
              actions={<button className="btn btn-sm btn-error">查看详情</button>}
            >
              <div className="text-2xl font-bold text-loss">¥89,000</div>
              <div className="text-sm text-base-content/60">较上月减少 5%</div>
            </LossCard>
            
            <WarningCard
              title="待处理项目"
              actions={<button className="btn btn-sm btn-warning">处理</button>}
            >
              <div className="text-2xl font-bold text-pending">23</div>
              <div className="text-sm text-base-content/60">需要审批</div>
            </WarningCard>
            
            <InfoCard
              title="员工总数"
              actions={<button className="btn btn-sm btn-info">管理</button>}
            >
              <div className="text-2xl font-bold text-info">156</div>
              <div className="text-sm text-base-content/60">活跃员工</div>
            </InfoCard>
          </div>
          
          {/* 不同尺寸的卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FinancialCard 
              size="sm" 
              title="紧凑卡片"
              description="适用于仪表板概览"
            >
              <div className="text-lg font-medium">小尺寸内容</div>
            </FinancialCard>
            
            <FinancialCard 
              size="md" 
              title="标准卡片"
              description="最常用的卡片尺寸"
            >
              <div className="text-xl font-medium">标准尺寸内容</div>
            </FinancialCard>
            
            <FinancialCard 
              size="lg" 
              title="大型卡片"
              description="适用于详细信息展示"
            >
              <div className="text-2xl font-medium">大尺寸内容</div>
            </FinancialCard>
          </div>
        </div>

        {/* 组件展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 员工数据表格 */}
          <div className="bg-base-200 rounded-xl p-6 border border-base-300">
            <h2 className="text-xl font-semibold mb-4">员工数据表格</h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>部门</th>
                    <th className="text-right">薪资</th>
                    <th className="text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleEmployeeData.map((employee) => (
                    <tr key={employee.id} className="hover">
                      <td className="font-medium">{employee.name}</td>
                      <td className="text-base-content/70">{employee.department}</td>
                      <td className="text-right tabular-nums font-medium">
                        ¥{employee.salary.toLocaleString()}
                      </td>
                      <td className="text-center">
                        <EmployeeStatusBadge status={employee.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 财务数据表格 */}
          <div className="bg-base-200 rounded-xl p-6 border border-base-300">
            <h2 className="text-xl font-semibold mb-4">财务数据表格</h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th className="text-right">金额</th>
                    <th className="text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleFinancialData.map((item, index) => (
                    <tr key={index} className="hover">
                      <td className="font-medium">{item.item}</td>
                      <td className={`text-right tabular-nums font-medium ${
                        item.amount > 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        ¥{Math.abs(item.amount).toLocaleString()}
                      </td>
                      <td className="text-center">
                        <SalaryStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 按钮和表单展示 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-6">按钮和表单组件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 按钮展示 */}
            <div>
              <h3 className="text-lg font-medium mb-4">按钮样式</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">主要按钮</button>
                  <button className="btn btn-secondary">次要按钮</button>
                  <button className="btn btn-accent">强调按钮</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-success">成功</button>
                  <button className="btn btn-warning">警告</button>
                  <button className="btn btn-error">错误</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-outline btn-primary">轮廓</button>
                  <button className="btn btn-ghost">幽灵</button>
                  <button className="btn btn-link">链接</button>
                </div>
              </div>
            </div>

            {/* 表单展示 */}
            <div>
              <h3 className="text-lg font-medium mb-4">表单组件</h3>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">员工姓名</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="请输入员工姓名" 
                    className="input input-bordered"
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">部门</span>
                  </label>
                  <select className="select select-bordered">
                    <option>财务部</option>
                    <option>人事部</option>
                    <option>技术部</option>
                    <option>市场部</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">薪资范围</span>
                  </label>
                  <input 
                    type="range" 
                    min="5000" 
                    max="30000" 
                    defaultValue="15000"
                    className="range range-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-center text-base-content/60 py-8">
          <p>财务管理系统主题展示页面 - 展示 DaisyUI 主题定制效果</p>
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcasePage;