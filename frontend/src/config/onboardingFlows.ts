/**
 * 新用户指导流程配置
 * 
 * 定义了系统中所有可用的指导流程
 * 与翻译文件中的流程定义相对应
 */

import type { OnboardingFlow, OnboardingStep } from '@/types/onboarding';

/**
 * 系统入门指导流程
 * 帮助新用户快速了解薪资管理系统的核心功能
 */
export const gettingStartedFlow: OnboardingFlow = {
  id: 'gettingStarted',
  name: '系统入门指导',
  description: '帮助新用户快速了解薪资管理系统的核心功能',
  category: 'getting-started',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'welcome',
      title: '欢迎使用薪资管理系统',
      description: '我们将通过几个简单的步骤帮助您快速上手，了解系统的主要功能和操作方式。',
      content: '💡 小贴士：您可以随时按 ESC 键退出指导，或点击右上角的关闭按钮。',
      type: 'intro'
    },
    {
      id: 'dashboardOverview',
      title: '工作台总览',
      description: '这里显示系统的关键指标和最近活动，是您日常工作的起始页面。',
      content: '在工作台上，您可以看到员工总数、本月薪资概况、待处理任务等重要信息。',
      targetElement: '[data-tour="dashboard-overview"]',
      position: 'bottom'
    },
    {
      id: 'dashboardStats',
      title: '关键统计指标',
      description: '这些卡片展示了系统的核心数据统计，帮助您快速掌握整体情况。',
      content: '包括总员工数、部门数量、薪资总额等关键指标，点击可以查看更详细的信息。',
      targetElement: '[data-tour="dashboard-stats"]',
      position: 'bottom'
    },
    {
      id: 'navigationMenu',
      title: '导航菜单',
      description: '通过左侧菜单可以访问所有功能模块，包括员工管理、薪资管理、组织架构等。',
      content: '点击菜单项可以展开子菜单，双击可以快速跳转到常用页面。',
      targetElement: '[data-tour="navigation-menu"]',
      position: 'right'
    },
    {
      id: 'employeeManagement',
      title: '员工管理',
      description: '在这里可以添加、编辑和管理员工信息，是系统的核心功能之一。',
      content: '支持批量导入员工信息，也可以单个添加。员工信息包括基本资料、岗位信息、薪资配置等。',
      targetElement: '[data-tour="employee-management"]',
      position: 'right'
    },
    {
      id: 'payrollManagement',
      title: '薪资管理',
      description: '薪资管理模块用于处理员工的薪资计算、发放和查询。',
      content: '支持多种薪资结构，可以设置不同的薪资组件，如基本工资、绩效奖金、津贴扣除等。',
      targetElement: '[data-tour="payroll-management"]',
      position: 'right'
    },
    {
      id: 'quickActions',
      title: '快捷操作',
      description: '常用操作的快速入口，提高日常工作效率。',
      content: '包括添加员工、运行薪资、查看报表、系统设置等常用功能。',
      targetElement: '[data-tour="quick-actions"]',
      position: 'top'
    },
    {
      id: 'settingsAndProfile',
      title: '设置和个人资料',
      description: '在设置中可以配置系统参数，在个人资料中可以修改您的账户信息。',
      content: '建议首次使用时先完善个人资料信息，并查看系统设置是否符合您的使用习惯。',
      targetElement: '[data-tour="settings-btn"]',
      position: 'top'
    }
  ]
};

/**
 * 员工管理工作流程
 * 深入学习员工管理系统的完整功能和最佳实践
 */
export const employeeWorkflowFlow: OnboardingFlow = {
  id: 'employeeWorkflow',
  name: '员工管理工作流程',
  description: '深入学习员工管理系统的完整功能和最佳实践',
  category: 'workflow',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'employeeStatsOverview',
      title: '员工数据概览仪表板',
      description: '顶部的统计卡片展示了关键指标：总员工数、在职员工、离职员工和部门数量。',
      content: '这些实时数据帮助您快速掌握组织的人员概况：\n• 总员工数：了解组织规模\n• 在职员工：当前活跃人力资源\n• 离职员工：人员流失情况\n• 部门数量：组织架构复杂度',
      targetElement: '[data-tour="employee-stats"]',
      position: 'bottom'
    },
    {
      id: 'searchFunctionality',
      title: '智能搜索功能',
      description: '搜索框支持多维度查找：员工姓名、部门名称、职位名称、人员类别等。',
      content: '💡 搜索技巧：\n• 支持模糊匹配，输入部分关键词即可\n• 可以搜索中文姓名、部门或职位\n• 搜索结果实时更新\n• 点击清除按钮快速重置',
      targetElement: '.input[placeholder*="搜索员工"]',
      position: 'bottom'
    },
    {
      id: 'statusFilterSystem',
      title: '状态筛选系统',
      description: '通过状态筛选器可以快速过滤不同状态的员工：全部、在职、离职、停职。',
      content: '📋 使用场景：\n• 全部状态：查看所有员工\n• 在职：日常管理和薪资计算\n• 离职：离职手续和数据归档\n• 停职：临时状态管理',
      targetElement: 'select[class*="select"]',
      position: 'bottom'
    },
    {
      id: 'addEmployeeProcess',
      title: '新员工录入流程',
      description: '点击"添加员工"按钮开始创建新的员工档案。',
      content: '📝 录入要点：\n• 基本信息：姓名、性别、联系方式\n• 身份信息：身份证号、户籍地址\n• 工作信息：部门、职位、入职日期\n• 银行信息：工资卡号、开户行',
      targetElement: '[data-tour="add-employee"]',
      position: 'left'
    },
    {
      id: 'exportCapabilities',
      title: '多格式导出功能',
      description: '系统支持三种导出格式，满足不同场景需求。',
      content: '📤 导出格式选择：\n• CSV格式：轻量级，Excel兼容\n• Excel格式：完整样式，专业报表\n• JSON格式：程序处理，数据交换\n• 选中导出：仅导出筛选的员工',
      targetElement: '.dropdown[class*="dropdown-end"] .btn',
      position: 'left'
    },
    {
      id: 'batchSelection',
      title: '批量选择机制',
      description: '通过复选框可以选择单个或多个员工进行批量操作。',
      content: '✅ 选择技巧：\n• 单击：选择单个员工\n• 表头复选框：全选当前页面\n• Ctrl+点击：多选不连续项目\n• 选中后显示批量操作面板',
      targetElement: 'input[type="checkbox"][class*="checkbox"]:first-of-type',
      position: 'right'
    },
    {
      id: 'employeeDataTable',
      title: '员工信息表格详解',
      description: '表格展示员工的核心信息，每列都有特定的管理意义。',
      content: '🗂️ 列信息说明：\n• 员工姓名：身份标识，支持排序\n• 部门：组织归属，便于管理\n• 职位：岗位职责，影响薪资\n• 人员类别：员工分类，决定政策\n• 状态：工作状态，控制系统访问\n• 入职日期：工龄计算基础',
      targetElement: '[data-tour="employee-table"]',
      position: 'top'
    },
    {
      id: 'rowActionButtons',
      title: '行操作功能详解',
      description: '每行的操作按钮提供了对单个员工的精细管理功能。',
      content: '🎯 操作按钮功能：\n• 查看👁️：查看完整员工档案\n• 编辑✏️：修改员工信息\n• 删除🗑️：移除员工记录（谨慎操作）\n\n⚠️ 注意：删除操作不可恢复',
      targetElement: '.btn-ghost[title="查看详情"]',
      position: 'left'
    },
    {
      id: 'batchOperations',
      title: '批量操作高效管理',
      description: '选择多个员工后，批量操作面板让您能高效处理多个员工的状态变更。',
      content: '⚡ 批量操作功能：\n• 批量激活：恢复员工在职状态\n• 批量停职：设置临时停职\n• 批量删除：移除多个员工（谨慎）\n• 批量导出：导出选中员工数据\n\n💡 提高效率的最佳工具！',
      targetElement: '.card .flex .btn-outline',
      position: 'top'
    },
    {
      id: 'bestPracticesSummary',
      title: '员工管理最佳实践总结',
      description: '掌握这些最佳实践，让您的员工管理工作更加高效和规范。',
      content: '🏆 管理最佳实践：\n\n📊 定期检查统计数据\n🔍 善用搜索和筛选功能\n⚡ 批量操作提高效率\n💾 定期导出备份数据\n🔄 保持员工信息实时更新\n📋 规范化录入流程\n🔒 谨慎处理删除操作\n\n掌握这些技巧，让您成为员工管理专家！',
      targetElement: '.stats',
      position: 'bottom'
    }
  ]
};

/**
 * 薪资管理工作流程
 * 深入学习薪资数据录入、计算和管理功能
 */
export const payrollWorkflowFlow: OnboardingFlow = {
  id: 'payrollWorkflow',
  name: '薪资管理工作流程',
  description: '深入学习薪资数据录入、计算和管理功能',
  category: 'workflow',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'payrollPeriodManagement',
      title: '薪资周期管理',
      description: '薪资周期选择器是薪资管理的起点，选择正确的周期至关重要。',
      content: '🗓️ 周期管理要点：\n• 月度薪资：常规月度发薪\n• 季度奖金：绩效奖励发放\n• 年终奖金：年度激励计算\n• 补发薪资：历史数据调整\n• 特殊发放：临时薪资处理',
      targetElement: '[data-tour="payroll-period-selector"]',
      position: 'bottom'
    },
    {
      id: 'payrollCompletenessIndicator',
      title: '四要素完整性检查',
      description: '数据完整性是准确计算薪资的基础，四要素缺一不可。',
      content: '📊 四要素构成：\n• 基本薪资：岗位工资、级别工资\n• 绩效奖金：月度/季度绩效\n• 津贴补贴：各类津贴、交通补贴\n• 扣除项目：社保、公积金、个税\n\n✅ 完整度≥95%才建议进行薪资计算',
      targetElement: '[data-tour="payroll-completeness"]',
      position: 'bottom'
    },
    {
      id: 'payrollCalculationProcess',
      title: '薪资计算流程',
      description: '了解薪资的自动计算逻辑和手动调整机制。',
      content: '🧮 计算流程：\n1️⃣ 基础数据收集：考勤、绩效、调薪\n2️⃣ 自动计算：系统按规则计算\n3️⃣ 异常处理：缺勤扣款、补贴调整\n4️⃣ 税费计算：个税、社保自动计算\n5️⃣ 复核确认：HR人工复核',
      targetElement: '[data-tour="payroll-calculation"]',
      position: 'top'
    },
    {
      id: 'payrollDataTable',
      title: '薪资数据表格管理',
      description: '薪资表格是薪资管理的核心界面，展示所有员工的薪资详情。',
      content: '📋 表格功能说明：\n• 员工信息：姓名、部门、职位\n• 薪资明细：基本工资、奖金、津贴\n• 扣除明细：社保、公积金、个税\n• 实发薪资：最终到手金额\n• 操作功能：查看、编辑、计算',
      targetElement: '[data-tour="payroll-table"]',
      position: 'top'
    },
    {
      id: 'payrollSearchAndFilter',
      title: '薪资数据筛选',
      description: '使用搜索和筛选功能快速定位特定员工或部门的薪资数据。',
      content: '🔍 筛选技巧：\n• 员工搜索：按姓名快速查找\n• 部门筛选：批量查看部门薪资\n• 状态筛选：待计算、已计算、待审核\n• 异常筛选：薪资异常、计算错误\n• 排序功能：按薪资额度排序',
      targetElement: '[data-tour="payroll-search"]',
      position: 'bottom'
    },
    {
      id: 'payrollDetailView',
      title: '薪资明细查看',
      description: '点击薪资记录可以查看详细的薪资计算明细和组成结构。',
      content: '🔍 明细内容：\n• 基础薪资构成：岗位工资明细\n• 绩效奖金详情：考核得分及奖金\n• 津贴补贴明细：各项补贴详情\n• 扣除项目明细：税费扣缴详情\n• 计算公式：透明的计算过程',
      targetElement: '.btn[title*="查看"]',
      position: 'left'
    },
    {
      id: 'batchPayrollOperations',
      title: '批量薪资操作',
      description: '批量操作功能让您能够高效处理大量员工的薪资事务。',
      content: '⚡ 批量功能：\n• 批量计算：一次计算多个员工\n• 批量调整：统一调整薪资项目\n• 批量导入：Excel批量导入薪资\n• 批量导出：导出薪资数据\n• 批量删除：清除错误数据',
      targetElement: '[data-tour="batch-payroll-operations"]',
      position: 'top'
    },
    {
      id: 'payrollExportReporting',
      title: '薪资数据导出',
      description: '强大的导出功能支持多种格式的薪资数据导出。',
      content: '📊 导出选项：\n• 薪资明细表：详细薪资数据\n• 成本分析表：人力成本分析\n• 税务数据表：个税申报准备\n• Excel模板：标准格式导出\n• 自定义格式：按需定制导出',
      targetElement: '[data-tour="payroll-export-options"]',
      position: 'left'
    },
    {
      id: 'payrollQualityControl',
      title: '薪资质量控制',
      description: '建立完善的薪资质量控制体系，确保薪资数据的准确性。',
      content: '🛡️ 质量控制要点：\n\n📊 数据验证：\n• 薪资总额合理性检查\n• 个税计算准确性验证\n• 社保基数合规性审查\n\n🔍 异常监控：\n• 薪资异常波动预警\n• 重复计算检测\n• 漏算员工提醒',
      targetElement: '[data-tour="payroll-completeness"]',
      position: 'bottom'
    },
    {
      id: 'payrollManagementBestPractices',
      title: '薪资管理最佳实践',
      description: '掌握专业的薪资管理最佳实践，提升薪资数据管理的效率和准确性。',
      content: '🏆 管理最佳实践：\n\n🎯 数据管理：\n• 建立标准薪资模板\n• 定期备份薪资数据\n• 版本控制和追溯\n\n📅 流程优化：\n• 薪资计算自动化\n• 异常处理标准化\n• 数据校验规则化\n\n🔐 安全控制：\n• 薪资数据加密存储\n• 操作权限精细控制\n• 审计日志完整记录\n\n成为薪资管理专家的必备技能！',
      targetElement: '[data-tour="payroll-table"]',
      position: 'top'
    }
  ]
};

/**
 * 薪资审批工作流程
 * 深入学习薪资审核、审批和发放的完整流程
 */
export const payrollApprovalFlow: OnboardingFlow = {
  id: 'payrollApproval',
  name: '薪资审批工作流程',
  description: '深入学习薪资审核、审批和发放的完整流程',
  category: 'workflow',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'approvalWorkflowOverview',
      title: '审批流程概览',
      description: '了解薪资审批的完整工作流程和各个环节的职责。',
      content: '📋 审批流程：\n1️⃣ 数据提交：HR提交薪资数据\n2️⃣ 部门审核：部门负责人审核\n3️⃣ HR复核：人力资源部复核\n4️⃣ 财务审批：财务部门审批\n5️⃣ 总监确认：高级管理层确认\n6️⃣ 批量发放：银行批量转账',
      targetElement: '[data-tour="approval-workflow"]',
      position: 'bottom'
    },
    {
      id: 'pendingApprovalList',
      title: '待审批薪资列表',
      description: '查看所有待审批的薪资数据，了解审批状态和优先级。',
      content: '📊 审批状态说明：\n• 待审核：等待部门确认\n• 审核中：正在审批流程中\n• 已通过：审批通过待发放\n• 已退回：需要修正重新提交\n• 已发放：完成整个流程',
      targetElement: '[data-tour="approval-list"]',
      position: 'top'
    },
    {
      id: 'approvalDetailReview',
      title: '薪资数据审核',
      description: '详细审核薪资数据，检查计算准确性和合规性。',
      content: '🔍 审核要点：\n• 基础数据核对：考勤、绩效、调薪\n• 计算公式验证：税费、社保、奖金\n• 异常数据检查：超常薪资、负数项目\n• 合规性确认：政策符合性、标准一致性\n• 比较分析：同比环比数据对比',
      targetElement: '[data-tour="approval-detail"]',
      position: 'left'
    },
    {
      id: 'batchApprovalOperations',
      title: '批量审批操作',
      description: '使用批量操作功能提高审批效率，快速处理大量薪资数据。',
      content: '⚡ 批量审批：\n• 批量通过：一次通过多个审批\n• 批量退回：统一退回有问题的数据\n• 条件筛选：按部门、金额范围筛选\n• 快速审批：预设规则自动审批\n• 审批记录：完整的审批历史追踪',
      targetElement: '[data-tour="batch-approval"]',
      position: 'top'
    },
    {
      id: 'approvalComments',
      title: '审批意见管理',
      description: '学习如何添加审批意见，确保审批过程的透明度和可追溯性。',
      content: '📝 意见管理：\n• 审批意见：详细说明审批理由\n• 退回原因：明确指出需要修正的问题\n• 建议改进：提供数据优化建议\n• 历史记录：保留完整审批轨迹\n• 协作沟通：支持审批者间的协作',
      targetElement: '[data-tour="approval-comments"]',
      position: 'bottom'
    },
    {
      id: 'approvalNotifications',
      title: '审批通知系统',
      description: '了解审批通知机制，确保审批流程的及时性。',
      content: '🔔 通知机制：\n• 待审提醒：新的审批任务通知\n• 超时预警：审批超时自动提醒\n• 状态更新：审批结果实时通知\n• 异常提醒：审批异常情况告警\n• 完成确认：审批完成结果通知',
      targetElement: '[data-tour="approval-notifications"]',
      position: 'bottom'
    },
    {
      id: 'approvalReporting',
      title: '审批报表分析',
      description: '生成审批相关的统计报表，分析审批效率和质量。',
      content: '📊 报表功能：\n• 审批效率：平均审批时间统计\n• 审批质量：通过率、退回率分析\n• 审批负载：各审批者工作量分析\n• 流程瓶颈：识别审批流程瓶颈点\n• 趋势分析：审批数据趋势变化',
      targetElement: '[data-tour="approval-reports"]',
      position: 'left'
    },
    {
      id: 'payrollDistribution',
      title: '薪资发放管理',
      description: '学习薪资发放的执行过程和发放后的跟踪管理。',
      content: '💰 发放流程：\n• 发放准备：银行文件生成\n• 批量转账：银行批量代发\n• 发放确认：转账结果确认\n• 异常处理：失败转账处理\n• 发放报告：完整发放记录',
      targetElement: '[data-tour="payroll-distribution"]',
      position: 'top'
    },
    {
      id: 'approvalAuditTrail',
      title: '审批审计追踪',
      description: '了解审批审计系统，确保审批过程的合规性和可审计性。',
      content: '🔍 审计追踪：\n• 操作日志：完整审批操作记录\n• 时间戳：精确的操作时间记录\n• 用户追踪：审批人员身份确认\n• 数据变更：薪资数据变更历史\n• 合规报告：符合审计要求的报告',
      targetElement: '[data-tour="audit-trail"]',
      position: 'bottom'
    },
    {
      id: 'approvalBestPractices',
      title: '薪资审批最佳实践',
      description: '掌握专业的薪资审批最佳实践，确保审批流程的高效和规范。',
      content: '🏆 审批最佳实践：\n\n✅ 审批标准：\n• 建立明确的审批标准\n• 制定异常处理预案\n• 设置审批时限要求\n\n🔄 流程优化：\n• 简化审批环节\n• 自动化常规审批\n• 建立快速通道\n\n📋 质量保证：\n• 双重审核机制\n• 抽样检查制度\n• 定期流程评估\n\n🔐 风险控制：\n• 权限分离原则\n• 审批额度控制\n• 异常监控预警\n\n成为薪资审批专家！',
      targetElement: '[data-tour="approval-list"]',
      position: 'top'
    }
  ]
};

/**
 * 报表和统计功能
 * 深入学习数据分析、报表生成和决策支持功能
 */
export const reportingFlow: OnboardingFlow = {
  id: 'reporting',
  name: '报表和统计功能',
  description: '深入学习数据分析、报表生成和决策支持功能',
  category: 'feature-intro',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'reportDashboard',
      title: '报表仪表板',
      description: '报表仪表板展示关键指标的概览，帮助快速掌握整体情况。',
      content: '📊 仪表板功能：\n• 关键指标卡片：核心数据一目了然\n• 趋势图表：数据变化趋势分析\n• 对比分析：同比环比数据对比\n• 预警提醒：异常数据自动提醒',
      targetElement: '[data-tour="reports-dashboard"]',
      position: 'bottom'
    },
    {
      id: 'reportTemplates',
      title: '报表模板库',
      description: '系统提供丰富的预设报表模板，覆盖各种管理场景。',
      content: '📋 模板分类：\n• 薪资报表：薪资汇总、成本分析\n• 人员报表：在职统计、流动分析\n• 部门报表：部门薪资、绩效对比\n• 合规报表：税务申报、社保缴费\n• 自定义报表：按需定制报表',
      targetElement: '[data-tour="report-templates"]',
      position: 'bottom'
    },
    {
      id: 'dataFiltering',
      title: '数据筛选和维度分析',
      description: '强大的筛选功能让您能够从多个维度分析数据。',
      content: '🔍 筛选维度：\n• 时间维度：年度、季度、月度\n• 组织维度：部门、岗位、级别\n• 人员维度：在职、离职、试用期\n• 薪资维度：基本工资、奖金、津贴\n• 自定义维度：灵活组合条件',
      targetElement: '[data-tour="data-filters"]',
      position: 'bottom'
    },
    {
      id: 'chartVisualization',
      title: '数据可视化图表',
      description: '多种图表类型让复杂数据变得直观易懂。',
      content: '📈 图表类型：\n• 柱状图：数量对比分析\n• 折线图：趋势变化展示\n• 饼图：结构占比分析\n• 散点图：相关性分析\n• 热力图：密度分布展示',
      targetElement: '[data-tour="chart-area"]',
      position: 'top'
    },
    {
      id: 'reportExportOptions',
      title: '报表导出功能',
      description: '支持多种格式的报表导出，满足不同场景需求。',
      content: '📤 导出格式：\n• Excel格式：数据处理和分析\n• PDF格式：打印和归档\n• PPT格式：汇报演示\n• 图片格式：快速分享\n• 在线链接：实时数据分享',
      targetElement: '[data-tour="export-options"]',
      position: 'left'
    },
    {
      id: 'scheduledReports',
      title: '定时报表功能',
      description: '设置定时报表，自动生成和发送周期性报表。',
      content: '⏰ 定时功能：\n• 发送频率：日报、周报、月报\n• 收件人设置：管理层、部门负责人\n• 报表内容：自定义报表模板\n• 发送方式：邮件、系统通知\n• 异常处理：数据异常自动提醒',
      targetElement: '[data-tour="scheduled-reports"]',
      position: 'bottom'
    }
  ]
};

/**
 * 组织管理高级功能
 * 学习部门架构、职位体系和权限管理
 */
export const organizationManagementFlow: OnboardingFlow = {
  id: 'organizationManagement',
  name: '组织管理高级功能',
  description: '学习部门架构、职位体系和权限管理',
  category: 'advanced',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'departmentHierarchy',
      title: '部门层级管理',
      description: '学习如何创建和管理企业的部门层级结构。',
      content: '🏢 部门管理要点：\n• 层级设计：总部-事业部-部门-组\n• 职能划分：业务部门vs支持部门\n• 汇报关系：上下级管理关系\n• 成本中心：预算和成本控制\n• 权限继承：部门权限体系',
      targetElement: '[data-tour="department-tree"]',
      position: 'right'
    },
    {
      id: 'positionManagement',
      title: '职位体系设计',
      description: '建立完善的职位等级和职业发展通道。',
      content: '🎯 职位体系：\n• 职位等级：初级-中级-高级-专家\n• 职业通道：管理线vs专业线\n• 任职资格：技能要求和经验标准\n• 薪酬等级：职位与薪酬挂钩\n• 晋升路径：职业发展规划',
      targetElement: '[data-tour="position-management"]',
      position: 'bottom'
    },
    {
      id: 'rolePermissions',
      title: '角色权限管理',
      description: '设计精细化的角色和权限控制体系。',
      content: '🔐 权限管理：\n• 角色定义：管理员、HR、经理、员工\n• 功能权限：模块访问控制\n• 数据权限：数据范围控制\n• 操作权限：增删改查控制\n• 审批权限：流程审批控制',
      targetElement: '[data-tour="role-permissions"]',
      position: 'bottom'
    }
  ]
};

/**
 * 系统设置和配置
 * 学习系统参数配置和个性化设置
 */
export const systemConfigurationFlow: OnboardingFlow = {
  id: 'systemConfiguration',
  name: '系统设置和配置',
  description: '学习系统参数配置和个性化设置',
  category: 'advanced',
  prerequisites: [],
  permissions: [],
  steps: [
    {
      id: 'payrollConfiguration',
      title: '薪资计算配置',
      description: '配置薪资计算规则、税率参数和社保基数。',
      content: '💰 薪资配置：\n• 计算公式：自定义薪资计算逻辑\n• 税率设置：个税、社保税率配置\n• 社保基数：缴费基数上下限\n• 公积金比例：企业和个人比例\n• 特殊规则：加班费、年终奖计算',
      targetElement: '[data-tour="payroll-config"]',
      position: 'bottom'
    },
    {
      id: 'systemParameters',
      title: '系统参数设置',
      description: '配置系统运行的基础参数和业务规则。',
      content: '⚙️ 参数配置：\n• 工作日历：节假日、工作日设置\n• 审批流程：自定义审批环节\n• 通知设置：消息推送规则\n• 数据备份：自动备份策略\n• 安全策略：密码复杂度、登录限制',
      targetElement: '[data-tour="system-params"]',
      position: 'bottom'
    },
    {
      id: 'userPreferences',
      title: '个人偏好设置',
      description: '自定义个人使用习惯和界面偏好。',
      content: '👤 个人设置：\n• 界面主题：明暗主题切换\n• 语言设置：多语言支持\n• 时区设置：时间显示格式\n• 快捷键：键盘操作定制\n• 默认视图：页面布局偏好',
      targetElement: '[data-tour="user-preferences"]',
      position: 'bottom'
    }
  ]
};

/**
 * 所有可用的指导流程
 */
export const availableOnboardingFlows: OnboardingFlow[] = [
  gettingStartedFlow,
  employeeWorkflowFlow,
  payrollWorkflowFlow,
  payrollApprovalFlow,
  reportingFlow,
  organizationManagementFlow,
  systemConfigurationFlow
];

/**
 * 根据用户权限获取可用的指导流程
 */
export function getAvailableFlows(userPermissions: readonly string[] = []): OnboardingFlow[] {
  return availableOnboardingFlows.filter(flow => {
    if (!flow.permissions || flow.permissions.length === 0) {
      return true; // 无权限要求的流程对所有用户可见
    }
    
    // 检查通配符权限
    if (userPermissions.includes('*')) {
      return true; // 通配符权限用户可以访问所有流程
    }
    
    return flow.permissions.some(permission => 
      userPermissions.includes(permission)
    );
  });
}

/**
 * 根据用户状态获取推荐的指导流程
 */
export function getRecommendedFlows(
  userPermissions: readonly string[] = [],
  completedFlows: string[] = []
): OnboardingFlow[] {
  const available = getAvailableFlows(userPermissions);
  
  // 优先推荐入门流程和未完成的工作流程
  return available
    .filter(flow => !completedFlows.includes(flow.id))
    .sort((a, b) => {
      // 入门指导优先级最高
      if (a.category === 'getting-started' && b.category !== 'getting-started') return -1;
      if (b.category === 'getting-started' && a.category !== 'getting-started') return 1;
      
      // 工作流程次之
      if (a.category === 'workflow' && b.category !== 'workflow') return -1;
      if (b.category === 'workflow' && a.category !== 'workflow') return 1;
      
      return 0;
    })
    .slice(0, 3); // 最多推荐3个流程
}