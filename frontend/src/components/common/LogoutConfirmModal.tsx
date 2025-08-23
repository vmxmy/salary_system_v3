import { useTranslation } from '@/hooks/useTranslation';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  isLoading = false 
}: LogoutConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div className="modal modal-open">
        <div className="modal-box max-w-md">
          {/* 标题 */}
          <h3 className="font-bold text-lg mb-4">
            {String(t('auth:logout.confirm.title', '确认退出'))}
          </h3>
          
          {/* 内容 */}
          <p className="text-base-content/70 mb-6">
            {String(t('auth:logout.confirm.message', '您确定要退出登录吗？'))}
          </p>
          
          {/* 操作按钮 */}
          <div className="modal-action">
            {/* 取消按钮 */}
            <button 
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              {String(t('common:cancel', '取消'))}
            </button>
            
            {/* 确认按钮 */}
            <button 
              type="button"
              className="btn btn-error"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {String(t('auth:logout.confirming', '退出中...'))}
                </>
              ) : (
                String(t('auth:logout.confirm.button', '确认退出'))
              )}
            </button>
          </div>
        </div>
        
        {/* 点击背景关闭（只在非加载状态下） */}
        {!isLoading && (
          <div className="modal-backdrop" onClick={onCancel} />
        )}
      </div>
    </>
  );
}