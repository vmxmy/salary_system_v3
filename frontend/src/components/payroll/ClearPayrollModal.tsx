import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ClearPayrollModalProps {
  isOpen: boolean;
  month: string;
  periodId?: string;
  onConfirm: (clearStrategy?: 'all' | 'draft_only') => void;
  onCancel: () => void;
}

export const ClearPayrollModal: React.FC<ClearPayrollModalProps> = ({
  isOpen,
  month,
  periodId,
  onConfirm,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [clearStrategy, setClearStrategy] = useState<'all' | 'draft_only'>('draft_only');
  const [dataPreview, setDataPreview] = useState<{
    draftCount: number;
    approvedCount: number;
    paidCount: number;
    totalCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取数据预览
  useEffect(() => {
    if (isOpen && periodId) {
      setLoading(true);
      const fetchDataPreview = async () => {
        try {
          const { data, error } = await supabase
            .from('payrolls')
            .select('status')
            .eq('period_id', periodId);

          if (!error && data) {
            const preview = {
              draftCount: data.filter(p => p.status === 'draft').length,
              approvedCount: data.filter(p => p.status === 'approved').length,
              paidCount: data.filter(p => p.status === 'paid').length,
              totalCount: data.length
            };
            setDataPreview(preview);
          }
        } catch (err) {
          console.error('Failed to fetch data preview:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchDataPreview();
    }
  }, [isOpen, periodId]);

  const handleConfirm = useCallback(() => {
    if (confirmText !== '确认清空') {
      setError('请输入正确的确认文字');
      return;
    }
    setConfirmText('');
    setError('');
    setClearStrategy('draft_only');
    onConfirm(clearStrategy);
  }, [confirmText, clearStrategy, onConfirm]);

  const handleCancel = useCallback(() => {
    setConfirmText('');
    setError('');
    setClearStrategy('draft_only');
    setDataPreview(null);
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

          {/* 数据预览 */}
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2 text-sm">加载数据预览...</span>
            </div>
          ) : dataPreview ? (
            <div className="bg-base-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold">{month} 数据统计：</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>草稿状态：</span>
                  <span className="font-semibold text-warning">{dataPreview.draftCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>已审批：</span>
                  <span className="font-semibold text-info">{dataPreview.approvedCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>已支付：</span>
                  <span className="font-semibold text-success">{dataPreview.paidCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>总计：</span>
                  <span className="font-semibold">{dataPreview.totalCount} 条</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* 清除策略选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">清除策略</span>
            </label>
            <div className="space-y-2">
              <label className="label cursor-pointer">
                <span className="label-text text-xs">仅清除草稿状态的薪资记录（推荐）</span>
                <input 
                  type="radio" 
                  name="clearStrategy" 
                  className="radio radio-sm radio-primary" 
                  checked={clearStrategy === 'draft_only'}
                  onChange={() => setClearStrategy('draft_only')}
                />
              </label>
              <label className="label cursor-pointer">
                <span className="label-text text-xs text-error">
                  清除所有薪资记录（包括已审批和已支付）
                  {(!dataPreview || dataPreview.totalCount === 0) && (
                    <span className="text-base-content/50">（无数据）</span>
                  )}
                </span>
                <input 
                  type="radio" 
                  name="clearStrategy" 
                  className="radio radio-sm radio-error" 
                  checked={clearStrategy === 'all'}
                  onChange={() => setClearStrategy('all')}
                  disabled={!dataPreview || dataPreview.totalCount === 0}
                />
              </label>
            </div>
          </div>

          <div className="text-sm space-y-2">
            <p>即将清除的数据：</p>
            <ul className="list-disc list-inside ml-2 text-xs space-y-1">
              {clearStrategy === 'draft_only' ? (
                <>
                  <li className="text-warning">草稿状态的薪资记录（{dataPreview?.draftCount || 0} 条）</li>
                  <li>相关的薪资项目明细</li>
                </>
              ) : (
                <>
                  <li className="text-error">所有薪资记录（{dataPreview?.totalCount || 0} 条）</li>
                  <li>所有薪资项目明细</li>
                  <li>相关的缴费基数、人员类别、职务信息</li>
                </>
              )}
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