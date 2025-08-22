import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
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

// 会话存储管理器
class SessionManager {
  private static instance: SessionManager;
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // 生成会话标题（基于首条消息）
  generateSessionTitle(firstMessage: string): string {
    const maxLength = 30;
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    return cleaned.length > maxLength 
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned || '新的对话';
  }

  // 保存会话到 localStorage
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const key = `chat_session_${session.id}`;
      localStorage.setItem(key, JSON.stringify(session));
      
      // 更新会话列表
      const sessionsList = this.getSessionsList();
      const existingIndex = sessionsList.findIndex(s => s.id === session.id);
      
      const sessionInfo = {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length
      };

      if (existingIndex >= 0) {
        sessionsList[existingIndex] = sessionInfo;
      } else {
        sessionsList.unshift(sessionInfo);
      }
      
      // 只保留最近20个会话
      const limitedList = sessionsList.slice(0, 20);
      localStorage.setItem('chat_sessions_list', JSON.stringify(limitedList));
      
      console.log('💾 Session saved to localStorage:', session.id);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }

  // 从 localStorage 加载会话
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const key = `chat_session_${sessionId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const session = JSON.parse(stored) as ChatSession;
        console.log('📂 Session loaded from localStorage:', sessionId, session);
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      return null;
    }
  }

  // 获取会话列表
  getSessionsList(): Array<{id: string, title: string, updatedAt: string, messageCount: number}> {
    try {
      const stored = localStorage.getItem('chat_sessions_list');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // 删除会话数据
      const key = `chat_session_${sessionId}`;
      localStorage.removeItem(key);
      
      // 更新会话列表
      const sessionsList = this.getSessionsList();
      const filteredList = sessionsList.filter(s => s.id !== sessionId);
      localStorage.setItem('chat_sessions_list', JSON.stringify(filteredList));
      
      console.log('🗑️ Session deleted:', sessionId);
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
    }
  }
}

// AI API 调用函数
const callAIAgent = async (input: string, sessionId: string): Promise<PersistentMessage> => {
  try {
    console.log('🔐 Getting user session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ Session error:', sessionError);
      throw new Error('请先登录后再使用AI助手功能。');
    }
    
    console.log('✅ User authenticated, session found');

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
    
    console.log('🌐 Making request to:', url);
    console.log('📤 Request payload:', {
      query: input,
      sessionId: sessionId,
      context: {
        timestamp: new Date().toISOString()
      }
    });

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
        context: {
          timestamp: new Date().toISOString()
        }
      })
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      let errorMessage = 'AI服务暂时不可用，请稍后再试。';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Use default error message
      }
      
      throw new Error(errorMessage);
    }

    const aiResponse: AIResponse = await response.json();
    console.log('✅ AI Response received:', aiResponse);
    
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'assistant',
      content: aiResponse.response || '抱歉，我现在无法回答您的问题。',
      timestamp: Date.now(),
      sessionId
    };

  } catch (error) {
    console.error('❌ AI Agent Error:', error);
    
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'assistant',
      content: `🤖 抱歉，AI助手遇到了问题。

**您可以尝试：**
• 刷新页面后重试
• 使用系统的搜索功能查找信息  
• 查看相关页面的帮助文档

**常见问题：**
• 员工信息查询 → 前往员工管理页面
• 薪资数据查看 → 前往薪资管理页面
• 统计报表查询 → 前往统计分析页面

如果问题持续出现，请联系系统管理员。`,
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

interface PersistentAIRuntimeProviderProps {
  children: ReactNode;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

// 持久化 AI Runtime Provider
export function PersistentAIRuntimeProvider({ 
  children, 
  sessionId: providedSessionId,
  onSessionChange 
}: PersistentAIRuntimeProviderProps) {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<PersistentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const sessionManager = SessionManager.getInstance();

  // 加载或创建会话
  const loadOrCreateSession = useCallback(async (sessionId?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      let session: ChatSession;
      
      if (sessionId) {
        // 尝试加载指定会话
        const loaded = await sessionManager.loadSession(sessionId);
        if (loaded && loaded.userId === user.id) {
          session = loaded;
          console.log('📂 Loaded existing session:', sessionId);
        } else {
          // 会话不存在或不属于当前用户，创建新会话
          session = sessionManager.createSession(user.id);
          console.log('🆕 Created new session (fallback):', session.id);
        }
      } else {
        // 创建新会话
        session = sessionManager.createSession(user.id);
        console.log('🆕 Created new session:', session.id);
      }
      
      setCurrentSession(session);
      setMessages(session.messages);
      
      // 只在会话ID确实变化时通知父组件
      if (onSessionChange && session.id !== sessionId) {
        onSessionChange(session.id);
      }
      
    } catch (error) {
      console.error('❌ Failed to load/create session:', error);
      // 创建备用会话
      const fallbackSession = sessionManager.createSession(user.id || 'anonymous');
      setCurrentSession(fallbackSession);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionManager]);

  // 保存会话（防抖）
  const saveSession = useCallback(async (session: ChatSession) => {
    if (!session) return;
    
    try {
      await sessionManager.saveSession(session);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }, []);

  // 会话初始化标志
  const [hasInitialized, setHasInitialized] = useState(false);

  // 初始化和会话ID变更处理
  useEffect(() => {
    if (user && !hasInitialized) {
      setHasInitialized(true);
      loadOrCreateSession(providedSessionId);
    } else if (user && hasInitialized && providedSessionId !== currentSession?.id) {
      // 只有在明确指定不同sessionId时才重新加载
      loadOrCreateSession(providedSessionId);
    }
  }, [user, providedSessionId]); // 移除 loadOrCreateSession 依赖避免循环

  // 消息变更时保存会话
  useEffect(() => {
    if (currentSession && messages.length > 0) {
      // 生成会话标题（仅在首条用户消息时）
      const shouldUpdateTitle = messages.length === 1 && messages[0].role === 'user';
      const newTitle = shouldUpdateTitle 
        ? sessionManager.generateSessionTitle(messages[0].content)
        : currentSession.title;
      
      const updatedSession = {
        ...currentSession,
        messages,
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
      
      // 只有在内容真正改变时才更新状态
      const hasChanged = 
        JSON.stringify(currentSession.messages) !== JSON.stringify(messages) ||
        currentSession.title !== newTitle;
      
      if (hasChanged) {
        setCurrentSession(updatedSession);
        
        // 防抖保存（500ms后保存）
        const timeoutId = setTimeout(() => {
          saveSession(updatedSession);
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, currentSession?.id]); // 只依赖messages和session ID，避免整个session对象依赖

  // 处理新消息
  const onNew = async (message: AppendMessage) => {
    if (!currentSession) return;
    
    console.log('🚀 onNew called with message:', message);
    
    if (message.content[0]?.type !== 'text') {
      throw new Error('只支持文本消息');
    }

    const input = message.content[0].text;
    console.log('📝 User input:', input);
    
    // 创建用户消息
    const userMessage: PersistentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      sessionId: currentSession.id
    };
    
    console.log('➕ Adding user message to state');
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      console.log('📋 Current messages after user message:', newMessages);
      return newMessages;
    });
    setIsRunning(true);
    
    try {
      console.log('🤖 Calling AI agent...');
      const assistantMessage = await callAIAgent(input, currentSession.id);
      console.log('✅ AI response received:', assistantMessage);
      
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log('📋 Final messages after AI response:', newMessages);
        return newMessages;
      });
    } catch (error) {
      console.error('❌ Failed to get AI response:', error);
      
      const errorMessage: PersistentMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        role: 'assistant',
        content: `抱歉，AI服务遇到问题：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        sessionId: currentSession.id
      };
      
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        console.log('📋 Messages after error:', newMessages);
        return newMessages;
      });
    } finally {
      setIsRunning(false);
      console.log('✅ onNew completed');
    }
  };

  // 提供清空当前会话的方法
  const clearCurrentSession = useCallback(async () => {
    if (!user || !currentSession) return;
    
    const newSession = sessionManager.createSession(user.id);
    setCurrentSession(newSession);
    setMessages([]);
    
    if (onSessionChange) {
      onSessionChange(newSession.id);
    }
  }, [user, currentSession, onSessionChange]);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
    isDisabled: !user || isLoading,
  });

  // 扩展 runtime 以包含会话管理方法
  const extendedRuntime = {
    ...runtime,
    // 会话管理方法
    getCurrentSession: () => currentSession,
    clearSession: clearCurrentSession,
    getSessionsList: () => sessionManager.getSessionsList(),
    deleteSession: (sessionId: string) => sessionManager.deleteSession(sessionId),
    loadSession: loadOrCreateSession,
    isLoading
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

// 导出会话管理器实例以供其他组件使用
export { SessionManager };

// 会话管理 Hook
export function useSessionManager() {
  const sessionManager = SessionManager.getInstance();
  
  return {
    getSessionsList: sessionManager.getSessionsList,
    deleteSession: sessionManager.deleteSession,
    createSession: sessionManager.createSession,
  };
}