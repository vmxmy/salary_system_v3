/**
 * 增强的导入进度组件
 * 展示批处理进度、性能指标和取消操作
 */

import React from 'react';
import type { EnhancedImportProgress } from '@/utils/import/ProgressManager';

interface EnhancedImportProgressProps {
  progress: EnhancedImportProgress;
  onCancel?: () => void;
  className?: string;
}

export const EnhancedImportProgressComponent: React.FC<EnhancedImportProgressProps> = ({
  progress,
  onCancel,
  className = ''
}) => {
  const {
    phase,
    global,
    current,
    enhanced,
    message
  } = progress;

  const {
    weightedProgress,
    batchProcessor,
    canCancel,
    isCancelling,
    performance
  } = enhanced;

  // 格式化时间
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;
  };

  // 格式化速度
  const formatSpeed = (speed?: number) => {
    if (!speed) return '--';
    return `${Math.round(speed)} 条/秒`;
  };

  // 格式化内存
  const formatMemory = (mb?: number) => {
    if (!mb) return '--';
    return `${Math.round(mb)} MB`;
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        {/* 标题和状态 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-lg">
            {weightedProgress.currentPhase}
          </h3>
          <div className="flex items-center gap-2">
            {isCancelling && (
              <span className="loading loading-spinner loading-sm"></span>
            )}
            <div className="badge badge-primary">
              {Math.round(weightedProgress.totalProgress)}%
            </div>
          </div>
        </div>

        {/* 主进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>总体进度</span>
            <span>{Math.round(weightedProgress.totalProgress)}%</span>
          </div>
          <progress 
            className="progress progress-primary w-full" 
            value={weightedProgress.totalProgress} 
            max="100"
          ></progress>
        </div>

        {/* 当前阶段进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>当前阶段</span>
            <span>{Math.round(weightedProgress.currentPhaseProgress)}%</span>
          </div>
          <progress 
            className="progress progress-secondary w-full" 
            value={weightedProgress.currentPhaseProgress} 
            max="100"
          ></progress>
        </div>

        {/* 进度信息 */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <div className="stat-title">已处理组</div>
            <div className="stat-value text-base">
              {global.processedGroups} / {global.totalGroups}
            </div>
          </div>
          <div>
            <div className="stat-title">已处理记录</div>
            <div className="stat-value text-base">
              {global.processedRecords} / {global.totalRecords}
            </div>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="divider">性能指标</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="stat-title">处理速度</div>
            <div className="stat-value text-base">
              {formatSpeed(batchProcessor.processingSpeed)}
            </div>
          </div>
          <div>
            <div className="stat-title">批次大小</div>
            <div className="stat-value text-base">
              {batchProcessor.currentBatchSize}
            </div>
          </div>
          <div>
            <div className="stat-title">剩余时间</div>
            <div className="stat-value text-base">
              {formatDuration(performance.estimatedTimeRemaining)}
            </div>
          </div>
          <div>
            <div className="stat-title">内存使用</div>
            <div className="stat-value text-base">
              {formatMemory(performance.memoryUsage)}
            </div>
          </div>
        </div>

        {/* 当前处理信息 */}
        {current.groupName && (
          <div className="mt-4">
            <div className="text-sm opacity-70">
              正在处理: {current.groupName} ({current.processedRecords}/{current.totalRecords})
            </div>
            {message && (
              <div className="text-xs opacity-60 mt-1">{message}</div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="card-actions justify-end mt-4">
          {canCancel && onCancel && (
            <button 
              className={`btn btn-outline btn-error btn-sm ${isCancelling ? 'loading' : ''}`}
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? '正在取消...' : '取消导入'}
            </button>
          )}
        </div>

        {/* 错误和警告 */}
        {(progress.errors.length > 0 || progress.warnings.length > 0) && (
          <div className="mt-4">
            {progress.errors.length > 0 && (
              <div className="alert alert-error mb-2">
                <span className="text-sm">发现 {progress.errors.length} 个错误</span>
              </div>
            )}
            {progress.warnings.length > 0 && (
              <div className="alert alert-warning">
                <span className="text-sm">发现 {progress.warnings.length} 个警告</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};