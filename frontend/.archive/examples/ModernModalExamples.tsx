import { useState } from 'react';
import { 
  ModernModal, 
  ResponsiveModalWrapper, 
  ConfirmModal 
} from '@/components/common/ModernModalSystem';
import { 
  TabModal, 
  StepModal, 
  SideModal 
} from '@/components/common/LayeredModalSystem';
import {
  ModernInfoCard,
  StatCard,
  DataGrid,
  FieldDisplay,
  CardGroup
} from '@/components/common/EnhancedCardLayouts';
import {
  FormGroup,
  FormActions,
  ModernInput,
  ModernSelect,
  ModernTextarea,
  ModernCheckbox
} from '@/components/common/ModernFormSystem';
import {
  UserCircleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

/**
 * 现代化模态框系统完整使用示例
 * 展示薪资管理系统中各种模态框的最佳实践
 */
export function ModernModalExamples() {
  // 基础模态框状态
  const [basicModal, setBasicModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  
  // 复杂模态框状态
  const [tabModal, setTabModal] = useState(false);
  const [stepModal, setStepModal] = useState(false);
  const [sideModal, setSideModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    position: '',
    salary: '',
    notes: ''
  });

  // 模拟数据
  const employeeData = {
    id: 'emp-001',
    employee_name: '张三',
    department: '技术部',
    position: '高级工程师',
    hire_date: '2020-03-15',
    salary: 15000,
    status: 'active',
    email: 'zhangsan@company.com',
    phone: '13800138000'
  };

  const payrollStats = [
    {
      title: '应发工资',
      value: '¥15,000',
      change: { value: 5.2, type: 'increase' as const, period: '较上月' },
      variant: 'success' as const,
      icon: <CurrencyDollarIcon className="w-6 h-6" />
    },
    {
      title: '扣除合计',
      value: '¥2,250',
      change: { value: 2.1, type: 'decrease' as const, period: '较上月' },
      variant: 'error' as const,
      icon: <DocumentTextIcon className="w-6 h-6" />
    },
    {
      title: '实发工资',
      value: '¥12,750',
      change: { value: 6.8, type: 'increase' as const, period: '较上月' },
      variant: 'primary' as const,
      icon: <CurrencyDollarIcon className="w-6 h-6" />
    }
  ];

  // Tab配置
  const employeeTabs = [
    {
      id: 'basic',
      label: '基本信息',
      icon: <UserCircleIcon className="w-4 h-4" />,
      content: (
        <CardGroup columns={2}>
          <ModernInfoCard
            title="个人信息"
            icon={<UserCircleIcon className="w-6 h-6" />}
            variant="default"
          >
            <DataGrid columns={2}>
              <FieldDisplay label="姓名" value={employeeData.employee_name} />
              <FieldDisplay label="员工ID" value={employeeData.id} copyable />
              <FieldDisplay label="入职日期" value={employeeData.hire_date} />
              <FieldDisplay 
                label="状态" 
                value={
                  <span className="badge badge-success badge-sm">
                    在职
                  </span>
                } 
              />
            </DataGrid>
          </ModernInfoCard>
          
          <ModernInfoCard
            title="联系方式"
            icon={<PhoneIcon className="w-6 h-6" />}
            variant="info"
          >
            <DataGrid columns={1}>
              <FieldDisplay label="邮箱" value={employeeData.email} copyable />
              <FieldDisplay label="手机" value={employeeData.phone} copyable />
            </DataGrid>
          </ModernInfoCard>
        </CardGroup>
      )
    },
    {
      id: 'organization',
      label: '组织架构',
      icon: <BuildingOfficeIcon className="w-4 h-4" />,
      content: (
        <ModernInfoCard
          title="组织信息"
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          variant="primary"
        >
          <DataGrid columns={2}>
            <FieldDisplay label="部门" value={employeeData.department} />
            <FieldDisplay label="职位" value={employeeData.position} />
            <FieldDisplay label="汇报对象" value="李经理" />
            <FieldDisplay label="团队规模" value="8人" />
          </DataGrid>
        </ModernInfoCard>
      )
    },
    {
      id: 'payroll',
      label: '薪资详情',
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      badge: '3',
      content: (
        <div className="space-y-6">
          {/* 薪资统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payrollStats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          
          {/* 薪资明细 */}
          <ModernInfoCard
            title="本月薪资明细"
            subtitle="2024年1月"
            icon={<DocumentTextIcon className="w-6 h-6" />}
            variant="success"
          >
            <div className="space-y-3">
              {[
                { name: '基本工资', amount: 12000 },
                { name: '绩效奖金', amount: 3000 },
                { name: '社保扣除', amount: -1500 },
                { name: '个税扣除', amount: -750 }
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-base-200 last:border-b-0">
                  <span className="font-medium">{item.name}</span>
                  <span className={`font-mono ${item.amount > 0 ? 'text-success' : 'text-error'}`}>
                    {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </ModernInfoCard>
        </div>
      )
    }
  ];

  // 步骤配置
  const createEmployeeSteps = [
    {
      id: 'basic',
      title: '基本信息',
      description: '填写员工的基本个人信息',
      canNext: !!formData.employee_name,
      canPrevious: false,
      content: (
        <FormGroup title="个人基本信息" columns={2}>
          <ModernInput
            label="员工姓名"
            placeholder="请输入员工姓名"
            value={formData.employee_name}
            onChange={(e) => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
            required
          />
          <ModernSelect
            label="性别"
            options={[
              { value: 'male', label: '男' },
              { value: 'female', label: '女' }
            ]}
          />
          <ModernInput
            label="身份证号"
            placeholder="请输入身份证号"
          />
          <ModernInput
            label="手机号码"
            placeholder="请输入手机号码"
            leftIcon={<PhoneIcon className="w-4 h-4" />}
          />
        </FormGroup>
      )
    },
    {
      id: 'organization',
      title: '组织信息',
      description: '设置员工的部门和职位',
      canNext: !!formData.department && !!formData.position,
      canPrevious: true,
      content: (
        <FormGroup title="组织架构信息" columns={2}>
          <ModernSelect
            label="所属部门"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            options={[
              { value: 'tech', label: '技术部' },
              { value: 'hr', label: '人力资源部' },
              { value: 'finance', label: '财务部' }
            ]}
            required
          />
          <ModernSelect
            label="职位"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            options={[
              { value: 'engineer', label: '工程师' },
              { value: 'manager', label: '经理' },
              { value: 'specialist', label: '专员' }
            ]}
            required
          />
        </FormGroup>
      )
    },
    {
      id: 'complete',
      title: '完成创建',
      description: '确认信息并完成员工创建',
      canNext: true,
      canPrevious: true,
      content: (
        <div className="space-y-6">
          <ModernInfoCard
            title="员工信息确认"
            icon={<UserCircleIcon className="w-6 h-6" />}
            variant="success"
          >
            <DataGrid columns={2}>
              <FieldDisplay label="姓名" value={formData.employee_name} />
              <FieldDisplay label="部门" value={formData.department} />
              <FieldDisplay label="职位" value={formData.position} />
              <FieldDisplay label="创建时间" value={new Date().toLocaleDateString()} />
            </DataGrid>
          </ModernInfoCard>
          
          <ModernCheckbox
            label="我确认以上信息无误"
            description="创建后可以在员工管理页面进行修改"
            variant="card"
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-base-content">
          现代化模态框系统示例
        </h1>
        <p className="text-base-content/70 leading-relaxed max-w-2xl mx-auto">
          基于DaisyUI 5和TailwindCSS 4的现代化模态框组件系统，
          为薪资管理系统提供一致的用户体验和专业的界面设计。
        </p>
      </div>

      {/* 示例按钮组 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button 
          className="btn btn-primary"
          onClick={() => setBasicModal(true)}
        >
          基础模态框
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => setDetailModal(true)}
        >
          详情模态框
        </button>
        
        <button 
          className="btn btn-warning"
          onClick={() => setConfirmModal(true)}
        >
          确认对话框
        </button>
        
        <button 
          className="btn btn-info"
          onClick={() => setTabModal(true)}
        >
          选项卡模态框
        </button>
        
        <button 
          className="btn btn-success"
          onClick={() => {
            setCurrentStep(0);
            setStepModal(true);
          }}
        >
          步骤模态框
        </button>
        
        <button 
          className="btn btn-accent"
          onClick={() => setSideModal(true)}
        >
          侧边模态框
        </button>
      </div>

      {/* 基础模态框 */}
      <ModernModal
        open={basicModal}
        onClose={() => setBasicModal(false)}
        title="基础模态框示例"
        subtitle="展示现代化设计的基础模态框"
        headerIcon={<UserCircleIcon className="w-6 h-6" />}
        size="md"
        variant="default"
        footer={
          <div className="flex justify-end gap-3">
            <button 
              className="btn btn-ghost"
              onClick={() => setBasicModal(false)}
            >
              取消
            </button>
            <button className="btn btn-primary">
              确定
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-base-content/80 leading-relaxed">
            这是一个基础的现代化模态框示例，展示了清晰的层次结构、
            现代化的视觉设计和良好的用户体验。
          </p>
          
          <ModernInfoCard
            title="设计特点"
            icon={<DocumentTextIcon className="w-6 h-6" />}
            variant="info"
            size="sm"
          >
            <ul className="space-y-2 text-sm">
              <li>• 响应式设计，适配各种屏幕尺寸</li>
              <li>• 现代化的视觉效果和动画</li>
              <li>• 完善的无障碍支持</li>
              <li>• 一致的设计语言</li>
            </ul>
          </ModernInfoCard>
        </div>
      </ModernModal>

      {/* 详情模态框 */}
      <ResponsiveModalWrapper
        open={detailModal}
        onClose={() => setDetailModal(false)}
        title="员工详情"
        subtitle={`${employeeData.employee_name} - ${employeeData.department}`}
        headerIcon={<UserCircleIcon className="w-6 h-6" />}
        size="lg"
        variant="default"
        mobileFullscreen={true}
      >
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payrollStats.map((stat, index) => (
              <StatCard key={index} {...stat} size="sm" />
            ))}
          </div>
          
          {/* 详细信息 */}
          <CardGroup title="详细信息" columns={2}>
            <ModernInfoCard
              title="基本信息"
              icon={<UserCircleIcon className="w-6 h-6" />}
              variant="default"
              size="sm"
            >
              <DataGrid columns={1}>
                <FieldDisplay label="员工ID" value={employeeData.id} copyable />
                <FieldDisplay label="姓名" value={employeeData.employee_name} />
                <FieldDisplay label="入职日期" value={employeeData.hire_date} />
              </DataGrid>
            </ModernInfoCard>
            
            <ModernInfoCard
              title="联系方式"
              icon={<PhoneIcon className="w-6 h-6" />}
              variant="primary"
              size="sm"
            >
              <DataGrid columns={1}>
                <FieldDisplay label="邮箱" value={employeeData.email} copyable />
                <FieldDisplay label="手机" value={employeeData.phone} copyable />
              </DataGrid>
            </ModernInfoCard>
          </CardGroup>
        </div>
      </ResponsiveModalWrapper>

      {/* 确认对话框 */}
      <ConfirmModal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={() => {
          console.log('确认删除');
          setConfirmModal(false);
        }}
        title="确认删除员工"
        message="您确定要删除这个员工记录吗？此操作不可撤销，相关的薪资数据也将被删除。"
        confirmText="确认删除"
        cancelText="取消"
        variant="error"
      />

      {/* 选项卡模态框 */}
      <TabModal
        open={tabModal}
        onClose={() => setTabModal(false)}
        title="员工管理"
        tabs={employeeTabs}
        variant="default"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-base-content/60">
              最后更新：{new Date().toLocaleString()}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setTabModal(false)}>
                关闭
              </button>
              <button className="btn btn-primary">
                保存更改
              </button>
            </div>
          </div>
        }
      />

      {/* 步骤模态框 */}
      <StepModal
        open={stepModal}
        onClose={() => setStepModal(false)}
        title="创建新员工"
        steps={createEmployeeSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={() => {
          console.log('创建完成', formData);
          setStepModal(false);
          setCurrentStep(0);
        }}
        variant="success"
      />

      {/* 侧边模态框 */}
      <SideModal
        open={sideModal}
        onClose={() => setSideModal(false)}
        title="高级筛选"
        subtitle="设置详细的筛选条件"
        side="right"
        width="md"
      >
        <div className="space-y-6">
          <FormGroup title="员工筛选" columns={1}>
            <ModernSelect
              label="部门"
              options={[
                { value: 'all', label: '所有部门' },
                { value: 'tech', label: '技术部' },
                { value: 'hr', label: '人力资源部' }
              ]}
            />
            
            <ModernSelect
              label="职位级别"
              options={[
                { value: 'all', label: '所有级别' },
                { value: 'junior', label: '初级' },
                { value: 'senior', label: '高级' }
              ]}
            />
            
            <ModernInput
              label="薪资范围"
              placeholder="例如：8000-15000"
            />
          </FormGroup>
          
          <FormActions>
            <button className="btn btn-ghost" onClick={() => setSideModal(false)}>
              取消
            </button>
            <button className="btn btn-primary">
              应用筛选
            </button>
          </FormActions>
        </div>
      </SideModal>
    </div>
  );
}