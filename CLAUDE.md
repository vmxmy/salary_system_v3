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