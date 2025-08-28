# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Copy environment configuration
cp env.local.example .env.local
# Update .env.local with your Supabase credentials

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production (includes TypeScript compilation)
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies (minimal: python-dotenv, supabase)
pip install -r requirements.txt

# Start development server
python main.py
```

### Supabase Development
```bash
# Navigate to supabase directory
cd supabase

# Start local Supabase instance
supabase start

# Stop local Supabase instance
supabase stop

# Apply database migrations
supabase db push

# Reset local database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > ../frontend/src/types/supabase.ts
```

## Project Architecture

### High-Level Structure
This is a **refactored salary management system** migrating to Supabase and Render architecture:

- **Frontend**: React 19 + TypeScript 5.8 + Vite 7 + DaisyUI 5 + TailwindCSS 4
- **Backend**: Python + Supabase integration (minimal FastAPI alternative)
- **Database**: Supabase PostgreSQL with comprehensive schema
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: Supabase Storage for file management

### Directory Structure
```
v3/
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Generic components (DataTable, Pagination)
│   │   │   └── employee/       # Employee-specific components
│   │   ├── contexts/           # React contexts (AuthContext)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Layout components
│   │   ├── lib/                # API clients and utilities
│   │   ├── pages/              # Page components
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets
│   └── package.json            # Dependencies and scripts
├── backend/                    # Python backend (Supabase integration)
│   ├── main.py                 # Backend entry point
│   └── requirements.txt        # Python dependencies
├── supabase/                   # Supabase configuration
│   ├── config.toml             # Supabase local config
│   └── migrations/             # Database migration files
└── docs/                       # Project documentation
```

### Key Dependencies

#### Frontend Dependencies
- **React 19**: Latest React with improved performance and concurrent features
- **TypeScript 5.8**: Strict type checking and enhanced developer experience
- **Vite 7**: Lightning-fast build tool with HMR support
- **TailwindCSS 4**: Utility-first CSS framework with JIT compilation
- **DaisyUI 5**: Component library built on TailwindCSS
- **Supabase JS Client**: Official Supabase JavaScript SDK
- **TanStack Table**: Powerful table component for data display
- **React Router 7**: Client-side routing with type-safe navigation

### Key Architectural Patterns

#### Frontend Architecture
- **Component-Based Design**: Modular React components with clear separation of concerns
- **Hook Composition**: Custom hooks for data fetching and state management
- **Context Providers**: Centralized authentication and global state management
- **Type Safety**: Comprehensive TypeScript coverage with Supabase generated types

#### Backend Architecture
- **Hybrid Approach**: Minimal Python backend with Supabase BaaS integration
- **Database-First**: Leveraging Supabase's built-in features for most operations
- **Service Layer**: Python backend handles complex business logic and integrations

#### Database Design
- **HR Schema**: Employee management with organizational hierarchy
- **Payroll Schema**: Comprehensive payroll calculation and management system
- **Lookup Tables**: Flexible configuration through lookup_types and lookup_values
- **Time-Sliced Data**: Employee assignments with temporal validity periods
- **Security**: Row Level Security (RLS) policies for data protection

### Database Schema Highlights

#### Core Tables
- **employees**: Biographical employee information
- **employee_assignments**: Time-sliced role, department, and status data
- **departments**: Organizational department hierarchy
- **positions**: Job position hierarchy
- **personnel_categories**: Employee categorization (full-time, contractor, etc.)

#### Payroll System
- **payroll_components**: Definition of all salary components (earnings, deductions)
- **payroll_periods**: Pay period management
- **employee_payroll_configs**: Employee-specific payroll parameters
- **payroll_results**: Final calculated payroll data

#### Configuration System
- **lookup_types**: Categories for configurable values
- **lookup_values**: Individual options for each lookup type

### Authentication & Authorization

#### Supabase Auth Integration
- JWT-based authentication with automatic token management
- User profiles linked to employee records through `user_profiles` table
- Row Level Security (RLS) policies control data access at database level
- Authentication context provides user state throughout application

#### Security Features
- **RLS Policies**: Database-level security for all tables
- **Service Role Access**: Backend operations bypass RLS using service role
- **Sensitive Data Protection**: Encrypted storage for sensitive information like ID numbers
- **Permission-Based Access**: Role-based access control through user assignments

### Development Workflow

#### Frontend Development
- Use modern React patterns with hooks and functional components
- Follow TypeScript strict mode for type safety
- Utilize DaisyUI component library for consistent UI
- Implement responsive design with Tailwind CSS utilities

#### Backend Development
- Minimal Python backend focused on complex business logic
- Leverage Supabase APIs for standard CRUD operations
- Handle integrations and complex calculations in Python
- Use environment variables for configuration management

#### Database Development
- Use Supabase migrations for schema changes
- Create database views for complex queries
- Implement RLS policies for security
- Generate TypeScript types after schema changes

### Environment Configuration

#### Required Environment Variables
**Frontend (.env.local):**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (.env):**
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

#### Supabase Configuration
- Local development runs on ports 54321 (API), 54322 (DB), 54323 (Studio)
- Authentication configured for local development site_url
- Storage and realtime features enabled for enhanced functionality

### Important Development Notes

#### Frontend Development
- Always generate TypeScript types after schema changes: `supabase gen types`
- Use the established component patterns in `/components/common`
- Implement proper error boundaries and loading states
- Follow the authentication flow established in AuthContext

#### Backend Development
- Use Supabase service role for backend operations that bypass RLS
- Handle complex business logic that cannot be efficiently done in PostgreSQL
- Implement proper error handling and logging
- Maintain environment variable security

#### Database Development
- Always use migrations for schema changes
- Test RLS policies thoroughly before deployment
- Consider performance implications of complex views
- Document database schema changes in migration comments

### Migration Context

This v3 refactor represents a migration from a complex FastAPI + SQLAlchemy architecture to a simplified Supabase-first approach. The goal is to:

1. **Reduce Complexity**: Leverage Supabase's built-in features instead of custom implementations
2. **Improve Scalability**: Use Supabase's managed infrastructure
3. **Enhance Developer Experience**: Simplified deployment and development workflow
4. **Maintain Functionality**: Preserve all existing HR and payroll management features

### Testing Strategy

#### Frontend Testing
- Component unit tests for critical UI components
- Integration tests for data flow and API interactions
- E2E tests for complete user workflows

#### Backend Testing
- API endpoint testing for custom backend logic
- Database integration testing
- Performance testing for complex queries

The system maintains the sophisticated HR and payroll management capabilities of the original while adopting a more modern, maintainable architecture based on Supabase's Backend-as-a-Service platform.

## User Management Memories

### User Role Assignments
- 用户 mailto:blueyang@gmail.com 分配超级管理员角色：
  - 用户ID: 089b777e-0fa4-4238-adbc-066860cee037
  - 角色: super_admin (超级管理员)
  - 状态: active (已激活)
  - 分配时间: 2025-07-09 01:22:31

## Development Memories

### Database Development
- postgresql数据库要先检查schema再定位表
- 新系统的数据库操作使用 supabase-mcp-server；老系统的数据查询使用postgres MCP Server
- 不要使用模拟数据，所有模块都需要基于真是的supabase数据进行设计

### Frontend Development Memories
- 前端使用标准的daisyUI5样式，不要使用任何自定义的样式管理
- **字段命名统一**：所有字段使用 `employee_name` 而不是 `full_name`，保持前后端一致

### Database Migration Status (2025-01-11)
- **字段名标准化完成**：成功完成从 `full_name` 到 `employee_name` 的完整迁移
  - Phase 1: 更新所有视图使用 employee_name 别名 
  - Phase 2: 添加 employee_name 列到 employees 表并同步数据 (81/81 employees)
  - Phase 3: 删除旧的 full_name 字段，实现完全清洁的架构
- **所有视图已更新**：包括 view_payroll_summary, view_payroll_unified, view_recent_activities, view_payroll_metadata 等
- **数据完整性验证**：所有 895 条薪资记录和相关视图正常工作

## 数据库视图和字段规范文档

### 视图架构使用指南 (view-documentation.md)

系统采用分层视图架构，解决了数据冗余和性能问题：

#### 核心视图使用场景
- **view_payroll_summary**: 薪资列表页面（一对一关系，避免数据重复）
  - 用于列表展示，每个薪资记录仅一行
  - 包含员工基本信息但不包含薪资明细项
  - 查询示例: `.from('view_payroll_summary').select('*').eq('pay_month', '2025-01')`

- **view_payroll_unified**: 薪资详情页面（一对多关系，包含所有明细）
  - 用于详情展示和报表生成
  - 每个薪资对应多行（各薪资项目）
  - 查询示例: `.from('view_payroll_unified').select('*').eq('payroll_id', 'uuid')`

- **view_payroll_trend_unified**: 统计报表（预聚合数据）
  - 用于趋势分析和月度统计
  - 包含汇总指标和时间维度标识
  - 查询示例: `.from('view_payroll_trend_unified').select('*').eq('is_recent_12_months', true)`

#### 性能优化原则
1. 列表页面必须使用 `view_payroll_summary` 避免JOIN导致的数据倍增
2. 详情页面使用 `view_payroll_unified` 获取完整信息
3. 统计分析使用专门的聚合视图，避免实时计算

### 字段映射规范 (field-mapping-guide.md)

#### 统一字段命名规则
所有前后端代码必须使用一致的字段名，禁止使用已废弃的旧字段名：

**核心字段映射**:
- `employee_name` (原 full_name) - 员工姓名
- `payroll_id` (原 id) - 薪资记录ID
- `bank_account_number` (原 primary_bank_account) - 银行账号
- `position_name` (原 position_title) - 职位名称
- `category_name` (原 personnel_category_name) - 人员类别

**时间维度字段**:
- `pay_month` - 格式: YYYY-MM
- `pay_month_string` - 格式: YYYY年MM月
- `pay_year` - 年份数字
- `pay_month_number` - 月份数字(1-12)
- `is_current_month` - 是否当前月份
- `is_current_year` - 是否当前年份

#### TypeScript类型定义要求
```typescript
// 标准接口定义
interface Employee {
  employee_id: string;
  employee_name: string;  // 不使用 full_name
  // ...
}

interface PayrollSummaryView {
  payroll_id: string;
  employee_name: string;  // 映射自 employees.full_name
  department_name?: string;
  // ...
}
```

#### 数据转换最佳实践
- 后端视图层负责字段名映射（如 `e.full_name as employee_name`）
- 前端直接使用统一后的字段名，无需二次转换
- 避免在前端代码中做字段名兼容处理

### 重要提醒
1. **新功能开发**: 必须参照字段映射规范，使用统一的字段名
2. **视图选择**: 根据使用场景选择正确的视图，避免性能问题
3. **类型安全**: 使用 TypeScript 接口确保字段名一致性
4. **文档位置**: 
   - 视图API文档: `/docs/api/view-documentation.md`
   - 字段映射指南: `/docs/field-mapping-guide.md`

## DaisyUI 5 + TailwindCSS 4 样式配置管理指南

### 核心配置原则

**重要提醒：DaisyUI 5 与 TailwindCSS 4 是最佳搭档，但必须使用正确的配置方式。**

#### 1. 配置文件分离原则
- **CSS 配置**：所有 DaisyUI 相关配置都在 CSS 文件中
- **JS 配置**：`tailwind.config.js` 只配置内容路径，不包含任何 DaisyUI 插件

#### 2. 正确的配置方式

**src/index.css（正确）：**
```css
/* TailwindCSS 4 + DaisyUI 5 标准配置 */
@import "tailwindcss";
@plugin "daisyui" {
  themes: light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro, cyberpunk, valentine, halloween, garden, forest, aqua, lofi, pastel, fantasy, wireframe, black, luxury, dracula, cmyk, autumn, business, acid, lemonade, night, coffee, winter, dim, nord, sunset;
}
```

**tailwind.config.js（正确）：**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // TailwindCSS 4: 所有 DaisyUI 配置都在 CSS 中，这里不需要任何插件配置
}
```

#### 3. 常见错误配置（避免）

**❌ 错误：混合配置导致冲突**
```javascript
// tailwind.config.js - 不要这样做
export default {
  plugins: [require('daisyui')], // ❌ TailwindCSS 4 中不需要
  daisyui: { themes: [...] }      // ❌ 应该在 CSS 中配置
}
```

```css
/* index.css - 同时使用会冲突 */
@import "tailwindcss";
@plugin "daisyui"; /* 如果 JS 中也配置了会冲突 */
```

#### 4. 主题切换实现

**JavaScript 主题切换：**
```typescript
// 设置主题
document.documentElement.setAttribute('data-theme', 'cupcake');

// 检查主题是否生效
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--p');
console.log('Primary color:', primaryColor); // 应该有值
```

**React Hook 实现：**
```typescript
const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState('cupcake');
  
  const setTheme = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daisyui-theme', theme);
    setCurrentTheme(theme);
    
    // 广播事件同步所有组件
    window.dispatchEvent(new CustomEvent('daisyui-theme-change', {
      detail: { theme }
    }));
  };
  
  return { currentTheme, setTheme };
};
```

#### 5. 故障排查指南

**问题：CSS 变量为空**
```bash
# 症状：getComputedStyle(...).getPropertyValue('--p') 返回空字符串
# 原因：配置冲突或初始化失败
# 解决：检查是否混合了新旧配置语法
```

**问题：主题切换无效果**
```bash
# 症状：data-theme 属性设置正确，但视觉效果不变
# 原因：DaisyUI 未正确初始化或 CSS 变量未注入
# 解决：确保只在 CSS 中配置 DaisyUI，移除 JS 配置
```

**问题：控制台错误**
```bash
# 症状：@plugin directive 相关错误
# 原因：TailwindCSS 版本不兼容或语法错误
# 解决：确保使用 TailwindCSS 4.x 和 DaisyUI 5.x
```

#### 6. 开发调试技巧

**验证配置是否正确：**
```javascript
// 开发环境中验证主题加载
console.log('Theme vars:', {
  primary: getComputedStyle(document.documentElement).getPropertyValue('--p'),
  secondary: getComputedStyle(document.documentElement).getPropertyValue('--s'),
  accent: getComputedStyle(document.documentElement).getPropertyValue('--a'),
});
```

**清理缓存：**
```bash
# 配置更改后清理构建缓存
rm -rf node_modules/.vite
npm run dev
```

#### 7. 最佳实践

1. **单一配置源**：所有 DaisyUI 配置都在 CSS 中
2. **主题列表**：在 CSS 中明确列出所有需要的主题
3. **状态同步**：使用事件机制同步组件间的主题状态
4. **性能优化**：避免频繁切换主题，使用防抖
5. **用户体验**：保存用户选择的主题到 localStorage
- 归档文件夹: /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/archived
- 使用缓存失效统一配置管理器,配置所需的缓存失效策略
- 缓存失效统一配置管理器:src/hooks/core/useCacheInvalidationManager.ts