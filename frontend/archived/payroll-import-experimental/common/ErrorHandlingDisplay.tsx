/**
 * 错误处理显示组件
 * 提供统一的错误展示和用户指导
 */

import React, { useState } from 'react';
import { ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { cardEffects } from '@/styles/design-effects';

/**
 * 错误类型定义
 */
export type ErrorType = 'file' | 'validation' | 'import' | 'network' | 'permission' | 'unknown';

/**
 * 错误级别定义
 */
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  id?: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string;
  timestamp?: number;
  context?: Record<string, any>;
  suggestions?: string[];
  actions?: ErrorAction[];
}

/**
 * 错误操作接口
 */
export interface ErrorAction {
  label: string;
  handler: () => void;
  primary?: boolean;
  disabled?: boolean;
}

/**
 * 组件Props
 */
interface ErrorHandlingDisplayProps {
  errors: ErrorInfo[];
  onDismiss?: (errorId: string) => void;
  onRetry?: () => void;
  onClearAll?: () => void;
  maxDisplayCount?: number;
  showDetails?: boolean;
  className?: string;
}

/**
 * 获取错误图标
 */
const getErrorIcon = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return <XCircleIcon className="h-5 w-5" />;
    case 'medium':
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    case 'low':
    case 'info':
      return <InformationCircleIcon className="h-5 w-5" />;
    default:
      return <ExclamationTriangleIcon className="h-5 w-5" />;
  }
};

/**
 * 获取错误样式类
 */
const getErrorStyle = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'critical':
      return 'alert-error border-error/20';
    case 'high':
      return 'alert-error border-error/15';
    case 'medium':
      return 'alert-warning border-warning/20';
    case 'low':
      return 'alert-info border-info/20';
    case 'info':
      return 'alert-info border-info/15';
    default:
      return 'alert-warning border-warning/20';
  }
};

/**
 * 获取错误类型中文名
 */
const getErrorTypeName = (type: ErrorType) => {
  const typeNames: Record<ErrorType, string> = {
    file: '文件错误',
    validation: '数据验证',
    import: '导入错误',
    network: '网络错误',
    permission: '权限错误',
    unknown: '未知错误'
  };
  return typeNames[type] || '错误';
};

/**
 * 获取用户友好的错误建议
 */
const getErrorSuggestions = (type: ErrorType, message: string): string[] => {
  switch (type) {
    case 'file':
      if (message.includes('格式')) {
        return [
          '请确保上传的是 Excel 文件 (.xlsx 或 .xls)',
          '检查文件是否损坏，尝试重新生成文件',
          '确保文件不是空的或只包含空白工作表'
        ];
      }
      if (message.includes('大小')) {
        return [
          '文件可能过大，建议分批处理',
          '检查文件中是否包含过多的空行或无用数据',
          '尝试压缩文件或删除不必要的工作表'
        ];
      }
      return [
        '检查文件格式是否正确',
        '确保文件没有被其他程序占用',
        '尝试重新选择文件'
      ];

    case 'validation':
      return [
        '检查数据格式是否符合模板要求',
        '确保必填字段已经填写',
        '验证数字字段的格式和范围',
        '检查日期格式是否正确'
      ];

    case 'import':
      if (message.includes('UUID') || message.includes('周期')) {
        return [
          '请确保选择了正确的薪资周期',
          '检查薪资周期是否存在且可用',
          '联系管理员确认周期配置'
        ];
      }
      return [
        '检查网络连接是否正常',
        '确保数据库连接稳定',
        '尝试重新执行导入操作',
        '联系系统管理员获得帮助'
      ];

    case 'network':
      return [
        '检查网络连接是否正常',
        '尝试刷新页面重新连接',
        '等待片刻后重试',
        '如持续出现问题，请联系技术支持'
      ];

    case 'permission':
      return [
        '请联系管理员申请相应权限',
        '确认您的账户状态是否正常',
        '尝试重新登录系统'
      ];

    default:
      return [
        '尝试刷新页面',
        '检查网络连接',
        '联系技术支持获得帮助'
      ];
  }
};

/**
 * 错误处理显示组件
 */
export const ErrorHandlingDisplay: React.FC<ErrorHandlingDisplayProps> = ({
  errors,
  onDismiss,
  onRetry,
  onClearAll,
  maxDisplayCount = 5,
  showDetails = true,
  className
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  if (!errors || errors.length === 0) {
    return null;
  }

  const displayErrors = errors.slice(0, maxDisplayCount);
  const hasMoreErrors = errors.length > maxDisplayCount;

  const toggleErrorDetails = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const handleDismiss = (errorId: string) => {
    if (onDismiss) {
      onDismiss(errorId);
    }
  };

  const criticalErrors = errors.filter(e => e.severity === 'critical').length;
  const highErrors = errors.filter(e => e.severity === 'high').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 错误统计 */}
      <div className={cn(cardEffects.primary, 'p-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-error">
              <XCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-error">
                发现 {errors.length} 个问题
              </h3>
              <p className="text-sm text-base-content/70">
                {criticalErrors > 0 && `${criticalErrors} 个严重错误`}
                {criticalErrors > 0 && highErrors > 0 && '，'}
                {highErrors > 0 && `${highErrors} 个重要问题`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {onRetry && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onRetry}
              >
                重试
              </button>
            )}
            {onClearAll && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClearAll}
              >
                清除全部
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 错误列表 */}
      <div className="space-y-3">
        {displayErrors.map((error, index) => {
          const errorId = error.id || `error-${index}`;
          const isExpanded = expandedErrors.has(errorId);
          const suggestions = error.suggestions || getErrorSuggestions(error.type, error.message);

          return (
            <div
              key={errorId}
              className={cn(
                'alert',
                getErrorStyle(error.severity),
                'transition-all duration-200'
              )}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getErrorIcon(error.severity)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-sm badge-outline">
                          {getErrorTypeName(error.type)}
                        </span>
                        {error.code && (
                          <span className="text-xs font-mono text-base-content/60">
                            #{error.code}
                          </span>
                        )}
                        {error.timestamp && (
                          <span className="text-xs text-base-content/50">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">
                        {error.message}
                      </h4>
                      
                      {error.details && isExpanded && (
                        <div className="text-xs text-base-content/70 mb-2 p-2 bg-base-200/50 rounded">
                          {error.details}
                        </div>
                      )}

                      {/* 建议措施 */}
                      {showDetails && suggestions.length > 0 && (
                        <div className={cn(
                          'mt-2 transition-all duration-200',
                          isExpanded ? 'block' : 'hidden'
                        )}>
                          <div className="text-xs font-medium text-base-content/80 mb-1">
                            建议解决方案：
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-xs text-base-content/70">
                            {suggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 错误操作 */}
                      {error.actions && error.actions.length > 0 && isExpanded && (
                        <div className="mt-3 flex gap-2">
                          {error.actions.map((action, idx) => (
                            <button
                              key={idx}
                              className={cn(
                                'btn btn-xs',
                                action.primary ? 'btn-primary' : 'btn-outline'
                              )}
                              onClick={action.handler}
                              disabled={action.disabled}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {showDetails && (suggestions.length > 0 || error.details) && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => toggleErrorDetails(errorId)}
                      >
                        {isExpanded ? '收起' : '详情'}
                      </button>
                    )}
                    
                    {onDismiss && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleDismiss(errorId)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 更多错误提示 */}
        {hasMoreErrors && (
          <div className="text-center py-2">
            <div className="text-sm text-base-content/60">
              还有 {errors.length - maxDisplayCount} 个问题未显示
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook: 错误管理
 */
export const useErrorHandling = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = (errorInfo: Omit<ErrorInfo, 'id' | 'timestamp'>) => {
    const newError: ErrorInfo = {
      ...errorInfo,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    setErrors(prev => [...prev, newError]);
  };

  const removeError = (errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const hasErrors = errors.length > 0;
  const hasCriticalErrors = errors.some(e => e.severity === 'critical');

  return {
    errors,
    addError,
    removeError,
    clearAllErrors,
    hasErrors,
    hasCriticalErrors
  };
};

export default ErrorHandlingDisplay;