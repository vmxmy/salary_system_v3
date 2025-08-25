/**
 * 导入进度模态框组件
 * 提供美观的全屏进度展示体验
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { cardEffects } from '@/styles/design-effects';
import { ProgressDisplay, type ProgressData } from '../common/ProgressDisplay';
import { ErrorHandlingDisplay, type ErrorInfo } from '../common/ErrorHandlingDisplay';
import type { EnhancedImportPhaseType } from '../../context/EnhancedImportContext';

/**
 * 模态框Props
 */
interface ImportProgressModalProps {
  isOpen: boolean;
  progress: ProgressData | null;
  errors?: ErrorInfo[];
  title?: string;
  allowCancel?: boolean;
  onCancel?: () => void;
  onClose?: () => void;
  onErrorDismiss?: (errorId: string) => void;
  onErrorClearAll?: () => void;
  className?: string;
}

/**
 * 阶段状态映射
 */
const getPhaseDetails = (phase: EnhancedImportPhaseType) => {
  const phaseMap = {
    'configuration': { 
      title: '配置准备', 
      description: '正在准备导入配置...', 
      icon: '⚙️',
      color: 'text-info'
    },
    'file_processing': { 
      title: '文件处理', 
      description: '正在解析Excel文件内容...', 
      icon: '📄',
      color: 'text-warning'
    },
    'data_validation': { 
      title: '数据验证', 
      description: '正在验证数据格式和完整性...', 
      icon: '🔍',
      color: 'text-primary'
    },
    'real_import': { 
      title: '数据导入', 
      description: '正在将数据写入数据库...', 
      icon: '📤',
      color: 'text-secondary'
    },
    'completed': { 
      title: '导入完成', 
      description: '所有数据已成功导入！', 
      icon: '✅',
      color: 'text-success'
    },
    'error': { 
      title: '导入失败', 
      description: '导入过程中遇到错误', 
      icon: '❌',
      color: 'text-error'
    }
  };
  
  return phaseMap[phase] || {
    title: '处理中',
    description: '正在处理...',
    icon: '⏳',
    color: 'text-base-content'
  };
};

/**
 * 计算预估剩余时间
 */
const calculateTimeEstimate = (progress: ProgressData): string | null => {
  if (!progress.startTime || progress.overall <= 0 || !progress.isActive) {
    return null;
  }

  const elapsed = (Date.now() - progress.startTime) / 1000;
  const speed = progress.overall / elapsed;
  const remaining = 100 - progress.overall;
  const timeLeft = remaining / speed;

  if (timeLeft < 60) {
    return `约 ${Math.round(timeLeft)} 秒`;
  } else if (timeLeft < 3600) {
    const minutes = Math.floor(timeLeft / 60);
    return `约 ${minutes} 分钟`;
  } else {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    return `约 ${hours} 小时 ${minutes} 分钟`;
  }
};

/**
 * 导入进度模态框主组件
 */
export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  isOpen,
  progress,
  errors = [],
  title = '薪资数据导入',
  allowCancel = false,
  onCancel,
  onClose,
  onErrorDismiss,
  onErrorClearAll,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  // 控制模态框显示动画
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setAnimationClass('scale-100 opacity-100'), 10);
    } else {
      setAnimationClass('scale-95 opacity-0');
      setTimeout(() => setIsVisible(false), 200);
    }
  }, [isOpen]);

  // 如果没有进度数据且模态框关闭，不渲染
  if (!isVisible) return null;

  const phaseDetails = progress ? getPhaseDetails(progress.phase) : null;
  const timeEstimate = progress ? calculateTimeEstimate(progress) : null;
  const isCompleted = progress?.phase === 'completed';
  const hasErrors = errors.length > 0;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black/50 backdrop-blur-sm',
      className
    )}>
      {/* 模态框容器 */}
      <div className={cn(
        'relative w-full max-w-2xl mx-4',
        'transform transition-all duration-200 ease-out',
        animationClass
      )}>
        <div className={cn(cardEffects.elevated, 'p-8')}>
          {/* 头部 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            {phaseDetails && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl">{phaseDetails.icon}</span>
                <div>
                  <div className={cn('text-xl font-semibold', phaseDetails.color)}>
                    {phaseDetails.title}
                  </div>
                  <div className="text-sm text-base-content/70">
                    {phaseDetails.description}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 进度显示 */}
          {progress && (
            <div className="mb-8">
              <ProgressDisplay
                progress={progress}
                style="detailed"
                showTimeEstimate={true}
                variant="primary"
              />
              
              {/* 时间估算 */}
              {timeEstimate && !isCompleted && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-base-200/50 rounded-full px-4 py-2">
                    <span className="text-sm text-base-content/60">预计剩余时间:</span>
                    <span className="font-medium">{timeEstimate}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 错误显示 */}
          {hasErrors && (
            <div className="mb-6">
              <ErrorHandlingDisplay
                errors={errors}
                onDismiss={onErrorDismiss}
                onClearAll={onErrorClearAll}
                className="max-h-48 overflow-y-auto"
              />
            </div>
          )}

          {/* 底部操作区 */}
          <div className="flex justify-center gap-4">
            {isCompleted && (
              <button
                className="btn btn-primary btn-lg"
                onClick={onClose}
              >
                <span className="text-lg">🎉</span>
                完成
              </button>
            )}
            
            {!isCompleted && allowCancel && onCancel && (
              <button
                className="btn btn-outline btn-lg"
                onClick={onCancel}
                disabled={!progress?.isActive}
              >
                取消导入
              </button>
            )}
            
            {hasErrors && !isCompleted && onClose && (
              <button
                className="btn btn-ghost btn-lg"
                onClick={onClose}
              >
                关闭
              </button>
            )}
          </div>

          {/* 导入详细信息 */}
          {progress && (progress.fileProgress !== undefined || progress.importProgress !== undefined) && (
            <div className="mt-6 pt-6 border-t border-base-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {progress.fileProgress !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">文件处理:</span>
                    <div className="flex-1 bg-base-300 rounded-full h-2">
                      <div 
                        className="bg-info h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress.fileProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">{progress.fileProgress.toFixed(0)}%</span>
                  </div>
                )}
                
                {progress.importProgress !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">数据导入:</span>
                    <div className="flex-1 bg-base-300 rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress.importProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">{progress.importProgress.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProgressModal;