import React, { useState, useCallback } from 'react';

interface ClearPayrollModalProps {
  isOpen: boolean;
  month: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearPayrollModal: React.FC<ClearPayrollModalProps> = ({
  isOpen,
  month,
  onConfirm,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = useCallback(() => {
    if (confirmText !== '确认清空') {
      setError('请输入正确的确认文字');
      return;
    }
    setConfirmText('');
    setError('');
    onConfirm();
  }, [confirmText, onConfirm]);

  const handleCancel = useCallback(() => {
    setConfirmText('');
    setError('');
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">确认清空薪资数据</h3>
        
        <div className="space-y-4">
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">
              此操作不可恢复！
            </span>
          </div>

          <div className="text-sm space-y-2">
            <p>您即将清空 <span className="font-semibold text-error">{month}</span> 的所有薪资数据。</p>
            <p>此操作将删除：</p>
            <ul className="list-disc list-inside ml-2 text-xs space-y-1">
              <li>该月份的所有薪资记录</li>
              <li>相关的薪资项目明细</li>
              <li>所有关联的计算数据</li>
            </ul>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">
                请输入 <span className="font-semibold text-error">确认清空</span> 以继续：
              </span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError('');
              }}
              placeholder="确认清空"
              className={`input input-bordered ${error ? 'input-error' : ''}`}
              autoFocus
            />
            {error && (
              <label className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            )}
          </div>
        </div>

        <div className="modal-action">
          <button 
            className="btn btn-ghost"
            onClick={handleCancel}
          >
            取消
          </button>
          <button 
            className="btn btn-error"
            onClick={handleConfirm}
            disabled={!confirmText}
          >
            确认清空
          </button>
        </div>
      </div>
      
      <form method="dialog" className="modal-backdrop" onClick={handleCancel}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
};