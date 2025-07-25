# 人事工资系统前端页面开发需求规范

## 项目概述

### 系统架构
- **前端**: React 19 + TypeScript 5.8 + Vite 7 + DaisyUI 5 + TailwindCSS 4
- **后端**: Python + Supabase集成
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth with JWT
- **存储**: Supabase Storage

### 核心特性
- 响应式设计，支持桌面端和移动端
- 基于角色的权限控制（RLS）
- 实时数据同步
- 多语言支持（中文/英文）
- 完整的审计日志

---

## 设计原则

### UI/UX原则
1. **一致性**: 使用统一的设计系统和组件库
2. **易用性**: 简化复杂流程，提供向导式操作
3. **可访问性**: 支持键盘导航和屏幕阅读器
4. **性能**: 懒加载、虚拟滚动、缓存优化

### 技术原则
1. **组件复用**: 构建通用组件库，避免重复开发
2. **类型安全**: 严格的TypeScript类型定义
3. **状态管理**: 合理使用本地状态、全局状态和服务端状态
4. **错误处理**: 统一的错误处理和用户反馈机制

---

## 页面需求详述

## 🏢 一、组织架构管理模块

### 1.1 部门管理页面
**路由**: `/admin/departments`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `departments`

#### 功能需求
- **部门树展示**: 
  - 支持无限层级的树形结构
  - 展示部门名称、创建时间、子部门数量
  - 支持展开/折叠操作
- **部门操作**:
  - 新增部门（支持选择父部门）
  - 编辑部门信息
  - 删除部门（需检查是否有子部门或关联员工）
  - 拖拽调整部门层级关系
- **搜索功能**: 部门名称模糊搜索
- **批量操作**: 批量删除、批量移动

#### 技术要求
- 使用树形组件（如Ant Design Tree或自定义）
- 拖拽功能使用react-dnd或类似库
- 异步加载大型组织结构
- 操作确认对话框

#### 表单字段
```typescript
interface Department {
  id: string;
  name: string;
  parent_department_id?: string;
  created_at: string;
  updated_at: string;
  children?: Department[];
}
```

### 1.2 职务管理页面
**路由**: `/admin/positions`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `positions`

#### 功能需求
- **职务列表**: 
  - 表格展示职务名称、描述、创建时间
  - 支持分页、排序、搜索
- **职务操作**:
  - 新增职务
  - 编辑职务信息
  - 删除职务（需检查是否有关联员工）
- **批量操作**: 批量删除、Excel导入导出

#### 技术要求
- 使用DataTable通用组件
- 表单验证（职务名称唯一性）
- 删除前关联检查

#### 表单字段
```typescript
interface Position {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}
```

### 1.3 职级管理页面
**路由**: `/admin/job-ranks`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `job_ranks`

#### 功能需求
- **职级列表**: 表格展示，支持排序
- **职级操作**: CRUD操作
- **级别排序**: 支持手动调整职级顺序

#### 技术要求
- 拖拽排序功能
- 排序字段自动维护

---

## 👥 二、人员信息管理模块

### 2.1 员工档案管理页面
**路由**: `/admin/employees`  
**权限**: ADMIN, HR_MANAGER, MANAGER（仅查看下属）  
**数据表**: `employees`, `employee_contacts`, `employee_education`, `employee_bank_accounts`

#### 功能需求
- **员工列表**:
  - 表格展示员工基本信息
  - 高级搜索（姓名、部门、职务、状态等）
  - 支持批量操作
- **员工详情**:
  - 多标签页展示（基本信息、联系方式、教育背景、银行账户、文档）
  - 时间轴展示职位变动历史
- **员工操作**:
  - 新增员工（多步骤向导）
  - 编辑员工信息
  - 员工状态管理（激活/停用/离职）
  - 文档上传管理

#### 技术要求
- 多标签页组件
- 文件上传组件（支持多种格式）
- 敏感信息脱敏显示
- 权限控制（经理只能看到下属）

#### 核心表单结构
```typescript
interface Employee {
  id: string;
  user_id?: string;
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'inactive' | 'on_leave';
  manager_id?: string;
}

interface EmployeeContact {
  id: string;
  employee_id: string;
  contact_type: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address';
  contact_value_encrypted: string;
  is_primary: boolean;
}
```

### 2.2 员工身份类别管理页面
**路由**: `/admin/employee-categories`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `employee_categories`

#### 功能需求
- **类别树展示**: 支持层级结构的身份类别
- **类别管理**: CRUD操作，支持层级调整
- **影响分析**: 显示每个类别下的员工数量
- **规则配置**: 关联保险类型适用规则

#### 技术要求
- 树形组件with统计信息
- 级联选择器
- 影响范围分析组件

### 2.3 员工职位历史管理页面
**路由**: `/admin/employee-job-history`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `employee_job_history`

#### 功能需求
- **历史记录查看**:
  - 时间轴展示员工职位变动
  - 按员工、部门、时间范围筛选
- **职位调动**:
  - 单个员工调动
  - 批量调动操作
  - 调动预览和确认
- **有效期管理**:
  - 设置生效日期
  - 自动结束前一条记录

#### 技术要求
- Timeline组件
- 批量操作预览
- 日期范围选择器
- 有效期冲突检查

#### 数据结构
```typescript
interface EmployeeJobHistory {
  id: string;
  employee_id: string;
  department_id: string;
  position_id: string;
  rank_id: string;
  effective_start_date: string;
  effective_end_date?: string;
  notes?: string;
}
```

### 2.4 员工身份分配管理页面
**路由**: `/admin/employee-category-assignments`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `employee_category_assignments`

#### 功能需求
- **分配记录管理**: 员工身份类别的历史分配记录
- **批量分配**: 支持按条件批量分配身份类别
- **变更审批**: 身份变更审批流程
- **影响分析**: 分析身份变更对工资、保险的影响

#### 技术要求
- 时间片管理组件
- 批量分配向导
- 审批流程组件
- 影响分析报告

---

## 💰 三、薪资结构管理模块

### 3.1 工资项定义管理页面
**路由**: `/admin/salary-components`  
**权限**: ADMIN, FINANCE_ADMIN  
**数据表**: `salary_components`

#### 功能需求
- **工资项列表**:
  - 按类型分组显示（应发项、扣发项）
  - 支持搜索、筛选、排序
- **工资项管理**:
  - 新增/编辑/删除工资项
  - 设置是否应税属性
  - 工资项分类管理
- **影响分析**:
  - 查看使用该工资项的员工数量
  - 删除前影响评估

#### 技术要求
- 分组表格显示
- 标签组件（应发/扣发）
- 影响分析对话框

#### 数据结构
```typescript
interface SalaryComponent {
  id: string;
  name: string;
  type: 'earning' | 'deduction';
  is_taxable: boolean;
  description?: string;
}
```

### 3.2 工资单模板管理页面
**路由**: `/admin/payroll-templates`  
**权限**: ADMIN, FINANCE_ADMIN  
**数据表**: `payrolls`, `payroll_items`

#### 功能需求
- **模板设计器**:
  - 拖拽式工资单结构设计
  - 工资项的添加、排序、分组
  - 实时预览功能
- **模板管理**:
  - 保存、复制、删除模板
  - 模板版本管理
  - 应用到员工组

#### 技术要求
- 拖拽设计器组件
- 实时预览组件
- 模板版本控制

---

## 🛡️ 四、社保公积金管理模块

### 4.1 险种定义管理页面
**路由**: `/admin/insurance-types`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `insurance_types`

#### 功能需求
- **险种列表**: 显示所有保险类型
- **系统预设保护**: 系统预设险种不允许删除
- **自定义险种**: 支持添加地方特色险种

#### 技术要求
- 保护模式标识
- 自定义验证规则

### 4.2 社保政策版本管理页面
**路由**: `/admin/social-insurance-policies`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `social_insurance_policies`, `policy_rules`

#### 功能需求
- **政策版本管理**:
  - 政策版本列表
  - 版本比较功能
  - 有效期管理
- **费率配置**:
  - 各险种费率设置
  - 缴费基数上下限配置
  - 费率计算器
- **适用范围设置**:
  - 关联适用的员工类别
  - 地区适用性设置

#### 技术要求
- 版本时间轴组件
- 费率配置表格
- 计算器组件
- 版本对比组件

#### 数据结构
```typescript
interface SocialInsurancePolicy {
  id: string;
  name: string;
  region: string;
  effective_start_date: string;
  effective_end_date?: string;
}

interface PolicyRule {
  id: string;
  policy_id: string;
  insurance_type_id: string;
  employee_rate: number;
  employer_rate: number;
  base_floor: number;
  base_ceiling: number;
}
```

### 4.3 员工缴费基数管理页面
**路由**: `/admin/contribution-bases`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `employee_contribution_bases`

#### 功能需求
- **基数设置**:
  - 按员工设置各险种缴费基数
  - 批量导入/导出功能
  - 基数历史记录
- **基数计算**:
  - 基于工资自动计算建议基数
  - 基数合规性检查
  - 调整建议

#### 技术要求
- 基数计算引擎
- 批量操作组件
- Excel导入导出
- 合规性验证

### 4.4 保险类别规则管理页面
**路由**: `/admin/insurance-category-rules`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `insurance_type_category_rules`

#### 功能需求
- **规则矩阵**:
  - 保险类型 × 员工类别的二维表格
  - 支持批量设置适用性
  - 规则冲突检测
- **规则验证**:
  - 检查规则完整性
  - 识别规则冲突
  - 影响分析报告

#### 技术要求
- 矩阵配置组件
- 冲突检测算法
- 批量操作确认

---

## 🧾 五、个税管理模块

### 5.1 税收管辖区管理页面
**路由**: `/admin/tax-jurisdictions`  
**权限**: ADMIN  
**数据表**: `tax_jurisdictions`

#### 功能需求
- **管辖区维护**: 简单的CRUD操作
- **国际化支持**: 支持多语言名称

#### 技术要求
- 标准表格组件
- 多语言输入

### 5.2 个税政策管理页面
**路由**: `/admin/tax-policies`  
**权限**: ADMIN, FINANCE_ADMIN  
**数据表**: `tax_policies`, `tax_brackets`

#### 功能需求
- **政策版本管理**:
  - 个税政策版本控制
  - 有效期管理
- **税率配置**:
  - 累进税率梯度设置
  - 起征点配置
  - 速算扣除数计算
- **税额计算器**:
  - 实时税额计算工具
  - 不同政策版本对比

#### 技术要求
- 税率梯度配置组件
- 计算器组件
- 政策版本对比

#### 数据结构
```typescript
interface TaxPolicy {
  id: string;
  jurisdiction_id: string;
  name: string;
  effective_start_date: string;
  effective_end_date?: string;
  standard_monthly_threshold: number;
}

interface TaxBracket {
  id: string;
  policy_id: string;
  bracket_level: number;
  annual_income_floor: number;
  annual_income_ceiling?: number;
  rate: number;
  quick_deduction: number;
}
```

### 5.3 专项扣除管理页面
**路由**: `/admin/special-deductions`  
**权限**: ADMIN, HR_MANAGER  
**数据表**: `special_deduction_types`, `employee_special_deductions`

#### 功能需求
- **扣除项目管理**:
  - 专项扣除类型定义
  - 标准扣除额设置
- **员工申报管理**:
  - 员工申报记录查看
  - 申报审核流程
  - 批量审核操作
- **申报统计**:
  - 申报情况统计
  - 扣除金额汇总

#### 技术要求
- 审批流程组件
- 统计图表组件
- 批量审核操作

---

## ⚙️ 六、系统管理模块

### 6.1 用户角色管理页面
**路由**: `/admin/user-roles`  
**权限**: ADMIN  
**数据表**: `user_roles`, `auth.users`

#### 功能需求
- **用户管理**:
  - 用户账户列表
  - 用户状态管理（激活/禁用）
  - 密码重置功能
- **角色分配**:
  - 角色权限矩阵
  - 批量角色分配
  - 权限继承关系
- **安全审计**:
  - 登录日志查看
  - 操作日志审计
  - 异常行为监控

#### 技术要求
- 权限矩阵组件
- 审计日志表格
- 安全状态监控

#### 角色定义
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', 
  HR_MANAGER = 'hr_manager',
  FINANCE_ADMIN = 'finance_admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}
```

---

## 🔄 七、业务流程页面

### 7.1 月度工资发放流程页面
**路由**: `/payroll/monthly-run`  
**权限**: ADMIN, FINANCE_ADMIN

#### 功能需求
- **流程向导**:
  - 步骤1: 选择发放月份和员工范围
  - 步骤2: 数据校验和异常处理
  - 步骤3: 工资计算和预览
  - 步骤4: 审核确认和发放
- **计算引擎**:
  - 实时工资计算
  - 税费计算
  - 社保扣除计算
- **异常处理**:
  - 数据缺失提醒
  - 计算异常标记
  - 手动调整功能

#### 技术要求
- 多步骤向导组件
- 实时计算引擎
- 异常标记系统

### 7.2 员工入职向导页面
**路由**: `/hr/employee-onboarding`  
**权限**: ADMIN, HR_MANAGER

#### 功能需求
- **入职流程**:
  - 步骤1: 基本信息录入
  - 步骤2: 组织关系分配
  - 步骤3: 薪资配置
  - 步骤4: 社保设置
  - 步骤5: 账户创建
- **数据验证**:
  - 身份证号验证
  - 银行账户验证
  - 重复入职检查
- **关联创建**:
  - 自动创建用户账户
  - 关联员工档案
  - 生成员工编号

#### 技术要求
- 入职向导组件
- 数据验证服务
- 关联数据创建

---

## 通用组件需求

### 1. DataTable通用组件
**功能**: 
- 分页、排序、搜索
- 列配置和隐藏
- 批量操作
- 导出功能

### 2. TreeSelect树形选择器
**功能**:
- 支持单选/多选
- 异步加载
- 搜索功能
- 自定义渲染

### 3. TimelineManager时间片管理组件
**功能**:
- 有效期可视化
- 重叠检测
- 编辑操作
- 历史查看

### 4. PermissionMatrix权限矩阵组件
**功能**:
- 二维权限表格
- 批量设置
- 权限继承
- 冲突检测

### 5. BatchImport批量导入组件
**功能**:
- Excel文件上传
- 数据预览
- 错误标记
- 导入进度

### 6. AuditLog审计日志组件
**功能**:
- 操作记录展示
- 时间过滤
- 用户过滤
- 详情查看

---

## 技术实现要点

### 1. 状态管理策略
- **全局状态**: 用户信息、权限、系统配置
- **页面状态**: 表格筛选、分页、排序状态
- **服务端状态**: 使用TanStack Query管理API数据

### 2. 权限控制实现
- **页面级权限**: 路由守卫
- **组件级权限**: 权限HOC或Hook
- **数据级权限**: API返回数据基于RLS过滤

### 3. 错误处理机制
- **全局错误边界**: 捕获组件错误
- **API错误处理**: 统一错误响应处理
- **用户友好提示**: 错误信息本地化

### 4. 性能优化策略
- **代码分割**: 按路由和组件懒加载
- **虚拟滚动**: 大数据列表优化
- **缓存策略**: API响应缓存和本地存储

### 5. 国际化实现
- **多语言支持**: React i18next
- **动态切换**: 实时语言切换
- **本地化**: 日期、数字格式本地化

---

## 开发优先级建议

### Phase 1: 基础架构 (2周)
1. 项目脚手架搭建
2. 通用组件开发
3. 权限系统实现
4. 国际化配置

### Phase 2: 核心功能 (4周)
1. 组织架构管理 (3个页面)
2. 员工档案管理 (1个页面)
3. 用户角色管理 (1个页面)

### Phase 3: 人员管理 (3周)
1. 员工身份类别管理
2. 员工职位历史管理
3. 员工身份分配管理
4. 员工入职向导

### Phase 4: 薪资管理 (3周)
1. 工资项定义管理
2. 工资单模板管理
3. 月度工资发放流程

### Phase 5: 保险税务 (4周)
1. 社保公积金管理 (4个页面)
2. 个税管理 (3个页面)

### Phase 6: 优化完善 (2周)
1. 性能优化
2. 用户体验优化
3. 测试和修复
4. 文档完善

---

## 验收标准

### 功能验收
- [ ] 所有页面功能正常运行
- [ ] 权限控制生效
- [ ] 数据CRUD操作正确
- [ ] 批量操作功能正常
- [ ] 搜索筛选功能正常

### 性能验收
- [ ] 页面加载时间 < 2秒
- [ ] 大数据列表渲染流畅
- [ ] 内存占用合理
- [ ] 无明显性能瓶颈

### 兼容性验收
- [ ] 主流浏览器兼容
- [ ] 移动端适配
- [ ] 不同分辨率支持
- [ ] 无障碍访问支持

### 安全验收
- [ ] 权限控制严格
- [ ] 敏感数据脱敏
- [ ] XSS/CSRF防护
- [ ] 输入验证完整

---

**文档版本**: v1.0  
**创建日期**: 2025-01-24  
**更新日期**: 2025-01-24  
**文档作者**: Claude Code  
**审核状态**: 待审核