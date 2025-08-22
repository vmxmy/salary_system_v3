/**
 * 统计报表系统 Hooks 导出
 * 
 * 所有统计相关的自定义hooks集中导出
 * 遵循hooks-only数据访问原则
 */

// 综合统计
export { 
  useStatisticsSummary, 
  useStatisticsSummaryByDepartment 
} from './useStatisticsSummary';

// TODO: 后续将添加更多统计hooks
// export { useStatisticsFilters } from './useStatisticsFilters';
// export { useStatisticsExport } from './useStatisticsExport';
// export { useChartConfiguration } from './useChartConfiguration';
// export { useReportGenerator } from './useReportGenerator';