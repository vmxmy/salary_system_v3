# CLAUDE.md

[... existing content remains unchanged ...]

## Development Memories

### Database Development
- postgresql数据库要先检查schema再定位表
- 新系统的数据库操作使用 supabase-mcp-server；老系统的数据查询使用postgres MCP Server
- 不要使用模拟数据，所有模块都需要基于真是的supabase数据进行设计
- 使用src/types/supabase.ts了解最新的数据库结构,表结构,视图结构,字段名称

### Enterprise Architecture
- 企业级架构包含12个核心功能模块，从基础架构到跨切面关注点
- 架构目标是通过模块化、解耦和可扩展的设计提高系统的灵活性和可维护性
- 重点关注领域驱动设计(DDD)、事件驱动架构和CQRS模式的实现
- 每个模块都有明确的职责，如数据访问抽象、领域实体重构、DTO传输层等
- 通过业务规则引擎和工作单元模式提高系统的可配置性和事务管理能力
- 企业级分层架构开发指南已生成，文档位于：/webapp/v3/docs/ENTERPRISE_ARCHITECTURE_GUIDE.md
  - 文档包含DDD + Clean Architecture设计理念
  - 详细阐述了分层架构的各层职责（表现层、应用服务层、领域层、基础设施层）
  - 涵盖核心设计模式：Repository、Unit of Work、Domain Event、DTO模式
  - 提供员工管理和薪资管理模块的完整实例
  - 包含最佳实践、领域建模原则和常见问题解答

### Documentation
- 已创建详细的薪资计算系统函数逻辑说明文档，保存在 /database/functions/SALARY_CALCULATION_LOGIC.md
- 文档包含系统概述、核心计算流程、社保计算详解、触发器机制、批量处理、数据验证与调整、数据库表结构、计算示例和常见问题
- 文档采用Markdown格式，包含代码示例、表格、流程图（mermaid），便于开发团队理解和维护薪资计算系统

### Architecture Design Principles
- 轻量级人事工资管理系统采用领域驱动设计（DDD）为核心的分层架构
- 核心设计原则包括：
  - 关注点分离 (Separation of Concerns)
  - 依赖倒置 (Dependency Inversion)
  - 代码即文档 (Code as Documentation)
  - 务实主义 (Pragmatism)
- 系统严格遵循四层架构：接口层、应用服务层、领域层、基础设施层
- 层间依赖单向：上层可依赖下层，下层不能依赖上层
- 强调业务复杂性封装在领域层，与技术实现完全分离
- 保证系统的高内聚、低耦合、易测试、可演进

### Architectural Guidance
- DDD 指导下的 Vite + Supabase Serverless 架构开发指南核心哲学：
  - 平衡开发效率与业务复杂度管理
  - 不盲目追求 DDD 的"仪式感"，务实地采纳核心思想
  - 三大指导原则：
    1. BaaS 优先，保持轻量 (BaaS-First for Simplicity)
    2. 函数即服务，封装领域 (Functions as Domain Services)
    3. 前端即应用，驱动流程 (Frontend as the Application Driver)
  - 经典 DDD 四层架构与 Vite + Supabase 技术栈映射：
    - 接口层：Vite 前端应用 (React/Vue)
    - 应用层：Edge Function 的入口与编排逻辑
    - 领域层：Edge Function 内部的纯 TS/JS 模块
    - 基础设施层：Supabase 服务本身
  - 开发决策框架：根据功能复杂度选择"轻"与"重"路径
  - 强调项目目录结构清晰，分层明确
  - 推荐使用 RLS 作为首选权限控制机制
  - Edge Functions 作为复杂业务逻辑的主战场
  - 提倡演进式架构，随业务复杂度灵活调整

[... rest of the existing content remains unchanged ...]