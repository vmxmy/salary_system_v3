/**
 * Edge Function: 业务规则评估服务
 * 
 * 处理复杂的业务规则评估，特别是需要大量数据或计算密集型的规则
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 规则评估请求
 */
interface EvaluateRulesRequest {
  ruleSetId: string;
  entityType: string;
  entityData: any;
  contextData?: Record<string, any>;
  options?: {
    includeDetails?: boolean;
    stopOnFirstFailure?: boolean;
    parallelExecution?: boolean;
  };
}

/**
 * 规则评估结果
 */
interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  executionTime: number;
  details?: Record<string, any>;
}

/**
 * 规则评估响应
 */
interface EvaluateRulesResponse {
  success: boolean;
  results: RuleEvaluationResult[];
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
    totalExecutionTime: number;
  };
  recommendations?: string[];
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 获取Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 解析请求
    const requestData: EvaluateRulesRequest = await req.json()
    const { ruleSetId, entityType, entityData, contextData, options } = requestData

    // 获取适用的规则集
    const { data: ruleSet, error: ruleSetError } = await supabase
      .from('business_rule_sets')
      .select(`
        *,
        business_rules (
          id,
          name,
          description,
          rule_type,
          entity_type,
          conditions,
          actions,
          priority,
          enabled
        )
      `)
      .eq('id', ruleSetId)
      .single()

    if (ruleSetError) {
      throw new Error(`Failed to load rule set: ${ruleSetError.message}`)
    }

    // 过滤并排序规则
    const applicableRules = (ruleSet.business_rules || [])
      .filter((rule: any) => 
        rule.enabled && 
        (!rule.entity_type || rule.entity_type === entityType)
      )
      .sort((a: any, b: any) => b.priority - a.priority)

    // 评估规则
    const results: RuleEvaluationResult[] = []
    const startTime = Date.now()

    for (const rule of applicableRules) {
      const ruleStartTime = Date.now()
      
      try {
        // 根据规则类型执行不同的评估逻辑
        const result = await evaluateRule(rule, entityData, contextData, supabase)
        
        results.push({
          ...result,
          executionTime: Date.now() - ruleStartTime
        })

        // 如果配置了在首次失败时停止
        if (options?.stopOnFirstFailure && !result.passed && result.severity === 'error') {
          break
        }
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          message: `Rule evaluation failed: ${error.message}`,
          severity: 'error',
          executionTime: Date.now() - ruleStartTime
        })
      }
    }

    // 生成汇总信息
    const summary = {
      totalRules: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      warnings: results.filter(r => r.severity === 'warning').length,
      errors: results.filter(r => r.severity === 'error').length,
      totalExecutionTime: Date.now() - startTime
    }

    // 生成建议
    const recommendations = generateRecommendations(results, entityType)

    const response: EvaluateRulesResponse = {
      success: summary.errors === 0,
      results,
      summary,
      recommendations
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

/**
 * 评估单个规则
 */
async function evaluateRule(
  rule: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<RuleEvaluationResult> {
  const result: RuleEvaluationResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: 'info',
    executionTime: 0
  }

  // 评估条件
  if (rule.conditions) {
    const conditionsPassed = await evaluateConditions(rule.conditions, entityData, contextData, supabase)
    
    if (!conditionsPassed) {
      result.passed = false
      result.message = `Conditions not met for rule: ${rule.name}`
      result.severity = determineSeverity(rule)
      return result
    }
  }

  // 执行动作（如果有）
  if (rule.actions && result.passed) {
    const actionResults = await executeActions(rule.actions, entityData, contextData, supabase)
    
    // 某些动作可能会改变规则的通过状态
    if (actionResults.some(a => a.type === 'validation' && !a.success)) {
      result.passed = false
      result.message = actionResults.find(a => !a.success)?.message
      result.severity = determineSeverity(rule)
    }
    
    result.details = { actions: actionResults }
  }

  if (result.passed) {
    result.message = `Rule ${rule.name} passed successfully`
  }

  return result
}

/**
 * 评估条件
 */
async function evaluateConditions(
  conditions: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<boolean> {
  // 条件可以是简单条件或复合条件
  if (conditions.type === 'simple') {
    return evaluateSimpleCondition(conditions, entityData, contextData)
  } else if (conditions.type === 'composite') {
    return evaluateCompositeCondition(conditions, entityData, contextData, supabase)
  } else if (conditions.type === 'query') {
    return evaluateQueryCondition(conditions, entityData, contextData, supabase)
  }
  
  return true
}

/**
 * 评估简单条件
 */
function evaluateSimpleCondition(
  condition: any,
  entityData: any,
  contextData: any
): boolean {
  const { field, operator, value } = condition
  const fieldValue = getNestedValue(entityData, field)

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'greaterThan':
      return fieldValue > value
    case 'lessThan':
      return fieldValue < value
    case 'greaterThanOrEquals':
      return fieldValue >= value
    case 'lessThanOrEquals':
      return fieldValue <= value
    case 'contains':
      return String(fieldValue).includes(value)
    case 'startsWith':
      return String(fieldValue).startsWith(value)
    case 'endsWith':
      return String(fieldValue).endsWith(value)
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'notIn':
      return Array.isArray(value) && !value.includes(fieldValue)
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null
    case 'notExists':
      return fieldValue === undefined || fieldValue === null
    default:
      return false
  }
}

/**
 * 评估复合条件
 */
async function evaluateCompositeCondition(
  condition: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<boolean> {
  const { operator, conditions } = condition
  
  if (!Array.isArray(conditions)) {
    return false
  }

  switch (operator) {
    case 'AND':
      for (const subCondition of conditions) {
        const result = await evaluateConditions(subCondition, entityData, contextData, supabase)
        if (!result) return false
      }
      return true
      
    case 'OR':
      for (const subCondition of conditions) {
        const result = await evaluateConditions(subCondition, entityData, contextData, supabase)
        if (result) return true
      }
      return false
      
    case 'NOT':
      const result = await evaluateConditions(conditions[0], entityData, contextData, supabase)
      return !result
      
    default:
      return false
  }
}

/**
 * 评估查询条件（需要查询数据库）
 */
async function evaluateQueryCondition(
  condition: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<boolean> {
  const { table, query, expectedCount } = condition
  
  // 构建查询
  let dbQuery = supabase.from(table).select('id')
  
  // 应用查询条件
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'object' && value !== null) {
      const { operator, operand } = value as any
      dbQuery = applyQueryOperator(dbQuery, key, operator, operand, entityData)
    } else {
      dbQuery = dbQuery.eq(key, value)
    }
  }
  
  const { data, error } = await dbQuery
  
  if (error) {
    console.error('Query condition error:', error)
    return false
  }
  
  // 检查结果数量
  const count = data?.length || 0
  
  if (expectedCount !== undefined) {
    if (typeof expectedCount === 'number') {
      return count === expectedCount
    } else if (typeof expectedCount === 'object') {
      const { operator, value } = expectedCount
      switch (operator) {
        case 'equals': return count === value
        case 'greaterThan': return count > value
        case 'lessThan': return count < value
        case 'greaterThanOrEquals': return count >= value
        case 'lessThanOrEquals': return count <= value
        default: return false
      }
    }
  }
  
  return count > 0
}

/**
 * 应用查询操作符
 */
function applyQueryOperator(
  query: any,
  field: string,
  operator: string,
  value: any,
  entityData: any
): any {
  // 替换值中的变量引用
  const resolvedValue = resolveValue(value, entityData)
  
  switch (operator) {
    case 'eq': return query.eq(field, resolvedValue)
    case 'neq': return query.neq(field, resolvedValue)
    case 'gt': return query.gt(field, resolvedValue)
    case 'lt': return query.lt(field, resolvedValue)
    case 'gte': return query.gte(field, resolvedValue)
    case 'lte': return query.lte(field, resolvedValue)
    case 'like': return query.like(field, resolvedValue)
    case 'ilike': return query.ilike(field, resolvedValue)
    case 'in': return query.in(field, resolvedValue)
    case 'is': return query.is(field, resolvedValue)
    default: return query
  }
}

/**
 * 执行动作
 */
async function executeActions(
  actions: any[],
  entityData: any,
  contextData: any,
  supabase: any
): Promise<any[]> {
  const results = []
  
  for (const action of actions) {
    try {
      const result = await executeAction(action, entityData, contextData, supabase)
      results.push(result)
    } catch (error) {
      results.push({
        type: action.type,
        success: false,
        message: error.message
      })
    }
  }
  
  return results
}

/**
 * 执行单个动作
 */
async function executeAction(
  action: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<any> {
  switch (action.type) {
    case 'validation':
      return executeValidationAction(action, entityData)
      
    case 'calculation':
      return executeCalculationAction(action, entityData)
      
    case 'notification':
      return executeNotificationAction(action, entityData, contextData, supabase)
      
    case 'dataUpdate':
      return executeDataUpdateAction(action, entityData, supabase)
      
    default:
      return { type: action.type, success: false, message: 'Unknown action type' }
  }
}

/**
 * 执行验证动作
 */
function executeValidationAction(action: any, entityData: any): any {
  const { validator, params } = action
  
  // 这里可以实现各种验证逻辑
  switch (validator) {
    case 'required':
      const field = params.field
      const value = getNestedValue(entityData, field)
      return {
        type: 'validation',
        success: value !== undefined && value !== null && value !== '',
        message: value ? '' : `Field ${field} is required`
      }
      
    case 'range':
      const fieldValue = getNestedValue(entityData, params.field)
      const inRange = fieldValue >= params.min && fieldValue <= params.max
      return {
        type: 'validation',
        success: inRange,
        message: inRange ? '' : `Value ${fieldValue} is not in range [${params.min}, ${params.max}]`
      }
      
    default:
      return { type: 'validation', success: true }
  }
}

/**
 * 执行计算动作
 */
function executeCalculationAction(action: any, entityData: any): any {
  const { formula, resultField } = action
  
  try {
    // 简单的计算示例
    // 在实际应用中，这里应该使用安全的表达式解析器
    const result = evaluateFormula(formula, entityData)
    
    return {
      type: 'calculation',
      success: true,
      result,
      field: resultField
    }
  } catch (error) {
    return {
      type: 'calculation',
      success: false,
      message: error.message
    }
  }
}

/**
 * 执行通知动作
 */
async function executeNotificationAction(
  action: any,
  entityData: any,
  contextData: any,
  supabase: any
): Promise<any> {
  // 这里简化处理，实际应该调用通知服务
  const { template, recipients } = action
  
  // 记录通知请求
  const { error } = await supabase
    .from('notification_queue')
    .insert({
      template_id: template,
      recipients,
      data: entityData,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  
  return {
    type: 'notification',
    success: !error,
    message: error ? error.message : 'Notification queued'
  }
}

/**
 * 执行数据更新动作
 */
async function executeDataUpdateAction(
  action: any,
  entityData: any,
  supabase: any
): Promise<any> {
  const { table, updates, condition } = action
  
  // 构建更新数据
  const updateData: any = {}
  for (const [key, value] of Object.entries(updates)) {
    updateData[key] = resolveValue(value, entityData)
  }
  
  // 执行更新
  let query = supabase.from(table).update(updateData)
  
  // 应用条件
  if (condition) {
    for (const [key, value] of Object.entries(condition)) {
      query = query.eq(key, resolveValue(value, entityData))
    }
  }
  
  const { error } = await query
  
  return {
    type: 'dataUpdate',
    success: !error,
    message: error ? error.message : 'Data updated successfully'
  }
}

/**
 * 获取嵌套属性值
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

/**
 * 解析值（支持变量引用）
 */
function resolveValue(value: any, entityData: any): any {
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const path = value.slice(2, -2).trim()
    return getNestedValue(entityData, path)
  }
  return value
}

/**
 * 评估公式
 */
function evaluateFormula(formula: string, data: any): number {
  // 这是一个简化的实现
  // 实际应该使用安全的表达式解析器
  // 这里只处理简单的数学运算
  
  let expression = formula
  
  // 替换变量
  const variablePattern = /\{\{([^}]+)\}\}/g
  expression = expression.replace(variablePattern, (match, path) => {
    const value = getNestedValue(data, path.trim())
    return String(value || 0)
  })
  
  // 安全评估（只允许数字和基本运算符）
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    throw new Error('Invalid formula')
  }
  
  try {
    // 使用 Function 构造器而不是 eval
    return new Function('return ' + expression)()
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${error.message}`)
  }
}

/**
 * 确定严重程度
 */
function determineSeverity(rule: any): 'info' | 'warning' | 'error' | 'critical' {
  return rule.severity || 'error'
}

/**
 * 生成建议
 */
function generateRecommendations(
  results: RuleEvaluationResult[],
  entityType: string
): string[] {
  const recommendations: string[] = []
  
  // 分析失败的规则
  const failedRules = results.filter(r => !r.passed)
  
  if (failedRules.length === 0) {
    recommendations.push('All business rules passed successfully')
    return recommendations
  }
  
  // 按严重程度分组
  const criticalCount = failedRules.filter(r => r.severity === 'critical').length
  const errorCount = failedRules.filter(r => r.severity === 'error').length
  const warningCount = failedRules.filter(r => r.severity === 'warning').length
  
  if (criticalCount > 0) {
    recommendations.push(`Address ${criticalCount} critical issue(s) immediately`)
  }
  
  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} error(s) before proceeding`)
  }
  
  if (warningCount > 0) {
    recommendations.push(`Review ${warningCount} warning(s) for potential improvements`)
  }
  
  // 实体特定的建议
  if (entityType === 'PayrollEnhanced') {
    const payrollErrors = failedRules.filter(r => r.ruleName.includes('payroll'))
    if (payrollErrors.length > 0) {
      recommendations.push('Review payroll calculation and validation rules')
    }
  }
  
  if (entityType === 'EmployeeEnhanced') {
    const employeeErrors = failedRules.filter(r => r.ruleName.includes('employee'))
    if (employeeErrors.length > 0) {
      recommendations.push('Verify employee information and status')
    }
  }
  
  return recommendations
}