import React, { useCallback } from 'react';

interface PayrollCreationSuccessModalProps {
  isOpen: boolean;
  periodId?: string;
  onClose: () => void;
  onViewPayrolls: () => void;
}

export const PayrollCreationSuccessModal: React.FC<PayrollCreationSuccessModalProps> = ({
  isOpen,
  periodId,
  onClose,
  onViewPayrolls,
}) => {
  const handleViewPayrolls = useCallback(() => {
    onClose();
    onViewPayrolls();
  }, [onClose, onViewPayrolls]);

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="text-center space-y-6">
          {/* 成功图标 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-success" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>

          {/* 标题和消息 */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-base-content">
              薪资周期创建成功！
            </h3>
            <p className="text-base-content/70">
              您的薪资周期已成功创建并保存
            </p>
            {periodId && (
              <div className="text-sm text-base-content/60">
                周期ID: <span className="font-mono font-medium">{periodId}</span>
              </div>
            )}
          </div>

          {/* 操作说明 */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg 
                className="w-5 h-5 text-success mt-0.5 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div className="text-sm text-base-content/80">
                <p className="font-medium mb-1">接下来您可以：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>查看和管理薪资数据</li>
                  <li>继续添加员工薪资信息</li>
                  <li>进行薪资计算和发放</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3">
            <button 
              className="btn btn-ghost flex-1"
              onClick={onClose}
            >
              关闭
            </button>
            <button 
              className="btn btn-primary flex-1"
              onClick={handleViewPayrolls}
            >
              查看薪资列表
            </button>
          </div>
        </div>
      </div>
      
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
};