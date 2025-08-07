# 元数据管理页面基础

## 功能概述
创建独立的薪资元数据管理页面，为HR管理员提供批量管理员工工资元数据的界面。该页面将集成 TanStack Table 实现数据网格展示，并通过月份选择器控制数据范围。

## 业务背景
### 目标用户
- 主要用户：HR管理员
- 使用场景：月度工资数据准备、批量调整、数据核对

### 核心价值
- 提供统一的工资元数据管理入口
- 支持批量操作，提高工作效率
- 实时编辑，减少数据处理时间

## 功能需求

### 1. 页面结构
- **页面路由**：`/payroll/metadata`
- **页面标题**：薪资元数据管理
- **面包屑导航**：首页 > 薪资管理 > 元数据管理

### 2. 月份选择器
- **位置**：页面顶部工具栏
- **默认值**：当前月份
- **格式**：YYYY年MM月
- **交互**：
  - 点击展开月份选择面板
  - 支持快速切换到上月/下月
  - 选择月份后自动加载对应数据
- **数据联动**：切换月份时刷新表格数据

### 3. 数据表格（TanStack Table）
#### 3.1 表格列定义
**固定列（左侧）**：
- 员工编号 (employee_code)
- 姓名 (name)
- 部门 (department)
- 职位 (position)

**收入明细列（可横向滚动）**：
基于 `salary_components` 表中 `type='earning'` 的所有字段动态生成列：
- 基本工资
- 各类津贴
- 各类补贴
- 绩效奖金
- 其他收入项

**缴费基数列**：
- 养老保险基数 (pension_base)
- 医疗保险基数 (medical_base)
- 失业保险基数 (unemployment_base)
- 工伤保险基数 (injury_base)
- 生育保险基数 (maternity_base)
- 公积金基数 (housing_fund_base)

**个税列**：
- 个人所得税 (income_tax)

#### 3.2 表格功能
- **列固定**：员工信息列固定在左侧
- **横向滚动**：支持大量列的横向滚动
- **列宽调整**：支持拖拽调整列宽
- **排序**：支持按员工编号、姓名、部门排序
- **分页**：每页显示20/50/100条，支持跳转
- **空状态**：无数据时显示友好提示

### 4. 工具栏
位于月份选择器同一行，包含：
- **导出按钮**：导出当前月份数据为Excel
- **导入按钮**：批量导入Excel数据
- **刷新按钮**：重新加载数据
- **保存按钮**：批量保存修改（初期可禁用）

### 5. 数据加载
- **加载状态**：显示骨架屏或加载动画
- **错误处理**：加载失败时显示错误信息和重试按钮
- **空数据提示**：当月无数据时显示创建引导

## 数据模型

### 主要数据表
1. **payrolls**: 工资主表
   - id, employee_id, pay_period_start, pay_period_end
   - gross_pay, total_deductions, net_pay, status

2. **payroll_items**: 工资明细项
   - payroll_id, component_id, amount

3. **salary_components**: 工资组成项定义
   - id, name, type ('earning'/'deduction'), category

4. **employees**: 员工信息
   - id, employee_code, name, department_id, position_id

### 数据查询逻辑
```sql
-- 获取指定月份的工资元数据
SELECT 
  e.employee_code,
  e.name,
  d.name as department,
  pos.name as position,
  -- 动态earnings列
  -- 缴费基数列
  -- 个税列
FROM employees e
LEFT JOIN payrolls p ON e.id = p.employee_id
  AND p.pay_period_start = '月份开始日期'
LEFT JOIN payroll_items pi ON p.id = pi.payroll_id
-- 其他关联
WHERE e.status = 'active'
```

## 技术架构

### 技术栈
- **框架**：React 19 + TypeScript 5.8
- **UI库**：DaisyUI 5 + TailwindCSS 4
- **表格**：TanStack Table v8
- **数据获取**：Supabase JS Client
- **状态管理**：React Context (后续可升级为Zustand)

### 组件结构
```
PayrollMetadataPage/
├── index.tsx                 # 页面主组件
├── components/
│   ├── MonthPicker.tsx      # 月份选择器
│   ├── MetadataTable.tsx    # 数据表格
│   ├── TableToolbar.tsx     # 工具栏
│   └── TableSkeleton.tsx    # 加载骨架屏
├── hooks/
│   ├── usePayrollData.ts    # 数据获取钩子
│   └── useTableColumns.ts   # 动态列定义钩子
└── types/
    └── metadata.ts           # 类型定义
```

### 关键依赖
```json
{
  "@tanstack/react-table": "^8.20.5",
  "@supabase/supabase-js": "^2.46.2",
  "date-fns": "^4.1.0"
}
```

## 性能要求
- 首次加载时间 < 3秒
- 表格渲染1000行数据 < 1秒
- 支持虚拟滚动（后续优化）

## 安全要求
- 仅限已认证的HR管理员访问
- 使用Supabase RLS策略保护数据
- 敏感数据（如身份证号）不在此页面显示

## 测试要求
- 单元测试覆盖率 > 80%
- E2E测试覆盖核心流程
- 兼容Chrome、Firefox、Safari最新版本

## 未来扩展
- 批量编辑功能
- 数据对比功能
- 审批流程集成
- 数据版本管理