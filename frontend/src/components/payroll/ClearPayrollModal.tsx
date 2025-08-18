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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-base-100 rounded-xl shadow-2xl border border-base-300/60 overflow-hidden transform transition-all duration-300">
        {/* 紧凑头部 */}
        <div className="bg-gradient-to-r from-error/10 to-error/5 px-4 py-3 border-b border-base-300/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-error/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">确认清空薪资数据</h3>
              <p className="text-xs text-base-content/60">{month}</p>
            </div>
          </div>
        </div>

        {/* 紧凑内容区域 */}
        <div className="p-4 space-y-4">
          {/* 简化风险提示 */}
          <div className="alert alert-warning py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">此操作不可恢复，请谨慎确认！</span>
          </div>

          {/* 紧凑数据预览 */}
          {loading ? (
            <div className="text-center py-3">
              <span className="loading loading-spinner loading-xs"></span>
              <span className="text-xs text-base-content/70 ml-2">加载中...</span>
            </div>
          ) : dataPreview ? (
            <div className="bg-base-200/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">{month} 数据统计</h4>
              <div className="stats stats-horizontal w-full text-xs">
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">草稿</div>
                  <div className="stat-value text-sm text-warning">{dataPreview.draftCount}</div>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">已审批</div>
                  <div className="stat-value text-sm text-info">{dataPreview.approvedCount}</div>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">已支付</div>
                  <div className="stat-value text-sm text-success">{dataPreview.paidCount}</div>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">总计</div>
                  <div className="stat-value text-sm">{dataPreview.totalCount}</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 紧凑策略选择 */}
          <div>
            <h4 className="text-sm font-medium mb-2">清除策略</h4>
            <div className="form-control space-y-2">
              <label className="label cursor-pointer py-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clearStrategy" 
                    className="radio radio-sm radio-primary" 
                    checked={clearStrategy === 'draft_only'}
                    onChange={() => setClearStrategy('draft_only')}
                  />
                  <div>
                    <span className="text-sm">仅清除草稿状态</span>
                    <div className="badge badge-success badge-xs ml-2">推荐</div>
                  </div>
                </div>
              </label>
              <label className="label cursor-pointer py-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clearStrategy" 
                    className="radio radio-sm radio-error" 
                    checked={clearStrategy === 'all'}
                    onChange={() => setClearStrategy('all')}
                    disabled={!dataPreview || dataPreview.totalCount === 0}
                  />
                  <div className={(!dataPreview || dataPreview.totalCount === 0) ? 'opacity-50' : ''}>
                    <span className="text-sm text-error">清除所有记录</span>
                    <div className="badge badge-error badge-xs ml-2">危险</div>
                    {(!dataPreview || dataPreview.totalCount === 0) && (
                      <span className="text-xs text-base-content/50 block">（无数据）</span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 简化影响范围 */}
          <div className="bg-base-200/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-base-content/80 mb-2">即将清除的数据：</h4>
            <div className="text-xs space-y-1">
              {clearStrategy === 'draft_only' ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-warning"></div>
                    <span>草稿状态记录 ({dataPreview?.draftCount || 0} 条)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-base-content/40"></div>
                    <span className="text-base-content/70">相关薪资明细</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-error"></div>
                    <span className="text-error">所有薪资记录 ({dataPreview?.totalCount || 0} 条)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-base-content/40"></div>
                    <span className="text-base-content/70">薪资明细、基数、类别等数据</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 紧凑安全确认 */}
          <div>
            <label className="label">
              <span className="label-text text-sm">
                输入 <span className="font-bold text-error">"确认清空"</span> 继续
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError('');
                }}
                placeholder="确认清空"
                className={`input input-sm input-bordered w-full ${
                  error ? 'input-error' : 
                  confirmText === '确认清空' ? 'input-success' : ''
                }`}
                autoFocus
              />
              {confirmText === '确认清空' && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {error && (
              <div className="label">
                <span className="label-text-alt text-error text-xs">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* 紧凑页脚 */}
        <div className="border-t border-base-300/60 px-4 py-3">
          <div className="flex justify-end gap-2">
            <button 
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleCancel}
            >
              取消
            </button>
            <button 
              type="button"
              className="btn btn-sm btn-error"
              onClick={handleConfirm}
              disabled={!confirmText || confirmText !== '确认清空'}
            >
              确认清空
            </button>
          </div>
        </div>
      </div>
      
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={handleCancel}
        aria-label="关闭对话框"
      />
    </div>
  );
};