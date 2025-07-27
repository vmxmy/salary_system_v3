# 数据服务层开发

## 功能概述
创建部门管理的数据服务层，提供统一的数据访问接口，支持部门层级结构、员工关联和薪资统计数据的获取。

## 核心需求
- ✅ 扩展现有的 department.service.ts 服务类
- ✅ 集成 Supabase 数据库视图
- ✅ 提供 React Query hooks 支持
- ✅ 处理数据格式转换和错误处理
- ✅ 完善 TypeScript 类型定义

## 主要功能点
1. ✅ 部门层级数据获取（view_department_hierarchy）
2. ✅ 部门薪资统计获取（view_department_payroll_statistics）
3. ✅ 部门员工列表查询（view_employee_basic_info）
4. ✅ 部门CRUD基础操作
5. ✅ 数据缓存和性能优化

## 已实现的新功能

### DepartmentService 扩展功能
- `getDepartmentHierarchy()` - 获取部门层级结构
- `getDepartmentPayrollStats()` - 获取部门薪资统计（支持筛选）
- `getDepartmentEmployeesBasic()` - 获取部门员工基本信息
- `getDepartmentList()` - 获取扁平化部门列表
- `searchDepartments()` - 部门搜索功能
- `getDepartmentPayrollSummary()` - 特定时期薪资汇总
- `batchUpdateDepartments()` - 批量操作功能
- `formatNumber()` - 数值格式化（支持小数位精度）

### React Query Hooks
- `useDepartmentTree()` - 部门树形结构
- `useDepartmentHierarchy()` - 部门层级视图
- `useDepartmentPayrollStats()` - 部门薪资统计
- `useDepartmentEmployees()` - 部门员工列表
- `useDepartment()` - 单个部门详情
- `useCreateDepartment()` - 创建部门
- `useUpdateDepartment()` - 更新部门
- `useDeleteDepartment()` - 删除部门
- `useMoveDepartment()` - 移动部门
- `useUpdateDepartmentManager()` - 更新部门负责人

### TypeScript 类型定义
- 完整的部门相关类型定义（`/types/department.ts`）
- 数据库视图类型映射
- 表单和操作相关接口
- 导入导出类型定义

## 技术特色
- **数据库视图集成**: 充分利用现有的 PostgreSQL 视图
- **类型安全**: 完整的 TypeScript 类型覆盖
- **缓存优化**: React Query 智能缓存策略
- **错误处理**: 统一的错误处理和用户反馈
- **数值精度**: 财务数据的精确格式化
- **批量操作**: 支持高效的批量数据处理

## 下一步
数据服务层已完成，可以继续实现部门树形视图组件。