# 薪资管理系统重构计划：迁移至 Render & Supabase

**文档版本:** 1.0
**日期:** 2025年7月7日

## 1. 项目现状与核心信息摘要

本章总结了当前项目的核心技术、架构和功能，为重构提供了基线参考。

### 1.1. 核心功能

项目是一个功能全面的 **人力资源与薪资管理系统 (HR & Payroll System)**。其核心目标是数字化和自动化管理企业的人事信息、薪资计算与发放、考勤、以及相关的配置和报表。

### 1.2. 技术栈

- **后端框架:** FastAPI
- **数据库 ORM:** SQLAlchemy
- **目标数据库:** PostgreSQL
- **数据验证/序列化:** Pydantic
- **异步服务器:** Uvicorn
- **数据库迁移:** Alembic
- **其他关键库:** Pandas (数据处理), Celery (任务队列), Redis (缓存)

### 1.3. 架构与设计特点

- **分层架构:** 清晰的三层架构（表现层 Routers, 业务逻辑层 Services/CRUD, 数据访问层 Models）。
- **模块化设计:** 功能按业务领域（HR, Payroll, Auth, Config）高度模块化。
- **V2 架构演进:** 项目 `v2` 版本明显向 **基于数据库视图 (View-based)** 的高性能查询模式演进，通过预计算和展平数据来优化复杂查询。
- **声明式依�����注入:** 广泛利用 FastAPI 的 `Depends` 机制管理数据库会话和实现声明式权限验证。
- **强类型系统:** 从 Pydantic 到 SQLAlchemy 的强类型设计，保证了代码的健壮性和可维护性。

### 1.4. 核心数据模型与关系

- **人事 (HR):** 以 `Employee` 为核心，关联 `Department`, `Position`, `PersonnelCategory` 等维度表。
- **薪资 (Payroll):** 以 `PayrollEntry` 为核心，其结构通过 `earnings_details` 和 `deductions_details` (JSONB 字段) 动态构建。
- **配置 (Config):** 通过 `LookupValue` (字典表)、`PayrollComponentDefinition` (薪资项定义) 等模型支持业务的灵活性。
- **安全 (Security):** `User` 模型与 `Employee` 关联，通过 `Role` 和 `Permission` 实现 RBAC。

---

## 2. 现有代码冗余分析与精简策略

当前项目在向 `v2` 演进的过程中，存在一些技术债和冗余，以下是精简和重构的策略。

### 2.1. API 路由 (Routers) 冗余

- **问题:** `v2/routers` 中同时存在新旧路由文件（如 `payroll.py` vs `payroll_v2.py`），职责分散。
- **解决方案:**
    1.  **统一路由:** 确定 `_v2` 后缀的文件为权威版本，将旧版本中仍需要的功能按新架构风格迁移至新文件。
    2.  **清理 `main.py`:** 移除对旧路由文件的 `include_router` 调用。
    3.  **删��旧文件:** 确认功能全部迁移后，安全删除旧的路由文件。

### 2.2. Pydantic 模型 (Models) 冗余

- **问题:** `Create`, `Update`, `Base` 模型之间存在大量重复的字段定义，违反了 DRY (Don't Repeat Yourself) 原则。
- **解决方案:**
    1.  **利用继承:** 创建一个包含所有公共字段的 `Base` 模型。
    2.  让 `Create` 和 `Response` 模型继承自 `Base` 模型，只添加各自特有的字段或关系。
    3.  `Update` 模型独立定义，所有字段均为 `Optional`。

### 2.3. 路由注册中心化

- **问题:** `main.py` 中包含了大量的 `app.include_router` 调用，难以管理。
- **解决方案:**
    1.  **创建模块级主路由:** 在每个业务模块的 `__init__.py` 中创建一个 `APIRouter`，聚合该模块下的所有子路由。
    2.  **创建 V2 顶层路由:** 在 `v2/routers/__init__.py` 中创建一个顶层路由，聚合所有模块的主路由。
    3.  **简化 `main.py`:** `main.py` 最终只需要一行 `app.include_router(api_v2_router, prefix="/api/v2")` 即可挂载整个 V2 API。

---

## 3. 迁移到 Render 和 Supabase 的战略规划

### 3.1. 核心战略：混合模式 (Hybrid Approach)

我们不应完全放弃现有的 FastAPI 后端，而是采取一种 **混合模式**，将 Supabase 原生 API 和 FastAPI 后端结合，各取所长。

- **FastAPI 后端 (部署于 Render):** 作为项目的 **“大脑”** 和 **“安全堡垒”**。
    - **职责:**
        - 处理所有复杂的业务逻辑（薪资计算、报表生成、批量导入验证）。
        - 作为核心的安全网关，进行集中的认证、授权和输入验证。
        - 聚合复杂查询，为前端提供规整、高效的数据接口。
        - 隐藏数据库内部结构，提供稳定的 API 契约。

- **Supabase BaaS:** 作为项目的 **“强大盟友”**。
    - **职责:**
        - **数据库:** 提供高性能、可扩展的 PostgreSQL 数据库。
        - **认证:** 接管用户认证、令牌颁发和管理。
        - **存储:** 提供文件上传下载服务。
        - **原生 API:** 用于处理前端发起的、简单的、非核心的 CRUD 请求。

### 3.2. 迁移实施计划

#### **阶段一：基础设施搭建与数据库迁移**

1.  **创建 Supabase 项目:** 获取数据库连接字符串、API Keys。
2.  **创建 Render 应用:** 创建 Web Service 并连接到 Git 仓库。
3.  **数据库迁移:**
    - 使用 `pg_dump --schema-only` 导出当前数据库结构。
    - 调整导出的 SQL 以适配 Supabase 环境。
    - 在 Supabase SQL Editor 中执行，完成表、视图、函数的创建。
    - (可选) 迁移���有数���。
    - **关键成果:** Supabase 数据库拥有与原项目一致的表结构。

#### **阶段二：后端应用适配与部署**

1.  **配置环境变量:** 在 Render 中配置 `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET_KEY`。
2.  **认证系统重构:**
    - 移除本地密码校验和令牌生成逻辑。
    - 在 `/auth/token` 端点，调用 Supabase Auth API 进行用户登录。
    - 修改 `require_permissions` 依赖，使其能够验证和解析 Supabase 颁发的 JWT。
    - **关键成果:** 应用认证完全由 Supabase 接管。
3.  **部署到 Render:**
    - 修改启动命令为 `uvicorn webapp.main:app --host 0.0.0.0 --port $PORT`。
    - 推送代码，触发 Render 自动部署。
    - **关键成果:** FastAPI 应用在 Render 上成功运行，并连接到 Supabase。

#### **阶段三：利用 Supabase BaaS 能力进行深度重构**

1.  **数据库交互层重构 (可选但推荐):**
    - 引入 `supabase-py` 库。
    - 对于简单的 CRUD 操作，可逐步用 `supabase-py` 客户端替换 SQLAlchemy 代码。
    - **保留 SQLAlchemy** 用于处理复杂查询、事务和视图操作。两者可以共存。
2.  **文件存储迁移:**
    - 识别项目中的文件上传/下载功能。
    - 创建 Supabase Storage Buckets。
    - ���改相关逻���，使用 `supabase-py` 的存储接口。
    - **关键成果:** 实现无服务器、可扩展、安全的文件存储。
3.  **利用实时 (Realtime) 功能 (可选):**
    - 对于需要实时更新的功能（如任务状态），可利用 Supabase Realtime 提升用户体验。

---
**文档结束**
