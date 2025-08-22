/**
 * 新用户指导启动器组件
 * 
 * 功能：
 * 1. 快速启动 - 提供各种指导流程的快速入口
 * 2. 智能推荐 - 基于用户权限和状态推荐合适的指导
 * 3. 状态显示 - 显示各流程的完成状态
 * 4. 批量管理 - 支持重置和管理多个指导流程
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  UserIcon,
  CogIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import type { OnboardingFlow, FlowCategory, OnboardingStatus } from '@/types/onboarding';

interface OnboardingLauncherProps {
  compact?: boolean;
  showRecommendations?: boolean;
  className?: string;
  availableFlows?: OnboardingFlow[];
  showTitle?: boolean;
}

export const OnboardingLauncher = ({
  compact = false,
  showRecommendations = true,
  className = '',
  availableFlows,
  showTitle = true
}: OnboardingLauncherProps) => {
  const { t } = useTranslation(['onboarding', 'common']);
  const { user } = useUnifiedAuth();
  const { 
    getAvailableFlows, 
    startFlow, 
    isActive, 
    isLoading, 
    resetFlow,
    currentFlow 
  } = useOnboarding();

  const [flows, setFlows] = useState<OnboardingFlow[]>([]);
  const [flowStatuses, setFlowStatuses] = useState<Record<string, OnboardingStatus>>({});

  // 获取流程图标
  const getCategoryIcon = useCallback((category?: FlowCategory) => {
    const iconClass = "w-5 h-5";
    
    switch (category) {
      case 'getting-started':
        return <PlayIcon className={iconClass} />;
      case 'feature-intro':
        return <InformationCircleIcon className={iconClass} />;
      case 'workflow':
        return <ChartBarIcon className={iconClass} />;
      case 'advanced':
        return <CogIcon className={iconClass} />;
      case 'maintenance':
        return <BuildingOfficeIcon className={iconClass} />;
      default:
        return <UserIcon className={iconClass} />;
    }
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: OnboardingStatus) => {
    const iconClass = "w-4 h-4";
    
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className={`${iconClass} text-success`} />;
      case 'in-progress':
        return <ClockIcon className={`${iconClass} text-primary animate-pulse`} />;
      case 'skipped':
        return <XCircleIcon className={`${iconClass} text-base-content/40`} />;
      case 'failed':
        return <XCircleIcon className={`${iconClass} text-error`} />;
      case 'paused':
        return <ClockIcon className={`${iconClass} text-warning`} />;
      default:
        return <PlayIcon className={`${iconClass} text-base-content/60`} />;
    }
  }, []);

  // 获取状态文本
  const getStatusText = useCallback((status: OnboardingStatus) => {
    switch (status) {
      case 'completed':
        return t('status.completed');
      case 'in-progress':
        return t('status.inProgress');
      case 'skipped':
        return t('status.skipped');
      case 'failed':
        return t('status.failed');
      case 'paused':
        return t('status.paused');
      default:
        return t('status.notStarted');
    }
  }, [t]);

  // 获取状态颜色类
  const getStatusColorClass = useCallback((status: OnboardingStatus) => {
    switch (status) {
      case 'completed':
        return 'text-success';
      case 'in-progress':
        return 'text-primary';
      case 'skipped':
        return 'text-base-content/40';
      case 'failed':
        return 'text-error';
      case 'paused':
        return 'text-warning';
      default:
        return 'text-base-content/60';
    }
  }, []);

  // 加载可用流程
  const loadFlows = useCallback(async () => {
    try {
      const flowsToUse = availableFlows || getAvailableFlows();
      setFlows(flowsToUse);
      
      // 加载流程状态
      const statuses: Record<string, OnboardingStatus> = {};
      for (const flow of flowsToUse) {
        // 这里应该从API或localStorage加载实际状态
        // 暂时使用模拟数据
        statuses[flow.id] = 'not-started';
      }
      setFlowStatuses(statuses);
    } catch (error) {
      console.error('Failed to load onboarding flows:', error);
    }
  }, [availableFlows, getAvailableFlows]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // 启动指导流程
  const handleStartFlow = useCallback(async (flowId: string) => {
    try {
      await startFlow(flowId);
      setFlowStatuses(prev => ({
        ...prev,
        [flowId]: 'in-progress'
      }));
    } catch (error) {
      console.error('Failed to start onboarding flow:', error);
    }
  }, [startFlow]);

  // 重置指导流程
  const handleResetFlow = useCallback(async (flowId: string) => {
    try {
      await resetFlow();
      setFlowStatuses(prev => ({
        ...prev,
        [flowId]: 'not-started'
      }));
    } catch (error) {
      console.error('Failed to reset onboarding flow:', error);
    }
  }, [resetFlow]);

  // 获取推荐流程
  const getRecommendedFlows = useCallback(() => {
    if (!showRecommendations) return [];
    
    // 基于用户权限和未完成状态推荐，优先推荐入门和工作流程
    return flows.filter(flow => {
      const status = flowStatuses[flow.id];
      const isIncomplete = !status || status === 'not-started' || status === 'failed';
      const hasPermission = !flow.permissions || flow.permissions.length === 0 || 
        flow.permissions.some(p => user?.permissions?.includes(p));
      
      return isIncomplete && hasPermission;
    }).sort((a, b) => {
      // 优先级排序：getting-started > workflow > feature-intro > advanced
      const categoryPriority = {
        'getting-started': 4,
        'workflow': 3,
        'feature-intro': 2,
        'advanced': 1
      };
      const aPriority = categoryPriority[a.category as keyof typeof categoryPriority] || 0;
      const bPriority = categoryPriority[b.category as keyof typeof categoryPriority] || 0;
      return bPriority - aPriority;
    }).slice(0, 3); // 最多推荐3个
  }, [flows, flowStatuses, showRecommendations, user?.permissions]);

  const recommendedFlows = getRecommendedFlows();

  if (flows.length === 0) {
    return null;
  }

  return (
    <div className={`onboarding-launcher ${className}`}>
      {/* 推荐区域 */}
      {recommendedFlows.length > 0 && !compact && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
            <InformationCircleIcon className="w-4 h-4 text-primary" />
            {t('recommendations')}
          </h4>
          <div className="grid gap-2">
            {recommendedFlows.map((flow) => (
              <div
                key={flow.id}
                className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getCategoryIcon(flow.category)}
                  <div>
                    <div className="font-medium text-sm text-base-content">
                      {t(`flows.${flow.id}.name`, { defaultValue: flow.name })}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {t(`flows.${flow.id}.description`, { defaultValue: flow.description })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartFlow(flow.id)}
                  disabled={isLoading || (isActive && currentFlow?.id === flow.id)}
                  className="btn btn-primary btn-sm"
                >
                  <PlayIcon className="w-4 h-4" />
                  {t('start')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 所有流程列表 */}
      <div>
        {!compact && (
          <h4 className="text-sm font-semibold text-base-content mb-3">
            {t('allFlows')}
          </h4>
        )}
        
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {flows.map((flow) => {
            const status = flowStatuses[flow.id];
            const isCurrentFlow = isActive && currentFlow?.id === flow.id;
            const canStart = !isLoading && !isCurrentFlow;
            const canReset = status === 'completed' || status === 'failed' || status === 'skipped';

            return (
              <div
                key={flow.id}
                className={`p-4 bg-base-100 border rounded-xl transition-all duration-200 ${
                  isCurrentFlow 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : 'border-base-300 hover:border-base-400 hover:shadow-md'
                }`}
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(flow.category)}
                    <div>
                      <h5 className="font-medium text-base-content line-clamp-1">
                        {t(`flows.${flow.id}.name`, { defaultValue: flow.name })}
                      </h5>
                      {!compact && (
                        <p className="text-xs text-base-content/60 line-clamp-2 mt-1">
                          {t(`flows.${flow.id}.description`, { defaultValue: flow.description })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    {!compact && (
                      <span className={`text-xs font-medium ${getStatusColorClass(status)}`}>
                        {getStatusText(status)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 步骤信息 */}
                {!compact && (
                  <div className="text-xs text-base-content/50 mb-3">
                    {t('stepCount', { count: flow.steps.length })}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartFlow(flow.id)}
                      disabled={!canStart}
                      className={`btn btn-sm ${
                        status === 'completed' 
                          ? 'btn-outline' 
                          : 'btn-primary'
                      }`}
                    >
                      {status === 'completed' ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4" />
                          {compact ? t('restart') : t('review')}
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          {compact ? t('start') : t('startFlow')}
                        </>
                      )}
                    </button>

                    {canReset && !compact && (
                      <button
                        type="button"
                        onClick={() => handleResetFlow(flow.id)}
                        className="btn btn-ghost btn-sm opacity-60 hover:opacity-100"
                        title={t('resetFlow')}
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isCurrentFlow && (
                    <div className="text-xs text-primary font-medium animate-pulse">
                      {t('active')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};