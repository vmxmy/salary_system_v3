import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useEmployeeStatistics } from '@/hooks/employee/useEmployeeStatistics';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';

// 管理决策数据类型定义
export interface DecisionKPI {
  budgetExecutionRate: number;
  laborCostEfficiency: number;
  organizationHealthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  // 为组件兼容性添加的属性
  name?: string;
  type?: string;
  value?: number;
  benchmark?: number;
}

export interface RiskIndicator {
  id: string;
  type: 'turnover' | 'budget' | 'efficiency' | 'compliance';
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  priority: number;
}

export interface ManagementRecommendation {
  id: string;
  category: 'hr' | 'finance' | 'operations' | 'strategic';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedImpact: string;
  actionItems: string[];
  estimatedCost: number;
  timeline: string;
}

export interface TrendInsight {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  significance: 'minor' | 'moderate' | 'major';
  interpretation: string;
  businessImplication: string;
}

export interface QuickAction {
  id: string;
  type: 'navigation' | 'report' | 'approval' | 'analysis';
  title: string;
  description: string;
  icon: string;
  badge?: string;
  priority: number;
  action: string;
}

export interface ManagementDashboardData {
  decisionKPIs: DecisionKPI;
  riskIndicators: RiskIndicator[];
  recommendations: ManagementRecommendation[];
  trendInsights: TrendInsight[];
  quickActions: QuickAction[];
  lastCalculated: string;
  // 为组件兼容性添加的别名属性
  kpis: DecisionKPI[];
  insights: TrendInsight[];
  risks: RiskIndicator[];
}

/**
 * 管理仪表板Hook
 * 
 * 为管理决策提供聚合的智能洞察数据
 * 基于现有hooks进行数据二次加工和算法计算
 * 
 * 设计理念：
 * 1. 数据驱动：基于真实数据计算管理指标
 * 2. 智能分析：提供超越基础统计的决策洞察
 * 3. 风险导向：主动识别和预警潜在问题
 * 4. 行动指南：提供具体可执行的管理建议
 */
export const useManagementDashboard = () => {
  // 获取基础数据源
  // 注意：useStatisticsSummary 已被移除，使用直接的hooks替代
  // const statisticsSummary = useStatisticsSummary();
  const employeeStats = useEmployeeStatistics();
  const payrollAnalytics = usePayrollAnalytics();
  
  // 获取当前期间的薪资数据
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const payrollStats = payrollAnalytics.queries.usePayrollStatistics(currentPeriod);
  const payrollTrends = payrollAnalytics.queries.usePayrollTrends({
    startPeriod: new Date(new Date().setMonth(new Date().getMonth() - 11)).toISOString().slice(0, 7),
    endPeriod: currentPeriod
  });

  // 智能管理洞察计算
  const managementData = useMemo((): ManagementDashboardData | null => {
    // 等待所有基础数据加载完成
    if (!employeeStats.data || !payrollStats.data || !payrollTrends.data) {
      return null;
    }

    // const summaryData = statisticsSummary.data; // 已移除
    const empData = employeeStats.data;
    const payrollData = payrollStats.data;
    const trendsData = payrollTrends.data;

    // 1. 计算决策KPI指标
    const decisionKPIs: DecisionKPI = {
      // 预算执行率计算（基于薪资支出趋势）
      budgetExecutionRate: calculateBudgetExecutionRate(trendsData),
      
      // 人力成本效率计算（人均产出评估）
      laborCostEfficiency: calculateLaborCostEfficiency(empData, payrollData),
      
      // 组织健康度评分（综合多维度指标）
      organizationHealthScore: calculateOrganizationHealthScore(empData, trendsData),
      
      // 风险等级评估
      riskLevel: assessOverallRiskLevel(empData, payrollData, trendsData)
    };

    // 2. 风险指标识别
    const riskIndicators: RiskIndicator[] = identifyRiskIndicators(empData, payrollData, trendsData);

    // 3. 管理建议生成
    const recommendations: ManagementRecommendation[] = generateManagementRecommendations(
      empData, payrollData, riskIndicators
    );

    // 4. 趋势洞察分析
    const trendInsights: TrendInsight[] = analyzeTrendInsights(trendsData);

    // 5. 快速操作项生成
    const quickActions: QuickAction[] = generateQuickActions(riskIndicators);

    return {
      decisionKPIs,
      riskIndicators,
      recommendations,
      trendInsights,
      quickActions,
      lastCalculated: new Date().toISOString(),
      // 为组件兼容性添加的别名属性
      kpis: [decisionKPIs],
      insights: trendInsights,
      risks: riskIndicators
    };
  }, [employeeStats.data, payrollStats.data, payrollTrends.data]);

  // 计算加载状态
  const isLoading = employeeStats.isLoading || 
                   payrollStats.isLoading || 
                   payrollTrends.isLoading;

  // 计算错误状态
  const error = employeeStats.error || 
                payrollStats.error || 
                payrollTrends.error;

  // 刷新管理仪表板数据
  const refresh = async () => {
    await Promise.all([
      employeeStats.refetch(),
      payrollStats.refetch(),
      payrollTrends.refetch()
    ]);
  };

  return {
    data: managementData,
    isLoading,
    error,
    refresh,
    // 暴露原始数据源，用于深度分析
    rawData: {
      employeeStats: employeeStats.data,
      payrollStats: payrollStats.data,
      payrollTrends: payrollTrends.data
    }
  };
};

// 算法实现 - 预算执行率计算
const calculateBudgetExecutionRate = (trendsData: any[]): number => {
  if (trendsData.length < 2) return 85; // 默认值

  // 基于薪资增长趋势估算预算执行情况
  const recentTrends = trendsData.slice(-3);
  const avgGrowthRate = recentTrends.reduce((sum, trend) => sum + trend.growthRate, 0) / recentTrends.length;
  
  // 预算执行率 = 100% - |异常增长偏差|
  const normalGrowthRange = 5; // 正常增长范围 ±5%
  const deviation = Math.abs(avgGrowthRate) - normalGrowthRange;
  const executionRate = Math.max(60, Math.min(100, 100 - Math.max(0, deviation) * 2));
  
  return Math.round(executionRate);
};

// 算法实现 - 人力成本效率计算
const calculateLaborCostEfficiency = (empData: any, payrollData: any): number => {
  const totalEmployees = empData.total;
  const totalPayroll = payrollData.totalGrossPay;
  
  if (totalEmployees === 0 || totalPayroll === 0) return 70; // 默认值

  // 简化效率计算：基于人均薪资与行业基准的比较
  const avgSalary = totalPayroll / totalEmployees;
  const industryBenchmark = 8000; // 行业基准薪资（可配置）
  
  // 效率得分：在合理范围内薪资越接近基准越高效
  const ratio = avgSalary / industryBenchmark;
  let efficiency: number;
  
  if (ratio >= 0.8 && ratio <= 1.2) {
    // 在合理范围内，薪资适中，效率较高
    efficiency = 90 - Math.abs(ratio - 1) * 20;
  } else if (ratio < 0.8) {
    // 薪资偏低，可能存在人才流失风险
    efficiency = 60 + (ratio / 0.8) * 20;
  } else {
    // 薪资偏高，成本效率降低
    efficiency = 90 - (ratio - 1.2) * 30;
  }
  
  return Math.round(Math.max(40, Math.min(100, efficiency)));
};

// 算法实现 - 组织健康度评分
const calculateOrganizationHealthScore = (empData: any, trendsData: any[]): number => {
  let score = 100;
  
  // 基于员工数据的健康度评估（权重：40%）
  if (empData.total === 0) {
    score -= 40; // 无员工数据
  } else if (empData.total < 10) {
    score -= 20; // 员工数量过少
  }
  
  // 部门分布健康度（权重：30%）
  const departmentCount = empData.byDepartment?.length || 0;
  if (departmentCount === 0) {
    score -= 30;
  } else if (departmentCount === 1) {
    score -= 15; // 单一部门风险
  }
  
  // 薪资趋势健康度（权重：30%）
  if (trendsData.length >= 2) {
    const recentTrend = trendsData[trendsData.length - 1];
    const growthRate = recentTrend.growthRate || 0;
    
    if (Math.abs(growthRate) > 20) {
      score -= 25; // 薪资波动过大
    } else if (growthRate > 0 && growthRate <= 8) {
      score += 5; // 适度薪资增长是健康的
    }
  }
  
  return Math.round(Math.max(0, Math.min(100, score)));
};

// 算法实现 - 风险等级评估
const assessOverallRiskLevel = (empData: any, payrollData: any, trendsData: any[]): 'low' | 'medium' | 'high' => {
  let riskScore = 0;
  
  // 人员规模风险
  if (empData.total < 10) riskScore += 2; // 规模过小风险
  else if (empData.total === 0) riskScore += 3; // 无员工数据风险
  
  // 部门分布风险
  const departmentCount = empData.byDepartment?.length || 0;
  if (departmentCount <= 1) riskScore += 2;
  
  // 薪资波动风险
  if (trendsData.length >= 2) {
    const recentTrend = trendsData[trendsData.length - 1];
    const payrollGrowth = Math.abs(recentTrend.growthRate || 0);
    if (payrollGrowth > 25) riskScore += 3;
    else if (payrollGrowth > 15) riskScore += 2;
    else if (payrollGrowth > 10) riskScore += 1;
  }
  
  // 薪资总额风险
  const totalPayroll = payrollData.totalGrossPay || 0;
  if (totalPayroll === 0) riskScore += 2;
  
  if (riskScore >= 6) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
};

// 风险指标识别算法
const identifyRiskIndicators = (empData: any, payrollData: any, trendsData: any[]): RiskIndicator[] => {
  const indicators: RiskIndicator[] = [];
  
  // 员工数据风险检查
  if (empData.total === 0) {
    indicators.push({
      id: 'no-employee-data',
      type: 'compliance',
      level: 'critical',
      title: '缺少员工数据',
      description: '系统中未找到员工数据',
      impact: '无法进行有效的人力资源管理和决策',
      recommendation: '检查数据导入流程，确保员工数据正确录入',
      priority: 1
    });
  } else if (empData.total < 10) {
    indicators.push({
      id: 'small-team-risk',
      type: 'efficiency',
      level: 'medium',
      title: '团队规模较小',
      description: `当前员工总数为 ${empData.total} 人`,
      impact: '团队抗风险能力较弱，关键人员离职影响较大',
      recommendation: '评估业务需求，适度扩充关键岗位人员',
      priority: 2
    });
  }
  
  // 预算超支风险
  const recentPayrollTrend = trendsData.slice(-2);
  if (recentPayrollTrend.length >= 2) {
    const growthRate = recentPayrollTrend[recentPayrollTrend.length - 1].growthRate;
    if (growthRate > 15) {
      indicators.push({
        id: 'budget-overrun-risk',
        type: 'budget',
        level: growthRate > 25 ? 'critical' : 'high',
        title: '薪资支出快速增长',
        description: `薪资支出环比增长 ${growthRate.toFixed(1)}%，可能超出预算`,
        impact: '预算控制失效，可能影响其他运营支出',
        recommendation: '审查薪资调整决策，控制非核心人员薪资增长',
        priority: 1
      });
    }
  }
  
  // 效率风险
  const avgSalary = payrollData.totalGrossPay / empData.total;
  const industryBenchmark = 8000;
  if (avgSalary / industryBenchmark > 1.5) {
    indicators.push({
      id: 'cost-efficiency-risk',
      type: 'efficiency',
      level: avgSalary / industryBenchmark > 2 ? 'high' : 'medium',
      title: '人力成本偏高',
      description: `人均薪资 ${(avgSalary/1000).toFixed(1)}k，远超行业基准`,
      impact: '人力成本效率低下，影响组织竞争力',
      recommendation: '评估岗位价值，优化薪资结构，提升人员效率',
      priority: 2
    });
  }
  
  return indicators.sort((a, b) => a.priority - b.priority);
};

// 管理建议生成算法
const generateManagementRecommendations = (
  empData: any, 
  payrollData: any, 
  riskIndicators: RiskIndicator[]
): ManagementRecommendation[] => {
  const recommendations: ManagementRecommendation[] = [];
  
  // 基于风险指标生成建议
  riskIndicators.forEach((risk, index) => {
    if (risk.type === 'turnover' && risk.level !== 'low') {
      recommendations.push({
        id: `rec-turnover-${index}`,
        category: 'hr',
        priority: risk.level === 'critical' ? 'urgent' : 'high',
        title: '建立人员留存体系',
        description: '针对高流动率问题，建立系统性的人员留存机制',
        expectedImpact: '预期降低流动率5-10%，减少招聘成本30%',
        actionItems: [
          '开展离职面谈，分析离职原因',
          '优化薪酬福利体系',
          '改善工作环境和团队氛围',
          '建立职业发展通道'
        ],
        estimatedCost: 50000,
        timeline: '3-6个月'
      });
    }
    
    if (risk.type === 'budget' && risk.level !== 'low') {
      recommendations.push({
        id: `rec-budget-${index}`,
        category: 'finance',
        priority: risk.level === 'critical' ? 'urgent' : 'high',
        title: '加强薪资预算控制',
        description: '建立薪资支出预警机制，控制人力成本增长',
        expectedImpact: '预期控制薪资增长率在8%以内',
        actionItems: [
          '建立薪资预算审批流程',
          '设置月度支出预警阈值',
          '优化薪资结构比例',
          '制定成本控制策略'
        ],
        estimatedCost: 20000,
        timeline: '1-3个月'
      });
    }
  });
  
  // 基于组织状况生成战略建议
  const healthScore = calculateOrganizationHealthScore(empData, []);
  if (healthScore < 70) {
    recommendations.push({
      id: 'rec-org-improvement',
      category: 'strategic',
      priority: 'medium',
      title: '提升组织健康度',
      description: '系统性改善组织管理，提升整体运营效率',
      expectedImpact: '预期组织健康度提升15-20分',
      actionItems: [
        '开展组织诊断评估',
        '优化组织架构设计',
        '加强内部沟通机制',
        '建立绩效管理体系'
      ],
      estimatedCost: 100000,
      timeline: '6-12个月'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

// 趋势洞察分析算法
const analyzeTrendInsights = (payrollTrends: any[]): TrendInsight[] => {
  const insights: TrendInsight[] = [];
  
  // 薪资趋势洞察
  if (payrollTrends.length >= 3) {
    const recentTrend = payrollTrends.slice(-3);
    const avgGrowth = recentTrend.reduce((sum, trend) => sum + trend.growthRate, 0) / recentTrend.length;
    
    insights.push({
      metric: '薪资水平',
      direction: avgGrowth > 3 ? 'increasing' : avgGrowth < -3 ? 'decreasing' : 'stable',
      significance: Math.abs(avgGrowth) > 15 ? 'major' : Math.abs(avgGrowth) > 8 ? 'moderate' : 'minor',
      interpretation: avgGrowth > 15 ? '薪资快速上涨' : avgGrowth > 5 ? '薪资稳步增长' : avgGrowth < -5 ? '薪资下降' : '薪资水平稳定',
      businessImplication: avgGrowth > 15 ? '需要控制成本增长风险' : avgGrowth < -5 ? '可能影响员工满意度' : '薪资管理相对健康'
    });
  }
  
  return insights;
};

// 快速操作项生成算法
const generateQuickActions = (riskIndicators: RiskIndicator[]): QuickAction[] => {
  const actions: QuickAction[] = [];
  
  // 基础操作项
  actions.push(
    {
      id: 'generate-monthly-report',
      type: 'report',
      title: '生成月度报告',
      description: '快速生成管理月报',
      icon: 'document-report',
      priority: 1,
      action: '/statistics/reports/monthly'
    },
    {
      id: 'view-payroll-detail',
      type: 'navigation',
      title: '薪资详情分析',
      description: '查看详细薪资统计',
      icon: 'currency-dollar',
      priority: 2,
      action: '/statistics?tab=payroll'
    },
    {
      id: 'hr-analysis',
      type: 'navigation',
      title: 'HR数据分析',
      description: '人事统计分析',
      icon: 'users',
      priority: 3,
      action: '/statistics?tab=hr'
    }
  );
  
  // 移除了基于alerts的操作项，因为useStatisticsSummary已被删除
  
  // 基于风险指标生成操作项
  const highRiskCount = riskIndicators.filter(risk => risk.level === 'high' || risk.level === 'critical').length;
  if (highRiskCount > 0) {
    actions.push({
      id: 'risk-management',
      type: 'analysis',
      title: '风险管理',
      description: '查看高风险指标',
      icon: 'shield-exclamation',
      badge: highRiskCount.toString(),
      priority: 0,
      action: '/dashboard/risks'
    });
  }
  
  return actions.sort((a, b) => a.priority - b.priority);
};

export default useManagementDashboard;