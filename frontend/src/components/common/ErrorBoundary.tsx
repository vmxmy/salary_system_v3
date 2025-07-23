import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件
 * 捕获子组件中的JavaScript错误，记录错误并显示友好的备用UI
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 可以将错误日志上报给服务器
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      // 自定义降级后的 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <div className="alert alert-error">
          <div className="flex flex-col">
            <h3 className="font-bold">出现了一个错误</h3>
            <div className="text-sm">
              {this.state.error?.message || '未知错误'}
            </div>
            <div className="mt-2">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
              >
                重试
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 简化的错误边界Hook (仅用于功能组件的错误显示)
 * 注意：这不是真正的错误边界，只是一个错误显示组件
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  className = '' 
}: { 
  error: Error | null; 
  onRetry?: () => void;
  className?: string;
}) {
  if (!error) return null;

  return (
    <div className={`alert alert-error ${className}`}>
      <div className="flex flex-col">
        <h3 className="font-bold">加载失败</h3>
        <div className="text-sm">{error.message}</div>
        {onRetry && (
          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={onRetry}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;