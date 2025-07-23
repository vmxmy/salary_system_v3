# 项目技术架构文档：高新区工资信息管理系统

**版本**: 1.0
**日期**: 2025年7月23日

## 1. 概述 (Overview)

本文档旨在详细阐述“高新区工资信息管理系统”的技术架构。本系统旨在构建一个安全、可扩展且易于维护的现代化薪酬管理平台，能够精确处理复杂的工资、社保及个税计算，同时为员工和管理人员提供卓越的用户体验。

本架构的核心是 **Supabase 生态系统**，我们充分利用其提供的数据库、认证、存储、实时和边缘计算能力，构建一个“轻后端”（Backend-lite）甚至“无后端”（Serverless）的应用。

## 2. 核心设计哲学 (Core Design Philosophy)

我们的架构基于以下几个核心原则：

*   **数据库即后端 (Database as the Backend)**: 我们将 PostgreSQL 数据库作为系统的“单一事实来源 (Single Source of Truth)”，并通过其内置功能（如 RLS、数据库函数）来处理核心业务逻辑和安全策略。
*   **安全左移 (Shift-Left Security)**: 安全性从一开始就内置于数据层。通过行级安全（RLS），我们将访问控制策略直接在数据库中定义，确保任何客户端（无论是前端应用还是直接的 API 调用）都无法绕过权限检查。
*   **关注点分离 (Separation of Concerns)**: 每个组件各司其职。前端负责用户体验，数据库负责数据和核心逻辑，边缘函数负责流程编排和第三方集成。
*   **声明式开发 (Declarative Approach)**: 尽可能使用声明式工具。例如，通过 SQL 定义数据结构和安全策略，而不是在命令式的后端代码中实现。

## 3. 技术栈详情 (Technology Stack Details)

| 层次 | 技术/平台 | 用途 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | **React** (v18+) | 构建用户界面的核心框架。 |
| | **Vite** | 开发服务器和项目构建工具，提供极速的开发体验。 |
| | **TypeScript** | 为项目提供静态类型检查，增强代码健壮性。 |
| | **Tailwind CSS** | 用于快速构建现代化 UI 的功能类优先 CSS 框架。 |
| | **daisyUI** | 基于 Tailwind CSS 的组件库，提供开箱即用的 UI 组件。 |
| | **TanStack Table** | 强大的表格和数据网格库，用于复杂数据展示。 |
| | **Supabase-js (Client)** | 前端与 Supabase 后端交互的官方 JS 库。 |
| **后端平台 (Backend Platform)** | **Supabase** | 提供数据库、认证、存储、实时和边缘计算的一体化平台。 |
| **数据库 (Database)** | **PostgreSQL** (v15+) | 系统的核心数据存储，关系型数据库。 |
| | **pg_cron** | 用于执行定时任务（如自动生成工资单）的 Postgres 扩展。 |
| | **pgsodium** | 用于在数据库层面加密敏感数据（身份证、银行卡号）的扩展。 |
| **边缘计算 (Edge Computing)** | **Supabase Edge Functions** | 基于 Deno 的全球分布式 TypeScript 函数，用于处理业务流程。 |

## 4. 架构分层与职责 (Architectural Layers & Responsibilities)

本系统架构主要分为三个逻辑层次：

### 4.1. 前端应用 (Frontend Application)

*   **角色**: **用户体验层 (User Experience Layer)**。
*   **职责**:
    *   **UI/UX**: 渲染所有用户界面，包括员工个人仪表盘、HR 管理后台、报表视图等。
    *   **用户交互**: 处理用户的输入、表单提交和操作请求。
    *   **状态管理**: 管理前端应用的本地和全局状态。
    *   **认证流程**: 使用 `supabase-js` 引导用户完成登录、注册、忘记密码等操作。
    *   **数据展示与简单操作**: 执行简单的 CRUD（创建、读取、更新、删除）操作。例如，员工更新自己的联系方式，或 HR 查看部门员工列表。
    *   **调用业务逻辑**: 调用数据库函数 (RPC) 或边缘函数来触发复杂的业务流程。

### 4.2. Supabase 数据库 (Database as Backend)

*   **角色**: **数据与核心逻辑层 (Data & Core Logic Layer)**。
*   **职责**:
    *   **数据持久化**: 存储所有业务数据，包括员工信息、工资单、政策法规等。表结构设计见 `database_schema_design.md`。
    *   **数据安全与授权**: 通过**行级安全 (RLS)** 策略，在数据库层面强制执行所有数据访问规则。这是本架构安全模型的核心。
    *   **数据密集型计算**: 将复杂的、以数据为中心的计算逻辑封装在**数据库函数 (PostgreSQL Functions)** 中。例如：
        *   `calculate_payroll_for_employee()`: 计算单个员工的完整工资单。
        *   `get_employee_details_with_history()`: 获取员工及其完整的职位历史。
    *   **数据完整性**: 通过主键、外键、唯一约束和检查约束，保证数据的强一致性和准确性。
    *   **自动化触发**: 使用**数据库触发器 (Triggers)** 响应数据变化，例如，当 `employees` 表的 `termination_date` 被更新时，自动更新其 `employment_status`。

### 4.3. Supabase 边缘函数 (Edge Functions)

*   **角色**: **业务流程编排与集成层 (Process Orchestration & Integration Layer)**。
*   **职责**:
    *   **处理复杂业务流程**: 编排需要多个步骤、涉及多个系统调用的复杂工作流。例如，“执行月度发薪”流程。
    *   **安全的第三方集成**: 作为后端代理，安全地调用外部 API（如银行支付接口、税务申报接口）。API 密钥存储在 Supabase 的 Secrets Manager 中，前端绝不触及。
    *   **处理长时间运行的任务**: 接收前端请求，然后可以异步地、在后台执行耗时任务（或将其委托给更专业的后台服务如 AWS Lambda），避免前端请求超时。
    *   **执行高权限操作**: 对于某些需要绕过 RLS 的管理员操作（例如，系统级的批量数据修复），可以在 Edge Function 中使用 `service_role` 密钥来执行。

## 5. 数据流与业务流程示例

以一个核心业务流程 **“月度工资计算与发放”** 为例，展示各层如何协同工作：

1.  **[数据库 `pg_cron`]**: 每月25日，`pg_cron` 定时任务被触发，调用一个数据库函数 `create_all_draft_payrolls()`。
2.  **[数据库]**: 该函数遍历所有在职员工，并为每个人调用 `calculate_payroll_for_employee()` 函数，生成工资单草稿，状态为 `draft`，并存入 `payrolls` 和 `payroll_items` 表。
3.  **[前端 `Realtime`]**: HR 管理员的仪表盘通过 Supabase Realtime 实时监听到新工资单的创建，UI 自动更新，显示“待审批”的工资单列表。
4.  **[前端]**: HR 管理员审查工资单，点击“批准发放”按钮。
5.  **[边缘函数]**: 前端调用一个名为 `execute_payroll_run` 的 Edge Function。
6.  **[边缘函数]**: 该函数首先调用数据库函数将工资单状态更新为 `processing`。然后，它安全地从 Secrets 中读取银行 API 密钥，并调用银行接口执行转账。
7.  **[边缘函数]**: 在收到银行成功的响应后，该函数再次调用数据库函数，将工资单状态更新为 `paid`。
8.  **[数据库 `Trigger`]**: `payrolls` 表上的一个触发器被激活，调用 `pg_net` Webhook。
9.  **[Webhook/外部服务]**: Webhook 触发一个邮件/短信服务，向员工发送“工资已发放”的通知。
10. **[前端 `Realtime`]**: 员工和 HR 的界面都实时地看到工资单状态变成了“已支付”。

## 6. 安全模型总结

*   **认证**: 由 Supabase Auth 全权负责。
*   **授权**: 由数据库 RLS 策略在数据源头强制执行。
*   **数据加密**: 敏感 PII（个人身份信息）通过 `pgsodium` 在数据库中静态加密。
*   **密钥管理**: 第三方服务的 API 密钥由 Supabase Secrets Manager 管理，仅供 Edge Functions 在后端安全调用。

通过这种分层设计，我们构建了一个既能享受 Serverless 开发效率，又能保证企业级应用所需的安全、健壮和可维护性的现代化系统。
