# 短期重构实施计划 (7天完成)

## 📅 总体时间安排

**目标**：7个工作日内完成国际化规范和工具函数重叠问题的彻底解决

**优先级**：高优先级问题立即修复，中低优先级问题系统性解决

## 📋 详细实施计划

### 第1天 (Day 1) - 立即修复高优先级问题

#### 上午 (2-3小时)
1. **修复 Sidebar 临时翻译映射**
   ```typescript
   // 目标文件: src/components/layout/Sidebar.tsx:151-165
   
   // 第1步：更新 locales/zh-CN/common.json
   {
     "nav": {
       "dashboard": "工作台",
       "employees": "员工管理",
       "departments": "部门管理",
       // ... 添加所有导航项
     }
   }
   
   // 第2步：简化 Sidebar.tsx 中的 getDisplayName 函数
   const getDisplayName = (key: string): string => {
     return t(`common:nav.${key}`);
   };
   ```

2. **创建基础工具函数架构**
   ```bash
   mkdir -p src/lib/formatters
   touch src/lib/formatters/{index,types,base,currency,date,number,text,file,phone}.ts
   ```

#### 下午 (2-3小时)
3. **实现统一的格式化基础架构**
   - 创建 `types.ts` - 类型定义
   - 创建 `base.ts` - 基础工具函数
   - 实现 `createFormatter` 高阶函数

4. **重构货币格式化模块**
   - 合并 `src/lib/format.ts` 和 `src/utils/format.ts` 中的 `formatCurrency`
   - 实现国际化支持的版本

#### 验收标准
- [ ] Sidebar 导航完全使用 i18n
- [ ] 工具函数基础架构创建完成
- [ ] 货币格式化模块完成并测试通过

### 第2天 (Day 2) - 核心格式化模块重构

#### 上午 (3小时)
1. **重构日期格式化模块**
   ```typescript
   // 合并三个版本的 formatDate
   // src/lib/format.ts:41-86
   // src/utils/format.ts:47-92
   // src/lib/dateUtils.ts:120-145
   
   // 统一为一个支持国际化的版本
   ```

2. **重构数字格式化模块**
   - `formatNumber` 函数统一
   - `formatPercent` 函数优化
   - 添加国际化支持

#### 下午 (2小时)
3. **重构文本和电话格式化模块**
   - `formatPhone` / `formatPhoneNumber` 合并
   - `formatIdCard` / `formatIdNumber` 合并
   - 添加相应的 i18n 支持

4. **创建统一导出文件**
   - 完善 `src/lib/formatters/index.ts`
   - 提供向后兼容的别名

#### 验收标准
- [ ] 所有核心格式化模块完成
- [ ] 国际化文本全部抽取到翻译文件
- [ ] 单元测试覆盖主要函数

### 第3天 (Day 3) - 现有代码迁移 (第1批)

#### 上午 (3小时)
1. **迁移高频使用组件**
   ```bash
   # 目标组件列表
   - src/components/common/FinancialBadge.tsx
   - src/components/common/FinancialCard.tsx
   - src/components/payroll/PayrollAmountDisplay.tsx
   - src/components/employee/EmployeeDetailModalPro.tsx
   ```

2. **批量更新导入语句**
   ```bash
   # 使用脚本批量替换
   find src/ -name "*.tsx" -exec sed -i "s/from '@\/lib\/format'/from '@\/lib\/formatters'/g" {} \;
   find src/ -name "*.tsx" -exec sed -i "s/from '@\/utils\/format'/from '@\/lib\/formatters'/g" {} \;
   ```

#### 下午 (2小时)
3. **修复导入后的兼容性问题**
   - 检查参数不匹配的函数调用
   - 修复类型错误
   - 运行测试确保功能正常

#### 验收标准
- [ ] 第1批组件迁移完成
- [ ] 所有导入错误修复
- [ ] 运行 `npm run dev` 无错误

### 第4天 (Day 4) - 现有代码迁移 (第2批)

#### 上午 (3小时)
1. **迁移页面组件**
   ```bash
   # 目标页面组件
   - src/pages/payroll/PayrollListPage.tsx
   - src/pages/employee/EmployeeManagementPage.tsx
   - src/pages/dashboard/DashboardPage.tsx
   ```

2. **迁移图表组件中的硬编码**
   ```bash
   # 目标文件
   - src/components/dashboard/PayrollStructureChart.tsx
   - src/components/dashboard/DepartmentPayrollChart.tsx
   - src/components/dashboard/MonthlyPayrollTrendChart.tsx
   ```

#### 下午 (2小时)
3. **清理冗余工具文件**
   ```bash
   # 备份后删除
   mv src/lib/format.ts archived/
   mv src/utils/format.ts archived/
   
   # 保留 dateUtils.ts 中的业务逻辑函数
   ```

#### 验收标准
- [ ] 第2批组件迁移完成
- [ ] 图表组件国际化完成
- [ ] 冗余文件清理完成

### 第5天 (Day 5) - 完整性检查和优化

#### 上午 (3小时)
1. **全项目硬编码文本检查**
   ```bash
   # 创建检查脚本
   node scripts/check-hardcoded-text.js
   
   # 手动检查剩余的硬编码文本
   find src/ -name "*.tsx" | xargs grep -l "[\u4e00-\u9fa5]" | head -20
   ```

2. **修复发现的遗漏问题**
   - 模态框标题和按钮文本
   - 错误消息和提示文本
   - 表单验证消息

#### 下午 (2小时)
3. **性能优化和测试**
   - 运行性能基准测试
   - 检查bundle大小变化
   - 确保格式化性能不下降

#### 验收标准
- [ ] 零硬编码中文文本
- [ ] 性能测试通过
- [ ] 所有功能测试通过

### 第6天 (Day 6) - 测试和文档

#### 上午 (2小时)
1. **编写单元测试**
   ```bash
   # 创建测试文件
   touch src/lib/formatters/__tests__/{currency,date,number,text}.test.ts
   
   # 运行测试
   npm run test src/lib/formatters
   ```

2. **集成测试**
   - 测试多语言切换
   - 测试各种边界情况
   - 测试错误处理

#### 下午 (3小时)
3. **文档更新**
   ```markdown
   # 更新文档
   - README.md - 添加工具函数使用说明
   - CONTRIBUTING.md - 添加开发规范
   - API.md - 格式化函数API文档
   ```

4. **创建检查脚本**
   ```javascript
   // scripts/check-i18n-compliance.js
   // 自动检测国际化规范遵循情况
   ```

#### 验收标准
- [ ] 单元测试覆盖率 > 80%
- [ ] 文档完整更新
- [ ] 自动化检查脚本可用

### 第7天 (Day 7) - 验收和部署准备

#### 上午 (2小时)
1. **最终验收测试**
   ```bash
   # 完整测试流程
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

2. **多环境测试**
   - 开发环境功能测试
   - 生产构建测试
   - 多浏览器兼容性测试

#### 下午 (2小时)
3. **部署准备**
   - 创建迁移清单
   - 准备回滚方案
   - 更新部署文档

4. **团队交接**
   - 代码审查
   - 知识传递
   - 维护指南交付

#### 验收标准
- [ ] 所有测试通过
- [ ] 部署文档完整
- [ ] 团队成员熟悉新架构

## 📊 进度跟踪表

| 天数 | 主要任务 | 完成标准 | 负责人 | 状态 |
|------|----------|----------|--------|------|
| Day 1 | 立即修复 + 基础架构 | Sidebar i18n + 工具架构 | - | 🔄 |
| Day 2 | 核心模块重构 | 格式化模块完成 | - | ⏳ |
| Day 3 | 代码迁移(第1批) | 高频组件迁移完成 | - | ⏳ |
| Day 4 | 代码迁移(第2批) | 页面组件迁移完成 | - | ⏳ |
| Day 5 | 完整性检查 | 零硬编码文本 | - | ⏳ |
| Day 6 | 测试和文档 | 测试覆盖率>80% | - | ⏳ |
| Day 7 | 验收部署 | 生产就绪 | - | ⏳ |

## 🚨 风险控制

### 风险识别
1. **破坏性变更**：格式化函数接口变更可能导致现有代码错误
2. **性能回退**：新的国际化机制可能影响性能
3. **测试覆盖不足**：重构后可能引入新的bug

### 缓解措施
1. **渐进式迁移**：分批迁移，每次验证
2. **向后兼容**：提供别名函数保持兼容性
3. **回滚准备**：保留原始文件的备份

### 应急预案
```bash
# 如果出现严重问题，快速回滚
git checkout HEAD~1 src/lib/formatters
git checkout HEAD~1 src/components/layout/Sidebar.tsx
npm run build
```

## ✅ 最终验收清单

### 国际化规范
- [ ] 项目中无硬编码中文文本
- [ ] 所有UI文本支持多语言切换
- [ ] 翻译文件结构规范统一
- [ ] Sidebar导航使用标准i18n模式

### 工具函数重构
- [ ] 消除所有重复的格式化函数
- [ ] 统一的函数接口和类型定义
- [ ] 完整的单元测试覆盖
- [ ] 性能保持不变或提升

### 代码质量
- [ ] TypeScript编译无错误
- [ ] ESLint检查通过
- [ ] 所有功能测试通过
- [ ] 文档完整更新

### 团队就绪
- [ ] 开发规范文档完整
- [ ] 团队成员培训完成
- [ ] 维护工具和脚本可用

---

**预期效果**：完成后，项目将拥有完全规范的国际化架构和零重复的工具函数体系，为后续开发奠定坚实基础。