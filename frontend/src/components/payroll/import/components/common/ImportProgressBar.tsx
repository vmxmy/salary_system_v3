/**
 * 通用薪资导入进度条组件
 * 适用于所有数据组的导入操作，提供详细的阶段性进度反馈
 */

import React from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportProgress } from '@/hooks/payroll/import-export/types';
import { cn } from '@/lib/utils';

export interface ImportProgressBarProps {
  /** 当前导入进度数据 */
  progress: ImportProgress | null;
  
  /** 是否正在导入 */
  isImporting: boolean;
  
  /** 数据组类型 */
  dataGroup?: ImportDataGroup;
  
  /** 自定义样式类名 */
  className?: string;
  
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

/**
 * 数据组显示名称映射
 */
const DATA_GROUP_NAMES: Record<ImportDataGroup, string> = {
  earnings: '薪资项目',
  bases: '缴费基数',
  category: '人员类别',
  job: '职务信息',
  all: '全部数据'
};

/**
 * 导入阶段显示名称映射
 */
const PHASE_NAMES: Record<string, string> = {
  parsing: '解析文件',
  validating: '数据验证',
  importing: '导入数据',
  creating_payrolls: '创建薪资记录',
  inserting_items: '插入薪资项目',
  completed: '导入完成',
  error: '导入失败',
  // 兼容性字段
  processing: '处理数据',
  mapping: '字段映射',
  cleanup: '清理数据',
  failed: '导入失败'
};

/**
 * 获取进度百分比
 */
const getProgressPercentage = (progress: ImportProgress): number => {
  if (!progress.current?.totalRecords || progress.current.totalRecords === 0) {
    return 0;
  }
  
  const processed = progress.current.processedRecords || 0;
  const total = progress.current.totalRecords;
  
  return Math.min(Math.round((processed / total) * 100), 100);
};

/**
 * 获取阶段进度颜色 - 基于DaisyUI 5官方文档
 */
const getPhaseColor = (phase: string, isCompleted: boolean): string => {
  if (isCompleted) return 'progress-success';
  
  switch (phase) {
    case 'parsing':
      return 'progress-info';
    case 'validating':
      return 'progress-accent';
    case 'importing':
    case 'creating_payrolls':
    case 'inserting_items':
    case 'processing':
      return 'progress-primary';
    case 'error':
    case 'failed':
      return 'progress-error';
    // 兼容性支持
    case 'mapping':
      return 'progress-warning';
    case 'cleanup':
      return 'progress-secondary';
    default:
      return 'progress-primary';
  }
};

/**
 * 通用导入进度条组件
 */
export const ImportProgressBar: React.FC<ImportProgressBarProps> = ({
  progress,
  isImporting,
  dataGroup,
  className,
  showDetails = true
}) => {
  
  // 如果没有进度数据且不在导入状态，不显示组件
  if (!progress && !isImporting) {
    return null;
  }
  
  const percentage = progress ? getProgressPercentage(progress) : 0;
  const currentPhase = progress?.phase || 'parsing';
  const isCompleted = !isImporting && percentage === 100;
  const isFailed = currentPhase === 'error';
  
  const progressColor = getPhaseColor(currentPhase, isCompleted);
  
  return (
    <div className={cn('space-y-4 p-4 bg-base-100 rounded-lg border', className)}>
      {/* 标题和状态 */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium flex items-center gap-2">
          {isImporting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : isCompleted ? (
            <span className="text-success">✅</span>
          ) : isFailed ? (
            <span className="text-error">❌</span>
          ) : (
            <span className="text-info">⏳</span>
          )}
          {dataGroup && DATA_GROUP_NAMES[dataGroup]} 导入进度
        </h4>
        
        <div className="text-sm text-base-content/70">
          {percentage}% 完成
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-base-content/80">
            {PHASE_NAMES[currentPhase] || currentPhase}
          </span>
          
          {progress?.current && (
            <span className="text-base-content/60">
              {progress.current.processedRecords || 0} / {progress.current.totalRecords || 0}
            </span>
          )}
        </div>
        
        <progress 
          className={cn('progress w-full', progressColor)} 
          value={percentage} 
          max={100}
        ></progress>
      </div>

      {/* 当前处理消息 */}
      {progress?.message && (
        <div className="bg-base-200/50 p-3 rounded text-sm">
          <div className="flex items-start gap-2">
            <span className="text-primary">🔄</span>
            <span className="text-base-content/80">{progress.message}</span>
          </div>
        </div>
      )}

      {/* 详细信息 */}
      {showDetails && progress?.current && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {progress.current.groupName && (
            <div className="space-y-1">
              <div className="text-base-content/60">数据组</div>
              <div className="font-medium">{progress.current.groupName}</div>
            </div>
          )}
          
          {progress.current.sheetName && (
            <div className="space-y-1">
              <div className="text-base-content/60">工作表</div>
              <div className="font-medium">{progress.current.sheetName}</div>
            </div>
          )}
          
          {typeof progress.current.successCount === 'number' && (
            <div className="space-y-1">
              <div className="text-base-content/60">成功</div>
              <div className="font-medium text-success">{progress.current.successCount}</div>
            </div>
          )}
          
          {typeof progress.current.errorCount === 'number' && (
            <div className="space-y-1">
              <div className="text-base-content/60">错误</div>
              <div className="font-medium text-error">{progress.current.errorCount}</div>
            </div>
          )}
        </div>
      )}

      {/* 字段映射分析结果 */}
      {showDetails && progress?.current?.fieldMappingAnalysis && (
        <div className="bg-info/10 p-3 rounded-lg">
          <h5 className="font-medium text-info mb-2">📋 字段映射分析</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-base-content/60">映射字段: </span>
              <span className="font-medium">
                {progress.current.fieldMappingAnalysis.mappedColumns}/{progress.current.fieldMappingAnalysis.totalColumns}
              </span>
            </div>
            <div>
              <span className="text-base-content/60">必填字段: </span>
              <span className="font-medium">
                {progress.current.fieldMappingAnalysis.requiredFieldsMatched}/{progress.current.fieldMappingAnalysis.requiredFieldsTotal}
              </span>
            </div>
          </div>
          
          {/* 警告信息 */}
          {progress.current.fieldMappingAnalysis.warnings?.length > 0 && (
            <div className="mt-2">
              <div className="text-warning text-xs font-medium mb-1">⚠️ 警告:</div>
              {progress.current.fieldMappingAnalysis.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-warning/80">• {warning}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 全局进度（多工作表导入时） */}
      {progress?.global && progress.global.totalGroups > 1 && (
        <div className="border-t pt-3">
          <div className="text-sm text-base-content/70 mb-2">
            全局进度: {progress.global.processedGroups}/{progress.global.totalGroups} 工作表
          </div>
          <progress 
            className="progress progress-accent w-full" 
            value={progress.global.processedGroups} 
            max={progress.global.totalGroups}
          ></progress>
        </div>
      )}
    </div>
  );
};

export default ImportProgressBar;