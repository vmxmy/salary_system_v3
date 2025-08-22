import React, { useState, useCallback } from 'react';
import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import { useAuth } from '../../hooks/useAuth';
import { XMarkIcon, PaperAirplaneIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { SupabaseAIRuntimeProvider } from '../../lib/aiRuntime.tsx';

interface AIAssistantProps {
  className?: string;
}

// Enhanced Markdown Text Component with comprehensive DaisyUI styling
const MarkdownText: React.FC = () => {
  return (
    <MarkdownTextPrimitive 
      className="prose prose-sm max-w-none text-base-content leading-relaxed"
      // Configure markdown components with DaisyUI styling
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
};

// AI Assistant Message Component with Markdown support
const AIMessage: React.FC = () => {
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
};

// User Message Component with consistent styling
const AIUserMessage: React.FC = () => {
  return (
    <MessagePrimitive.Root className="mb-4">
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="w-8 h-8 bg-base-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-base-content">U</span>
        </div>
        
        {/* Message Content - simpler styling for user messages */}
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
};

// Floating Chat Button Component
export const AIFloatingButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle shadow-lg hover:shadow-xl transition-all duration-200 w-14 h-14"
      aria-label="打开AI助手"
    >
      <SparklesIcon className="w-6 h-6" />
    </button>
  );
};

// Chat Modal Component  
export const AIChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
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

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SupabaseAIRuntimeProvider>
            <ThreadPrimitive.Root className="h-full flex flex-col">
              {/* Main viewport with proper structure */}
              <ThreadPrimitive.Viewport 
                className="flex-1 p-4 overflow-y-auto min-h-0"
                autoScroll={true}
              >
                {/* Welcome message when empty */}
                <ThreadPrimitive.Empty>
                  <div className="text-center text-base-content/70 py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <SparklesIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">👋 您好！我是薪资管理系统的AI助手</h3>
                    <p className="text-sm mb-4">我可以帮助您：</p>
                    <ul className="text-sm space-y-1 mb-6">
                      <li>• 查询员工信息</li>
                      <li>• 查看薪资数据</li>
                      <li>• 分析统计报表</li>
                      <li>• 解答系统使用问题</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <ThreadPrimitive.Suggestion 
                        prompt="请帮我查询员工信息" 
                        method="replace"
                        className="btn btn-sm btn-outline"
                      >
                        查询员工信息
                      </ThreadPrimitive.Suggestion>
                      <ThreadPrimitive.Suggestion 
                        prompt="我想查看薪资统计分析" 
                        method="replace"
                        className="btn btn-sm btn-outline"
                      >
                        薪资统计分析
                      </ThreadPrimitive.Suggestion>
                      <ThreadPrimitive.Suggestion 
                        prompt="如何使用这个系统？" 
                        method="replace"
                        className="btn btn-sm btn-outline"
                      >
                        系统使用帮助
                      </ThreadPrimitive.Suggestion>
                    </div>
                  </div>
                </ThreadPrimitive.Empty>
                
                {/* Messages area */}
                <ThreadPrimitive.Messages components={{
                  Message: AIMessage,
                  UserMessage: AIUserMessage,
                  AssistantMessage: AIMessage
                }} />
                
                {/* Spacer for proper spacing */}
                <ThreadPrimitive.If empty={false}>
                  <div className="h-4" />
                </ThreadPrimitive.If>
                
                {/* Scroll to bottom button */}
                <div className="sticky bottom-0 flex justify-center pb-2">
                  <ThreadPrimitive.ScrollToBottom className="btn btn-sm btn-circle btn-ghost opacity-70 hover:opacity-100 transition-opacity">
                    <ArrowDownIcon className="w-4 h-4" />
                  </ThreadPrimitive.ScrollToBottom>
                </div>
              </ThreadPrimitive.Viewport>
                
              {/* Composer at bottom - outside viewport with fixed height */}
              <div className="flex-shrink-0 border-t border-base-200 p-4 bg-base-100">
                <ComposerPrimitive.Root className="flex gap-3 items-end">
                  <div className="flex-1">
                    <ComposerPrimitive.Input 
                      className="textarea textarea-bordered w-full resize-none bg-base-100 text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-10 min-h-10 max-h-10 leading-tight py-2"
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
                  <ComposerPrimitive.Send className="btn btn-primary btn-square h-10 w-10 min-h-10">
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
              </div>
            </ThreadPrimitive.Root>
          </SupabaseAIRuntimeProvider>
        </div>
      </div>
    </div>
  );
};

// Main AI Assistant Component with floating button and modal
export const AIAssistant: React.FC<AIAssistantProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      <AIFloatingButton onClick={handleOpenModal} />
      <AIChatModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default AIAssistant;