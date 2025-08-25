/**
 * 进度显示组件
 * 提供美观的进度条、环形进度和状态展示
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { cardEffects } from '@/styles/design-effects';
import type { EnhancedImportPhaseType } from '../../context/EnhancedImportContext';

/**
 * 进度数据接口
 */
export interface ProgressData {
  overall: number; // 0-100 整体进度
  phase: EnhancedImportPhaseType; // 当前阶段
  message: string; // 进度消息
  isActive: boolean; // 是否活跃
  fileProgress?: number; // 文件处理进度
  importProgress?: number; // 导入进度
  currentOperation?: string; // 当前操作
  estimatedTimeLeft?: number; // 预估剩余时间（秒）
  startTime?: number; // 开始时间戳
}

/**
 * 进度样式选项
 */
export type ProgressStyle = 'linear' | 'circular' | 'detailed' | 'minimal';

/**
 * 组件Props
 */
interface ProgressDisplayProps {
  progress: ProgressData;
  style?: ProgressStyle;
  showDetails?: boolean;
  showTimeEstimate?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
}

/**
 * 获取阶段颜色和图标
 */
const getPhaseStyle = (phase: EnhancedImportPhaseType) => {
  switch (phase) {
    case 'configuration':
      return { color: 'text-info', bgColor: 'bg-info/10', icon: '⚙️', name: '配置阶段' };
    case 'file_processing':
      return { color: 'text-warning', bgColor: 'bg-warning/10', icon: '📄', name: '文件处理' };
    case 'data_validation':
      return { color: 'text-primary', bgColor: 'bg-primary/10', icon: '🔍', name: '数据验证' };
    case 'real_import':
      return { color: 'text-secondary', bgColor: 'bg-secondary/10', icon: '📤', name: '数据导入' };
    case 'completed':
      return { color: 'text-success', bgColor: 'bg-success/10', icon: '✅', name: '完成' };
    case 'error':
      return { color: 'text-error', bgColor: 'bg-error/10', icon: '❌', name: '错误' };
    default:
      return { color: 'text-base-content', bgColor: 'bg-base-200', icon: '⏳', name: '处理中' };
  }
};

/**
 * 获取进度条颜色
 */
const getProgressColor = (variant: ProgressDisplayProps['variant'], phase: EnhancedImportPhaseType) => {
  if (variant && variant !== 'primary') {
    return `progress-${variant}`;
  }
  
  switch (phase) {
    case 'configuration':
      return 'progress-info';
    case 'file_processing':
      return 'progress-warning';
    case 'data_validation':
      return 'progress-primary';
    case 'real_import':
      return 'progress-secondary';
    case 'completed':
      return 'progress-success';
    case 'error':
      return 'progress-error';
    default:
      return 'progress-primary';
  }
};

/**
 * 格式化时间
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
};

/**
 * 计算平均速度和剩余时间
 */
const calculateTimeEstimate = (progress: ProgressData): { speed: number; timeLeft: number } | null => {
  if (!progress.startTime || progress.overall <= 0 || !progress.isActive) {
    return null;
  }

  const elapsed = (Date.now() - progress.startTime) / 1000; // 秒
  const speed = progress.overall / elapsed; // 进度/秒
  const remaining = 100 - progress.overall;
  const timeLeft = remaining / speed;

  return { speed, timeLeft };
};

/**
 * 线性进度条组件
 */
const LinearProgress: React.FC<{
  progress: ProgressData;
  variant: ProgressDisplayProps['variant'];
  size: ProgressDisplayProps['size'];
  showDetails: boolean;
}> = ({ progress, variant, size, showDetails }) => {
  const phaseStyle = getPhaseStyle(progress.phase);
  const progressColor = getProgressColor(variant, progress.phase);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={phaseStyle.color}>{phaseStyle.icon}</span>
            <span className="font-medium">{phaseStyle.name}</span>
          </div>
          <span className="font-mono">{progress.overall.toFixed(1)}%</span>
        </div>
      )}
      
      <progress 
        className={cn(
          'progress w-full',
          progressColor,
          sizeClasses[size || 'md']
        )}
        value={progress.overall} 
        max={100}
      />
      
      {showDetails && progress.message && (
        <div className="text-xs text-base-content/70">
          {progress.message}
          {progress.currentOperation && (
            <span className="ml-2 text-base-content/50">({progress.currentOperation})</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 环形进度组件
 */
const CircularProgress: React.FC<{
  progress: ProgressData;
  variant: ProgressDisplayProps['variant'];
  size: ProgressDisplayProps['size'];
  showDetails: boolean;
}> = ({ progress, variant, size, showDetails }) => {
  const phaseStyle = getPhaseStyle(progress.phase);
  
  const sizes = {
    sm: { size: 60, stroke: 4, text: 'text-xs' },
    md: { size: 80, stroke: 6, text: 'text-sm' },
    lg: { size: 120, stroke: 8, text: 'text-base' }
  };
  
  const config = sizes[size || 'md'];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress.overall / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg width={config.size} height={config.size} className="transform -rotate-90">
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            fill="transparent"
            className="text-base-300"
          />
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            fill="transparent"
            className={phaseStyle.color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          config.text
        )}>
          <div className="text-center">
            <div className="font-bold">{Math.round(progress.overall)}%</div>
            <div className="text-xs opacity-70">{phaseStyle.icon}</div>
          </div>
        </div>
      </div>
      
      {showDetails && (
        <div className="flex-1 space-y-1">
          <div className="font-medium">{phaseStyle.name}</div>
          {progress.message && (
            <div className="text-sm text-base-content/70">{progress.message}</div>
          )}
          {progress.currentOperation && (
            <div className="text-xs text-base-content/50">{progress.currentOperation}</div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 详细进度组件
 */
const DetailedProgress: React.FC<{
  progress: ProgressData;
  variant: ProgressDisplayProps['variant'];
  showTimeEstimate: boolean;
}> = ({ progress, variant, showTimeEstimate }) => {
  const phaseStyle = getPhaseStyle(progress.phase);
  const timeEstimate = calculateTimeEstimate(progress);

  return (
    <div className={cn(cardEffects.primary, 'p-4 space-y-4')}>
      {/* 主进度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn('text-lg', phaseStyle.color)}>{phaseStyle.icon}</span>
            <span className="font-semibold">{phaseStyle.name}</span>
          </div>
          <span className="font-mono font-bold">{progress.overall.toFixed(1)}%</span>
        </div>
        
        <progress 
          className={cn('progress progress-lg w-full', getProgressColor(variant, progress.phase))}
          value={progress.overall} 
          max={100}
        />
        
        {progress.message && (
          <div className="text-sm text-base-content/80 mt-2">{progress.message}</div>
        )}
      </div>

      {/* 子进度 */}
      {(progress.fileProgress !== undefined || progress.importProgress !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progress.fileProgress !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📄 文件处理</span>
                <span className="font-mono">{progress.fileProgress.toFixed(0)}%</span>
              </div>
              <progress 
                className="progress progress-info w-full"
                value={progress.fileProgress} 
                max={100}
              />
            </div>
          )}
          
          {progress.importProgress !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📤 数据导入</span>
                <span className="font-mono">{progress.importProgress.toFixed(0)}%</span>
              </div>
              <progress 
                className="progress progress-success w-full"
                value={progress.importProgress} 
                max={100}
              />
            </div>
          )}
        </div>
      )}

      {/* 时间估算 */}
      {showTimeEstimate && timeEstimate && (
        <div className="flex justify-between items-center text-sm bg-base-200/50 rounded-lg p-3">
          <div>
            <span className="text-base-content/60">预计剩余时间：</span>
            <span className="font-medium ml-1">{formatTime(timeEstimate.timeLeft)}</span>
          </div>
          <div>
            <span className="text-base-content/60">处理速度：</span>
            <span className="font-medium ml-1">{timeEstimate.speed.toFixed(1)}%/秒</span>
          </div>
        </div>
      )}

      {/* 当前操作 */}
      {progress.currentOperation && (
        <div className="text-xs text-base-content/60 italic">
          当前操作: {progress.currentOperation}
        </div>
      )}
    </div>
  );
};

/**
 * 进度显示主组件
 */
export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  progress,
  style = 'linear',
  showDetails = true,
  showTimeEstimate = false,
  className,
  size = 'md',
  variant = 'primary'
}) => {
  // 如果没有活动进度，显示静态状态
  if (!progress.isActive && progress.overall === 0) {
    return null;
  }

  const commonProps = {
    progress,
    variant,
    size,
    showDetails
  };

  return (
    <div className={className}>
      {style === 'linear' && <LinearProgress {...commonProps} />}
      {style === 'circular' && <CircularProgress {...commonProps} />}
      {style === 'detailed' && (
        <DetailedProgress 
          progress={progress} 
          variant={variant} 
          showTimeEstimate={showTimeEstimate}
        />
      )}
      {style === 'minimal' && (
        <LinearProgress {...commonProps} showDetails={false} />
      )}
    </div>
  );
};

export default ProgressDisplay;