import type { 
  EmployeeStatistics, 
  EmployeeTrends, 
  DepartmentStatistics,
  TrendDataPoint 
} from './statistics';

// =============================================================================
// 统计报表系统扩展类型定义
// =============================================================================

// 综合统计概览数据
export interface StatisticsSummary {
  overview: {
    totalEmployees: number;
    totalPayroll: number;
    averageSalary: number;
    activeDepartments: number;
    lastUpdated: string;
  };
  
  trends: {
    employeeGrowth: number;    // 员工增长率 %
    payrollGrowth: number;     // 薪资增长率 %
    turnoverRate: number;      // 流动率 %
    budgetUtilization: number; // 预算使用率 % (预留)
  };
  
  alerts: StatisticsAlert[];
}

// 统计警报信息
export interface StatisticsAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

// 薪资统计扩展 (基于usePayrollAnalytics的数据结构)
export interface PayrollStatisticsExtended {
  period: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageGrossPay: number;
  averageDeductions: number;
  averageNetPay: number;
  statusCounts: {
    draft: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
  // 扩展字段
  medianSalary: number;
  salaryRange: {
    min: number;
    max: number;
    percentile25: number;
    percentile75: number;
  };
  departmentBreakdown: DepartmentPayrollStats[];
}

// 部门薪资统计
export interface DepartmentPayrollStats {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageGrossPay: number;
  averageNetPay: number;
  percentOfTotal: number;
  rankInOrganization: number;
}

// 薪资趋势扩展
export interface PayrollTrendsExtended {
  period: string;
  year: number;
  month: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  employeeCount: number;
  growthRate: number;      // 环比增长率
  yearOverYear: number;    // 同比增长率
  // 扩展字段
  seasonalIndex: number;   // 季节性指数
  forecastValue: number;   // 预测值
  confidence: number;      // 置信度
}

// 薪资组件分析扩展
export interface ComponentAnalysisExtended {
  componentId: string;
  componentName: string;
  componentType: 'earning' | 'deduction';
  totalAmount: number;
  averageAmount: number;
  employeeCount: number;
  percentOfTotal: number;
  // 扩展字段
  medianAmount: number;
  standardDeviation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: boolean;
}

// 对比分析扩展
export interface ComparisonAnalysisExtended {
  basePeriod: string;
  comparePeriod: string;
  metrics: ComparisonMetric[];
  summary: {
    overallTrend: 'positive' | 'negative' | 'neutral';
    significantChanges: number;
    confidence: number;
  };
}

export interface ComparisonMetric {
  metric: string;
  basePeriodValue: number;
  comparePeriodValue: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
  explanation?: string;
}

// =============================================================================
// 报表配置和筛选
// =============================================================================

// 统计筛选器
export interface StatisticsFilters {
  dateRange: {
    start: string;
    end: string;
    preset?: 'last3months' | 'last6months' | 'lastyear' | 'ytd' | 'custom';
  };
  departments: string[];
  positions: string[];
  employeeTypes: ('regular' | 'contract' | 'other')[];
  payrollStatus: ('draft' | 'approved' | 'paid' | 'cancelled')[];
  salaryRange?: {
    min: number;
    max: number;
  };
}

// 报表配置
export interface ReportConfiguration {
  id: string;
  name: string;
  type: 'dashboard' | 'hr-stats' | 'payroll-stats' | 'trends' | 'custom';
  filters: StatisticsFilters;
  layout: {
    charts: ChartConfiguration[];
    tables: TableConfiguration[];
  };
  exportSettings: {
    formats: ('excel' | 'csv' | 'pdf')[];
    includeCharts: boolean;
    includeRawData: boolean;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

// 图表配置
export interface ChartConfiguration {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar';
  dataSource: string; // hook名称或数据源标识
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  filterBy?: string;
  colors?: string[];
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
}

// 表格配置
export interface TableConfiguration {
  id: string;
  title: string;
  dataSource: string;
  columns: TableColumnConfig[];
  pagination: boolean;
  sorting: boolean;
  filtering: boolean;
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
}

export interface TableColumnConfig {
  key: string;
  title: string;
  dataType: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  width?: number;
  sortable: boolean;
  filterable: boolean;
  format?: string; // 数值格式化规则
}

// =============================================================================
// 导出和分享
// =============================================================================

// 导出配置
export interface ExportConfiguration {
  format: 'excel' | 'csv' | 'pdf';
  filename: string;
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Partial<StatisticsFilters>;
  template?: string; // 导出模板ID
}

// 导出进度
export interface ExportProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// 分享配置
export interface ShareConfiguration {
  id: string;
  type: 'link' | 'email' | 'schedule';
  recipients?: string[];
  permissions: ('view' | 'export' | 'edit')[];
  expiresAt?: string;
  password?: boolean;
  includeFilters: boolean;
}

// =============================================================================
// UI状态管理
// =============================================================================

// 统计页面状态
export interface StatisticsPageState {
  activeModule: 'dashboard' | 'hr-stats' | 'payroll-stats' | 'trends' | 'export';
  loading: boolean;
  error: string | null;
  filters: StatisticsFilters;
  layout: 'grid' | 'list' | 'fullscreen';
  sidebarCollapsed: boolean;
  preferences: {
    defaultDateRange: string;
    defaultDepartments: string[];
    theme: 'light' | 'dark' | 'auto';
    chartAnimations: boolean;
  };
}

// 图表交互状态
export interface ChartInteractionState {
  hoveredDataPoint?: {
    chartId: string;
    dataIndex: number;
    data: any;
  };
  selectedDataPoints: {
    chartId: string;
    dataIndices: number[];
  }[];
  zoomedRange?: {
    chartId: string;
    start: string | number;
    end: string | number;
  };
}

// =============================================================================
// 数据处理和计算
// =============================================================================

// 数据聚合配置
export interface AggregationConfig {
  groupBy: string[];
  metrics: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';
    alias?: string;
  }[];
  filters?: Record<string, any>;
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

// 统计计算结果
export interface StatisticsCalculationResult<T = any> {
  data: T;
  metadata: {
    calculatedAt: string;
    totalRecords: number;
    filteredRecords: number;
    processingTime: number; // 毫秒
    cacheHit: boolean;
  };
  warnings?: string[];
  errors?: string[];
}

// =============================================================================
// 工具函数类型
// =============================================================================

// 格式化函数类型
export type CurrencyFormatter = (amount: number) => string;
export type PercentageFormatter = (value: number, decimals?: number) => string;
export type DateFormatter = (date: string | Date, format?: string) => string;
export type NumberFormatter = (value: number, options?: Intl.NumberFormatOptions) => string;

// 颜色生成器类型
export type ColorGenerator = (index: number, total: number, theme?: string) => string;

// 趋势计算器类型
export type TrendCalculator = (data: TrendDataPoint[]) => {
  direction: 'up' | 'down' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
};

export default {};