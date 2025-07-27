# 快速开始

欢迎使用薪资管理系统组件库！本指南将帮助您快速上手，了解如何在项目中使用我们的组件和设计系统。

## 环境要求

### 系统要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
- **操作系统**: macOS, Windows, Linux

### 浏览器支持
- **现代浏览器**: Chrome >= 90, Firefox >= 88, Safari >= 14, Edge >= 90
- **移动浏览器**: iOS Safari >= 14, Chrome Android >= 90

## 项目设置

### 1. 克隆项目
```bash
git clone <repository-url>
cd salary_system/webapp/v3/frontend
```

### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 3. 环境配置
复制环境配置文件：
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，配置 Supabase 连接：
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 启动开发服务器
```bash
npm run dev
```

项目将在 `http://localhost:5173` 启动。

## 项目结构

```
src/
├── components/          # UI 组件
│   ├── common/         # 通用组件
│   ├── employee/       # 员工管理组件
│   ├── payroll/        # 薪资管理组件
│   └── layouts/        # 布局组件
├── pages/              # 页面组件
├── hooks/              # 自定义 Hooks
├── services/           # API 服务
├── styles/             # 样式文件
│   ├── modern-effects.ts    # 现代化效果
│   ├── typography.ts       # 排版系统
│   └── design-tokens.ts    # 设计令牌
├── lib/                # 工具库
├── types/              # TypeScript 类型定义
└── locales/            # 国际化文件
```

## 核心概念

### 1. 设计令牌系统
设计令牌是设计系统的基础，定义了颜色、字体、间距等基础样式：

```tsx
// 使用设计令牌
import { colors, spacing, typography } from '@/styles/design-tokens';

function ExampleComponent() {
  return (
    <div 
      className={`
        ${colors.primary.base} 
        ${spacing.padding.md} 
        ${typography.body.base}
      `}
    >
      内容
    </div>
  );
}
```

### 2. 孔雀屏设计模式
我们的核心设计模式，强调信息的分层展示：

```tsx
import { AccordionSection } from '@/components/common/AccordionSection';

function PeacockExample() {
  const [openSections, setOpenSections] = useState(['basic']);

  return (
    <div className="peacock-container">
      {/* 核心信息 */}
      <h1 className="text-2xl font-bold mb-4">员工详情</h1>
      
      {/* 分层信息展示 */}
      <AccordionSection
        id="basic"
        title="基本信息"
        icon={<UserIcon />}
        isOpen={openSections.includes('basic')}
        onToggle={() => toggleSection('basic')}
      >
        <div>基本信息内容</div>
      </AccordionSection>
    </div>
  );
}
```

### 3. 现代化组件
所有组件都支持现代化的视觉效果和交互：

```tsx
import { ModernButton } from '@/components/common/ModernButton';
import { DataTable } from '@/components/common/DataTable';

function ModernExample() {
  return (
    <div>
      <ModernButton variant="primary" size="md">
        现代化按钮
      </ModernButton>
      
      <DataTable
        columns={columns}
        data={data}
        enableExport={true}
        showPagination={true}
      />
    </div>
  );
}
```

## 创建第一个页面

### 1. 创建页面组件
```tsx
// src/pages/ExamplePage.tsx
import React from 'react';
import { ModernButton } from '@/components/common/ModernButton';
import { FinancialCard } from '@/components/common/FinancialCard';
import { useTranslation } from '@/hooks/useTranslation';

export default function ExamplePage() {
  const { t } = useTranslation(['common', 'employee']);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-50 to-base-100">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-base-100 via-base-50/50 to-base-100 border-b border-base-200/60 mb-6">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-base-content">
            {t('common:example')}
          </h1>
          <p className="text-base-content/60 mt-2">
            这是一个示例页面
          </p>
        </div>
      </div>

      {/* 页面内容 */}
      <div className="container mx-auto px-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinancialCard
            title="总计"
            value="¥15,000.00"
            variant="info"
            icon="💰"
          />
          <FinancialCard
            title="已发放"
            value="¥12,750.00"
            variant="success"
            icon="✅"
          />
          <FinancialCard
            title="扣除"
            value="¥2,250.00"
            variant="warning"
            icon="📊"
          />
        </div>

        <div className="flex gap-4">
          <ModernButton variant="primary">
            主要操作
          </ModernButton>
          <ModernButton variant="secondary">
            次要操作
          </ModernButton>
        </div>
      </div>
    </div>
  );
}
```

### 2. 添加路由
```tsx
// src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import ExamplePage from '@/pages/ExamplePage';

export const router = createBrowserRouter([
  // 其他路由...
  {
    path: '/example',
    element: <ExamplePage />,
  },
]);
```

## 使用核心组件

### 1. ModernButton 按钮组件
```tsx
import { ModernButton } from '@/components/common/ModernButton';
import { PlusIcon } from 'lucide-react';

function ButtonExample() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="space-x-2">
      <ModernButton 
        variant="primary" 
        size="md"
        icon={<PlusIcon />}
        onClick={handleClick}
        loading={loading}
      >
        添加员工
      </ModernButton>
      
      <ModernButton variant="secondary">
        取消
      </ModernButton>
    </div>
  );
}
```

### 2. DataTable 数据表格
```tsx
import { DataTable } from '@/components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<Employee>();

const columns = [
  columnHelper.accessor('name', {
    header: '姓名',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('department', {
    header: '部门',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('salary', {
    header: '薪资',
    cell: info => `¥${info.getValue().toLocaleString()}`,
  }),
];

function TableExample() {
  const { data, isLoading } = useEmployees();

  return (
    <DataTable
      columns={columns}
      data={data || []}
      loading={isLoading}
      enableExport={true}
      showPagination={true}
      exportFileName="employees"
    />
  );
}
```

### 3. AccordionSection 折叠面板
```tsx
import { AccordionSection } from '@/components/common/AccordionSection';
import { UserIcon, BriefcaseIcon } from 'lucide-react';

function AccordionExample() {
  const [openSections, setOpenSections] = useState(['personal']);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="space-y-4">
      <AccordionSection
        id="personal"
        title="个人信息"
        icon={<UserIcon />}
        isOpen={openSections.includes('personal')}
        onToggle={() => toggleSection('personal')}
      >
        <div className="space-y-2">
          <p>姓名: 张三</p>
          <p>邮箱: zhangsan@example.com</p>
        </div>
      </AccordionSection>

      <AccordionSection
        id="work"
        title="工作信息"
        icon={<BriefcaseIcon />}
        isOpen={openSections.includes('work')}
        onToggle={() => toggleSection('work')}
      >
        <div className="space-y-2">
          <p>部门: 技术部</p>
          <p>职位: 前端工程师</p>
        </div>
      </AccordionSection>
    </div>
  );
}
```

## 样式和主题

### 1. 使用现代化效果
```tsx
import { cardEffects, buttonEffects, iconContainer } from '@/styles/modern-effects';
import { cn } from '@/lib/utils';

function StyledComponent() {
  return (
    <div className={cn(cardEffects.modern, 'p-6')}>
      <div className={iconContainer.modern('primary', 'md')}>
        <Icon />
      </div>
      
      <button className={buttonEffects.primary}>
        现代化按钮
      </button>
    </div>
  );
}
```

### 2. 响应式设计
```tsx
import { responsive } from '@/styles/modern-effects';

function ResponsiveComponent() {
  return (
    <div className={cn(
      'grid gap-4',
      responsive.mobile.grid,   // 移动端: grid-cols-1 sm:grid-cols-2
      'lg:grid-cols-3'          // 桌面端: 3列布局
    )}>
      {items.map(item => (
        <div key={item.id} className={responsive.mobile.padding}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

### 3. 性能优化
```tsx
import { performance } from '@/styles/modern-effects';

function OptimizedComponent() {
  return (
    <div className={cn(
      'transition-all duration-300',
      performance.animationContainer  // 硬件加速容器
    )}>
      <div className={performance.textContainer}>
        文本内容
      </div>
      
      <div className={performance.scrollContainer}>
        可滚动内容
      </div>
    </div>
  );
}
```

## 国际化支持

### 1. 使用翻译
```tsx
import { useTranslation } from '@/hooks/useTranslation';

function I18nExample() {
  const { t } = useTranslation(['common', 'employee']);

  return (
    <div>
      <h1>{t('common:welcome')}</h1>
      <p>{t('employee:description')}</p>
      
      {/* 带参数的翻译 */}
      <p>{t('common:greeting', { name: '张三' })}</p>
    </div>
  );
}
```

### 2. 添加新的翻译
```json
// src/locales/zh-CN/common.json
{
  "welcome": "欢迎使用薪资管理系统",
  "greeting": "您好，{{name}}！"
}
```

## 数据管理

### 1. 使用 API 服务
```tsx
import { employeeService } from '@/services/employee.service';
import { useQuery, useMutation } from '@tanstack/react-query';

function DataExample() {
  // 查询数据
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getEmployees(),
  });

  // 变更数据
  const createEmployee = useMutation({
    mutationFn: employeeService.createEmployee,
    onSuccess: () => {
      // 重新获取数据
      queryClient.invalidateQueries(['employees']);
    },
  });

  const handleCreate = (data: EmployeeData) => {
    createEmployee.mutate(data);
  };

  return (
    <div>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <EmployeeList 
          employees={employees || []}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
```

### 2. 状态管理
```tsx
import { create } from 'zustand';

interface AppStore {
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
}

const useAppStore = create<AppStore>((set) => ({
  selectedEmployeeId: null,
  setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),
}));

function StateExample() {
  const { selectedEmployeeId, setSelectedEmployeeId } = useAppStore();

  return (
    <div>
      <p>当前选中: {selectedEmployeeId || '无'}</p>
      <button onClick={() => setSelectedEmployeeId('123')}>
        选择员工
      </button>
    </div>
  );
}
```

## 常见问题

### Q: 如何自定义主题颜色？
A: 修改 `src/styles/theme.css` 中的 CSS 变量：
```css
:root {
  --color-primary: rgb(59 130 246);
  --color-primary-hover: rgb(37 99 235);
}
```

### Q: 如何添加新的组件？
A: 在 `src/components/common/` 下创建新组件，遵循现有的命名和结构约定。

### Q: 如何优化大列表的性能？
A: 使用 DataTable 组件的分页功能，或者实现虚拟化列表。

### Q: 如何处理错误状态？
A: 使用 React Query 的错误处理机制，配合 Toast 通知用户。

## 下一步

- 阅读 [设计系统概述](../design-system/overview.md) 了解设计原则
- 查看 [组件文档](../components/) 学习具体组件用法
- 学习 [孔雀屏设计模式](../patterns/peacock-screen.md) 的应用
- 掌握 [性能优化技巧](../styles/performance.md)

欢迎开始使用薪资管理系统组件库！如有问题，请查阅相关文档或联系开发团队。