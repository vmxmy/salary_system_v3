// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// AI Agent Request/Response Types
interface PersistentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sessionId: string
}

interface AIRequest {
  query: string
  sessionId: string
  messageHistory?: PersistentMessage[] // 添加消息历史支持
  context?: Record<string, any>
}

interface AIResponse {
  response: string
  sessionId: string
  toolsUsed?: string[]
  metadata?: Record<string, any>
}

interface UserProfile {
  user_id: string
  role: string
  employee_id?: string
  employee_name?: string
  is_active: boolean
}

console.log('🚀 AI Agent Function started!', new Date().toISOString())

Deno.serve(async (req: Request) => {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`
  console.log(`\n🎯 [${requestId}] New request started at ${new Date().toISOString()}`)
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight request handled`)
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ [${requestId}] Method not allowed: ${req.method}`)
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`📝 [${requestId}] POST request received from ${req.headers.get('origin') || 'unknown'}`)

  try {
    // Parse request body
    console.log(`📦 [${requestId}] Parsing request body...`)
    const requestBody: AIRequest = await req.json()
    const { query, sessionId, messageHistory = [], context } = requestBody

    console.log(`📋 [${requestId}] Request details:`, {
      query: query?.substring(0, 50) + (query?.length > 50 ? '...' : ''),
      sessionId,
      messageHistoryLength: messageHistory.length,
      hasContext: !!context
    })

    if (!query || !sessionId) {
      console.log(`❌ [${requestId}] Missing required fields: query=${!!query}, sessionId=${!!sessionId}`)
      return new Response(
        JSON.stringify({ 
          error: 'Query and sessionId are required',
          requestId,
          received: { query: !!query, sessionId: !!sessionId }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Authentication
    console.log(`🔐 [${requestId}] Checking authentication...`)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log(`❌ [${requestId}] No authorization header provided`)
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header required',
          requestId 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔑 [${requestId}] Auth header present: ${authHeader.substring(0, 20)}...`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user profile and permissions from user_roles and employees tables
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'User role not found or inactive' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get employee information if available
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_name')
      .eq('user_id', user.id)
      .eq('employment_status', 'active')
      .maybeSingle()

    const userProfile: UserProfile = {
      user_id: user.id,
      role: userRole.role,
      is_active: userRole.is_active,
      employee_id: employee?.id,
      employee_name: employee?.employee_name || 'Unknown User'
    }

    console.log(`👤 [${requestId}] AI request from user: ${userProfile.employee_name} (${userProfile.role})`)
    console.log(`💭 [${requestId}] Message history length: ${messageHistory.length}`)
    
    // 特殊处理：如果是简单的问候语，先记录日志再处理
    if (['hi', 'hello', '你好', 'hey'].includes(query.toLowerCase().trim())) {
      console.log(`👋 [${requestId}] Greeting detected: "${query}" - proceeding with full AI processing`)
      console.log(`🧪 [${requestId}] This is a test query to verify logs are working`)
    }

    // Use Google Gemini API for free AI inference
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!geminiApiKey) {
      const errorDetail = {
        error: 'AI service configuration missing',
        message: 'Google Gemini API key not configured',
        code: 'GEMINI_API_KEY_MISSING',
        timestamp: new Date().toISOString(),
        solution: 'Please configure GOOGLE_GEMINI_API_KEY environment variable in Supabase project settings'
      }
      
      console.error('GOOGLE_GEMINI_API_KEY environment variable not set')
      console.error('Available environment variables:', Object.keys(Deno.env.toObject()).filter(k => !k.includes('SECRET')))
      
      return new Response(
        JSON.stringify(errorDetail),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Gemini API key configured:', geminiApiKey ? `${geminiApiKey.slice(0, 10)}...` : 'MISSING')

    // Generate system prompt based on user role
    const systemPrompt = generateSystemPrompt(userProfile)

    // Define available tools based on user permissions
    const availableTools = await defineUserTools(userProfile, supabase)
    console.log(`Available tools for ${userProfile.role}:`, availableTools.map(t => t.name))

    // Process AI request using Google Gemini API with conversation history
    try {
      console.log(`Processing query: "${query}" for user: ${userProfile.employee_name}`)
      console.log(`System prompt: ${systemPrompt.slice(0, 200)}...`)
      
      // Build conversation contents with history
      const conversationContents = buildConversationHistory(systemPrompt, messageHistory, query)
      
      // Call Google Gemini API for AI inference with conversation history
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: conversationContents,
          tools: availableTools.length > 0 ? [{
            function_declarations: availableTools
          }] : undefined,
          tool_config: availableTools.length > 0 ? {
            function_calling_config: {
              mode: "AUTO"
            }
          } : undefined,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topK: 40,
            topP: 0.95
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      })

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text()
        let detailedError = `Gemini API error: ${geminiResponse.status} - ${geminiResponse.statusText}`
        
        try {
          const errorJson = JSON.parse(errorText)
          console.error('Gemini API detailed error:', JSON.stringify(errorJson, null, 2))
          
          // 提取具体错误信息
          if (errorJson.error) {
            detailedError += `\nError Code: ${errorJson.error.code || 'Unknown'}`
            detailedError += `\nError Message: ${errorJson.error.message || 'No message'}`
            
            // 常见错误的中文说明
            if (errorJson.error.code === 'API_KEY_INVALID') {
              detailedError += `\n问题：API密钥无效或已过期`
            } else if (errorJson.error.code === 'PERMISSION_DENIED') {
              detailedError += `\n问题：API权限不足或配额用尽`
            } else if (errorJson.error.code === 'QUOTA_EXCEEDED') {
              detailedError += `\n问题：API调用配额已用尽`
            } else if (errorJson.error.code === 'INVALID_REQUEST') {
              detailedError += `\n问题：请求格式无效`
            }
            
            if (errorJson.error.details) {
              detailedError += `\nDetails: ${JSON.stringify(errorJson.error.details)}`
            }
          }
        } catch (jsonError) {
          // 如果不是JSON格式的错误
          console.error('Raw Gemini API error text:', errorText)
          detailedError += `\nRaw Error: ${errorText}`
        }
        
        console.error('Complete Gemini error details:', detailedError)
        throw new Error(detailedError)
      }

      const geminiData = await geminiResponse.json()
      const candidate = geminiData.candidates?.[0]
      
      console.log('Gemini response structure:', JSON.stringify(candidate, null, 2))
      
      // Handle function calling response
      const functionCalls = candidate?.content?.parts?.filter((part: any) => part.functionCall)
      const textResponse = candidate?.content?.parts?.find((part: any) => part.text)?.text
      
      let finalResponse = textResponse || ''
      let toolsUsed: string[] = []
      
      // Execute function calls if present
      if (functionCalls && functionCalls.length > 0) {
        console.log(`Executing ${functionCalls.length} function calls`)
        
        for (const functionCall of functionCalls) {
          const toolName = functionCall.functionCall.name
          const toolArgs = functionCall.functionCall.args
          
          console.log(`Executing tool: ${toolName} with args:`, toolArgs)
          
          try {
            console.log(`[${toolName}] Starting tool execution...`)
            const toolResult = await executeTool(toolName, toolArgs, userProfile, supabase)
            console.log(`[${toolName}] Tool execution completed:`, JSON.stringify(toolResult, null, 2))
            toolsUsed.push(toolName)
            
            // Generate natural language response from tool result
            const responsePrompt = `基于以下数据查询结果，用自然语言回答用户的问题。请用中文回答，格式清晰易读：

查询结果：
${JSON.stringify(toolResult, null, 2)}

用户问题：${query}`

            console.log(`[${toolName}] Generating natural language response...`)
            const finalGeminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{ text: responsePrompt }]
                }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 1024  // 增加token限制
                }
              })
            })
            
            if (finalGeminiResponse.ok) {
              const finalData = await finalGeminiResponse.json()
              finalResponse = finalData.candidates?.[0]?.content?.parts?.[0]?.text || '查询完成，但无法生成回复。'
              console.log(`[${toolName}] Generated response:`, finalResponse.substring(0, 200) + '...')
            } else {
              const errorText = await finalGeminiResponse.text()
              console.error(`[${toolName}] Gemini response error:`, finalGeminiResponse.status, errorText)
              
              // 提供更智能的备用响应
              if (toolResult.departmentList) {
                finalResponse = `根据统计，系统中共有 ${toolResult.totalDepartments} 个部门：\n\n` +
                  toolResult.departmentList.map((dept: string, index: number) => 
                    `${index + 1}. ${dept} (${toolResult.stats[dept]?.total || 0}人, 其中在职${toolResult.stats[dept]?.active || 0}人)`
                  ).join('\n') + 
                  `\n\n总计：${toolResult.totalEmployees}名员工`
              } else {
                finalResponse = `查询完成，找到 ${Array.isArray(toolResult.data) ? toolResult.data.length : toolResult.totalEmployees || 0} 条结果。`
              }
            }
            
          } catch (error) {
            console.error(`[${toolName}] Tool execution error:`, error)
            console.error(`[${toolName}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
            finalResponse = `抱歉，执行查询时遇到问题：${error instanceof Error ? error.message : '未知错误'}`
          }
        }
      }
      
      if (!finalResponse) {
        throw new Error('No response content from Gemini API')
      }

      const response: AIResponse = {
        response: finalResponse,
        sessionId: sessionId,
        toolsUsed: toolsUsed,
        metadata: {
          userRole: userProfile.role,
          timestamp: new Date().toISOString(),
          aiProvider: 'google-gemini',
          model: 'gemini-2.0-flash',
          tokensUsed: geminiData.usageMetadata?.totalTokenCount || 0,
          conversationLength: messageHistory.length,
          hasHistory: messageHistory.length > 0,
          functionCallsExecuted: functionCalls?.length || 0,
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      }

      console.log(`✅ [${requestId}] Request completed successfully in ${Date.now() - startTime}ms`)
      console.log(`📊 [${requestId}] Response stats:`, {
        tokensUsed: response.metadata.tokensUsed,
        toolsUsed: toolsUsed.length,
        responseLength: finalResponse.length,
        hasHistory: messageHistory.length > 0
      })

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (aiError) {
      console.error('AI processing error:', aiError)
      console.log(`Query was: "${query}"`)
      console.log(`Error type: ${aiError.constructor.name}`)
      console.log(`Error message: ${aiError.message}`)
      
      // Try alternative AI processing approach
      let intelligentResponse = await generateIntelligentFallback(query, userProfile, supabase)
      
      const fallbackResponse: AIResponse = {
        response: intelligentResponse,
        sessionId: sessionId,
        toolsUsed: [],
        metadata: {
          userRole: userProfile.role,
          timestamp: new Date().toISOString(),
          fallback: true,
          originalQuery: query,
          aiProvider: 'google-gemini',
          aiError: aiError.message,
          conversationLength: messageHistory.length
        }
      }

      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.log('Request details:', { query, sessionId, userAgent: req.headers.get('user-agent') })
    
    // 构建详细的错误响应
    const errorDetails = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      
      // 在开发环境中提供更多调试信息
      ...(Deno.env.get('DENO_ENV') !== 'production' && {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
        query: query,
        sessionId: sessionId
      })
    }

    return new Response(
      JSON.stringify(errorDetails),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Build conversation history for Gemini API
function buildConversationHistory(systemPrompt: string, messageHistory: PersistentMessage[], currentQuery: string) {
  const contents: any[] = []
  
  // Add system prompt as the first user message
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }]
  })
  
  // Add a model response acknowledging the system prompt
  contents.push({
    role: 'model',
    parts: [{ text: '我明白了，我是您的专业HR薪资管理系统AI助手。我会根据您的角色权限和需求，为您提供准确、专业的帮助。请告诉我您需要什么帮助？' }]
  })
  
  // Add conversation history (limit to last 10 messages to avoid token limit)
  const recentHistory = messageHistory.slice(-10)
  
  for (const message of recentHistory) {
    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    })
  }
  
  // Add current query
  contents.push({
    role: 'user',
    parts: [{ text: currentQuery }]
  })
  
  console.log(`Built conversation with ${contents.length} messages (${recentHistory.length} from history + system + current)`)
  
  return contents
}

// Generate role-specific system prompt
function generateSystemPrompt(userProfile: UserProfile): string {
  const basePrompt = `你是一个专业的HR薪资管理系统AI助手。

用户信息：
- 姓名：${userProfile.employee_name || '未知'}
- 角色：${getRoleDisplayName(userProfile.role)}
- 员工ID：${userProfile.employee_id || '无'}

请遵循以下原则：
1. 只提供用户有权限访问的信息
2. 以专业、准确的方式回答问题  
3. 如果需要更多信息，请主动询问
4. 对敏感数据要谨慎处理
5. 用中文回答，格式清晰易读
6. 在多轮对话中，要记住之前的对话内容，提供连贯的帮助
7. 可以引用之前提到的信息，但要确保准确性

根据用户角色权限：`

  const rolePermissions = {
    super_admin: '- 拥有系统最高权限\n- 可查看和管理所有数据\n- 可进行系统配置和用户管理\n- 可访问所有功能模块',
    admin: '- 可查看所有员工和部门信息\n- 可访问完整薪资统计\n- 可进行系统管理操作',
    hr_manager: '- 可查看所有员工信息\n- 可访问薪资统计数据\n- 可进行HR管理操作',
    manager: '- 可查看本部门员工信息\n- 可访问本部门薪资概览\n- 可进行部门管理操作',
    employee: '- 只能查看自己的信息\n- 可查看公开的部门信息\n- 基础查询功能'
  }

  return basePrompt + '\n' + rolePermissions[userProfile.role]
}

// Get role display name in Chinese
function getRoleDisplayName(role: string): string {
  const roleNames = {
    super_admin: '超级管理员',
    admin: '系统管理员',
    hr_manager: '人事经理', 
    manager: '部门经理',
    employee: '普通员工'
  }
  return roleNames[role as keyof typeof roleNames] || '未知角色'
}

// Generate intelligent fallback response based on user query
async function generateIntelligentFallback(query: string, userProfile: UserProfile, supabase: any): Promise<string> {
  const queryLower = query.toLowerCase().trim()
  
  // Analyze query content to provide relevant fallback responses
  if (queryLower.includes('员工') || queryLower.includes('人员') || queryLower.includes('查询')) {
    if (userProfile.role === 'employee') {
      return `**员工信息查询**

很抱歉AI服务暂时不可用，但我可以为您提供以下建议：

🔍 **查询您的个人信息**：
- 点击右上角个人头像查看基本信息
- 前往"个人中心"查看详细档案

📋 **常见查询内容**：
- 个人基本信息和联系方式
- 部门归属和职位信息
- 入职时间和工作状态

💡 如需更多帮助，请联系HR部门或直接使用系统导航功能。`
    } else {
      return `**员工信息管理**

很抱歉AI服务暂时不可用，但根据您的权限，您可以：

🔍 **查询员工信息**：
- 前往"员工管理"页面查看员工列表
- 使用搜索功能快速定位特定员工
- 查看详细的员工档案信息

📊 **管理功能**：
- 编辑员工基本信息
- 管理部门人员配置
- 查看员工历史记录

请直接使用相应的管理界面进行操作。`
    }
  }
  
  if (queryLower.includes('薪资') || queryLower.includes('工资') || queryLower.includes('薪酬')) {
    if (userProfile.role === 'employee') {
      return `**薪资查询**

很抱歉AI服务暂时不可用，但您可以：

💰 **查看您的薪资信息**：
- 前往"薪资管理"页面查看薪资记录
- 查看最近几个月的薪资明细
- 下载薪资单据和相关文件

📈 **薪资历史**：
- 查看薪资发放历史
- 分析薪资构成和变化趋势

💡 如有薪资相关问题，请联系财务部门或HR部门。`
    } else if (['super_admin', 'admin', 'hr_manager'].includes(userProfile.role)) {
      return `**薪资数据管理**

很抱歉AI服务暂时不可用，但根据您的管理权限，您可以：

📊 **薪资统计分析**：
- 前往"统计分析"页面查看薪资报表
- 生成月度、季度薪资统计
- 分析部门薪资分布和趋势

💼 **薪资管理操作**：
- 薪资数据录入和审核
- 薪资计算和发放管理
- 薪资报表导出和打印

请直接使用系统的薪资管理功能进行操作。`
    } else {
      return `**部门薪资概览**

很抱歉AI服务暂时不可用，但作为部门管理者，您可以：

📋 **查看部门薪资概况**：
- 前往相关报表页面查看本部门薪资统计
- 了解团队薪资分布情况

💡 如需更详细的薪资分析，请联系HR部门。`
    }
  }
  
  if (queryLower.includes('统计') || queryLower.includes('报表') || queryLower.includes('分析')) {
    return `**数据统计分析**

很抱歉AI服务暂时不可用，但您可以：

📈 **访问统计报表**：
- 前往"统计分析"页面查看各类报表
- 生成员工、薪资、部门相关统计
- 导出数据进行进一步分析

📊 **可用的统计功能**：
- 员工统计和分布分析
- 薪资趋势和对比分析
- 部门绩效统计报告

请直接使用系统提供的统计分析功能。`
  }
  
  if (queryLower.includes('部门') || queryLower.includes('组织')) {
    return `**部门组织信息**

很抱歉AI服务暂时不可用，但您可以：

🏢 **查看组织架构**：
- 前往"部门管理"页面查看部门结构
- 了解各部门人员配置情况
- 查看部门负责人和联系信息

👥 **部门人员管理**：
- 查看部门员工列表
- 了解人员调动和变更情况

请直接使用相关的部门管理功能。`
  }
  
  if (queryLower.includes('系统') || queryLower.includes('功能') || queryLower.includes('如何') || queryLower.includes('怎么')) {
    return `**系统使用帮助**

很抱歉AI服务暂时不可用，但我可以为您提供系统使用指导：

🚀 **主要功能模块**：
- **员工管理**：员工档案、信息维护
- **薪资管理**：薪资计算、发放管理  
- **统计分析**：各类数据报表和分析
- **系统设置**：用户权限、系统配置

📱 **使用技巧**：
- 使用左侧导航菜单快速跳转
- 利用搜索功能快速定位信息
- 查看页面帮助提示了解具体操作

💡 如需详细使用指导，请查看系统帮助文档或联系技术支持。`
  }
  
  // Default intelligent response
  return `**AI助手暂时不可用**

很抱歉，AI服务当前遇到技术问题。但我根据您的查询"${query}"，为您提供以下建议：

🔍 **您可能在寻找**：
- 员工信息查询 → 前往"员工管理"页面
- 薪资数据查看 → 前往"薪资管理"页面  
- 统计报表分析 → 前往"统计分析"页面
- 系统功能使用 → 查看相关页面的帮助文档

🎯 **快速操作**：
- 使用顶部搜索框快速查找信息
- 点击左侧导航菜单访问各功能模块
- 查看页面右上角的帮助按钮

💡 AI服务恢复后，我将能够为您提供更智能的帮助和数据分析。如有紧急需求，请联系系统管理员。

**您的角色**：${getRoleDisplayName(userProfile.role)} | **查询时间**：${new Date().toLocaleString('zh-CN')}`
}

// Execute tool function
async function executeTool(toolName: string, args: any, userProfile: UserProfile, supabase: any) {
  console.log(`Executing tool: ${toolName}`)
  
  switch (toolName) {
    case 'searchEmployees':
      return await searchEmployees(args, userProfile, supabase)
    case 'getEmployeeDetails':
      return await getEmployeeDetails(args, userProfile, supabase)
    case 'getEmployeeStats':
      return await getEmployeeStats(args, userProfile, supabase)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// Search employees function
async function searchEmployees(args: any, userProfile: UserProfile, supabase: any) {
  let query = supabase
    .from('view_employee_basic_info')
    .select(`
      employee_id,
      employee_name,
      gender,
      department_name,
      position_name,
      category_name,
      employment_status,
      mobile_phone,
      latest_degree,
      hire_date,
      years_of_service
    `)

  // Apply role-based access control
  if (userProfile.role === 'employee') {
    // Employees can only see their own info
    query = query.eq('employee_id', userProfile.employee_id)
  } else if (userProfile.role === 'manager') {
    // Managers can see their department (this would need department mapping)
    // For now, allow all for managers+
  }

  // Apply search filters
  if (args.name) {
    query = query.ilike('employee_name', `%${args.name}%`)
  }
  if (args.department) {
    query = query.ilike('department_name', `%${args.department}%`)
  }
  if (args.position) {
    query = query.ilike('position_name', `%${args.position}%`)
  }
  if (args.status && args.status !== 'all') {
    query = query.eq('employment_status', args.status)
  }
  if (args.gender && args.gender !== 'all') {
    query = query.eq('gender', args.gender)
  }
  if (args.education) {
    query = query.ilike('latest_degree', `%${args.education}%`)
  }

  // Apply limit
  const limit = Math.min(args.limit || 10, 50)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    throw new Error(`Database query error: ${error.message}`)
  }

  // Mask sensitive data
  const maskedData = data?.map(employee => maskSensitiveEmployeeData(employee, userProfile)) || []

  return {
    success: true,
    count: maskedData.length,
    data: maskedData,
    message: `找到 ${maskedData.length} 名员工`
  }
}

// Get employee details function
async function getEmployeeDetails(args: any, userProfile: UserProfile, supabase: any) {
  let query = supabase
    .from('view_employee_basic_info')
    .select('*')

  if (args.employeeId) {
    query = query.eq('employee_id', args.employeeId)
  } else if (args.employeeName) {
    query = query.eq('employee_name', args.employeeName)
  } else {
    throw new Error('需要提供员工ID或员工姓名')
  }

  // Apply role-based access control
  if (userProfile.role === 'employee') {
    query = query.eq('employee_id', userProfile.employee_id)
  }

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        success: false,
        message: '未找到该员工信息'
      }
    }
    throw new Error(`Database query error: ${error.message}`)
  }

  const maskedData = maskSensitiveEmployeeData(data, userProfile)

  return {
    success: true,
    data: maskedData,
    message: `获取员工 ${data.employee_name} 的详细信息`
  }
}

// Get employee statistics function
async function getEmployeeStats(args: any, userProfile: UserProfile, supabase: any) {
  if (!['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    throw new Error('权限不足，无法访问统计信息')
  }

  const groupBy = args.groupBy || 'department'
  console.log(`Getting employee stats grouped by: ${groupBy}`)
  
  let query = supabase
    .from('view_employee_basic_info')
    .select(`${groupBy}_name, employment_status`)

  if (userProfile.role === 'manager') {
    // TODO: Limit to manager's department if needed
    console.log('Manager role - applying department restrictions...')
  }

  const { data, error } = await query

  if (error) {
    console.error('Database query error in getEmployeeStats:', error)
    throw new Error(`Database query error: ${error.message}`)
  }

  console.log(`Query returned ${data?.length || 0} records`)

  if (!data || data.length === 0) {
    return {
      success: true,
      groupBy: groupBy,
      stats: {},
      totalEmployees: 0,
      message: `没有找到员工数据`
    }
  }

  // Group and count with better null handling
  const stats = data.reduce((acc: any, item: any) => {
    const fieldName = `${groupBy}_name`
    const key = item[fieldName] || '未分配'  // 更好的null处理
    
    if (!acc[key]) {
      acc[key] = { total: 0, active: 0, inactive: 0 }
    }
    
    acc[key].total++
    if (item.employment_status === 'active') {
      acc[key].active++
    } else {
      acc[key].inactive++
    }
    return acc
  }, {})

  console.log('Generated stats:', stats)

  // Create detailed result with department list
  const departmentList = Object.keys(stats)
  
  return {
    success: true,
    groupBy: groupBy,
    stats: stats,
    departmentList: departmentList, // 添加部门列表
    totalEmployees: data.length,
    totalDepartments: departmentList.length,
    message: `按${groupBy === 'department' ? '部门' : groupBy}统计的员工分布，共发现${departmentList.length}个${groupBy === 'department' ? '部门' : '分组'}`
  }
}

// Mask sensitive employee data based on user role
function maskSensitiveEmployeeData(employee: any, userProfile: UserProfile) {
  const masked = { ...employee }

  // Always mask sensitive fields for non-admin users
  if (!['super_admin', 'admin'].includes(userProfile.role)) {
    if (masked.id_number) {
      masked.id_number = masked.id_number.slice(0, 6) + '****' + masked.id_number.slice(-4)
    }
    if (masked.bank_account_number) {
      masked.bank_account_number = '****' + masked.bank_account_number.slice(-4)
    }
    if (masked.mobile_phone) {
      masked.mobile_phone = masked.mobile_phone.slice(0, 3) + '****' + masked.mobile_phone.slice(-4)
    }
  }

  // Employees can only see their own full info
  if (userProfile.role === 'employee' && masked.employee_id !== userProfile.employee_id) {
    delete masked.id_number
    delete masked.bank_account_number
    delete masked.mobile_phone
    delete masked.email
    delete masked.personal_email
  }

  return masked
}

// Define available tools based on user role
async function defineUserTools(userProfile: UserProfile, supabase: any) {
  const tools: any[] = []

  // Employee search tool (available to all authenticated users)
  tools.push({
    name: 'searchEmployees',
    description: `员工信息搜索查询工具 - 当用户想要查找、搜索、查询员工信息时使用此工具。
    
触发场景：
• "查找张三"、"搜索李四"、"有没有王五这个人"
• "技术部有多少人"、"找一下研发部门的员工" 
• "查询所有经理职位的员工"、"看看有哪些高级工程师"
• "找一下本科学历的员工"、"查询男性员工名单"
• "在职员工有多少"、"离职的员工信息"

关键词识别：查找、搜索、搜查、查询、找一下、看看、有没有、有多少、名单、信息、员工、人员、同事、工作人员

支持多维度组合查询，包括姓名、部门、职位、性别、学历、在职状态等条件。`,
    parameters: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          description: '员工姓名关键词 - 支持模糊匹配，例如："张"可以找到"张三"、"张明"等所有姓张的员工' 
        },
        department: { 
          type: 'string', 
          description: '部门名称关键词 - 支持模糊匹配，例如："技术"可以找到"技术部"、"技术研发部"等。常见部门：研发部、技术部、市场部、人事部、财务部' 
        },
        position: { 
          type: 'string', 
          description: '职位名称关键词 - 支持模糊匹配，例如："工程师"可以找到"高级工程师"、"软件工程师"等。常见职位：经理、总监、工程师、专员、主管' 
        },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive', 'all'],
          description: '在职状态筛选 - active:在职（默认）, inactive:离职, all:所有状态。用户说"在职"、"离职"、"所有员工"时使用对应值',
          default: 'active'
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'all'],
          description: '性别筛选 - male:男性, female:女性, all:不限性别（默认）。用户提到"男"、"女"、"男性"、"女性"时使用',
          default: 'all'
        },
        education: {
          type: 'string',
          description: '学历关键词 - 支持模糊匹配。常见学历：高中、中专、大专、本科、学士、硕士、研究生、博士。例如：用户说"本科"或"学士"都匹配本科学历'
        },
        limit: { 
          type: 'integer', 
          description: '查询结果数量限制 - 默认10条，最大50条。用户要求"所有"、"全部"时可设置为50，要求"几个"时设置为对应数字',
          minimum: 1,
          maximum: 50,
          default: 10
        }
      }
    }
  })

  // Employee details tool
  tools.push({
    name: 'getEmployeeDetails',
    description: `员工详细档案查询工具 - 当用户需要查看特定员工的完整详细信息时使用，适用于深度了解某个具体员工的全面情况。

触发场景：
• "张三的详细信息"、"李四的完整档案"、"王五的个人资料" 
• "看一下刘六的详细情况"、"我想了解赵七这个人"
• "查看某某员工的全部信息"、"这个员工的背景资料"
• "员工档案查询"、"个人档案详情"、"完整资料"
• 当用户提到具体姓名后追问更多细节时

关键词识别：详细信息、详细情况、完整档案、个人资料、背景资料、档案查询、详情、全部信息、完整资料、这个人、了解、具体情况

注意：此工具用于获取单个员工的完整信息，如果用户只是想搜索或列出多个员工，请使用searchEmployees工具。`,
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: '员工唯一标识ID（UUID格式）- 如果从之前的搜索结果中获得了员工ID，优先使用此参数进行精确查询'
        },
        employeeName: {
          type: 'string', 
          description: '员工完整姓名 - 当不知道员工ID时使用。必须是准确的员工姓名，例如："张三"（不要使用"张"等模糊名称）。如果用户提供的是模糊名称，建议先用searchEmployees查找确切姓名'
        }
      },
      anyOf: [
        { required: ["employeeId"] },
        { required: ["employeeName"] }
      ]
    }
  })

  // Statistics tools for managers and above
  if (['super_admin', 'admin', 'hr_manager', 'manager'].includes(userProfile.role)) {
    tools.push({
      name: 'getEmployeeStats',
      description: `员工统计分析工具 - 当用户想要了解人员分布、统计数据、组织结构分析时使用。专门处理统计、计数、分组、分布类查询。

重要触发场景：
• 部门相关："有哪些部门"、"各部门人数分布"、"部门统计"、"哪个部门人最多"
• 职位相关："职位分布情况"、"有多少个经理"、"各职位统计"、"岗位分析"
• 学历相关："学历分布"、"本科生有多少"、"高学历人才统计"、"教育背景分析"
• 性别相关："男女比例"、"性别分布"、"男性女性各多少人"、"人员性别统计"
• 人员类别："正式员工统计"、"合同工分布"、"人员类型分析"、"编制情况"
• 综合统计："总共多少人"、"人员概况"、"组织分析"、"人力资源统计"

关键词识别：
统计、分布、分析、有哪些、多少个、多少人、人数、比例、概况、情况、各、总共、全部、整体
部门、职位、岗位、学历、性别、类别、类型、编制、人员、员工

特别注意："有哪些部门"这类问题应该用department维度统计，返回所有部门列表和每个部门的人数分布。`,
      parameters: {
        type: 'object',
        properties: {
          groupBy: {
            type: 'string',
            enum: ['department', 'position', 'latest_degree', 'gender', 'category'],
            description: `统计分析的维度类型：
• department - 按部门统计（用于"有哪些部门"、"部门分布"、"各部门人数"等查询）
• position - 按职位统计（用于"职位分布"、"有多少经理"、"岗位分析"等查询）  
• latest_degree - 按学历统计（用于"学历分布"、"本科生多少"、"教育背景"等查询）
• gender - 按性别统计（用于"男女比例"、"性别分布"等查询）
• category - 按人员类别统计（用于"正式员工"、"合同工"、"编制情况"等查询）

智能选择指导：用户问"有哪些"一般选department，问"多少"看具体内容，问"分布"、"比例"根据上下文选择`,
            default: 'department'
          },
          includeDetails: {
            type: 'boolean',
            description: '是否包含每个分组的详细数据列表 - true:返回详细列表, false:只返回统计汇总（默认）。当用户要求"详细"、"具体"、"列表"时设为true',
            default: false
          }
        },
        required: ['groupBy']
      }
    })
  }

  return tools
}

/* To invoke locally:

1. Set environment variable: `GOOGLE_GEMINI_API_KEY=your_api_key_here`
2. Run `supabase start` 
3. Run `supabase functions serve ai-agent`
4. Test with curl:

curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-agent' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"query":"你好，我需要查询员工信息","sessionId":"test-001"}'

Note: Get your free Google Gemini API key from: https://aistudio.google.com/app/apikey

*/