/**
 * 页面级指导流程工具函数
 * 用于为不同页面提供相关的指导流程
 */

import type { OnboardingFlow } from '@/types/onboarding';
import { availableOnboardingFlows } from '@/config/onboardingFlows';

/**
 * 页面路径与指导流程的映射关系
 */
export const PAGE_FLOW_MAPPING: Record<string, string[]> = {
  // 仪表板页面 - 系统入门指导
  '/dashboard': ['gettingStarted'],
  '/': ['gettingStarted'],
  
  // 员工管理相关页面
  '/employees': ['employeeWorkflow'],
  '/employees/list': ['employeeWorkflow'],
  '/employees/create': ['employeeWorkflow'],
  '/employees/import': ['employeeWorkflow'],
  
  // 薪资管理页面
  '/payroll/list': ['payrollWorkflow'],
  '/payroll/approval': ['payrollApproval'],
  '/payroll/insurance-config': ['insuranceConfig'],
  
  // 统计报表页面
  '/statistics': ['reporting'],
  '/reports': ['reporting'],
  
  // 组织管理页面
  '/organization': ['organizationManagement'],
  '/departments': ['organizationManagement'],
  '/positions': ['organizationManagement'],
  
  // 系统设置页面
  '/settings': ['systemConfiguration'],
  '/config': ['systemConfiguration']
};

/**
 * 根据当前页面路径获取相关的指导流程
 * @param pathname 当前页面路径
 * @param userPermissions 用户权限（可选）
 * @returns 适用于当前页面的指导流程数组
 */
export function getFlowsForPage(
  pathname: string, 
  userPermissions: readonly string[] = []
): OnboardingFlow[] {
  // 查找最匹配的路径
  const matchedPath = findBestMatchingPath(pathname);
  
  if (!matchedPath) {
    // 如果没有匹配的路径，返回通用流程
    return getDefaultFlows(userPermissions);
  }
  
  const flowIds = PAGE_FLOW_MAPPING[matchedPath];
  
  // 根据flow ID过滤可用流程
  const relevantFlows = availableOnboardingFlows.filter(flow => 
    flowIds.includes(flow.id)
  );
  
  // 根据用户权限进一步过滤
  return filterFlowsByPermissions(relevantFlows, userPermissions);
}

/**
 * 查找最佳匹配的路径
 * 使用最长匹配原则
 * @param pathname 当前路径
 * @returns 匹配的映射路径或null
 */
function findBestMatchingPath(pathname: string): string | null {
  const paths = Object.keys(PAGE_FLOW_MAPPING);
  
  // 按路径长度降序排列，确保最具体的路径优先匹配
  const sortedPaths = paths.sort((a, b) => b.length - a.length);
  
  for (const path of sortedPaths) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return path;
    }
  }
  
  return null;
}

/**
 * 根据权限过滤指导流程
 * @param flows 待过滤的流程
 * @param userPermissions 用户权限
 * @returns 过滤后的流程
 */
function filterFlowsByPermissions(
  flows: OnboardingFlow[], 
  userPermissions: readonly string[]
): OnboardingFlow[] {
  return flows.filter(flow => {
    // 如果流程没有权限要求，则对所有用户可见
    if (!flow.permissions || flow.permissions.length === 0) {
      return true;
    }
    
    // 检查用户是否具有所需权限
    return flow.permissions.some(permission => 
      userPermissions.includes(permission)
    );
  });
}

/**
 * 获取默认的指导流程（用于未映射的页面）
 * @param userPermissions 用户权限
 * @returns 默认流程数组
 */
function getDefaultFlows(userPermissions: readonly string[] = []): OnboardingFlow[] {
  // 对于未映射的页面，只显示系统入门指导
  const defaultFlowIds = ['gettingStarted'];
  
  const defaultFlows = availableOnboardingFlows.filter(flow => 
    defaultFlowIds.includes(flow.id)
  );
  
  return filterFlowsByPermissions(defaultFlows, userPermissions);
}

/**
 * 检查当前页面是否支持指导系统
 * @param pathname 当前页面路径
 * @returns 是否支持指导系统
 */
export function isOnboardingSupportedPage(pathname: string): boolean {
  return findBestMatchingPath(pathname) !== null;
}

/**
 * 获取页面相关的推荐指导流程
 * 根据用户的使用情况和页面特性推荐最相关的流程
 * @param pathname 当前页面路径
 * @param userPermissions 用户权限
 * @param completedFlowIds 已完成的流程ID
 * @returns 推荐的指导流程
 */
export function getRecommendedFlowsForPage(
  pathname: string,
  userPermissions: readonly string[] = [],
  completedFlowIds: string[] = []
): OnboardingFlow[] {
  const pageFlows = getFlowsForPage(pathname, userPermissions);
  
  // 过滤掉已完成的流程
  const uncompletedFlows = pageFlows.filter(flow => 
    !completedFlowIds.includes(flow.id)
  );
  
  // 如果有未完成的页面相关流程，优先推荐
  if (uncompletedFlows.length > 0) {
    return uncompletedFlows;
  }
  
  // 如果页面相关流程都已完成，可以推荐相关的高级流程
  return getAdvancedFlowsForPage(pathname, userPermissions, completedFlowIds);
}

/**
 * 获取页面相关的高级指导流程
 * @param pathname 当前页面路径
 * @param userPermissions 用户权限
 * @param completedFlowIds 已完成的流程ID
 * @returns 高级指导流程
 */
function getAdvancedFlowsForPage(
  pathname: string,
  userPermissions: readonly string[] = [],
  completedFlowIds: string[] = []
): OnboardingFlow[] {
  // 基于页面类型推荐相关的高级流程
  if (pathname.includes('/employees')) {
    return availableOnboardingFlows.filter(flow => 
      ['organizationManagement'].includes(flow.id) &&
      !completedFlowIds.includes(flow.id)
    );
  }
  
  if (pathname.includes('/payroll')) {
    return availableOnboardingFlows.filter(flow => 
      ['reporting', 'systemConfiguration'].includes(flow.id) &&
      !completedFlowIds.includes(flow.id)
    );
  }
  
  if (pathname.includes('/statistics')) {
    return availableOnboardingFlows.filter(flow => 
      ['systemConfiguration'].includes(flow.id) &&
      !completedFlowIds.includes(flow.id)
    );
  }
  
  return [];
}