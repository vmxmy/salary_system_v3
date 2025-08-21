import React from 'react';

interface ClearProgressModalProps {
  isOpen: boolean;
  currentStep: string;
  progress: number;
  total: number;
  onCancel?: () => void;
}

export const ClearProgressModal: React.FC<ClearProgressModalProps> = ({
  isOpen,
  currentStep,
  progress,
  total,
  onCancel,
}) => {
  if (!isOpen) return null;

  const progressPercentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isCompleted = progress >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-base-100 rounded-xl shadow-2xl border border-base-300/60 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-base-300/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              {isCompleted ? (
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="loading loading-spinner loading-sm text-primary"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">
                {isCompleted ? '清理完成' : '正在清理薪资数据'}
              </h3>
              <p className="text-xs text-base-content/60">
                请稍候，正在处理中...
              </p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 当前步骤 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/80">当前步骤</span>
              <span className="text-primary font-medium">{progress}/{total}</span>
            </div>
            <div className="text-base font-medium text-base-content">
              {currentStep}
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/80">整体进度</span>
              <span className="text-primary font-medium">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* 步骤说明 */}
          <div className="bg-base-200/50 rounded-lg p-3">
            <h4 className="text-xs font-medium text-base-content/80 mb-2">清理步骤：</h4>
            <div className="text-xs space-y-1 text-base-content/70">
              <div className={`flex items-center gap-2 ${progress >= 1 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 1 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>查询薪资记录</span>
                {progress >= 1 && <span className="text-xs">✓</span>}
              </div>
              <div className={`flex items-center gap-2 ${progress >= 2 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 2 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>删除审批记录</span>
                {progress >= 2 && <span className="text-xs">✓</span>}
              </div>
              <div className={`flex items-center gap-2 ${progress >= 3 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 3 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>删除薪资明细</span>
                {progress >= 3 && <span className="text-xs">✓</span>}
              </div>
              <div className={`flex items-center gap-2 ${progress >= 4 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 4 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>删除薪资记录</span>
                {progress >= 4 && <span className="text-xs">✓</span>}
              </div>
              <div className={`flex items-center gap-2 ${progress >= 5 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 5 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>清理员工数据（并行）</span>
                {progress >= 5 && <span className="text-xs">✓</span>}
              </div>
              <div className={`flex items-center gap-2 ${progress >= 6 ? 'text-success' : 'text-base-content/50'}`}>
                <div className={`w-1 h-1 rounded-full ${progress >= 6 ? 'bg-success' : 'bg-base-content/30'}`}></div>
                <span>清理完成</span>
                {progress >= 6 && <span className="text-xs">✓</span>}
              </div>
            </div>
          </div>

          {/* 完成状态 */}
          {isCompleted && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-success font-medium">
                  清理操作已完成！
                </span>
              </div>
              <p className="text-xs text-success/80 mt-1">
                所有薪资数据已成功清除，页面将自动刷新。
              </p>
            </div>
          )}

          {/* 警告提示 */}
          {!isCompleted && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-xs text-warning">
                  请勿关闭页面或刷新浏览器！
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 页脚 */}
        {isCompleted && onCancel && (
          <div className="border-t border-base-300/60 px-6 py-4">
            <div className="flex justify-end">
              <button 
                type="button"
                className="btn btn-sm btn-primary"
                onClick={onCancel}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 背景遮罩 - 阻止用户点击 */}
      <div 
        className="absolute inset-0 -z-10" 
        aria-label="正在处理中，请稍候"
      />
    </div>
  );
};