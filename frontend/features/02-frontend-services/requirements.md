# 前端服务层实现

## 功能概述
基于数据库视图层，实现前端服务层，封装所有与薪资管理相关的 Supabase 操作。

## 核心服务

### 1. 薪资管理服务 (payroll.service.ts)
- 薪资期间管理
- 薪资数据 CRUD
- 薪资状态流转
- 批量操作支持

### 2. 社保配置服务 (insurance-config.service.ts)
- 缴费基数管理（按月）
- 费率配置管理
- 身份类型管理
- 基数验证

### 3. 薪资组件服务 (salary-components.service.ts)
- 六大类组件管理
- 组件启用/禁用
- 组件规则配置

### 4. 薪资计算服务 (payroll-calculation.service.ts)
- 触发薪资计算
- 计算结果查询
- 异常处理

### 5. 导出服务 (payroll-export.service.ts)
- Excel 导出
- PDF 工资条生成
- 批量打印支持

## 技术要求
- 使用 TypeScript 强类型
- 集成 React Query 缓存
- 支持实时订阅
- 完善的错误处理