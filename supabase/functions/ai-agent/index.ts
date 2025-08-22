// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

console.log('AI Agent Function (Bugfix V3) started!');

// --- 流式响应核心处理器 ---
Deno.serve(async (req)=>{
  // 预检请求和非 POST 请求的快速处理逻辑
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // --- 创建可读流以实现流式响应 ---
  const stream = new ReadableStream({
    async start (controller) {
      // 用于向客户端发送事件的辅助函数
      const encoder = new TextEncoder();
      const sendEvent = (type, data) => {
        const eventPayload = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${eventPayload}\n\n`));
      };
      
      const sendErrorAndClose = (message, status = 500) => {
          console.error('Stream Error:', message);
          sendEvent('error', { message, status });
          controller.close();
      }

      try {
        // 1. 解析请求体
        const requestBody = await req.json();
        const { query, sessionId, messageHistory = [] } = requestBody;
        if (!query || !sessionId) {
          return sendErrorAndClose('Query and sessionId are required', 400);
        }

        sendEvent('status', { message: '请求已收到，正在验证用户身份...' });

        // 2. 身份验证和用户授权
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return sendErrorAndClose('Authorization header required', 401);
        }

        const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return sendErrorAndClose('Authentication failed', 401);
        }

        const { data: userRole, error: roleError } = await supabase.from('user_roles').select('role, is_active').eq('user_id', user.id).eq('is_active', true).single();
        if (roleError || !userRole) {
          return sendErrorAndClose('User role not found or inactive', 403);
        }

        const { data: employee } = await supabase.from('employees').select('id, employee_name').eq('user_id', user.id).eq('employment_status', 'active').maybeSingle();
        const userProfile = {
          user_id: user.id,
          role: userRole.role,
          is_active: userRole.is_active,
          employee_id: employee?.id,
          employee_name: employee?.employee_name || 'Unknown User'
        };
        
        sendEvent('status', { message: `身份验证成功: ${userProfile.employee_name} (${getRoleDisplayName(userProfile.role)})` });

        // 3. AI 服务配置检查
        const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openrouterApiKey) {
          return sendErrorAndClose('AI service configuration missing: OPENROUTER_API_KEY not set', 503);
        }

        // 4. 动态生成提示和工具
        const systemPrompt = generateSystemPrompt(userProfile);
        const allTools = await defineUserTools(userProfile, supabase);
        sendEvent('status', { message: `智能分析查询内容，从${allTools.length}个工具中选择相关工具...` });
        const availableTools = selectRelevantTools(query, allTools, userProfile);
        sendEvent('status', { message: `已选择${availableTools.length}个相关工具，开始处理请求` });
        
        // 5. 【第一次 OpenRouter/GLM 调用】 - 意图识别和工具决策 (非流式)
        sendEvent('status', { message: '正在分析您的意图，请稍候...' });
        sendEvent('status', { message: `优化对话上下文（${messageHistory.length}条历史消息）...` });
        const conversationMessages = buildConversationMessages(systemPrompt, messageHistory, query);
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openrouterApiKey}`,
                'HTTP-Referer': 'https://supabase.com',
                'X-Title': 'HR Salary Management AI Assistant'
            },
            body: JSON.stringify({
                model: 'z-ai/glm-4.5-air:free',
                messages: conversationMessages,
                tools: availableTools.length > 0 ? availableTools.map(tool => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                })) : undefined,
                tool_choice: availableTools.length > 0 ? 'auto' : undefined,
                temperature: 0.1,
                max_tokens: 1000
            })
        });

        if (!openrouterResponse.ok) {
            const errorText = await openrouterResponse.text();
            console.error("OpenRouter Intent API Error Details:", errorText);
            return sendErrorAndClose(`OpenRouter API error (Intent): ${openrouterResponse.status} - See function logs for details.`, 502);
        }

        const openrouterData = await openrouterResponse.json();
        const message = openrouterData.choices?.[0]?.message;
        const functionCalls = message?.tool_calls;
        const textResponse = message?.content;

        let finalResponseText = '';
        const toolsUsed = [];

        // 6. 工具执行逻辑
        if (functionCalls && functionCalls.length > 0) {
            for (const functionCall of functionCalls) {
                const toolName = functionCall.function.name;
                const toolArgs = functionCall.function.arguments ? JSON.parse(functionCall.function.arguments) : {};
                toolsUsed.push(toolName);
                
                sendEvent('tool_call', { name: toolName, args: toolArgs });
                
                try {
                    const toolResult = await executeTool(toolName, toolArgs, userProfile, supabase);

                    // --- BUGFIX START ---
                    // 修正点 1: 发送真实的工具执行结果，而不是硬编码 success: true
                    sendEvent('tool_result', { name: toolName, result: toolResult });

                    // 修正点 2: 检查工具执行是否成功
                    if (toolResult.success === false) {
                        // 如果工具明确返回失败（例如找不到用户），直接使用它的 message 作为最终回复
                        finalResponseText = toolResult.message || `执行工具 ${toolName} 失败，未提供具体原因。`;
                        sendEvent('llm_chunk', { text: finalResponseText });
                    } else {
                        // 只有在工具成功时，才继续调用 OpenRouter/GLM 生成自然语言回复
                        sendEvent('status', { message: '数据已获取，正在生成自然语言回复...' });
                        const responsePrompt = generateAIPrompt(toolName, toolResult, query);
                        
                        console.log(`Generating response for toolResult:`, JSON.stringify(toolResult, null, 2));
                        console.log(`Using prompt:`, responsePrompt.substring(0, 200) + '...');
                        
                        const finalStreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openrouterApiKey}`,
                                'HTTP-Referer': 'https://supabase.com',
                                'X-Title': 'HR Salary Management AI Assistant'
                            },
                            body: JSON.stringify({
                                model: 'z-ai/glm-4.5-air:free',
                                messages: [{ role: 'user', content: responsePrompt }],
                                temperature: 0.3,
                                max_tokens: 1024,
                                stream: true
                            })
                        });

                        console.log(`OpenRouter stream response status: ${finalStreamResponse.status}`);
                        
                        if (!finalStreamResponse.ok) {
                            const errorText = await finalStreamResponse.text();
                            console.error(`OpenRouter stream API error:`, errorText);
                            
                            // 降级到非流式响应
                            console.log(`Falling back to non-stream response...`);
                            const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${openrouterApiKey}`,
                                    'HTTP-Referer': 'https://supabase.com',
                                    'X-Title': 'HR Salary Management AI Assistant'
                                },
                                body: JSON.stringify({
                                    model: 'z-ai/glm-4.5-air:free',
                                    messages: [{ role: 'user', content: responsePrompt }],
                                    temperature: 0.3,
                                    max_tokens: 1024,
                                    stream: false
                                })
                            });
                            
                            if (fallbackResponse.ok) {
                                const fallbackData = await fallbackResponse.json();
                                finalResponseText = fallbackData.choices?.[0]?.message?.content || '查询成功，但无法生成回复。';
                                sendEvent('llm_chunk', { text: finalResponseText });
                            } else {
                                throw new Error(`Both streaming and non-streaming OpenRouter calls failed: ${errorText}`);
                            }
                        } else {
                            // 流式响应处理（OpenAI格式）
                            const reader = finalStreamResponse.body.pipeThrough(new TextDecoderStream()).getReader();
                            let buffer = '';
                            let hasReceivedData = false;
                            
                            try {
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    
                                    buffer += value;
                                    const lines = buffer.split('\n');
                                    buffer = lines.pop() || '';

                                    for (const line of lines) {
                                        if (line.startsWith('data: ')) {
                                            const jsonStr = line.substring(6).trim();
                                            if (jsonStr && jsonStr !== '[DONE]') {
                                                try {
                                                    const parsed = JSON.parse(jsonStr);
                                                    const textChunk = parsed.choices?.[0]?.delta?.content;
                                                    if (textChunk) {
                                                        finalResponseText += textChunk;
                                                        sendEvent('llm_chunk', { text: textChunk });
                                                        hasReceivedData = true;
                                                        console.log(`Received chunk: ${textChunk.substring(0, 50)}...`);
                                                    }
                                                } catch (e) {
                                                    console.warn('Could not parse chunk:', jsonStr, e);
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                // 检查是否收到了任何数据
                                if (!hasReceivedData) {
                                    console.warn('No data received from streaming response, using fallback');
                                    // 根据工具类型生成不同的fallback响应
                                    finalResponseText = generateFallbackResponse(toolName, toolResult, query);
                                    sendEvent('llm_chunk', { text: finalResponseText });
                                }
                            } finally {
                                reader.releaseLock();
                            }
                        }
                    }
                    // --- BUGFIX END ---
                } catch (toolError) {
                    finalResponseText = `抱歉，执行查询 '${toolName}' 时遇到严重问题：${toolError.message}`;
                    sendEvent('error', { message: finalResponseText });
                }
            }
        } else if (textResponse) {
            finalResponseText = textResponse;
            sendEvent('llm_chunk', { text: finalResponseText });
        } else {
             finalResponseText = "抱歉，我无法处理您的请求，请尝试换一种问法。";
             sendEvent('llm_chunk', { text: finalResponseText });
        }

        // 8. 发送最终的元数据并关闭流
        const metadata = {
            userRole: userProfile.role,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            toolsUsed: toolsUsed,
        };
        sendEvent('final_response', { response: finalResponseText, metadata });
        controller.close();

      } catch (error) {
        sendErrorAndClose(error.message || 'An unexpected error occurred', 500);
      }
    }
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
    status: 200
  });
});

// =================================================================
// 辅助函数 (Helper Functions)
// =================================================================

function buildConversationMessages(systemPrompt, messageHistory, currentQuery) {
  const messages = [];
  messages.push({ role: 'system', content: systemPrompt });
  
  // 智能历史上下文限制策略
  const contextConfig = getContextLimitConfig(currentQuery, messageHistory);
  const recentHistory = selectRelevantHistory(messageHistory, contextConfig);
  
  console.log(`📚 [Context] Using ${recentHistory.length}/${messageHistory.length} history messages (limit: ${contextConfig.maxMessages})`);
  
  for (const message of recentHistory){
    messages.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    });
  }
  messages.push({ role: 'user', content: currentQuery });
  return messages;
}

// 根据查询类型和历史消息确定上下文限制配置
function getContextLimitConfig(query, messageHistory) {
  const queryLower = query.toLowerCase();
  
  // 基于查询类型的动态配置
  const configs = {
    // 简单查询：减少上下文
    simple: {
      maxMessages: 4,
      maxTokens: 800,
      keywords: ['是什么', '多少', '有没有', '在哪', '怎么样']
    },
    
    // 薪资查询：需要一些上下文了解查询范围
    salary: {
      maxMessages: 6,
      maxTokens: 1200,
      keywords: ['薪资', '工资', '薪水', '收入', '最高', '对比']
    },
    
    // 复杂分析：需要更多上下文
    analysis: {
      maxMessages: 8,
      maxTokens: 1600,
      keywords: ['分析', '统计', '趋势', '对比', '分布', '变化']
    },
    
    // 默认配置
    default: {
      maxMessages: 6,
      maxTokens: 1000,
      keywords: []
    }
  };
  
  // 匹配查询类型
  for (const [type, config] of Object.entries(configs)) {
    if (type === 'default') continue;
    
    for (const keyword of config.keywords) {
      if (queryLower.includes(keyword)) {
        console.log(`🎯 [Context] Detected query type: ${type}, using ${config.maxMessages} messages limit`);
        return config;
      }
    }
  }
  
  // 如果历史消息很少，适当减少限制
  if (messageHistory.length <= 4) {
    return { ...configs.default, maxMessages: messageHistory.length };
  }
  
  return configs.default;
}

// 智能选择相关的历史消息
function selectRelevantHistory(messageHistory, config) {
  if (messageHistory.length === 0) {
    return [];
  }
  
  // 简单策略：取最近的消息，但保持对话的连贯性
  let selectedMessages = messageHistory.slice(-config.maxMessages);
  
  // 确保选择的消息以用户消息开头（如果可能）
  if (selectedMessages.length > 1 && selectedMessages[0].role === 'assistant') {
    selectedMessages = selectedMessages.slice(1);
  }
  
  // 计算大概的token数量（粗略估算：中文1字符约等于1.5个token）
  let estimatedTokens = 0;
  const finalMessages = [];
  
  for (let i = selectedMessages.length - 1; i >= 0; i--) {
    const message = selectedMessages[i];
    const messageTokens = Math.ceil(message.content.length * 1.5);
    
    if (estimatedTokens + messageTokens > config.maxTokens && finalMessages.length > 0) {
      break;
    }
    
    finalMessages.unshift(message);
    estimatedTokens += messageTokens;
  }
  
  console.log(`💭 [Context] Selected messages token estimate: ${estimatedTokens}/${config.maxTokens}`);
  
  return finalMessages;
}

// 动态工具选择策略 - 基于用户查询内容智能选择相关工具
function selectRelevantTools(query, allTools, userProfile) {
  console.log(`🔍 [Tool Selection] Analyzing query: "${query}"`);
  
  // 将查询转换为小写，便于关键词匹配
  const normalizedQuery = query.toLowerCase();
  
  // 定义工具类别和关键词映射
  const toolCategories = {
    // 薪资相关工具
    salary: {
      keywords: ['薪资', '工资', '薪水', '收入', '月薪', '年薪', '工资单', '薪酬', '待遇', '报酬', 
                '最高薪', '薪资最高', '工资最高', '谁的工资', '工资多少', '收入多少', '薪资多少'],
      tools: ['getEmployeeSalary', 'getDepartmentSalaryStats', 'getSalaryTrends']
    },
    
    // 员工信息相关工具
    employee: {
      keywords: ['员工', '职工', '人员', '同事', '姓名', '信息', '详情', '档案', '资料', 
                '搜索', '查找', '找', '列出', '有哪些', '有多少人', '人数'],
      tools: ['searchEmployees', 'getEmployeeDetails']
    },
    
    // 统计分析相关工具
    statistics: {
      keywords: ['统计', '分析', '分布', '比例', '趋势', '总数', '数量', '各个', '分别', 
                '分组', '汇总', '对比', '变化', '增长', '环比', '同比'],
      tools: ['getEmployeeStats', 'getSalaryTrends', 'getDepartmentSalaryStats']
    }
  };
  
  // 计算每个类别的匹配分数
  const categoryScores = {};
  for (const [category, config] of Object.entries(toolCategories)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (normalizedQuery.includes(keyword)) {
        score += keyword.length; // 更长的关键词权重更高
      }
    }
    categoryScores[category] = score;
  }
  
  console.log(`📊 [Tool Selection] Category scores:`, categoryScores);
  
  // 特殊规则处理
  const selectedTools = new Set();
  
  // 规则1: 如果明确提到具体员工姓名且询问详细信息
  const hasPersonName = /[\u4e00-\u9fa5]{2,4}(?=的|信息|详情|档案|资料)/g.test(normalizedQuery);
  if (hasPersonName && (normalizedQuery.includes('信息') || normalizedQuery.includes('详情') || 
      normalizedQuery.includes('档案') || normalizedQuery.includes('资料'))) {
    selectedTools.add('getEmployeeDetails');
    console.log(`👤 [Tool Selection] Detected person name query, added getEmployeeDetails`);
  }
  
  // 规则2: 薪资相关查询
  if (categoryScores.salary > 0) {
    // 如果询问"谁的工资最高"类问题
    if (normalizedQuery.includes('谁') && (normalizedQuery.includes('工资') || normalizedQuery.includes('薪资')) && 
        (normalizedQuery.includes('最高') || normalizedQuery.includes('最多'))) {
      selectedTools.add('getEmployeeSalary');
    }
    
    // 如果询问部门薪资
    if ((normalizedQuery.includes('部门') || normalizedQuery.includes('处') || normalizedQuery.includes('科')) &&
        (normalizedQuery.includes('薪资') || normalizedQuery.includes('工资'))) {
      selectedTools.add('getDepartmentSalaryStats');
    }
    
    // 如果询问薪资趋势
    if (normalizedQuery.includes('趋势') || normalizedQuery.includes('变化') || normalizedQuery.includes('增长')) {
      selectedTools.add('getSalaryTrends');
    }
    
    // 个人薪资查询
    if (normalizedQuery.includes('我的') || normalizedQuery.includes('自己的')) {
      selectedTools.add('getEmployeeSalary');
    }
  }
  
  // 规则3: 员工搜索查询
  if (categoryScores.employee > 0 && categoryScores.salary === 0) {
    if (normalizedQuery.includes('搜索') || normalizedQuery.includes('查找') || normalizedQuery.includes('列出') ||
        normalizedQuery.includes('有多少') || normalizedQuery.includes('人数')) {
      selectedTools.add('searchEmployees');
    }
  }
  
  // 规则4: 统计分析查询
  if (categoryScores.statistics > 0) {
    if (normalizedQuery.includes('统计') || normalizedQuery.includes('分布') || normalizedQuery.includes('比例')) {
      selectedTools.add('getEmployeeStats');
    }
  }
  
  // 如果没有匹配到任何规则，使用得分最高的类别
  if (selectedTools.size === 0) {
    const highestCategory = Object.keys(categoryScores).reduce((a, b) => 
      categoryScores[a] > categoryScores[b] ? a : b
    );
    
    if (categoryScores[highestCategory] > 0) {
      // 添加该类别的工具
      for (const toolName of toolCategories[highestCategory].tools) {
        selectedTools.add(toolName);
      }
      console.log(`🎯 [Tool Selection] Using highest scoring category: ${highestCategory}`);
    } else {
      // 完全没有匹配，使用基础工具集
      selectedTools.add('searchEmployees');
      selectedTools.add('getEmployeeDetails');
      console.log(`🌐 [Tool Selection] No matches found, using basic tools`);
    }
  }
  
  // 过滤出用户有权限使用的工具
  const relevantTools = allTools.filter(tool => selectedTools.has(tool.name));
  
  console.log(`✅ [Tool Selection] Selected ${relevantTools.length}/${allTools.length} tools:`, 
    relevantTools.map(t => t.name));
  
  // 优化工具描述长度以减少token消耗
  const optimizedTools = relevantTools.map(tool => ({
    ...tool,
    description: optimizeToolDescription(tool.name, tool.description)
  }));
  
  return optimizedTools;
}

// 优化工具描述以减少token消耗
function optimizeToolDescription(toolName, originalDescription) {
  // 提取核心描述，移除过多的示例和解释
  const coreDescriptions = {
    'searchEmployees': '搜索和列出多个员工或按条件筛选员工列表（不含薪资）',
    'getEmployeeDetails': '获取特定员工的完整详细档案信息',
    'getEmployeeStats': '对员工数据进行分组统计和分析',
    'getEmployeeSalary': '查询员工薪资记录和明细信息',
    'getDepartmentSalaryStats': '获取部门薪资统计分析数据',
    'getSalaryTrends': '分析薪资时间趋势变化和增长率'
  };
  
  // 返回简化版描述，但保留关键触发信息
  const coreDesc = coreDescriptions[toolName];
  if (coreDesc) {
    // 保留原描述的触发场景部分
    const triggerMatch = originalDescription.match(/触发场景[：:]([^关]*)/);
    const trigger = triggerMatch ? triggerMatch[1].trim() : '';
    
    return coreDesc + (trigger ? `。适用于: ${trigger.substring(0, 50)}...` : '');
  }
  
  return originalDescription;
}

function generateSystemPrompt(userProfile) {
  const basePrompt = `
    你是一个专业的、数据驱动的HR薪资管理系统AI助手。你的名字叫"HR-GPT"。

    用户信息：
    - 姓名：${userProfile.employee_name || '未知'}
    - 角色：${getRoleDisplayName(userProfile.role)}

    【核心指令 - 强制执行】
    1.  **工具强制优先**: 当用户询问任何员工信息时，你【必须立即】调用相应工具。禁止先询问更多信息。
    2.  **立即行动原则**: 用户提到任何员工姓名时，立即调用getEmployeeDetails工具，使用用户提供的确切姓名。
    3.  **薪资查询识别**: 当用户询问"工资"、"薪资"、"收入"、"薪水"时，【必须优先】使用薪资相关工具，而不是员工搜索工具。
    4.  **上下文薪资分析**: 如果用户在部门薪资查询后问"谁的工资最高"，应结合之前的薪资统计结果进行分析和回答。
    5.  **禁止预先询问**: 绝对禁止因为"可能重名"、"需要更多信息"等理由而不调用工具。先尝试，失败了再询问。
    6.  **标准流程**: 看到员工姓名 → 立即调用getEmployeeDetails → 根据结果决定下一步。

    【示例执行】
    用户："李庆的电话"
    你的行动：立即调用getEmployeeDetails({employeeName: "李庆"})
    
    用户："综合处所有员工的工资"
    你的行动：立即调用getDepartmentSalaryStats({department: "综合处"})
    
    用户："张三的薪资"
    你的行动：立即调用getEmployeeSalary({employeeName: "张三"})
    
    用户："谁的工资最高"
    你的行动：立即调用getEmployeeSalary({compareAll: true})
    
    用户："综合处谁工资最高"
    你的行动：立即调用getEmployeeSalary({compareAll: true, department: "综合处"})
    
    【绝对禁止】
    ❌ "我需要更多信息来唯一识别他"
    ❌ "请问您知道他的员工ID吗"
    ❌ "为了保护数据安全需要..."
    ❌ 对于薪资查询使用员工搜索工具
    
    【必须执行】
    ✅ 直接调用工具查询
    ✅ 根据工具结果回答或请求更多信息
    ✅ 薪资查询必须使用薪资工具

    根据你的角色 (${getRoleDisplayName(userProfile.role)})，你拥有以下权限：
  `;
  const rolePermissions = {
    super_admin: '- 拥有系统最高权限，可访问所有数据和工具。',
    admin: '- 可访问所有员工和部门信息及统计数据。',
    hr_manager: '- 可访问所有员工信息和薪资统计数据。',
    manager: '- 可访问本部门员工信息和薪资概览。',
    employee: '- 只能访问自己的个人信息。'
  };
  return basePrompt + '\n' + rolePermissions[userProfile.role];
}

function getRoleDisplayName(role) {
  const roleNames = { super_admin: '超级管理员', admin: '系统管理员', hr_manager: '人事经理', manager: '部门经理', employee: '普通员工' };
  return roleNames[role] || '未知角色';
}

async function executeTool(toolName, args, userProfile, supabase) {
  console.log(`Executing tool: ${toolName} with args:`, args);
  switch(toolName){
    case 'searchEmployees': return await searchEmployees(args, userProfile, supabase);
    case 'getEmployeeDetails': return await getEmployeeDetails(args, userProfile, supabase);
    case 'getEmployeeStats': return await getEmployeeStats(args, userProfile, supabase);
    case 'getEmployeeSalary': return await getEmployeeSalary(args, userProfile, supabase);
    case 'getDepartmentSalaryStats': return await getDepartmentSalaryStats(args, userProfile, supabase);
    case 'getSalaryTrends': return await getSalaryTrends(args, userProfile, supabase);
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool Implementations
async function searchEmployees(args, userProfile, supabase) {
  console.log(`searchEmployees called with args:`, args);
  let query = supabase.from('view_employee_basic_info').select(`employee_id, employee_name, gender, department_name, position_name, category_name, employment_status, mobile_phone, latest_degree, hire_date, years_of_service`);
  if (userProfile.role === 'employee') { query = query.eq('employee_id', userProfile.employee_id); }
  
  // 支持多种参数名称，兼容AI的不同调用方式
  const nameParam = args.name || args.employeeName;
  if (nameParam) { 
    console.log(`Filtering by name: ${nameParam}`);
    query = query.ilike('employee_name', `%${nameParam}%`); 
  }
  
  if (args.department) { query = query.ilike('department_name', `%${args.department}%`); }
  if (args.position) { query = query.ilike('position_name', `%${args.position}%`); }
  if (args.status && args.status !== 'all') { query = query.eq('employment_status', args.status); }
  const limit = Math.min(args.limit || 10, 50);
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`Database query error: ${error.message}`);
  const maskedData = data?.map((employee) => maskSensitiveEmployeeData(employee, userProfile)) || [];
  console.log(`searchEmployees returning ${maskedData.length} results`);
  return { success: true, count: maskedData.length, data: maskedData };
}

// --- BUGFIX START ---
// 修正点 3: 调整 getEmployeeDetails 逻辑，使其能正确处理找不到或找到多个用户的情况
async function getEmployeeDetails(args, userProfile, supabase) {
  console.log(`getEmployeeDetails called with args:`, args);
  let query = supabase.from('view_employee_basic_info').select('*', { count: 'exact' });
  
  if (args.employeeId) {
    console.log(`Querying by employee_id: ${args.employeeId}`);
    query = query.eq('employee_id', args.employeeId);
  } else if (args.employeeName) {
    console.log(`Querying by employee_name: ${args.employeeName}`);
    query = query.eq('employee_name', args.employeeName);
  } else {
    throw new Error('需要提供员工ID或员工姓名');
  }

  // 员工只能查自己
  if (userProfile.role === 'employee') {
    query = query.eq('employee_id', userProfile.employee_id);
  }

  const { data, error, count } = await query;
  console.log(`Query result: count=${count}, error=${error?.message}, dataLength=${data?.length}`);

  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  if (count === 0) {
    return { success: false, message: `数据库中未找到名为 "${args.employeeName || args.employeeId}" 的员工。` };
  }

  if (count > 1) {
    return { success: false, message: `数据库中找到 ${count} 位名叫 "${args.employeeName}" 的员工，请提供更精确的信息（如部门）以便查询。` };
  }

  const maskedData = maskSensitiveEmployeeData(data[0], userProfile);
  console.log(`getEmployeeDetails returning success with employee: ${maskedData.employee_name}`);
  return { success: true, data: maskedData };
}
// --- BUGFIX END ---

async function getEmployeeStats(args, userProfile, supabase) {
  if (!['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    throw new Error('权限不足，无法访问统计信息');
  }
  const groupBy = args.groupBy || 'department';
  
  // 根据不同的分组字段构造查询
  let selectFields;
  if (groupBy === 'gender') {
    // 性别统计使用 gender 字段（不是 gender_name）
    selectFields = 'gender, employment_status';
  } else if (groupBy === 'latest_degree') {
    // 学历统计使用 latest_degree 字段（不是 latest_degree_name）
    selectFields = 'latest_degree, employment_status';
  } else {
    // 其他字段使用 _name 后缀
    selectFields = `${groupBy}_name, employment_status`;
  }
  
  let query = supabase.from('view_employee_basic_info').select(selectFields);
  const { data, error } = await query;
  if (error) throw new Error(`Database query error: ${error.message}`);
  if (!data || data.length === 0) return { success: true, stats: {}, totalEmployees: 0 };
  
  const stats = data.reduce((acc, item) => {
    // 根据分组类型获取正确的字段值
    let key;
    if (groupBy === 'gender') {
      key = item.gender || '未知';
      // 将英文性别转换为中文显示
      if (key === 'male') key = '男';
      else if (key === 'female') key = '女';
    } else if (groupBy === 'latest_degree') {
      key = item.latest_degree || '未知';
      // 如果需要，可以在这里添加学历的中文转换逻辑
    } else {
      key = item[`${groupBy}_name`] || '未分配';
    }
    
    if (!acc[key]) acc[key] = { total: 0, active: 0, inactive: 0 };
    acc[key].total++;
    if (item.employment_status === 'active') acc[key].active++; else acc[key].inactive++;
    return acc;
  }, {});
  return { success: true, groupBy, stats, totalEmployees: data.length };
}

// === 薪资查询工具实现 ===

// 获取员工薪资信息
async function getEmployeeSalary(args, userProfile, supabase) {
  // 权限检查：只有特定角色可以查看薪资信息
  if (!['super_admin', 'admin', 'hr_manager'].includes(userProfile.role)) {
    // 员工只能查看自己的薪资
    if (userProfile.role === 'employee') {
      if (!userProfile.employee_id) {
        throw new Error('员工身份验证失败，无法查询薪资信息');
      }
    } else {
      throw new Error('权限不足，无法访问薪资信息');
    }
  }

  console.log(`getEmployeeSalary called with args:`, args);
  
  let query = supabase.from('view_payroll_summary').select(`
    payroll_id, employee_name, department_name, position_name,
    period_name, period_start, period_end, scheduled_pay_date, actual_pay_date,
    gross_pay, total_deductions, net_pay, payroll_status,
    created_at, updated_at
  `);

  // 查询条件
  if (args.employeeId) {
    query = query.eq('employee_id', args.employeeId);
  } else if (args.employeeName) {
    query = query.eq('employee_name', args.employeeName);
  } else if (args.compareAll) {
    // 查询所有员工进行薪资比较（仅限管理层）
    if (!['super_admin', 'admin', 'hr_manager'].includes(userProfile.role)) {
      throw new Error('权限不足，无法查询所有员工薪资');
    }
    // 不添加员工筛选条件，查询所有员工
  } else if (userProfile.role === 'employee') {
    // 员工只能查看自己的薪资
    query = query.eq('employee_id', userProfile.employee_id);
  } else {
    throw new Error('需要提供员工ID、员工姓名，或设置compareAll为true以比较所有员工');
  }

  // 期间筛选
  if (args.period) {
    query = query.ilike('period_name', `%${args.period}%`);
  }

  // 部门筛选
  if (args.department) {
    query = query.ilike('department_name', `%${args.department}%`);
  }

  // 状态筛选
  if (args.status) {
    query = query.eq('payroll_status', args.status);
  }

  // 限制结果数量
  if (args.compareAll) {
    // 比较所有员工时，限制为最近一个期间
    if (!args.period) {
      query = query.eq('period_name', '2025年8月'); // 查询最新期间
    }
    const limit = Math.min(args.limit || 100, 200); // 允许更多员工数据
    query = query.order('gross_pay', { ascending: false }).limit(limit);
  } else {
    const limit = Math.min(args.limit || 12, 24); // 最多查询2年数据
    query = query.order('period_start', { ascending: false }).limit(limit);
  }

  const { data, error, count } = await query;
  
  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    const employeeName = args.employeeName || args.employeeId || '该员工';
    return { 
      success: false, 
      message: `未找到 ${employeeName} 的薪资记录。可能的原因：员工不存在、没有薪资记录或指定期间无数据。`
    };
  }

  // 敏感数据处理：根据用户角色决定是否展示完整薪资信息
  const maskedData = data.map(salary => maskSensitiveSalaryData(salary, userProfile));
  
  return { 
    success: true, 
    count: maskedData.length, 
    data: maskedData,
    employee_name: data[0].employee_name,
    department_name: data[0].department_name
  };
}

// 获取部门薪资统计
async function getDepartmentSalaryStats(args, userProfile, supabase) {
  // 权限检查：管理层角色才能查看部门薪资统计
  if (!['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    throw new Error('权限不足，无法访问部门薪资统计信息');
  }

  console.log(`getDepartmentSalaryStats called with args:`, args);
  
  let query = supabase.from('view_department_payroll_statistics').select(`
    department_name, period_name, period_code,
    pay_year, pay_month, employee_count,
    total_gross_pay, total_deductions, total_net_pay,
    avg_gross_pay, avg_net_pay, max_gross_pay, min_gross_pay
  `);

  // 部门筛选
  if (args.department) {
    query = query.ilike('department_name', `%${args.department}%`);
  }

  // 期间筛选
  if (args.period) {
    query = query.ilike('period_name', `%${args.period}%`);
  } else {
    // 默认查询最近3个月的数据
    query = query.gte('pay_year', new Date().getFullYear() - 1);
  }

  // 只查询有数据的记录
  query = query.gt('employee_count', 0);

  const limit = Math.min(args.limit || 20, 50);
  query = query.order('period_name', { ascending: false })
               .order('total_gross_pay', { ascending: false })
               .limit(limit);

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { 
      success: false, 
      message: '未找到符合条件的部门薪资统计数据。' 
    };
  }

  return { 
    success: true, 
    count: data.length, 
    data: data,
    summary: {
      periods_covered: [...new Set(data.map(d => d.period_name))].length,
      departments_covered: [...new Set(data.map(d => d.department_name))].length,
      total_employees: data.reduce((sum, d) => sum + (d.employee_count || 0), 0)
    }
  };
}

// 获取薪资趋势分析
async function getSalaryTrends(args, userProfile, supabase) {
  // 权限检查：管理层角色才能查看薪资趋势
  if (!['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    throw new Error('权限不足，无法访问薪资趋势分析');
  }

  console.log(`getSalaryTrends called with args:`, args);
  
  let query = supabase.from('view_payroll_trend_unified').select(`
    period_id, period_name, pay_year, period_month,
    pay_month, pay_month_string, employee_count,
    total_gross_pay, total_net_pay, total_deductions,
    avg_gross_pay, avg_net_pay, min_gross_pay, max_gross_pay,
    is_current_month, is_current_year, is_recent_12_months,
    employee_count_last_year, total_gross_pay_last_year,
    employee_count_last_month, total_gross_pay_last_month
  `);

  // 时间范围筛选
  if (args.timeRange) {
    switch (args.timeRange) {
      case 'recent_12_months':
        query = query.eq('is_recent_12_months', true);
        break;
      case 'current_year':
        query = query.eq('is_current_year', true);
        break;
      case 'last_year':
        query = query.eq('pay_year', new Date().getFullYear() - 1);
        break;
      default:
        query = query.eq('is_recent_12_months', true);
    }
  } else {
    // 默认查询最近12个月
    query = query.eq('is_recent_12_months', true);
  }

  // 只查询有数据的记录
  query = query.gt('employee_count', 0);

  query = query.order('pay_month', { ascending: false });

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { 
      success: false, 
      message: '未找到符合条件的薪资趋势数据。' 
    };
  }

  // 计算趋势指标
  const trendAnalysis = calculateTrendMetrics(data);

  return { 
    success: true, 
    count: data.length, 
    data: data,
    trend_analysis: trendAnalysis,
    time_range: args.timeRange || 'recent_12_months'
  };
}

// 薪资数据脱敏处理
function maskSensitiveSalaryData(salary, userProfile) {
  const masked = { ...salary };
  
  // 超级管理员和管理员可以看到完整薪资信息
  if (['super_admin', 'admin'].includes(userProfile.role)) {
    return masked;
  }
  
  // HR经理可以看到部分薪资信息
  if (userProfile.role === 'hr_manager') {
    return masked; // HR经理目前也可以看到完整信息
  }
  
  // 员工只能看到自己的完整薪资，其他人的薪资会脱敏
  if (userProfile.role === 'employee') {
    return masked; // 员工查询工具已经限制只能查自己的薪资
  }
  
  // 其他角色（如普通管理者）看到的薪资信息会部分脱敏
  if (masked.gross_pay) {
    const grossPay = parseFloat(masked.gross_pay);
    masked.gross_pay_range = getSalaryRange(grossPay);
    delete masked.gross_pay;
    delete masked.net_pay;
    delete masked.total_deductions;
  }
  
  return masked;
}

// 获取薪资范围（用于脱敏显示）
function getSalaryRange(salary) {
  if (salary < 5000) return '5000以下';
  if (salary < 8000) return '5000-8000';
  if (salary < 12000) return '8000-12000';
  if (salary < 18000) return '12000-18000';
  if (salary < 25000) return '18000-25000';
  return '25000以上';
}

// 计算薪资趋势指标
function calculateTrendMetrics(data) {
  if (!data || data.length < 2) {
    return { trend: '数据不足', growth_rate: 0 };
  }

  const sortedData = data.sort((a, b) => a.pay_month.localeCompare(b.pay_month));
  const latest = sortedData[sortedData.length - 1];
  const previous = sortedData[sortedData.length - 2];
  
  const latestAvg = parseFloat(latest.avg_gross_pay || 0);
  const previousAvg = parseFloat(previous.avg_gross_pay || 0);
  
  const growthRate = previousAvg > 0 ? ((latestAvg - previousAvg) / previousAvg * 100) : 0;
  
  let trend = '稳定';
  if (growthRate > 5) trend = '上升';
  else if (growthRate < -5) trend = '下降';
  
  return {
    trend,
    growth_rate: parseFloat(growthRate.toFixed(2)),
    latest_period: latest.pay_month_string,
    latest_avg_salary: latestAvg,
    employee_count_change: (latest.employee_count || 0) - (previous.employee_count || 0)
  };
}

function maskSensitiveEmployeeData(employee, userProfile) {
  const masked = { ...employee };
  if (!['super_admin', 'admin'].includes(userProfile.role) || (userProfile.role === 'employee' && masked.employee_id !== userProfile.employee_id)) {
    if (masked.id_number) masked.id_number = masked.id_number.slice(0, 6) + '****' + masked.id_number.slice(-4);
    if (masked.bank_account_number) masked.bank_account_number = '****' + masked.bank_account_number.slice(-4);
    if (masked.mobile_phone) masked.mobile_phone = masked.mobile_phone.slice(0, 3) + '****' + masked.mobile_phone.slice(-4);
  }
  return masked;
}

async function defineUserTools(userProfile, supabase) {
  const tools = [];
  
  tools.push({
    name: 'searchEmployees',
    description: `【员工搜索工具】用于搜索和列出多个员工或按条件筛选员工列表。适用于群体查询和条件筛选（非薪资相关）。
触发场景: "技术部有多少人？", "列出所有在职的女性员工", "公司有多少人？", "搜索姓张的员工"
关键词: 列出, 搜索, 有多少, 全部, 所有, 群体, 筛选, 条件查询
重要约束: 
- 此工具【不包含薪资信息】，只用于查找员工基本信息
- 如果用户询问工资、薪资、收入等，应使用薪资相关工具
- 如果用户要查看单个具体员工的详细信息，应使用 getEmployeeDetails 工具`,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '员工姓名。支持模糊匹配。例如用户问"张伟"，就传入"张伟"。用于搜索包含此姓名的所有员工。' },
        department: { type: 'string', description: '部门名称。支持模糊匹配。例如用户问"技术部的员工"，就传入"技术"。' },
        position: { type: 'string', description: '职位名称。支持模糊匹配。例如用户问"所有经理"，就传入"经理"。' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'all'],
          description: `根据员工的在职状态进行筛选。如果用户提到 "在职", "还在工作的" -> 使用 'active'；用户提到 "离职", "已经走了的" -> 使用 'inactive'；用户没有明确指定或提到 "所有" -> 使用 'all'`,
          default: 'active'
        },
        limit: { type: 'integer', description: '查询结果数量限制，默认10', default: 10 }
      }
    }
  });

  tools.push({
    name: 'getEmployeeDetails',
    description: `【单个员工详情工具】获取特定员工的完整详细档案信息。当用户查询单个具体员工的信息时使用。
触发场景: "李庆的信息", "查看张三的详细资料", "王五的档案", "某某员工的具体情况"
关键词: 具体员工姓名, 信息, 详细, 档案, 资料, 情况, 的, 查看
使用原则: 当用户明确提到一个具体员工姓名并想了解其信息时，优先使用此工具。`,
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: '员工的唯一标识ID（UUID格式）。如果上下文已经提到了某个员工的ID，必须使用此参数进行精确查询。'
        },
        employeeName: {
          type: 'string',
          description: '员工的完整姓名，这是当用户通过姓名查询时的【首选参数】。你应该【直接使用】用户提供的姓名尝试调用此工具。只有当工具执行失败（例如，因为找不到该姓名或找到多个同名者）时，你才应该向用户请求更多信息，如部门或员工ID。'
        }
      },
      oneOf: [
        { title: 'Query by Employee ID', required: ['employeeId'] },
        { title: 'Query by Employee Name', required: ['employeeName'] }
      ]
    }
  });

  if (['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    tools.push({
      name: 'getEmployeeStats',
      description: `【统计专用】对员工数据进行分组统计和分析。当用户的问题涉及"分布"、"比例"、"统计"、"总数"、"分别是多少"等时，必须使用此工具。
触发场景: "统计一下各个部门的人数", "男女比例是多少？", "不同学历的员工分布情况"
关键词: 统计, 分布, 比例, 各个, 总计, 数量, 分析
约束: 不要用此工具查找单个员工，那是 searchEmployees 的工作。`,
      parameters: {
        type: 'object',
        properties: {
          groupBy: {
            type: 'string',
            enum: ['department', 'position', 'latest_degree', 'gender', 'category'],
            description: `统计分析的维度。根据用户问题智能选择：
- 用户问及"部门" -> 'department'
- 用户问及"职位", "岗位" -> 'position'
- 用户问及"学历", "教育背景" -> 'latest_degree'
- 用户问及"性别", "男女" -> 'gender'
- 用户问及"员工类型", "编制" -> 'category'`,
            default: 'department'
          }
        },
        required: ['groupBy']
      }
    });
  }

  // === 薪资相关工具定义 ===
  
  // 个人薪资查询工具 - HR管理层使用
  if (['super_admin', 'admin', 'hr_manager'].includes(userProfile.role)) {
    tools.push({
      name: 'getEmployeeSalary',
      description: `【员工薪资查询】获取特定员工的薪资记录和明细信息。适用于查询个人薪资历史和薪资详情。当需要知道具体员工的薪资数额时使用。
触发场景: "李庆的薪资", "查看张三8月份工资", "某某员工的薪资记录", "工资明细", "谁的工资最高", "薪资最高的是谁", "综合处谁工资最高", "技术部薪资最高的员工"
关键词: 薪资, 工资, 工资单, 薪水, 收入, 月薪, 薪资记录, 谁的工资, 工资最高, 最高薪资
重要说明: 当用户询问"谁的工资最高"等比较性问题时，需要查询具体员工薪资进行比较
使用限制: 只有HR管理层可以查询其他员工薪资，普通员工只能查询自己的薪资。`,
      parameters: {
        type: 'object',
        properties: {
          employeeId: {
            type: 'string',
            description: '员工的唯一标识ID（UUID格式）。优先使用此参数进行精确查询。'
          },
          employeeName: {
            type: 'string',
            description: '员工姓名。当没有员工ID时使用姓名查询。'
          },
          period: {
            type: 'string',
            description: '薪资期间筛选，如"2025年8月"、"2024年"、"8月"等。不提供则查询所有期间。'
          },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'paid'],
            description: '薪资状态筛选。不提供则查询所有状态。'
          },
          limit: {
            type: 'integer',
            description: '查询结果数量限制，默认12个月，最多24个月',
            default: 12
          },
          compareAll: {
            type: 'boolean',
            description: '设置为true时查询所有员工薪资进行比较。用于回答"谁的工资最高"等问题。'
          },
          department: {
            type: 'string',
            description: '部门名称筛选。与compareAll一起使用时，可查询特定部门内薪资最高的员工。如"综合处谁工资最高"。'
          }
        },
        anyOf: [
          { title: 'Query by Employee ID', required: ['employeeId'] },
          { title: 'Query by Employee Name', required: ['employeeName'] },
          { title: 'Query all employees for comparison', properties: { compareAll: { type: 'boolean', const: true } } }
        ]
      }
    });
  }

  // 员工自查薪资工具
  if (userProfile.role === 'employee') {
    tools.push({
      name: 'getEmployeeSalary',
      description: `【我的薪资查询】查看自己的薪资记录和工资明细。员工只能查询自己的薪资信息。
触发场景: "我的薪资", "我的工资", "查看我的工资单", "我8月份的工资"
关键词: 我的薪资, 我的工资, 我的收入, 工资单
权限说明: 员工只能查询自己的薪资信息，无法查看其他员工的薪资。`,
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: '薪资期间筛选，如"2025年8月"、"2024年"、"8月"等。不提供则查询所有期间。'
          },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'paid'],
            description: '薪资状态筛选。不提供则查询所有状态。'
          },
          limit: {
            type: 'integer',
            description: '查询结果数量限制，默认12个月，最多24个月',
            default: 12
          }
        }
      }
    });
  }

  // 部门薪资统计工具 - 管理层使用
  if (['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    tools.push({
      name: 'getDepartmentSalaryStats',
      description: `【部门薪资统计】获取部门级别的薪资统计分析数据，包括平均薪资、薪资分布等。当用户询问部门的工资、薪资情况时必须使用此工具。
触发场景: "各部门薪资统计", "技术部平均工资", "部门薪资对比", "薪资成本分析", "综合处所有员工的工资", "XX部门工资情况"
关键词: 部门薪资, 平均工资, 薪资统计, 薪资成本, 部门对比, 薪资分布, 工资, 薪水, 收入, 部门工资
重要提醒: 当用户询问"某部门的工资"、"某部门所有员工的薪资"时，应优先使用此工具而不是员工搜索工具
管理价值: 帮助管理层了解各部门薪资水平和成本控制情况。`,
      parameters: {
        type: 'object',
        properties: {
          department: {
            type: 'string',
            description: '部门名称筛选，支持模糊匹配。如"技术部"、"财政"等。不提供则查询所有部门。'
          },
          period: {
            type: 'string',
            description: '薪资期间筛选，如"2025年8月"、"2024年"等。不提供则查询最近几个月。'
          },
          limit: {
            type: 'integer',
            description: '查询结果数量限制，默认20，最多50',
            default: 20
          }
        }
      }
    });

    tools.push({
      name: 'getSalaryTrends',
      description: `【薪资趋势分析】分析薪资的时间趋势变化，包括环比增长、同比分析等关键指标。
触发场景: "薪资趋势分析", "工资增长情况", "薪资变化趋势", "年度薪资对比"
关键词: 薪资趋势, 工资增长, 薪资变化, 同比, 环比, 趋势分析
分析价值: 为管理决策提供薪资发展趋势和增长率等关键数据洞察。`,
      parameters: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['recent_12_months', 'current_year', 'last_year'],
            description: `时间范围选择：
- recent_12_months: 最近12个月（默认）
- current_year: 当前年度
- last_year: 上一年度`,
            default: 'recent_12_months'
          }
        }
      }
    });
  }
  
  return tools;
}

// 根据工具类型生成针对性的AI提示词
function generateAIPrompt(toolName, toolResult, userQuery) {
  const baseInstruction = "请用中文回答，语言自然流畅。**重要格式要求**：请使用Markdown格式来组织回复，包括表格、标题、列表等，使信息更清晰易读。";
  
  switch (toolName) {
    case 'getEmployeeDetails':
      return `用户查询了特定员工的详细信息。请基于以下员工详情数据，用自然语言为用户介绍这位员工的基本信息。${baseInstruction}

员工详情数据：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 员工详细信息"作为标题开头
2. 使用表格格式展示员工基本信息（姓名、部门、职位、状态等）
3. 如果有联系方式或其他详细信息，使用有序列表展示
4. 最后用一段话总结该员工的主要情况

示例格式：
## 员工详细信息

| 项目 | 详情 |
|------|------|
| 姓名 | XXX |
| 部门 | XXX |
| 职位 | XXX |
| 状态 | 在职/离职 |

### 联系方式
- 📞 电话：XXX
- 📧 邮箱：XXX

总结该员工的工作情况和关键信息。`;

    case 'searchEmployees':
      return `用户执行了员工搜索查询。请基于以下搜索结果，用自然语言总结搜索到的员工信息和统计情况。${baseInstruction}

搜索结果数据：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 🔍 员工搜索结果"作为标题
2. 先用醒目的方式显示搜索统计（找到X位员工）
3. 使用表格展示员工列表，包含关键信息列
4. 如果结果较多，可按部门或职位分组展示
5. 最后提供搜索结果的简要分析

示例格式：
## 🔍 员工搜索结果

> **搜索结果**：共找到 **X** 位符合条件的员工

| 姓名 | 部门 | 职位 | 状态 | 入职年限 |
|------|------|------|------|----------|
| XXX  | XXX  | XXX  | ✅在职 | X年 |

### 📊 搜索结果分析
- 部门分布情况
- 职位层级分布
- 其他关键发现`;

    case 'getEmployeeStats':
      return `用户请求了员工统计分析。请基于以下统计数据，用自然语言分析和解释统计结果。${baseInstruction}

统计分析数据：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 📊 员工统计分析报告"作为标题
2. 用醒目的方式显示总体统计数据
3. 使用表格展示各分组的详细数据
4. 添加数据可视化描述（如百分比、趋势等）
5. 最后提供管理建议或关键洞察

示例格式：
## 📊 员工统计分析报告

> **总体概况**：系统中共有 **X** 名员工

### 详细分布

| 分组名称 | 总人数 | 在职人数 | 离职人数 | 占比 |
|----------|--------|----------|----------|------|
| XXX | X | X | X | X% |

### 💡 关键发现
- 🏢 最大部门：XXX（X人，占比X%）
- 📈 人员状态：在职率X%
- 🎯 管理建议：基于数据的建议

### 📈 数据解读
对统计结果进行业务角度的分析和解释。`;

    case 'getEmployeeSalary':
      return `用户查询了员工的薪资信息。请基于以下薪资数据，用专业的方式展示员工的薪资详情。${baseInstruction}

薪资数据：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 💰 员工薪资查询结果"作为标题
2. 显示员工基本信息（姓名、部门、职位）
3. 使用表格展示薪资明细列表（按时间倒序）
4. 如果有多个月份，展示薪资变化趋势
5. 提供薪资统计摘要（平均薪资、最高最低等）

示例格式：
## 💰 员工薪资查询结果

**员工信息**：${toolResult.employee_name || '[员工姓名]'} | ${toolResult.department_name || '[部门]'}

### 📋 薪资明细

| 期间 | 应发工资 | 扣除合计 | 实发工资 | 状态 |
|------|----------|----------|----------|------|
| 2025年8月 | ¥15,000 | ¥3,000 | ¥12,000 | ✅已发放 |

### 📊 薪资统计
- 💼 **查询期间**：X个月薪资记录
- 💰 **平均实发**：¥X,XXX
- 📈 **最高月份**：XXXX年X月（¥X,XXX）
- 📉 **最低月份**：XXXX年X月（¥X,XXX）`;

    case 'getDepartmentSalaryStats':
      return `用户查询了部门薪资统计信息。请基于以下部门薪资统计数据，提供专业的薪资分析报告。${baseInstruction}

部门薪资统计：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 🏢 部门薪资统计分析"作为标题
2. 显示统计概览（涵盖期间、部门数量、员工总数）
3. 使用表格展示各部门详细数据
4. 提供部门间薪资对比分析
5. 给出管理建议和关键洞察

示例格式：
## 🏢 部门薪资统计分析

> **统计概览**：涵盖 **X个部门** • **X个期间** • **总计X名员工**

### 📊 部门薪资详情

| 部门名称 | 期间 | 人数 | 总薪资 | 平均薪资 | 最高薪资 | 最低薪资 |
|----------|------|------|--------|----------|----------|----------|
| 技术部 | 2025年8月 | 15 | ¥180,000 | ¥12,000 | ¥18,000 | ¥8,000 |

### 💡 管理洞察
- 🏆 **薪资最高部门**：XXX（平均¥X,XXX）
- 💰 **薪资成本最大**：XXX（总计¥X,XXX）
- 📊 **人均效率对比**：分析各部门人效情况
- 🎯 **管理建议**：基于数据的薪资管理建议`;

    case 'getSalaryTrends':
      return `用户查询了薪资趋势分析。请基于以下趋势数据，提供专业的薪资发展分析报告。${baseInstruction}

薪资趋势数据：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：
1. 以"## 📈 薪资趋势分析报告"作为标题
2. 显示趋势概览（时间范围、趋势方向、增长率）
3. 使用表格展示各月份详细数据
4. 提供趋势图表描述和关键变化点
5. 给出趋势预测和战略建议

示例格式：
## 📈 薪资趋势分析报告

> **趋势概览**：${toolResult.time_range || '最近12个月'} • 趋势${toolResult.trend_analysis?.trend || '稳定'} • 增长率${toolResult.trend_analysis?.growth_rate || 0}%

### 📊 月度薪资数据

| 月份 | 员工人数 | 平均薪资 | 总薪资 | 环比变化 |
|------|----------|----------|--------|----------|
| 2025年8月 | 53 | ¥14,397 | ¥763,049 | +5.2% |

### 🔍 趋势分析
- 📈 **总体趋势**：${toolResult.trend_analysis?.trend || '数据分析中'}
- 💹 **增长率**：${toolResult.trend_analysis?.growth_rate || 0}%
- 👥 **人员变化**：${toolResult.trend_analysis?.employee_count_change || 0}人
- 🎯 **预测建议**：基于趋势数据的战略建议`;

    default:
      return `基于以下数据查询结果，用自然语言回答用户的问题。${baseInstruction}

查询结果：
${JSON.stringify(toolResult, null, 2)}

用户问题：${userQuery}

**格式要求**：请使用适当的Markdown格式（标题、表格、列表、强调等）来组织回复，确保信息清晰易读。`;
  }
}

// 根据工具类型生成fallback响应（Markdown格式）
function generateFallbackResponse(toolName, toolResult, userQuery) {
  try {
    switch (toolName) {
      case 'getEmployeeDetails':
        if (toolResult?.data?.employee_name) {
          return `## 员工详细信息

| 项目 | 详情 |
|------|------|
| 姓名 | ${toolResult.data.employee_name} |
| 部门 | ${toolResult.data.department_name || '未知'} |
| 职位 | ${toolResult.data.position_name || '未知'} |
| 状态 | ${toolResult.data.employment_status === 'active' ? '✅ 在职' : '❌ 离职'} |
${toolResult.data.mobile_phone ? `| 电话 | 📞 ${toolResult.data.mobile_phone} |\n` : ''}${toolResult.data.latest_degree ? `| 学历 | 🎓 ${toolResult.data.latest_degree} |\n` : ''}${toolResult.data.years_of_service ? `| 工作年限 | ⏱️ ${toolResult.data.years_of_service}年 |\n` : ''}

> ✅ 已成功获取员工基本信息`;
        }
        return '## ℹ️ 查询结果\n\n已找到员工信息，详细内容请参考查询结果。';
        
      case 'searchEmployees':
        if (toolResult?.data && Array.isArray(toolResult.data)) {
          const count = toolResult.data.length;
          if (count === 0) {
            return '## 🔍 员工搜索结果\n\n> ❌ **搜索结果**：未找到符合条件的员工\n\n建议调整搜索条件后重新尝试。';
          }
          return `## 🔍 员工搜索结果

> ✅ **搜索结果**：共找到 **${count}** 位符合条件的员工

搜索结果包含了员工的基本信息，包括：
- 👤 员工姓名
- 🏢 所属部门  
- 💼 职位信息
- 📊 工作状态
- 📞 联系方式

### 💡 提示
如需查看更详细的员工信息，可以点击具体员工进行查询。`;
        }
        return '## ✅ 搜索完成\n\n员工搜索已完成，请查看搜索结果。';
        
      case 'getEmployeeStats':
        if (toolResult?.stats && toolResult?.totalEmployees) {
          const stats = toolResult.stats;
          const total = toolResult.totalEmployees;
          const groupBy = toolResult.groupBy || 'department';
          
          let response = `## 📊 员工统计分析报告

> **总体概况**：系统中共有 **${total}** 名员工

### 详细分布

| 分组名称 | 总人数 | 在职人数 | 离职人数 | 在职率 |
|----------|--------|----------|----------|--------|`;
          
          Object.entries(stats).forEach(([name, data]: [string, any]) => {
            const activeRate = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;
            response += `\n| ${name} | ${data.total} | ${data.active} | ${data.inactive} | ${activeRate}% |`;
          });
          
          // 计算总体在职率
          const totalActive = Object.values(stats).reduce((sum: number, data: any) => sum + data.active, 0);
          const overallActiveRate = total > 0 ? Math.round((totalActive / total) * 100) : 0;
          
          response += `

### 💡 关键发现
- 📈 **总体在职率**：${overallActiveRate}%
- 🏢 **分组数量**：共${Object.keys(stats).length}个${groupBy === 'department' ? '部门' : '分组'}
- 👥 **活跃员工**：${totalActive}人正在职`;

          return response;
        }
        return '## 📊 统计分析完成\n\n统计分析已完成，数据包含员工分布和数量信息。';
        
      case 'getEmployeeSalary':
        if (toolResult?.data && Array.isArray(toolResult.data) && toolResult.data.length > 0) {
          const employeeName = toolResult.employee_name || '该员工';
          const count = toolResult.data.length;
          return `## 💰 员工薪资查询结果

> ✅ **查询结果**：已找到 **${employeeName}** 的 **${count}** 个月薪资记录

### 📋 薪资概览
- 👤 **员工**：${employeeName}
- 🏢 **部门**：${toolResult.department_name || '未知'}
- 📅 **记录期间**：${count}个月
- 💰 **最新薪资状态**：已获取薪资明细

### 💡 温馨提示
薪资数据已成功获取，包含应发工资、扣除项目、实发金额等详细信息。`;
        }
        return '## 💰 薪资查询完成\n\n薪资查询已完成，相关数据已获取。';

      case 'getDepartmentSalaryStats':
        if (toolResult?.data && Array.isArray(toolResult.data) && toolResult.summary) {
          const summary = toolResult.summary;
          return `## 🏢 部门薪资统计分析

> ✅ **统计概览**：涵盖 **${summary.departments_covered}个部门** • **${summary.periods_covered}个期间** • **总计${summary.total_employees}名员工**

### 📊 统计摘要
- 🏢 **部门数量**：${summary.departments_covered}个
- 📅 **统计期间**：${summary.periods_covered}个月份
- 👥 **员工总数**：${summary.total_employees}人
- 💰 **数据完整性**：已获取完整薪资统计数据

### 💡 分析价值
统计结果包含各部门的薪资水平、成本分布、人员规模等关键管理指标，为薪资管理决策提供数据支持。`;
        }
        return '## 🏢 部门统计完成\n\n部门薪资统计已完成，相关数据已获取。';

      case 'getSalaryTrends':
        if (toolResult?.data && Array.isArray(toolResult.data) && toolResult.trend_analysis) {
          const trend = toolResult.trend_analysis;
          const count = toolResult.data.length;
          return `## 📈 薪资趋势分析报告

> ✅ **趋势概览**：${toolResult.time_range || '最近12个月'} • 总体趋势**${trend.trend}** • 增长率**${trend.growth_rate}%**

### 📊 趋势摘要
- 📅 **分析期间**：${count}个月数据
- 📈 **趋势方向**：${trend.trend}
- 💹 **增长率**：${trend.growth_rate}%
- 👥 **人员变化**：${trend.employee_count_change > 0 ? '+' : ''}${trend.employee_count_change}人
- 💰 **最新平均薪资**：¥${trend.latest_avg_salary?.toFixed(0) || 'N/A'}

### 🔍 关键发现
薪资趋势分析已完成，数据显示了组织薪资水平的发展轨迹和变化趋势，为薪资策略调整提供重要参考。`;
        }
        return '## 📈 趋势分析完成\n\n薪资趋势分析已完成，相关数据已获取。';
        
      default:
        return `## ✅ 查询完成

查询任务 \`${toolName}\` 已成功完成，相关数据已获取。

> ⚠️ **提示**：由于技术原因无法生成详细解释，请直接查看查询结果数据。`;
    }
  } catch (error) {
    console.error('Error generating fallback response:', error);
    return `## ❌ 处理异常

查询已完成，但生成回复时遇到问题。

> 🔍 **建议**：请查看查询结果数据或重新发起查询。`;
  }
}
