import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, CurrencyInput, SearchInput } from '../components/ui/Input';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Select } from '../components/ui/Select';
import { Checkbox, CheckboxGroup } from '../components/ui/Checkbox';
import { RadioGroup } from '../components/ui/Radio';
import { Textarea } from '../components/ui/Textarea';
import { DatePicker } from '../components/ui/DatePicker';
import { formatCurrency, formatDate } from '../lib/utils';

/**
 * Sample Employee Data for Demo
 */
interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  salary: number;
  status: 'active' | 'inactive' | 'pending';
  hireDate: string;
  email: string;
}

const sampleEmployees: Employee[] = [
  {
    id: 1,
    name: '张三',
    position: '高级软件工程师',
    department: '技术部',
    salary: 15000,
    status: 'active',
    hireDate: '2022-01-15',
    email: 'zhang.san@company.com'
  },
  {
    id: 2,
    name: '李四',
    position: 'HR经理',
    department: '人力资源部',
    salary: 12000,
    status: 'active',
    hireDate: '2021-03-20',
    email: 'li.si@company.com'
  },
  {
    id: 3,
    name: '王五',
    position: '会计',
    department: '财务部',
    salary: 8000,
    status: 'pending',
    hireDate: '2023-06-01',
    email: 'wang.wu@company.com'
  },
  {
    id: 4,
    name: 'John Smith',
    position: 'Senior Developer',
    department: 'Engineering',
    salary: 18000,
    status: 'active',
    hireDate: '2020-09-10',
    email: 'john.smith@company.com'
  },
  {
    id: 5,
    name: 'Sarah Johnson',
    position: 'Product Manager',
    department: 'Product',
    salary: 16000,
    status: 'inactive',
    hireDate: '2019-11-05',
    email: 'sarah.johnson@company.com'
  }
];

/**
 * Design System Demo Page
 * Showcases all components and patterns in the design system
 */
export const DesignSystemDemo: React.FC = () => {
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string | number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [salaryFilter, setSalaryFilter] = useState<number | null>(null);
  
  // Additional demo state
  const [selectedDepartment, setSelectedDepartment] = useState<string | number | undefined>('');
  const [selectedNotifications, setSelectedNotifications] = useState<(string | number)[]>(['email']);
  const [selectedPayFrequency, setSelectedPayFrequency] = useState<string | number>('monthly');
  const [employeeNotes, setEmployeeNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Navigation for demo
  const navigation = [
    {
      id: 'dashboard',
      label: '仪表板 Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'employees',
      label: '员工管理 Employees',
      href: '/employees',
      badge: 5,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      children: [
        { id: 'employee-list', label: '员工列表', href: '/employees/list' },
        { id: 'employee-add', label: '新增员工', href: '/employees/add' }
      ]
    },
    {
      id: 'payroll',
      label: '薪资管理 Payroll',
      href: '/payroll',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: '报表中心 Reports',
      href: '/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  // Table columns definition
  const columns: ColumnDef<Employee>[] = [
    {
      id: 'name',
      header: '姓名 Name',
      accessor: 'name',
      sortable: true,
      sticky: 'left',
      cell: (value, row) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-medium mr-3">
            {value.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      id: 'position',
      header: '职位 Position',
      accessor: 'position',
      sortable: true
    },
    {
      id: 'department',
      header: '部门 Department',
      accessor: 'department',
      sortable: true,
      hiddenOnMobile: true
    },
    {
      id: 'salary',
      header: '薪资 Salary',
      accessor: 'salary',
      sortable: true,
      align: 'right',
      cell: (value) => (
        <span className="font-mono text-financial-positive">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      id: 'status',
      header: '状态 Status',
      accessor: 'status',
      cell: (value) => (
        <span className={`status-badge ${
          value === 'active' ? 'positive' : 
          value === 'inactive' ? 'negative' : 'warning'
        }`}>
          {value === 'active' ? '在职' : 
           value === 'inactive' ? '离职' : '待入职'}
        </span>
      )
    },
    {
      id: 'hireDate',
      header: '入职日期 Hire Date',
      accessor: 'hireDate',
      sortable: true,
      hiddenOnMobile: true,
      cell: (value) => formatDate(new Date(value))
    }
  ];

  // Filter employees based on search and salary
  const filteredEmployees = sampleEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSalary = !salaryFilter || employee.salary >= salaryFilter;
    
    return matchesSearch && matchesSalary;
  });

  return (
    <AppLayout
      navigation={navigation}
      activeNavId="employees"
      title="设计系统演示 Design System Demo"
      breadcrumbs={[
        { label: '首页', href: '/' },
        { label: '设计系统', href: '/design-system' },
        { label: '组件演示' }
      ]}
      user={{
        name: '管理员 Admin',
        email: 'admin@company.com',
        role: '系统管理员'
      }}
      notificationCount={3}
      logo={
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-content font-bold text-sm">HR</span>
          </div>
          <span className="ml-2 font-semibold text-gray-900">薪资系统</span>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            专业 HR/薪资管理系统设计组件
          </h2>
          <p className="text-gray-600 mb-6">
            基于 Tailwind CSS v4 + DaisyUI 构建的现代化设计系统，专为数据密集的人力资源和薪资管理界面优化。
            支持中英文双语显示，具备完整的响应式布局和无障碍访问功能。
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-positive/10 border border-positive/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-positive text-2xl font-bold">{sampleEmployees.filter(e => e.status === 'active').length}</div>
                <div className="ml-auto">
                  <svg className="w-8 h-8 text-positive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-positive text-sm mt-1">在职员工</p>
            </div>
            
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-warning text-2xl font-bold">{sampleEmployees.filter(e => e.status === 'pending').length}</div>
                <div className="ml-auto">
                  <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-warning text-sm mt-1">待入职</p>
            </div>
            
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-info text-2xl font-bold">
                  {formatCurrency(sampleEmployees.reduce((sum, e) => sum + e.salary, 0))}
                </div>
                <div className="ml-auto">
                  <svg className="w-8 h-8 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-info text-sm mt-1">总薪资</p>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-primary text-2xl font-bold">{sampleEmployees.length}</div>
                <div className="ml-auto">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-primary text-sm mt-1">总员工数</p>
            </div>
          </div>
        </div>

        {/* Button Components Demo */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">按钮组件 Button Components</h3>
          <div className="space-y-4">
            {/* Primary Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">主要操作 Primary Actions</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">保存 Save</Button>
                <Button variant="primary" loading>处理中 Processing</Button>
                <Button variant="primary" disabled>已禁用 Disabled</Button>
                <Button variant="success">确认 Confirm</Button>
                <Button variant="warning">警告 Warning</Button>
                <Button variant="destructive">删除 Delete</Button>
              </div>
            </div>

            {/* Secondary Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">次要操作 Secondary Actions</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary">编辑 Edit</Button>
                <Button variant="outline">取消 Cancel</Button>
                <Button variant="ghost">详情 Details</Button>
                <Button variant="link">了解更多 Learn More</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">尺寸变化 Sizes</h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">小按钮 Small</Button>
                <Button size="default">默认 Default</Button>
                <Button size="lg">大按钮 Large</Button>
                <Button size="xl">超大 Extra Large</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Components Demo */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">表单组件 Form Components</h3>
          
          {/* Input Components */}
          <div className="mb-8">
            <h4 className="text-base font-medium text-gray-900 mb-4">输入框组件 Input Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Inputs */}
              <div className="space-y-4">
                <Input
                  label="员工姓名 Employee Name"
                  placeholder="请输入员工姓名"
                  required
                />
                
                <Input
                  label="邮箱地址 Email"
                  type="email"
                  placeholder="example@company.com"
                  helpText="用于系统登录和通知"
                />
                
                <Input
                  label="错误示例 Error Example"
                  placeholder="Invalid input"
                  error="请输入有效的信息"
                  variant="error"
                />
              </div>

              {/* Specialized Inputs */}
              <div className="space-y-4">
                <SearchInput
                  label="搜索员工 Search Employees"
                  placeholder="输入姓名、职位或部门"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm('')}
                />
                
                <CurrencyInput
                  label="薪资过滤 Salary Filter"
                  placeholder="最低薪资"
                  onValueChange={setSalaryFilter}
                  helpText="显示薪资高于此金额的员工"
                />
                
                <Input
                  label="成功状态 Success State"
                  placeholder="Valid input"
                  variant="success"
                  helpText="信息验证成功"
                />
              </div>
            </div>
          </div>

          {/* Select Components */}
          <div className="mb-8">
            <h4 className="text-base font-medium text-gray-900 mb-4">选择器组件 Select Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="所属部门 Department"
                placeholder="请选择部门"
                searchable
                options={[
                  { value: 'tech', label: '技术部 Technology' },
                  { value: 'hr', label: '人力资源部 Human Resources' },
                  { value: 'finance', label: '财务部 Finance' },
                  { value: 'marketing', label: '市场部 Marketing' },
                  { value: 'operations', label: '运营部 Operations' }
                ]}
                value={selectedDepartment}
                onChange={(value) => setSelectedDepartment(value as string | number)}
                helpText="选择员工所属的主要部门"
              />
              
              <Select
                label="技能标签 Skills"
                placeholder="选择相关技能"
                multiple
                searchable
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'typescript', label: 'TypeScript' },
                  { value: 'nodejs', label: 'Node.js' },
                  { value: 'python', label: 'Python' },
                  { value: 'postgresql', label: 'PostgreSQL' },
                  { value: 'design', label: 'UI/UX Design' }
                ]}
                helpText="可以选择多个技能"
              />
            </div>
          </div>

          {/* Radio & Checkbox Components */}
          <div className="mb-8">
            <h4 className="text-base font-medium text-gray-900 mb-4">选项组件 Choice Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RadioGroup
                label="薪资发放频率 Pay Frequency"
                options={[
                  { 
                    value: 'monthly', 
                    label: '月结算 Monthly', 
                    description: '每月最后一天发放薪资' 
                  },
                  { 
                    value: 'biweekly', 
                    label: '双周结算 Bi-weekly', 
                    description: '每两周发放一次薪资' 
                  },
                  { 
                    value: 'weekly', 
                    label: '周结算 Weekly', 
                    description: '每周发放薪资' 
                  }
                ]}
                value={selectedPayFrequency}
                onChange={setSelectedPayFrequency}
                helpText="选择薪资发放的时间间隔"
              />
              
              <CheckboxGroup
                label="通知设置 Notification Preferences"
                options={[
                  { 
                    value: 'email', 
                    label: '邮件通知 Email', 
                    description: '接收重要邮件通知' 
                  },
                  { 
                    value: 'sms', 
                    label: '短信通知 SMS', 
                    description: '接收重要短信通知' 
                  },
                  { 
                    value: 'push', 
                    label: '推送通知 Push', 
                    description: '接收应用推送通知' 
                  }
                ]}
                value={selectedNotifications}
                onChange={setSelectedNotifications}
                helpText="选择接收通知的方式"
              />
            </div>
          </div>

          {/* Textarea & DatePicker */}
          <div className="mb-8">
            <h4 className="text-base font-medium text-gray-900 mb-4">高级输入组件 Advanced Input Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea
                label="员工备注 Employee Notes"
                placeholder="请输入员工相关备注信息..."
                value={employeeNotes}
                onChange={(e) => setEmployeeNotes(e.target.value)}
                rows={4}
                maxLength={500}
                showCharCount
                autoResize
                helpText="记录员工的特殊技能、工作经验或其他重要信息"
              />
              
              <DatePicker
                label="入职日期 Hire Date"
                placeholder="请选择入职日期"
                value={selectedDate}
                onChange={setSelectedDate}
                maxDate={new Date()}
                helpText="选择员工正式入职的日期"
              />
            </div>
          </div>

          {/* Single Components */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">单项选择 Single Options</h4>
            <div className="space-y-4">
              <Checkbox
                label="同意服务条款 Accept Terms of Service"
                description="我已阅读并同意公司的服务条款和隐私政策"
                checked={agreedToTerms}
                onChange={setAgreedToTerms}
                required
              />
              
              <Checkbox
                label="接收营销邮件 Marketing Emails"
                description="接收公司产品更新和营销活动的邮件通知"
                indeterminate={selectedNotifications.includes('email') && selectedNotifications.length > 1}
              />
            </div>
          </div>
        </div>

        {/* DataTable Demo */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">数据表格 Data Table</h3>
            <div className="flex gap-3">
              <Button
                variant="primary"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                新增员工
              </Button>
              {selectedEmployees.size > 0 && (
                <Button variant="outline">
                  批量操作 ({selectedEmployees.size})
                </Button>
              )}
            </div>
          </div>

          <DataTable
            data={filteredEmployees}
            columns={columns}
            selectable
            selectedRows={selectedEmployees}
            onSelectionChange={setSelectedEmployees}
            getRowId={(row) => row.id}
            responsive
            hover
            emptyMessage="没有找到匹配的员工数据"
          />
        </div>

        {/* Typography Demo */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">优雅衬线字体系统 Elegant Serif Typography</h3>
          <div className="space-y-8">
            {/* Font Families Demo */}
            <div>
              <h4 className="text-base font-medium text-gray-600 mb-4">字体族 Font Families</h4>
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">标题字体 - Source Serif Pro + Noto Serif SC</p>
                  <h3 className="font-serif text-2xl font-semibold text-gray-900">
                    专业人力资源薪资管理系统 Professional HR Payroll Management System
                  </h3>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">正文字体 - Crimson Text + Noto Serif SC</p>
                  <p className="font-serif-body text-base text-gray-900">
                    这是一个优雅的衬线字体系统，专为中英文混排而设计。Crimson Text 是一款经典的正文衬线字体，
                    具有出色的可读性和优雅的字形设计。配合思源宋体，为中文内容提供了完美的视觉体验。
                    This elegant serif typography system is designed for mixed Chinese-English content with superior 
                    readability and aesthetic appeal.
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">等宽字体 - JetBrains Mono</p>
                  <code className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    employee_salary = 15000.00; // 员工薪资 {`{ id: "EMP001", amount: ¥15,000.00 }`}
                  </code>
                </div>
              </div>
            </div>

            {/* Headings Hierarchy */}
            <div>
              <h4 className="text-base font-medium text-gray-600 mb-4">标题层级 Heading Hierarchy</h4>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl font-bold text-gray-900">
                  一级标题 H1 - 主要页面标题 Main Page Title
                </h1>
                <h2 className="font-serif text-3xl font-semibold text-gray-900">
                  二级标题 H2 - 章节标题 Section Title
                </h2>
                <h3 className="font-serif text-2xl font-semibold text-gray-900">
                  三级标题 H3 - 子章节 Subsection
                </h3>
                <h4 className="font-serif text-xl font-medium text-gray-900">
                  四级标题 H4 - 组件标题 Component Title
                </h4>
                <h5 className="font-serif text-lg font-medium text-gray-900">
                  五级标题 H5 - 小节标题 Minor Section
                </h5>
                <h6 className="font-serif text-base font-medium text-gray-900">
                  六级标题 H6 - 最小标题 Smallest Heading
                </h6>
              </div>
            </div>

            {/* Body Text Sizes */}
            <div>
              <h4 className="text-base font-medium text-gray-600 mb-4">正文文本 Body Text Styles</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-serif-body text-gray-900">
                    大号正文 (18px) - 适用于重要介绍文字和引导内容。这种尺寸的文字具有很好的视觉冲击力，
                    适合用于重要信息的传达。Large body text for important introductions and lead content.
                  </p>
                </div>
                
                <div>
                  <p className="text-base font-serif-body text-gray-900">
                    标准正文 (16px) - 这是默认的正文字体大小，适用于大部分内容显示。优雅的衬线字体设计确保了
                    在长时间阅读时的舒适性。支持中英文混排，字间距和行间距都经过精心优化。
                    Standard body text for most content with optimized spacing for Chinese-English mixed typography.
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-serif-body text-gray-600">
                    小号文本 (14px) - 用于辅助信息、帮助文本和次要内容。适合用于表格中的数据、
                    注释说明和补充信息。Small text for auxiliary information and supplementary content.
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-serif-body text-gray-500">
                    极小文本 (12px) - 用于版权信息、技术细节和最次要的内容显示。
                    Extra small text for copyright and technical details.
                  </p>
                </div>
              </div>
            </div>

            {/* Financial & Data Text */}
            <div>
              <h4 className="text-base font-medium text-gray-600 mb-4">财务数据展示 Financial Data Display</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-positive/10 border border-positive/20 rounded-lg">
                  <p className="text-sm text-positive mb-1">收入 Income</p>
                  <p className="font-mono text-2xl font-bold text-positive tabular-nums">+¥15,000.00</p>
                  <p className="text-xs text-positive/80 mt-1">较上月增长 12.5%</p>
                </div>
                
                <div className="p-4 bg-negative/10 border border-negative/20 rounded-lg">
                  <p className="text-sm text-negative mb-1">扣除 Deductions</p>
                  <p className="font-mono text-2xl font-bold text-negative tabular-nums">-¥2,500.00</p>
                  <p className="text-xs text-negative/80 mt-1">社保公积金等</p>
                </div>
                
                <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                  <p className="text-sm text-info mb-1">净薪资 Net Salary</p>
                  <p className="font-mono text-2xl font-bold text-info tabular-nums">¥12,500.00</p>
                  <p className="text-xs text-info/80 mt-1">实际到账金额</p>
                </div>
              </div>
            </div>

            {/* Mixed Content Example */}
            <div>
              <h4 className="text-base font-medium text-gray-600 mb-4">中英文混排示例 Mixed Content Example</h4>
              <div className="p-6 bg-gray-100 rounded-lg border border-gray-200">
                <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">
                  Employee Performance Review 员工绩效评估报告
                </h3>
                <p className="font-serif-body text-base text-gray-900 leading-relaxed">
                  根据 Q4 2023 的绩效数据分析，张三 (Employee ID: EMP001) 在 Software Development 
                  岗位上表现出色。其技术能力评分为 92/100，团队协作能力评分为 88/100。
                  建议在下一季度将其 Base Salary 从 ¥12,000 调整至 ¥15,000，
                  并给予 Performance Bonus ¥3,000 作为激励。
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  Report generated on 2024-01-15 by HR System v2.0
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Badges */}
        <div className="bg-base-200 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">状态标识 Status & Badges</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">状态徽章 Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <span className="status-badge positive">活跃 Active</span>
                <span className="status-badge negative">停用 Inactive</span>
                <span className="status-badge warning">待审核 Pending</span>
                <span className="status-badge info">处理中 Processing</span>
                <span className="status-badge neutral">草稿 Draft</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">进度条 Progress Bars</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>薪资处理进度</span>
                    <span>75%</span>
                  </div>
                  <div className="progress-enhanced">
                    <div className="progress-bar positive" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>员工入职进度</span>
                    <span>45%</span>
                  </div>
                  <div className="progress-enhanced">
                    <div className="progress-bar warning" style={{ width: '45%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>数据同步进度</span>
                    <span>90%</span>
                  </div>
                  <div className="progress-enhanced">
                    <div className="progress-bar info" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};