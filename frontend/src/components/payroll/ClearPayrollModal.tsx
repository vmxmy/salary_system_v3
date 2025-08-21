import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClearProgressModal } from './ClearProgressModal';

interface ClearPayrollModalProps {
  isOpen: boolean;
  month: string;
  periodId?: string;
  onConfirm: (onProgress?: (step: string, completed: number, total: number) => void) => void;
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
  const [dataPreview, setDataPreview] = useState<{
    totalCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 进度状态
  const [showProgress, setShowProgress] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progressCompleted, setProgressCompleted] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

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

  // 进度回调函数
  const handleProgress = useCallback((step: string, completed: number, total: number) => {
    setCurrentStep(step);
    setProgressCompleted(completed);
    setProgressTotal(total);
    
    // 如果完成了，延迟2秒后关闭进度模态框
    if (completed >= total) {
      setTimeout(() => {
        setShowProgress(false);
        onCancel(); // 关闭原始模态框
      }, 2000);
    }
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    if (confirmText !== '确认清空') {
      setError('请输入正确的确认文字');
      return;
    }
    
    // 显示进度模态框
    setShowProgress(true);
    setCurrentStep('准备开始清理...');
    setProgressCompleted(0);
    setProgressTotal(6);
    
    // 重置状态并调用清除函数
    setConfirmText('');
    setError('');
    onConfirm(handleProgress);
  }, [confirmText, onConfirm, handleProgress]);

  const handleCancel = useCallback(() => {
    setConfirmText('');
    setError('');
    setDataPreview(null);
    setShowProgress(false);
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <>
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
              <div className="flex items-center justify-center">
                <div className="stat py-2 px-3 text-center">
                  <div className="stat-title text-xs">薪资记录</div>
                  <div className="stat-value text-lg text-error">{dataPreview.totalCount}</div>
                  <div className="stat-desc text-xs">条记录将被清除</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 清除说明 */}
          <div className="bg-error/10 rounded-lg p-3 border border-error/20">
            <h4 className="text-sm font-medium text-error mb-2">清除范围</h4>
            <div className="text-xs text-base-content/80 space-y-1">
              <p>✓ 所有薪资记录和明细项</p>
              <p>✓ 员工缴费基数信息</p>
              <p>✓ 员工身份类别分配</p>
              <p>✓ 员工职务信息</p>
              <p>✓ 特殊扣除信息</p>
              <p>✓ 审批记录</p>
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
    
    {/* 进度模态框 */}
    <ClearProgressModal
      isOpen={showProgress}
      currentStep={currentStep}
      progress={progressCompleted}
      total={progressTotal}
      onCancel={() => {
        setShowProgress(false);
        onCancel();
      }}
    />
  </>
  );
};