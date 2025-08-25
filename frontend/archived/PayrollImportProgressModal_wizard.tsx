import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@/components/common/Icons';
import type { ImportDataGroup } from '@/types/payroll-import';

// Import phase types based on the existing system
export type ImportPhase = 'idle' | 'parsing' | 'validating' | 'importing' | 'creating_payrolls' | 'inserting_items' | 'completed' | 'error';

// Progress data structure matching the existing hook
export interface ImportProgress {
  phase: ImportPhase;
  global: {
    totalGroups: number;
    processedGroups: number;
    totalRecords: number;
    processedRecords: number;
    dataGroups: string[];
  };
  current: {
    groupName: string;
    groupIndex: number;
    sheetName: string;
    totalRecords: number;
    processedRecords: number;
  };
}

// Import result structure
export interface ImportResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
  warnings: string[];
}

// Modal props
export interface PayrollImportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  selectedDataGroups: ImportDataGroup[];
  selectedMonth: string;
  progress: ImportProgress;
  result?: ImportResult;
  onRetry?: () => void;
  onCancel?: () => void;
  allowCancel: boolean;
}

// Step definition for the DaisyUI steps component
interface ImportStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  phase: ImportPhase[];
}

// Phase description mappings
const getPhaseDescription = (phase: ImportPhase): string => {
  const phaseMap: Record<ImportPhase, string> = {
    'idle': '准备中',
    'parsing': '解析文件',
    'validating': '验证数据',
    'importing': '导入数据',
    'creating_payrolls': '创建薪资记录',
    'inserting_items': '插入薪资项目',
    'completed': '完成',
    'error': '错误'
  };
  return phaseMap[phase] || '处理中';
};

// Get data group display name
const getDataGroupDisplayName = (group: ImportDataGroup): string => {
  const groupNameMap: Record<ImportDataGroup, string> = {
    [ImportDataGroup.EARNINGS]: '薪资项目明细',
    [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '员工身份类别',
    [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息'
  };
  return groupNameMap[group] || group;
};

export const PayrollImportProgressModal: React.FC<PayrollImportProgressModalProps> = ({
  isOpen,
  onClose,
  fileName = '',
  selectedDataGroups,
  selectedMonth,
  progress,
  result,
  onRetry,
  onCancel,
  allowCancel
}) => {
  // Calculate step statuses based on current progress
  const getStepStatus = (stepPhases: ImportPhase[]): 'pending' | 'active' | 'completed' | 'error' => {
    if (progress.phase === 'error' && stepPhases.includes(progress.phase)) return 'error';
    if (stepPhases.includes(progress.phase)) return 'active';
    
    // Check if this step is completed (current phase is beyond this step's phases)
    const phaseOrder: ImportPhase[] = ['idle', 'parsing', 'validating', 'importing', 'creating_payrolls', 'inserting_items', 'completed'];
    const currentPhaseIndex = phaseOrder.indexOf(progress.phase);
    const stepMaxPhaseIndex = Math.max(...stepPhases.map(p => phaseOrder.indexOf(p)));
    
    if (currentPhaseIndex > stepMaxPhaseIndex) return 'completed';
    return 'pending';
  };

  // Define import steps
  const importSteps: ImportStep[] = [
    {
      id: 'preparation',
      title: '文件解析',
      description: '解析Excel文件结构和数据',
      status: getStepStatus(['idle', 'parsing']),
      phase: ['idle', 'parsing']
    },
    {
      id: 'validation',
      title: '数据验证',
      description: '验证数据格式和完整性',
      status: getStepStatus(['validating']),
      phase: ['validating']
    },
    {
      id: 'import',
      title: '数据导入',
      description: '执行数据导入操作',
      status: getStepStatus(['importing', 'creating_payrolls', 'inserting_items']),
      phase: ['importing', 'creating_payrolls', 'inserting_items']
    },
    {
      id: 'completion',
      title: '完成',
      description: '导入操作完成',
      status: getStepStatus(['completed']),
      phase: ['completed']
    }
  ];

  const isCompleted = progress.phase === 'completed';
  const hasError = progress.phase === 'error' || (result && !result.success);
  const isInProgress = !isCompleted && !hasError && progress.phase !== 'idle';

  // Calculate overall progress percentage
  const getOverallProgress = (): number => {
    if (!progress.global.totalRecords) return 0;
    return Math.round((progress.global.processedRecords / progress.global.totalRecords) * 100);
  };

  // Calculate current group progress percentage
  const getCurrentGroupProgress = (): number => {
    if (!progress.current.totalRecords) return 0;
    return Math.round((progress.current.processedRecords / progress.current.totalRecords) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">薪资数据导入</h3>
          {allowCancel && !isCompleted && (
            <button 
              className="btn btn-sm btn-ghost btn-circle" 
              onClick={onCancel}
              disabled={!allowCancel}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Import Information Overview */}
        <div className="card bg-base-200 shadow-sm mb-6">
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm opacity-70">目标月份</div>
                <div className="font-medium">{selectedMonth}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">导入文件</div>
                <div className="font-medium truncate" title={fileName}>{fileName || '未选择文件'}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">数据类型</div>
                <div className="font-medium">
                  {selectedDataGroups.map(group => getDataGroupDisplayName(group)).join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Component */}
        <div className="mb-6">
          <ul className="steps steps-vertical lg:steps-horizontal w-full">
            {importSteps.map((step, index) => (
              <li 
                key={step.id}
                className={`step ${
                  step.status === 'completed' ? 'step-primary' :
                  step.status === 'active' ? 'step-secondary' :
                  step.status === 'error' ? 'step-error' : ''
                }`}
              >
                <div className="step-content text-left">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-xs opacity-70">{step.description}</div>
                  {step.status === 'active' && (
                    <div className="text-xs text-secondary font-medium mt-1">
                      {getPhaseDescription(progress.phase)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress Details - Only show during active import */}
        {isInProgress && (
          <div className="space-y-4 mb-6">
            {/* Global Progress Overview */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">导入进度总览</h4>
                  <div className="badge badge-info">
                    {getPhaseDescription(progress.phase)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="stat">
                    <div className="stat-title text-sm">数据组进度</div>
                    <div className="stat-value text-lg">
                      {progress.global.processedGroups} / {progress.global.totalGroups}
                    </div>
                    <div className="stat-desc text-xs">
                      {progress.global.dataGroups.join(', ')}
                    </div>
                  </div>
                  
                  <div className="stat">
                    <div className="stat-title text-sm">记录进度</div>
                    <div className="stat-value text-lg text-primary">
                      {progress.global.processedRecords} / {progress.global.totalRecords}
                    </div>
                    <div className="stat-desc text-xs">
                      {getOverallProgress()}% 完成
                    </div>
                  </div>
                </div>
                
                {/* Global Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>总体进度</span>
                    <span>{getOverallProgress()}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={getOverallProgress()} 
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Current Group Details */}
            {progress.current.groupName && (
              <div className="card bg-base-100 shadow-sm border border-primary/20">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-primary">
                      正在处理: {progress.current.groupName}
                    </h5>
                    <div className="badge badge-outline">
                      第 {progress.current.groupIndex + 1} 组
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm opacity-70">当前工作表</div>
                      <div className="font-medium">{progress.current.sheetName}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-70">处理进度</div>
                      <div className="font-medium">
                        {progress.current.processedRecords} / {progress.current.totalRecords}
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Group Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>当前组进度</span>
                      <span>{getCurrentGroupProgress()}%</span>
                    </div>
                    <progress 
                      className="progress progress-secondary w-full" 
                      value={getCurrentGroupProgress()} 
                      max="100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section - Show when completed or has errors */}
        {(result || hasError) && (
          <div className="card bg-base-100 shadow-sm mb-6">
            <div className="card-body p-4">
              <div className="flex items-center gap-3 mb-4">
                {hasError ? (
                  <ExclamationTriangleIcon className="w-6 h-6 text-error" />
                ) : (
                  <CheckCircleIcon className="w-6 h-6 text-success" />
                )}
                <h4 className="font-medium">
                  {hasError ? '导入遇到问题' : '导入完成'}
                </h4>
              </div>

              {result && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="stat">
                    <div className="stat-title text-sm">成功</div>
                    <div className="stat-value text-lg text-success">
                      {result.successCount}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-sm">失败</div>
                    <div className="stat-value text-lg text-error">
                      {result.failedCount}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-sm">跳过</div>
                    <div className="stat-value text-lg text-warning">
                      {result.skippedCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Show errors if any */}
              {result && result.errors.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">错误详情:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-error bg-error/10 p-2 rounded">
                        第{error.row}行: {error.message}
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-sm opacity-70">
                        ...还有 {result.errors.length - 5} 个错误
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-action">
          {hasError && onRetry && (
            <button className="btn btn-warning" onClick={onRetry}>
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              重试失败记录
            </button>
          )}
          
          <button 
            className={`btn ${isCompleted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={onClose}
          >
            {isCompleted ? '完成' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
};