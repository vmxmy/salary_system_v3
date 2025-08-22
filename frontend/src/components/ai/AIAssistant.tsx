import React, { useState, useCallback, memo, useMemo } from 'react';
import { 
  ThreadPrimitive, 
  MessagePrimitive, 
  ComposerPrimitive,
  useThreadViewport,
  useThreadRuntime,
  useThread
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import { useAuth } from '../../hooks/useAuth';
import { XMarkIcon, PaperAirplaneIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { SimplePersistentAIRuntimeProvider } from '../../lib/simplePersistentAIRuntime.tsx';

interface AIAssistantProps {
  className?: string;
}

// 性能优化的 Markdown 组件，使用 memo 防止不必要的重渲染
const MarkdownText: React.FC = memo(() => {
  return (
    <MarkdownTextPrimitive 
      className="prose prose-sm max-w-none text-base-content leading-relaxed"
      components={{
        h1: ({ children }) => <h1 className="text-2xl font-bold text-base-content mb-4 mt-6 border-b border-base-300 pb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold text-base-content mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold text-base-content mb-2 mt-4">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold text-base-content mb-2 mt-3">{children}</h4>,
        p: ({ children }) => <p className="text-base-content mb-3 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-base-content">{children}</strong>,
        em: ({ children }) => <em className="italic text-base-content">{children}</em>,
        code: ({ children }) => <code className="bg-base-200 text-accent px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
        pre: ({ children }) => (
          <pre className="bg-base-200 text-base-content p-4 rounded-lg overflow-x-auto my-4 border border-base-300">
            {children}
          </pre>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside text-base-content mb-3 space-y-1 ml-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-base-content mb-3 space-y-1 ml-2">{children}</ol>,
        li: ({ children }) => <li className="text-base-content">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic text-base-content/80 my-4 bg-base-200/50 py-2 rounded-r">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="table table-xs bg-base-100 border border-base-300 rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-base-200">{children}</thead>,
        th: ({ children }) => <th className="border border-base-300 text-base-content font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-base-300 text-base-content">{children}</td>,
        a: ({ href, children }) => (
          <a 
            href={href} 
            className="link link-primary hover:link-hover" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-base-300 my-6" />,
      }}
    />
  );
});

MarkdownText.displayName = 'MarkdownText';

// AI 消息组件，使用性能优化和条件渲染
const AIMessage: React.FC = memo(() => {
  return (
    <MessagePrimitive.Root className="mb-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-4 h-4 text-primary-content" />
        </div>
        
        {/* Message Content with Markdown */}
        <div className="flex-1 min-w-0">
          <MessagePrimitive.Parts components={{
            Text: MarkdownText
          }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
});

AIMessage.displayName = 'AIMessage';

// 用户消息组件
const UserMessage: React.FC = memo(() => {
  return (
    <MessagePrimitive.Root className="mb-4">
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="w-8 h-8 bg-base-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-base-content">U</span>
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <MessagePrimitive.Parts components={{
            Text: ({ text }) => (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-base-content leading-relaxed">{text}</p>
              </div>
            )
          }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
});

UserMessage.displayName = 'UserMessage';

// 高级滚动到底部组件，使用 viewport 状态管理
const SmartScrollToBottom: React.FC = memo(() => {
  const isAtBottom = useThreadViewport((state) => state.isAtBottom);
  
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button
        className={`btn btn-sm btn-circle btn-ghost transition-all duration-200 ${
          isAtBottom ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100'
        }`}
        aria-label="滚动到底部"
      >
        <ArrowDownIcon className="w-4 h-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
});

SmartScrollToBottom.displayName = 'SmartScrollToBottom';

// 智能建议组件
const SmartSuggestions: React.FC = memo(() => {
  const suggestions = useMemo(() => [
    { prompt: "请帮我查询员工信息", label: "查询员工信息" },
    { prompt: "我想查看薪资统计分析", label: "薪资统计分析" },
    { prompt: "如何使用这个系统？", label: "系统使用帮助" },
    { prompt: "请生成最新的薪资报表", label: "生成薪资报表" }
  ], []);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((suggestion) => (
        <ThreadPrimitive.Suggestion 
          key={suggestion.prompt}
          prompt={suggestion.prompt} 
          method="replace"
          className="btn btn-sm btn-outline hover:btn-primary transition-colors"
        >
          {suggestion.label}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
});

SmartSuggestions.displayName = 'SmartSuggestions';

// 高级欢迎组件，带条件渲染和智能建议
const EnhancedWelcome: React.FC = memo(() => {
  return (
    <ThreadPrimitive.Empty>
      <div className="text-center text-base-content/70 py-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <SparklesIcon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">👋 您好！我是薪资管理系统的AI助手</h3>
        <p className="text-sm mb-4">我可以帮助您：</p>
        <ul className="text-sm space-y-1 mb-6">
          <li>• 查询员工信息和薪资数据</li>
          <li>• 生成统计报表和分析</li>
          <li>• 解答系统使用问题</li>
          <li>• 提供数据洞察和建议</li>
        </ul>
        <SmartSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
});

EnhancedWelcome.displayName = 'EnhancedWelcome';

// 高级作曲器组件，带状态管理
const EnhancedComposer: React.FC = memo(() => {
  const threadRuntime = useThreadRuntime();
  const isRunning = useThread((state) => state.isRunning);

  const handleCancel = useCallback(() => {
    if (isRunning) {
      threadRuntime.cancelRun();
    }
  }, [isRunning, threadRuntime]);

  return (
    <div className="flex-shrink-0 border-t border-base-200 p-4 bg-base-100">
      <ComposerPrimitive.Root className="flex gap-3 items-end">
        <div className="flex-1">
          <ComposerPrimitive.Input 
            className="textarea textarea-bordered w-full resize-none bg-base-100 text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-10 min-h-10 max-h-32 leading-tight py-2"
            placeholder="输入您的问题..."
            autoFocus
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </div>
        
        {/* 动态发送/取消按钮 */}
        {isRunning ? (
          <button
            onClick={handleCancel}
            className="btn btn-error btn-square h-10 w-10 min-h-10"
            title="取消生成"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        ) : (
          <ComposerPrimitive.Send className="btn btn-primary btn-square h-10 w-10 min-h-10">
            <PaperAirplaneIcon className="w-5 h-5" />
          </ComposerPrimitive.Send>
        )}
      </ComposerPrimitive.Root>
    </div>
  );
});

EnhancedComposer.displayName = 'EnhancedComposer';

// 高级聊天模态框组件
export const AIChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = memo(({ isOpen, onClose }) => {
  const { user } = useAuth();

  // 🔧 关键修复：使用样式控制显示，避免mount/unmount
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen && user ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden transform transition-transform duration-200 scale-95 hover:scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-primary-content" />
            </div>
            <div>
              <h3 className="font-semibold text-base-content">AI助手</h3>
              <p className="text-sm text-base-content/70">薪资管理系统智能助手</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="关闭"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 🔧 关键修复：ThreadPrimitive直接渲染，Provider已移到外部 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ThreadPrimitive.Root 
            className="h-full flex flex-col"
            style={{
              ['--thread-max-width' as string]: '100%',
            }}
          >
            {/* 高级视口，带自动滚动和性能优化 */}
            <ThreadPrimitive.Viewport 
              className="flex-1 p-4 overflow-y-auto min-h-0"
              autoScroll={true}
            >
              {/* 增强的欢迎消息 */}
              <EnhancedWelcome />
              
              {/* 消息区域 */}
              <ThreadPrimitive.Messages components={{
                UserMessage: UserMessage,
                AssistantMessage: AIMessage,
                Message: AIMessage
              }} />
              
              {/* 条件渲染的间隔 */}
              <ThreadPrimitive.If empty={false}>
                <div className="h-4" />
              </ThreadPrimitive.If>
              
              {/* 智能滚动到底部按钮 */}
              <div className="sticky bottom-0 flex justify-center pb-2">
                <SmartScrollToBottom />
              </div>
            </ThreadPrimitive.Viewport>
              
            {/* 增强的作曲器 */}
            <EnhancedComposer />
          </ThreadPrimitive.Root>
        </div>
      </div>
    </div>
  );
});

AIChatModal.displayName = 'AIChatModal';

// 浮动按钮组件（保持不变）
export const AIFloatingButton: React.FC<{ onClick: () => void }> = memo(({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle shadow-lg hover:shadow-xl transition-all duration-200 w-14 h-14"
      aria-label="打开AI助手"
    >
      <SparklesIcon className="w-6 h-6" />
    </button>
  );
});

AIFloatingButton.displayName = 'AIFloatingButton';

// 主要 AI 助手组件
export const AIAssistant: React.FC<AIAssistantProps> = memo(({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const { user } = useAuth();

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // 注意：不清除 currentSessionId，这样重新打开时会保留会话
  }, []);

  // 🔧 修复: 稳定化onSessionChange回调，防止触发重渲染循环
  const handleSessionChange = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // 如果用户未认证则不渲染
  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      <AIFloatingButton onClick={handleOpenModal} />
      
      {/* 🔧 关键修复：Provider移到外部，只挂载一次，通过isActive控制其行为 */}
      <SimplePersistentAIRuntimeProvider 
        sessionId={currentSessionId}
        onSessionChange={handleSessionChange}
        isActive={isModalOpen} // 新增属性控制是否激活
      >
        <AIChatModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
        />
      </SimplePersistentAIRuntimeProvider>
    </div>
  );
});

AIAssistant.displayName = 'AIAssistant';

export default AIAssistant;