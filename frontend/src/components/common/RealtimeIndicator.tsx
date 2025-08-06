import { useRealtimeIndicator } from '@/hooks/useRealtimeConnection';
import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Supabase Realtime 连接状态指示器组件
 * 显示实时连接的状态，支持重连操作
 */
export function RealtimeIndicator({ 
  className,
  showText = true,
  size = 'sm'
}: RealtimeIndicatorProps) {
  const { connectionStatus: _connectionStatus, isConnected, reconnect, indicator } = useRealtimeIndicator();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          dot: 'w-2 h-2',
          text: 'text-xs',
        };
      case 'md':
        return {
          container: 'px-3 py-1.5 text-sm',
          dot: 'w-3 h-3',
          text: 'text-sm',
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          dot: 'w-4 h-4',
          text: 'text-base',
        };
      default:
        return {
          container: 'px-2 py-1 text-xs',
          dot: 'w-2 h-2',
          text: 'text-xs',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const getStatusColor = () => {
    switch (indicator.color) {
      case 'success':
        return 'bg-success text-success-content';
      case 'warning':
        return 'bg-warning text-warning-content';
      case 'error':
        return 'bg-error text-error-content';
      default:
        return 'bg-base-300 text-base-content';
    }
  };

  const handleClick = () => {
    if (!isConnected) {
      reconnect();
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full',
        'border border-base-200/50 bg-base-100/80 backdrop-blur-sm',
        'transition-all duration-200',
        sizeClasses.container,
        !isConnected && 'cursor-pointer hover:bg-base-200/50',
        className
      )}
      onClick={handleClick}
      title={`Realtime状态: ${indicator.text}${!isConnected ? ' (点击重连)' : ''}`}
    >
      {/* 状态指示点 */}
      <div className="relative">
        <div
          className={cn(
            'rounded-full',
            sizeClasses.dot,
            getStatusColor(),
            indicator.pulse && 'animate-pulse'
          )}
        />
        {/* 连接成功时的光环效果 */}
        {isConnected && (
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-success/20',
              'animate-ping',
              sizeClasses.dot
            )}
          />
        )}
      </div>

      {/* 状态文本 */}
      {showText && (
        <span className={cn(
          'font-medium text-base-content/80',
          sizeClasses.text
        )}>
          {indicator.text}
        </span>
      )}

      {/* 重连按钮（仅在断开连接时显示） */}
      {!isConnected && (
        <button
          type="button"
          className={cn(
            'btn btn-ghost btn-xs ml-1',
            'text-base-content/60 hover:text-base-content'
          )}
          onClick={(e) => {
            e.stopPropagation();
            reconnect();
          }}
        >
          重连
        </button>
      )}
    </div>
  );
}

/**
 * 简化版本的实时连接指示器
 * 仅显示状态点，适用于工具栏等空间有限的场景
 */
export function RealtimeStatusDot({ className }: { className?: string }) {
  return (
    <RealtimeIndicator
      className={className}
      showText={false}
      size="sm"
    />
  );
}