import React, { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { 
  useExternalStoreRuntime, 
  AssistantRuntimeProvider,
  type ThreadMessageLike, 
  type AppendMessage 
} from '@assistant-ui/react';
import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';

interface PersistentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sessionId: string;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: PersistentMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AIResponse {
  response: string;
  sessionId: string;
  toolsUsed?: string[];
  metadata?: Record<string, any>;
}

// 简化的会话管理器
class SimpleSessionManager {
  private static instance: SimpleSessionManager;
  
  static getInstance(): SimpleSessionManager {
    if (!SimpleSessionManager.instance) {
      SimpleSessionManager.instance = new SimpleSessionManager();
    }
    return SimpleSessionManager.instance;
  }

  // 生成会话标题
  generateSessionTitle(firstMessage: string): string {
    const maxLength = 30;
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    return cleaned.length > maxLength 
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned || '新的对话';
  }

  // 保存会话
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const key = `chat_session_${session.id}`;
      localStorage.setItem(key, JSON.stringify(session));
      console.log('💾 Session saved:', session.id);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }

  // 加载会话
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const key = `chat_session_${sessionId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const session = JSON.parse(stored) as ChatSession;
        console.log('📂 Session loaded:', sessionId);
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      return null;
    }
  }

  // 创建新会话
  createSession(userId: string, firstMessage?: string): ChatSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const now = new Date().toISOString();
    
    return {
      id: sessionId,
      userId,
      title: firstMessage ? this.generateSessionTitle(firstMessage) : '新的对话',
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  }
}

// AI API 调用函数
const callAIAgent = async (input: string, sessionId: string, messageHistory: PersistentMessage[] = []): Promise<PersistentMessage> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('请先登录后再使用AI助手功能。');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query: input,
        sessionId: sessionId,
        messageHistory: messageHistory, // 传递完整消息历史
        context: {
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'AI服务暂时不可用，请稍后再试。';
      let detailedErrorInfo = '';
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('AI Service Error Details:', errorJson);
        
        // 构建详细的错误信息
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        
        if (errorJson.code) {
          detailedErrorInfo += `\n错误代码: ${errorJson.code}`;
        }
        
        if (errorJson.solution) {
          detailedErrorInfo += `\n解决方案: ${errorJson.solution}`;
        }
        
        if (errorJson.timestamp) {
          detailedErrorInfo += `\n发生时间: ${new Date(errorJson.timestamp).toLocaleString('zh-CN')}`;
        }
        
        // 针对不同错误类型提供具体指导
        if (errorJson.code === 'GEMINI_API_KEY_MISSING') {
          errorMessage = '🔑 AI服务配置不完整 - Google Gemini API密钥未设置';
          detailedErrorInfo += `\n\n管理员需要：\n• 访问 Supabase Dashboard\n• 在项目设置中配置 GOOGLE_GEMINI_API_KEY 环境变量\n• 获取API密钥：https://aistudio.google.com/app/apikey`;
        } else if (errorMessage.includes('API_KEY_INVALID')) {
          errorMessage = '🔑 AI服务API密钥无效';
          detailedErrorInfo += `\n\n可能原因：\n• API密钥已过期\n• API密钥格式错误\n• 请检查密钥是否正确配置`;
        } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
          errorMessage = '📊 AI服务配额已用尽';
          detailedErrorInfo += `\n\n解决方法：\n• 等待配额重置\n• 升级Google Cloud账户\n• 检查API使用限制`;
        } else if (errorMessage.includes('PERMISSION_DENIED')) {
          errorMessage = '🚫 AI服务权限不足';
          detailedErrorInfo += `\n\n可能原因：\n• API密钥权限不足\n• 服务未启用\n• 账户状态异常`;
        }
        
        errorMessage += detailedErrorInfo;
        
      } catch (parseError) {
        console.error('Failed to parse error JSON:', parseError);
        console.error('Raw error text:', errorText);
        errorMessage = `AI服务错误: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
      }
      
      throw new Error(errorMessage);
    }

    const aiResponse: AIResponse = await response.json();
    
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'assistant',
      content: aiResponse.response || '抱歉，我现在无法回答您的问题。',
      timestamp: Date.now(),
      sessionId
    };

  } catch (error) {
    console.error('❌ AI Agent Error:', error);
    
    // 获取更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const isDevMode = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG_INFO === 'true';
    
    let userFriendlyContent = `🤖 抱歉，AI助手遇到了问题。`;
    
    // 在开发模式或调试模式下显示具体错误
    if (isDevMode) {
      userFriendlyContent += `\n\n**错误详情：**\n\`${errorMessage}\``;
      
      // 如果是网络错误，提供更多信息
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        userFriendlyContent += `\n\n**可能原因：**\n• 网络连接问题\n• Supabase服务不可用\n• Edge Function未正确部署`;
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('登录')) {
        userFriendlyContent += `\n\n**可能原因：**\n• 用户会话已过期\n• 登录状态异常`;
      } else if (errorMessage.includes('API') || errorMessage.includes('Gemini')) {
        userFriendlyContent += `\n\n**可能原因：**\n• AI服务API配置问题\n• API密钥无效或过期`;
      }
    } else {
      // 生产模式下根据错误类型提供友好提示
      if (errorMessage.includes('登录') || errorMessage.includes('Authentication')) {
        userFriendlyContent += `\n\n**问题：** 身份验证失败，请重新登录。`;
      } else if (errorMessage.includes('权限') || errorMessage.includes('权限不足')) {
        userFriendlyContent += `\n\n**问题：** 您的账户权限不足以使用此功能。`;
      } else {
        userFriendlyContent += `\n\n**问题：** 服务暂时不可用。`;
      }
    }

    userFriendlyContent += `

**您可以尝试：**
• 刷新页面后重试
• 检查网络连接状况
• 重新登录系统
• 使用系统的搜索功能查找信息  

**常见功能入口：**
• 员工信息查询 → 前往员工管理页面
• 薪资数据查看 → 前往薪资管理页面
• 统计报表查询 → 前往统计分析页面

如果问题持续出现，请联系系统管理员。

**错误时间：** ${new Date().toLocaleString('zh-CN')}`;

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'assistant',
      content: userFriendlyContent,
      timestamp: Date.now(),
      sessionId
    };
  }
};

// 转换消息格式
const convertMessage = (message: PersistentMessage): ThreadMessageLike => ({
  role: message.role,
  content: [{ type: 'text', text: message.content }],
  id: message.id,
  createdAt: new Date(message.timestamp)
});

interface SimplePersistentAIRuntimeProviderProps {
  children: ReactNode;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  isActive?: boolean; // 新增：控制Provider是否激活
}

// 简化的持久化 AI Runtime Provider
export function SimplePersistentAIRuntimeProvider({ 
  children, 
  sessionId: providedSessionId,
  onSessionChange,
  isActive = true // 默认激活
}: SimplePersistentAIRuntimeProviderProps) {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<PersistentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const sessionManager = SimpleSessionManager.getInstance();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSessionChangeRef = useRef(onSessionChange);
  const initializingRef = useRef(false);
  const lastInitParamsRef = useRef<string>('');

  // 🔧 修复1: 稳定化关键引用
  const stableUserId = useMemo(() => user?.id, [user?.id]);
  
  const stableOnSessionChange = useCallback((sessionId: string) => {
    onSessionChangeRef.current?.(sessionId);
  }, []);

  // 保持最新的onSessionChange引用，但不触发重渲染
  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  // 🔧 修复2: 彻底重构初始化逻辑，消除循环依赖
  const initializeSession = useCallback(async (userId: string, sessionId?: string) => {
    // 生成唯一参数签名，避免重复初始化
    const initParams = `${userId}-${sessionId || 'new'}`;
    
    // 防止重复初始化
    if (initializingRef.current) {
      console.log('⏳ Session initialization already in progress, skipping...');
      return;
    }
    
    // 检查参数是否变化
    if (lastInitParamsRef.current === initParams && currentSession) {
      console.log('♻️ Session already initialized with same params, skipping...');
      return;
    }
    
    initializingRef.current = true;
    setIsLoading(true);
    
    try {
      let session: ChatSession;
      
      if (sessionId) {
        // 尝试加载现有会话
        const loaded = await sessionManager.loadSession(sessionId);
        if (loaded && loaded.userId === userId) {
          session = loaded;
          console.log('📂 Loaded existing session:', sessionId);
        } else {
          // 创建新会话
          session = sessionManager.createSession(userId);
          console.log('🆕 Created new session (fallback):', session.id);
        }
      } else {
        // 创建新会话
        session = sessionManager.createSession(userId);
        console.log('🆕 Created new session:', session.id);
      }
      
      setCurrentSession(session);
      setMessages(session.messages);
      lastInitParamsRef.current = initParams;
      
      // 通知父组件会话ID变更（使用稳定的回调）
      if (session.id !== sessionId) {
        stableOnSessionChange(session.id);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      // 创建备用会话
      const fallbackSession = sessionManager.createSession(userId);
      setCurrentSession(fallbackSession);
      setMessages([]);
      lastInitParamsRef.current = '';
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  }, [stableOnSessionChange]); // 只依赖稳定的回调

  // 保存会话（防抖）
  const debouncedSave = useCallback((session: ChatSession) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      sessionManager.saveSession(session);
    }, 500);
  }, []); // sessionManager是单例，不需要依赖

  // 🔧 修复3: 只在激活时初始化session，避免不必要的创建
  useEffect(() => {
    if (stableUserId && isActive && !currentSession) {
      console.log('🚀 [SimplePersistentAI] Initializing session (isActive=true)...');
      initializeSession(stableUserId, providedSessionId);
    } else if (!isActive) {
      console.log('⏸️ [SimplePersistentAI] Provider inactive, skipping initialization');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableUserId, providedSessionId, isActive]); // 添加isActive依赖

  // 🔧 修复4: 优化消息保存逻辑，避免不必要的状态更新
  const lastSavedMessagesLength = useRef(0);
  useEffect(() => {
    if (currentSession && messages.length > 0 && !initializingRef.current) {
      // 只在消息数量真正变化时才处理
      if (lastSavedMessagesLength.current === messages.length) {
        return;
      }
      
      lastSavedMessagesLength.current = messages.length;
      
      const updatedSession: ChatSession = {
        ...currentSession,
        messages,
        updatedAt: new Date().toISOString(),
        // 更新标题（仅在首条用户消息时）
        title: messages.length === 1 && messages[0].role === 'user' 
          ? sessionManager.generateSessionTitle(messages[0].content)
          : currentSession.title
      };
      
      // 避免不必要的状态更新
      setCurrentSession(prev => {
        if (!prev || prev.updatedAt !== updatedSession.updatedAt) {
          return updatedSession;
        }
        return prev;
      });
      
      debouncedSave(updatedSession);
    }
  }, [messages.length, currentSession?.id, debouncedSave]);

  // 处理新消息
  const onNew = async (message: AppendMessage) => {
    if (!currentSession) return;
    
    if (message.content[0]?.type !== 'text') {
      throw new Error('只支持文本消息');
    }

    const input = message.content[0].text;
    
    // 创建用户消息
    const userMessage: PersistentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      sessionId: currentSession.id
    };
    
    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setIsRunning(true);
    
    try {
      // 获取AI回复，传递当前消息历史（包括刚添加的用户消息）
      const currentHistory = [...messages, userMessage];
      const assistantMessage = await callAIAgent(input, currentSession.id, currentHistory);
      
      // 添加AI消息
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ Failed to get AI response:', error);
      
      // 添加错误消息
      const errorMessage: PersistentMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        role: 'assistant',
        content: `抱歉，AI服务遇到问题：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        sessionId: currentSession.id
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsRunning(false);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
    isDisabled: !user || isLoading,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export { SimpleSessionManager };