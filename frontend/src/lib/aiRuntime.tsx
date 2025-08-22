import React, { useState, type ReactNode } from 'react';
import { 
  useExternalStoreRuntime, 
  AssistantRuntimeProvider 
} from '@assistant-ui/react';
import type { 
  ThreadMessageLike, 
  AppendMessage 
} from '@assistant-ui/react';
import { supabase } from './supabase';

interface SupabaseAIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface AIResponse {
  response: string;
  sessionId: string;
  toolsUsed?: string[];
  metadata?: Record<string, any>;
}

// 将消息转换为 Assistant UI 格式
const convertMessage = (message: SupabaseAIMessage): ThreadMessageLike => {
  return {
    role: message.role,
    content: [{ type: 'text', text: message.content }],
  };
};

// AI API 调用函数
const callAIAgent = async (input: string): Promise<SupabaseAIMessage> => {
  try {
    console.log('🔐 Getting user session...');
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ Session error:', sessionError);
      throw new Error('请先登录后再使用AI助手功能。');
    }
    
    console.log('✅ User authenticated, session found');

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
    
    console.log('🌐 Making request to:', url);
    console.log('📤 Request payload:', {
      query: input,
      sessionId: sessionId,
      context: {
        timestamp: new Date().toISOString()
      }
    });

    // Make request to AI Agent Edge Function
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
    console.log('📥 Response headers:', Object.fromEntries(response.headers));

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
      role: 'assistant',
      content: aiResponse.response || '抱歉，我现在无法回答您的问题。',
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ AI Agent Error:', error);
    
    // Return fallback response
    return {
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
      timestamp: Date.now()
    };
  }
};

// Runtime Provider Component
export function SupabaseAIRuntimeProvider({ 
  children 
}: { 
  children: ReactNode 
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<SupabaseAIMessage[]>([]);

  const onNew = async (message: AppendMessage) => {
    console.log('🚀 onNew called with message:', message);
    
    if (message.content[0]?.type !== 'text') {
      throw new Error('只支持文本消息');
    }

    const input = message.content[0].text;
    console.log('📝 User input:', input);
    
    // Add user message
    const userMessage: SupabaseAIMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
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
      // Get AI response
      const assistantMessage = await callAIAgent(input);
      console.log('✅ AI response received:', assistantMessage);
      
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log('📋 Final messages after AI response:', newMessages);
        return newMessages;
      });
    } catch (error) {
      console.error('❌ Failed to get AI response:', error);
      // Add error message
      const errorMessage: SupabaseAIMessage = {
        role: 'assistant',
        content: `抱歉，AI服务遇到问题：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now()
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

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}