import React, { useState } from 'react';
import { ModernButton } from '@/components/common/ModernButton';
import { FinancialBadge, EmployeeStatusBadge, SalaryStatusBadge, PriorityBadge } from '@/components/common/FinancialBadge';
import { FinancialCard } from '@/components/common/FinancialCard';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { AccordionSection } from '@/components/common/AccordionSection';
import { DetailField } from '@/components/common/DetailField';
import { cn } from '@/lib/utils';

// 模拟数据
const sampleTableData = [
  {
    id: 1,
    name: '张三',
    department: '技术部',
    position: '高级工程师',
    salary: 15000,
    status: 'active'
  },
  {
    id: 2,
    name: '李四',
    department: '产品部',
    position: '产品经理',
    salary: 18000,
    status: 'active'
  },
  {
    id: 3,
    name: '王五',
    department: '设计部',
    position: 'UI设计师',
    salary: 12000,
    status: 'probation'
  }
];

const sampleTableColumns = [
  {
    id: 'name',
    header: () => '姓名',
    accessorKey: 'name',
    cell: ({ row }: any) => <span className="font-medium">{row.original.name}</span>
  },
  {
    id: 'department',
    header: () => '部门',
    accessorKey: 'department'
  },
  {
    id: 'position',
    header: () => '职位',
    accessorKey: 'position'
  },
  {
    id: 'salary',
    header: () => '薪资',
    accessorKey: 'salary',
    cell: ({ row }: any) => `¥${row.original.salary.toLocaleString()}`
  },
  {
    id: 'status',
    header: () => '状态',
    accessorKey: 'status',
    cell: ({ row }: any) => (
      <EmployeeStatusBadge status={row.original.status} />
    )
  }
];

export function DesignSystemShowcase() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-50 to-base-100">
      {/* 现代化页面标题 */}
      <div className={cn(
        'bg-gradient-to-r from-base-100 via-base-50/50 to-base-100',
        'border-b border-base-200/60 mb-8',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.04)]'
      )}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className={iconContainer.modern('primary', 'lg')}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12s0-12-12-12v12z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-base-content tracking-tight">
                现代化设计系统展示
              </h1>
              <p className="text-base-content/60 mt-1">
                全新的视觉效果和交互体验
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-y-12 pb-12">
        {/* 按钮展示 */}
        <section>
          <AccordionSection title="按钮组件" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">主要按钮</h4>
                <div className="space-y-2">
                  <ModernButton variant="primary" size="sm">小尺寸</ModernButton>
                  <ModernButton variant="primary" size="md">中等尺寸</ModernButton>
                  <ModernButton variant="primary" size="lg">大尺寸</ModernButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">次要按钮</h4>
                <div className="space-y-2">
                  <ModernButton variant="secondary" size="sm">次要小</ModernButton>
                  <ModernButton variant="secondary" size="md">次要中</ModernButton>
                  <ModernButton variant="secondary" size="lg">次要大</ModernButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">幽灵按钮</h4>
                <div className="space-y-2">
                  <ModernButton variant="ghost" size="sm">幽灵小</ModernButton>
                  <ModernButton variant="ghost" size="md">幽灵中</ModernButton>
                  <ModernButton variant="ghost" size="lg">幽灵大</ModernButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">危险按钮</h4>
                <div className="space-y-2">
                  <ModernButton variant="danger" size="sm">危险小</ModernButton>
                  <ModernButton variant="danger" size="md">危险中</ModernButton>
                  <ModernButton variant="danger" size="lg">危险大</ModernButton>
                </div>
              </div>
            </div>
          </AccordionSection>
        </section>

        {/* 徽章展示 */}
        <section>
          <AccordionSection title="徽章组件" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">员工状态</h4>
                <div className="flex flex-wrap gap-2">
                  <EmployeeStatusBadge status="active" />
                  <EmployeeStatusBadge status="inactive" />
                  <EmployeeStatusBadge status="probation" />
                  <EmployeeStatusBadge status="leave" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">薪资状态</h4>
                <div className="flex flex-wrap gap-2">
                  <SalaryStatusBadge status="approved" amount={15000} />
                  <SalaryStatusBadge status="pending" />
                  <SalaryStatusBadge status="rejected" />
                  <SalaryStatusBadge status="profit" amount={2000} />
                  <SalaryStatusBadge status="loss" amount={500} />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80">优先级</h4>
                <div className="flex flex-wrap gap-2">
                  <PriorityBadge priority="critical" />
                  <PriorityBadge priority="high" />
                  <PriorityBadge priority="medium" />
                  <PriorityBadge priority="low" />
                </div>
              </div>
            </div>
          </AccordionSection>
        </section>

        {/* 卡片展示 */}
        <section>
          <AccordionSection title="卡片组件" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ProfitCard
                title="月度盈利"
                value="¥126,840"
                subtitle="较上月增长12%"
                description="包含所有部门的综合收益"
                icon="📈"
                interactive="glow"
                className={selectedCard === 'profit' ? 'ring-2 ring-success/30' : ''}
                onClick={() => setSelectedCard(selectedCard === 'profit' ? null : 'profit')}
              />
              
              <LossCard
                title="月度支出"
                value="¥89,320"
                subtitle="较上月减少8%"
                description="包含薪资和运营成本"
                icon="📉"
                interactive="glow"
                className={selectedCard === 'loss' ? 'ring-2 ring-error/30' : ''}
                onClick={() => setSelectedCard(selectedCard === 'loss' ? null : 'loss')}
              />
              
              <WarningCard
                title="待处理"
                value="23"
                subtitle="项审批"
                description="需要管理层审批的项目"
                icon="⚠️"
                interactive="glow"
                className={selectedCard === 'warning' ? 'ring-2 ring-warning/30' : ''}
                onClick={() => setSelectedCard(selectedCard === 'warning' ? null : 'warning')}
              />
              
              <InfoCard
                title="在线员工"
                value="147"
                subtitle="/ 180 人"
                description="当前在线工作的员工数量"
                icon="👥"
                interactive="glow"
                className={selectedCard === 'info' ? 'ring-2 ring-info/30' : ''}
                onClick={() => setSelectedCard(selectedCard === 'info' ? null : 'info')}
              />
            </div>
          </AccordionSection>
        </section>

        {/* 表格展示 */}
        <section>
          <AccordionSection title="数据表格" defaultOpen>
            <div className="space-y-6">
              <div className="text-sm text-base-content/60">
                现代化的数据表格，具有渐变背景、光环效果和流畅的交互动画
              </div>
              <DataTable
                columns={sampleTableColumns}
                data={sampleTableData}
                showToolbar={true}
                showPagination={true}
                enableRowSelection={true}
                showGlobalFilter={true}
                striped={true}
                hover={true}
              />
            </div>
          </AccordionSection>
        </section>

        {/* 表单字段展示 */}
        <section>
          <AccordionSection title="表单字段" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField
                label="文本字段"
                value="示例文本内容"
                type="text"
                editable
              />
              
              <DetailField
                label="日期字段"
                value="2024-01-15"
                type="date"
                editable
              />
              
              <DetailField
                label="邮箱字段"
                value="user@example.com"
                type="email"
                editable
              />
              
              <DetailField
                label="电话字段"
                value="138****5678"
                type="phone"
                sensitive
                editable
              />
              
              <DetailField
                label="选择字段"
                value="选项A"
                type="select"
                options={[
                  { label: '选项A', value: 'A' },
                  { label: '选项B', value: 'B' },
                  { label: '选项C', value: 'C' }
                ]}
                editable
              />
              
              <DetailField
                label="状态字段"
                value="active"
                type="status"
                editable
              />
            </div>
          </AccordionSection>
        </section>

        {/* 视觉效果展示 */}
        <section>
          <AccordionSection title="视觉效果" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 渐变效果 */}
              <div className={cn(
                cardEffects.modern,
                'p-6 text-center'
              )}>
                <h4 className="font-semibold mb-2">卡片阴影</h4>
                <p className="text-sm text-base-content/60">
                  多层阴影和渐变背景
                </p>
              </div>
              
              {/* 玻璃态效果 */}
              <div className={cn(
                cardEffects.glass,
                'p-6 text-center relative'
              )}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-xl"></div>
                <div className="relative z-10">
                  <h4 className="font-semibold mb-2">玻璃态效果</h4>
                  <p className="text-sm text-base-content/60">
                    半透明背景和模糊效果
                  </p>
                </div>
              </div>
              
              {/* 动画效果 */}
              <div className={cn(
                cardEffects.modern,
                'p-6 text-center group cursor-pointer',
                'hover:scale-105 transition-all duration-300'
              )}>
                <h4 className="font-semibold mb-2 group-hover:animate-bounce">动画效果</h4>
                <p className="text-sm text-base-content/60">
                  悬停查看缩放和弹跳动画
                </p>
              </div>
            </div>
          </AccordionSection>
        </section>

        {/* 颜色系统展示 */}
        <section>
          <AccordionSection title="颜色系统">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'Primary', class: 'bg-primary text-primary-content' },
                { name: 'Secondary', class: 'bg-secondary text-secondary-content' },
                { name: 'Accent', class: 'bg-accent text-accent-content' },
                { name: 'Success', class: 'bg-success text-success-content' },
                { name: 'Warning', class: 'bg-warning text-warning-content' },
                { name: 'Error', class: 'bg-error text-error-content' },
                { name: 'Info', class: 'bg-info text-info-content' },
                { name: 'Base-100', class: 'bg-base-100 text-base-content border border-base-300' },
                { name: 'Base-200', class: 'bg-base-200 text-base-content' },
                { name: 'Base-300', class: 'bg-base-300 text-base-content' }
              ].map((color) => (
                <div key={color.name} className={cn(
                  color.class,
                  'p-4 rounded-lg text-center font-medium text-sm'
                )}>
                  {color.name}
                </div>
              ))}
            </div>
          </AccordionSection>
        </section>
      </div>
    </div>
  );
}

export default DesignSystemShowcase;