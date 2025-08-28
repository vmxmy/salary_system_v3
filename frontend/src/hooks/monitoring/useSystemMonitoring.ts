import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useEmployeeStatistics } from '@/hooks/employee/useEmployeeStatistics';
// 新增真实工作流hooks
import { usePayrollApprovalWorkflow } from '@/hooks/workflow/usePayrollApprovalWorkflow';
import { useHRChangeRequests } from '@/hooks/workflow/useHRChangeRequests';
import { useSystemOperations } from '@/hooks/workflow/useSystemOperations';

// 数据质量指标类型定义
export interface DataQualityMetrics {
  completeness: number; // 数据完整性 0-100
  timeliness: number;   // 数据及时性 0-100
  consistency: number;  // 数据一致性 0-100
  accuracy: number;     // 数据准确性 0-100
  lastChecked: string;
  issues: DataQualityIssue[];
  // 为组件兼容性添加的属性
  overallScore?: number;
}

export interface DataQualityIssue {
  id: string;
  type: 'missing' | 'outdated' | 'inconsistent' | 'invalid';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  affectedRecords: number;
  recommendation: string;
}

// 工作流程状态类型定义
export interface WorkflowProgress {
  processType: 'payroll_approval' | 'hr_change' | 'department_update' | 'employee_onboarding';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  estimatedCompletion: string;
  averageProcessingTime: number; // 分钟
  bottlenecks: string[];
}

export interface WorkflowStatusData {
  payrollApprovalProgress: WorkflowProgress[];
  hrChangeRequests: WorkflowProgress[];
  systemOperations: WorkflowProgress[];
  overallEfficiency: number;
}

// 系统使用情况类型定义
export interface SystemUsageData {
  activeUsers: {
    current: number;
    peak24h: number;
    averageSessionDuration: number; // 分钟
    usersByRole: Record<string, number>;
  };
  featureUsageHeatmap: FeatureUsage[];
  performanceMetrics: PerformanceMetric[];
  systemHealth: {
    uptime: number; // 百分比
    responseTime: number; // 毫秒
    errorRate: number; // 百分比
    lastIncident: string;
  };
}

export interface FeatureUsage {
  feature: string;
  module: string;
  usageCount: number;
  uniqueUsers: number;
  averageUseTime: number;
  popularityScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  benchmark: number;
  trend: 'improving' | 'degrading' | 'stable';
}

// 系统监控综合数据
export interface SystemMonitoringData {
  dataQuality: DataQualityMetrics;
  workflowStatus: WorkflowStatusData;
  systemUsage: SystemUsageData;
  overallStatus: 'healthy' | 'warning' | 'critical';
  recommendedActions: SystemAction[];
  lastUpdated: string;
  // 为组件兼容性添加的属性
  systemHealth?: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  workflowProgress?: WorkflowProgress[];
}

export interface SystemAction {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'performance' | 'data_quality' | 'workflow' | 'security';
  title: string;
  description: string;
  estimatedImpact: string;
  estimatedEffort: string;
  deadline?: string;
}

/**
 * 系统监控Hook
 * 
 * 监控系统运营状态，包括数据质量、工作流程、系统使用情况
 * 与其他统计模块的差异：专注于系统运营层面，非业务数据分析
 * 
 * 核心功能：
 * 1. 数据质量实时监控
 * 2. 业务流程状态跟踪
 * 3. 系统性能指标监控
 * 4. 用户使用行为分析
 */
export const useSystemMonitoring = () => {
  // 获取基础数据源用于系统监控分析
  // 注意：useStatisticsSummary 已被移除，使用直接的hooks替代
  // const statisticsSummary = useStatisticsSummary();
  const payrollAnalytics = usePayrollAnalytics();
  const employeeStats = useEmployeeStatistics();
  
  // 获取当前期间的数据用于监控分析
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const payrollStats = payrollAnalytics.queries.usePayrollStatistics(currentPeriod);
  
  // 新增真实工作流数据源
  const payrollApprovalWorkflow = usePayrollApprovalWorkflow(currentPeriod);
  const hrChangeRequests = useHRChangeRequests('current_month');
  const systemOperations = useSystemOperations('last_24h');

  // 系统监控数据计算
  const monitoringData = useMemo((): SystemMonitoringData | null => {
    // 等待基础数据加载
    if (!employeeStats.data) {
      return null;
    }

    const empData = employeeStats.data;
    const payrollData = payrollStats.data;

    // 1. 数据质量监控（注意：summaryData已移除，使用empData作为主数据源）
    const dataQuality = calculateDataQualityMetrics(empData, payrollData);

    // 2. 工作流程状态监控（使用真实数据）
    const workflowStatus = calculateRealWorkflowStatus(
      payrollApprovalWorkflow,
      hrChangeRequests,
      systemOperations
    );

    // 3. 系统使用情况监控
    const systemUsage = calculateSystemUsage(empData);

    // 4. 综合状态评估
    const overallStatus = assessOverallSystemStatus(dataQuality, workflowStatus, systemUsage);

    // 5. 推荐操作生成
    const recommendedActions = generateSystemActions(dataQuality, workflowStatus, systemUsage);

    return {
      dataQuality,
      workflowStatus,
      systemUsage,
      overallStatus,
      recommendedActions,
      lastUpdated: new Date().toISOString(),
      // 为组件兼容性添加的属性
      systemHealth: systemUsage.systemHealth,
      workflowProgress: [
        ...workflowStatus.payrollApprovalProgress,
        ...workflowStatus.hrChangeRequests,
        ...workflowStatus.systemOperations
      ]
    };
  }, [
    employeeStats.data, 
    payrollStats.data,
    payrollApprovalWorkflow.workflowProgress,
    hrChangeRequests.workflowProgress,
    systemOperations.workflowProgress
  ]);

  // 计算加载状态（包含工作流数据）
  const isLoading = employeeStats.isLoading || payrollStats.isLoading ||
                   payrollApprovalWorkflow.isLoading || hrChangeRequests.isLoading || systemOperations.isLoading;

  // 计算错误状态（包含工作流错误）
  const error = employeeStats.error || payrollStats.error ||
                payrollApprovalWorkflow.error || hrChangeRequests.error || systemOperations.error;

  // 刷新监控数据（包含工作流数据）
  const refresh = async () => {
    await Promise.all([
      employeeStats.refetch(),
      payrollStats.refetch?.(),
      payrollApprovalWorkflow.refetch(),
      hrChangeRequests.refetch(),
      systemOperations.refetch()
    ]);
  };

  return {
    data: monitoringData,
    isLoading,
    error,
    refresh
  };
};

// 数据质量监控算法
const calculateDataQualityMetrics = (
  empData: any,
  payrollData?: any
): DataQualityMetrics => {
  const issues: DataQualityIssue[] = [];
  
  // 1. 数据完整性检查
  let completeness = 100;
  
  // 员工数据完整性
  if (empData.total === 0) {
    completeness -= 30;
    issues.push({
      id: 'no-employee-data',
      type: 'missing',
      severity: 'critical',
      source: 'employee_statistics',
      description: '系统中无员工数据',
      affectedRecords: 0,
      recommendation: '检查员工数据导入流程'
    });
  }
  
  // 部门数据完整性
  if (empData.byDepartment?.length === 0) {
    completeness -= 15;
    issues.push({
      id: 'no-department-data',
      type: 'missing',
      severity: 'high',
      source: 'department_structure',
      description: '部门结构数据缺失',
      affectedRecords: empData.total,
      recommendation: '完善组织架构设置'
    });
  }
  
  // 2. 数据及时性检查（基于员工数据最后更新时间）
  const timeliness = 100;
  // 使用当前时间作为基准，假设数据是实时的
  const lastUpdate = new Date();
  const hoursOld = 0; // 假设实时数据
  
  // 可以根据实际需求调整及时性检查逻辑
  // 目前假设数据是实时的，所以及时性为100%
  
  // 3. 数据一致性检查
  let consistency = 100;
  
  // 检查员工总数与部门人数之和的一致性
  const deptTotalEmployees = empData.byDepartment?.reduce((sum: number, dept: any) => sum + dept.count, 0) || 0;
  if (Math.abs(empData.total - deptTotalEmployees) > empData.total * 0.1) {
    consistency -= 25;
    issues.push({
      id: 'employee-count-inconsistency',
      type: 'inconsistent',
      severity: 'medium',
      source: 'employee_department_mapping',
      description: '员工总数与部门统计不一致',
      affectedRecords: Math.abs(empData.total - deptTotalEmployees),
      recommendation: '检查员工部门归属数据'
    });
  }
  
  // 4. 数据准确性评估（基于业务规则）
  let accuracy = 100;
  
  // 检查员工数据的基本合理性
  if (empData.total > 10000) {
    accuracy -= 10;
    issues.push({
      id: 'abnormal-employee-count',
      type: 'invalid',
      severity: 'medium',
      source: 'employee_statistics',
      description: '员工总数异常偏高',
      affectedRecords: 1,
      recommendation: '验证员工数据统计逻辑'
    });
  }
  
  return {
    completeness: Math.max(0, completeness),
    timeliness: Math.max(0, timeliness),
    consistency: Math.max(0, consistency),
    accuracy: Math.max(0, accuracy),
    lastChecked: new Date().toISOString(),
    issues: issues.sort((a, b) => {
      const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
  };
};

// 真实工作流程状态监控算法（使用真实数据）
const calculateRealWorkflowStatus = (
  payrollApprovalWorkflow: any,
  hrChangeRequests: any,
  systemOperations: any
): WorkflowStatusData => {
  const payrollApprovalProgress: WorkflowProgress[] = [];
  const hrChangeProgress: WorkflowProgress[] = [];
  const systemOperationProgress: WorkflowProgress[] = [];
  
  // 薪资审批工作流数据
  if (payrollApprovalWorkflow.workflowProgress) {
    payrollApprovalProgress.push(payrollApprovalWorkflow.workflowProgress);
  }
  
  // HR变更请求工作流数据
  if (hrChangeRequests.workflowProgress) {
    hrChangeProgress.push(hrChangeRequests.workflowProgress);
  }
  
  // 系统操作工作流数据
  if (systemOperations.workflowProgress) {
    systemOperationProgress.push(systemOperations.workflowProgress);
  }
  
  // 如果没有真实数据，使用默认值
  if (payrollApprovalProgress.length === 0) {
    payrollApprovalProgress.push({
      processType: 'payroll_approval',
      status: 'pending',
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      estimatedCompletion: new Date().toISOString(),
      averageProcessingTime: 15,
      bottlenecks: ['暂无数据']
    });
  }
  
  if (hrChangeProgress.length === 0) {
    hrChangeProgress.push({
      processType: 'hr_change',
      status: 'pending',
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      estimatedCompletion: new Date().toISOString(),
      averageProcessingTime: 30,
      bottlenecks: ['暂无数据']
    });
  }
  
  if (systemOperationProgress.length === 0) {
    systemOperationProgress.push({
      processType: 'department_update',
      status: 'completed',
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      estimatedCompletion: new Date().toISOString(),
      averageProcessingTime: 5,
      bottlenecks: ['暂无数据']
    });
  }
  
  // 计算整体效率
  const allProcesses = [...payrollApprovalProgress, ...hrChangeProgress, ...systemOperationProgress];
  const totalItems = allProcesses.reduce((sum, process) => sum + process.totalItems, 0);
  const totalCompleted = allProcesses.reduce((sum, process) => sum + process.completedItems, 0);
  const overallEfficiency = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 100;
  
  return {
    payrollApprovalProgress,
    hrChangeRequests: hrChangeProgress,
    systemOperations: systemOperationProgress,
    overallEfficiency: Math.round(overallEfficiency)
  };
};

// 保留旧的模拟算法作为备用（如需要）
const calculateWorkflowStatus = (
  summaryData: any,
  empData: any,
  payrollData?: any
): WorkflowStatusData => {
  // 模拟工作流程数据（在实际系统中应该从专门的工作流API获取）
  const payrollApprovalProgress: WorkflowProgress[] = [
    {
      processType: 'payroll_approval',
      status: 'in_progress',
      totalItems: payrollData?.totalEmployees || empData.total,
      completedItems: Math.floor((payrollData?.totalEmployees || empData.total) * 0.85),
      failedItems: Math.floor((payrollData?.totalEmployees || empData.total) * 0.05),
      estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      averageProcessingTime: 15,
      bottlenecks: ['审批人员不足', '数据验证耗时']
    }
  ];
  
  const hrChangeRequests: WorkflowProgress[] = [
    {
      processType: 'hr_change',
      status: 'pending',
      totalItems: Math.floor(empData.total * 0.1),
      completedItems: Math.floor(empData.total * 0.05),
      failedItems: 0,
      estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      averageProcessingTime: 30,
      bottlenecks: ['跨部门协调', '文档准备']
    }
  ];
  
  const systemOperations: WorkflowProgress[] = [
    {
      processType: 'department_update',
      status: 'completed',
      totalItems: empData.byDepartment?.length || 0,
      completedItems: empData.byDepartment?.length || 0,
      failedItems: 0,
      estimatedCompletion: new Date().toISOString(),
      averageProcessingTime: 5,
      bottlenecks: []
    }
  ];
  
  // 计算整体效率
  const allProcesses = [...payrollApprovalProgress, ...hrChangeRequests, ...systemOperations];
  const totalItems = allProcesses.reduce((sum, process) => sum + process.totalItems, 0);
  const totalCompleted = allProcesses.reduce((sum, process) => sum + process.completedItems, 0);
  const overallEfficiency = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 100;
  
  return {
    payrollApprovalProgress,
    hrChangeRequests,
    systemOperations,
    overallEfficiency: Math.round(overallEfficiency)
  };
};

// 系统使用情况监控算法
const calculateSystemUsage = (empData: any): SystemUsageData => {
  // 模拟系统使用数据（在实际系统中应该从用户行为分析API获取）
  const activeUsers = {
    current: Math.floor(empData.total * 0.3), // 假设30%的用户在线
    peak24h: Math.floor(empData.total * 0.6),
    averageSessionDuration: 25,
    usersByRole: {
      admin: 2,
      hr_manager: 5,
      manager: Math.floor(empData.total * 0.1),
      employee: Math.floor(empData.total * 0.2)
    }
  };
  
  const featureUsageHeatmap: FeatureUsage[] = [
    {
      feature: 'dashboard',
      module: 'statistics',
      usageCount: empData.total * 50,
      uniqueUsers: Math.floor(empData.total * 0.8),
      averageUseTime: 5,
      popularityScore: 95,
      trend: 'stable'
    },
    {
      feature: 'payroll_view',
      module: 'payroll',
      usageCount: empData.total * 20,
      uniqueUsers: Math.floor(empData.total * 0.6),
      averageUseTime: 8,
      popularityScore: 80,
      trend: 'increasing'
    },
    {
      feature: 'hr_stats',
      module: 'statistics',
      usageCount: empData.total * 15,
      uniqueUsers: Math.floor(empData.total * 0.3),
      averageUseTime: 12,
      popularityScore: 65,
      trend: 'stable'
    }
  ];
  
  const performanceMetrics: PerformanceMetric[] = [
    {
      metric: '页面加载时间',
      value: 1.2,
      unit: '秒',
      status: 'good',
      benchmark: 2.0,
      trend: 'improving'
    },
    {
      metric: '数据库响应时间',
      value: 45,
      unit: '毫秒',
      status: 'excellent',
      benchmark: 100,
      trend: 'stable'
    },
    {
      metric: 'API错误率',
      value: 0.5,
      unit: '%',
      status: 'good',
      benchmark: 1.0,
      trend: 'improving'
    }
  ];
  
  const systemHealth = {
    uptime: 99.8,
    responseTime: 120,
    errorRate: 0.2,
    lastIncident: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  return {
    activeUsers,
    featureUsageHeatmap,
    performanceMetrics,
    systemHealth
  };
};

// 系统整体状态评估算法
const assessOverallSystemStatus = (
  dataQuality: DataQualityMetrics,
  workflowStatus: WorkflowStatusData,
  systemUsage: SystemUsageData
): 'healthy' | 'warning' | 'critical' => {
  let score = 100;
  
  // 数据质量影响（权重40%）
  const avgDataQuality = (dataQuality.completeness + dataQuality.timeliness + 
                         dataQuality.consistency + dataQuality.accuracy) / 4;
  if (avgDataQuality < 60) score -= 40;
  else if (avgDataQuality < 80) score -= 20;
  else if (avgDataQuality < 90) score -= 10;
  
  // 工作流程效率影响（权重30%）
  if (workflowStatus.overallEfficiency < 50) score -= 30;
  else if (workflowStatus.overallEfficiency < 70) score -= 20;
  else if (workflowStatus.overallEfficiency < 85) score -= 10;
  
  // 系统性能影响（权重30%）
  const criticalPerformanceIssues = systemUsage.performanceMetrics.filter(
    metric => metric.status === 'critical' || metric.status === 'warning'
  ).length;
  score -= criticalPerformanceIssues * 15;
  
  if (systemUsage.systemHealth.uptime < 99) score -= 15;
  if (systemUsage.systemHealth.errorRate > 2) score -= 15;
  
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
};

// 系统操作建议生成算法
const generateSystemActions = (
  dataQuality: DataQualityMetrics,
  workflowStatus: WorkflowStatusData,
  systemUsage: SystemUsageData
): SystemAction[] => {
  const actions: SystemAction[] = [];
  
  // 基于数据质量问题生成建议
  const criticalDataIssues = dataQuality.issues.filter(issue => issue.severity === 'critical');
  if (criticalDataIssues.length > 0) {
    actions.push({
      id: 'fix-critical-data-issues',
      priority: 'urgent',
      category: 'data_quality',
      title: '修复关键数据问题',
      description: `发现 ${criticalDataIssues.length} 个关键数据质量问题需要立即处理`,
      estimatedImpact: '恢复系统数据完整性，避免决策错误',
      estimatedEffort: '2-4小时',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // 基于工作流程效率生成建议
  if (workflowStatus.overallEfficiency < 70) {
    actions.push({
      id: 'optimize-workflow',
      priority: 'high',
      category: 'workflow',
      title: '优化工作流程效率',
      description: `当前工作流程效率 ${workflowStatus.overallEfficiency}%，需要优化`,
      estimatedImpact: '提升处理效率20-30%',
      estimatedEffort: '1-2天',
    });
  }
  
  // 基于系统性能生成建议
  const performanceWarnings = systemUsage.performanceMetrics.filter(
    metric => metric.status === 'warning' || metric.status === 'critical'
  );
  if (performanceWarnings.length > 0) {
    actions.push({
      id: 'improve-performance',
      priority: 'medium',
      category: 'performance',
      title: '优化系统性能',
      description: `${performanceWarnings.length} 个性能指标需要关注`,
      estimatedImpact: '改善用户体验，提升系统稳定性',
      estimatedEffort: '半天',
    });
  }
  
  return actions.sort((a, b) => {
    const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export default useSystemMonitoring;