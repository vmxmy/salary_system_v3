# 薪资管理系统功能规划

本目录包含薪资管理系统的完整功能规划和实施指南。

## 功能模块列表

1. **01-database-views** - 数据库视图层设计
   - 所有薪资相关的数据库视图定义
   - 为前端提供优化的数据访问接口

2. **02-frontend-services** - 前端服务层
   - Supabase 客户端服务封装
   - React Query hooks 实现

3. **03-payroll-components** - 薪资UI组件
   - 现代化的薪资管理组件库
   - 遵循统一的设计系统

4. **04-configuration-management** - 配置管理
   - 人员身份管理
   - 社保费率配置
   - 缴费基数管理

5. **05-payroll-calculation** - 薪资计算与管理
   - 薪资期间管理
   - 计算、编辑、审核流程

6. **06-payroll-reports** - 报表与分析
   - 各类薪资报表
   - 数据分析和导出

## 实施顺序

建议按照以下顺序实施：

1. 首先完成 01-database-views（数据基础）
2. 然后实现 02-frontend-services（服务层）
3. 同时进行 03-payroll-components（UI组件）
4. 最后实现具体功能页面（04、05、06）

## 技术栈

- 数据库：Supabase PostgreSQL
- 前端框架：React 19 + TypeScript 5.8
- UI框架：TailwindCSS 4 + DaisyUI 5
- 状态管理：React Query
- 构建工具：Vite 7

## 开发指南

每个功能模块都包含三个文件：
- `requirements.md` - 需求说明
- `design.md` - 设计文档
- `tasks.md` - 实施任务清单

请在开始开发前仔细阅读相关文档。
