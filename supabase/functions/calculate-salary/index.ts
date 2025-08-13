/**
 * Edge Function: 薪资计算
 * 
 * 处理复杂的薪资计算逻辑
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculateSalaryRequest {
  employeeId: string
  periodId: string
  includeBonus?: boolean
  includeOvertime?: boolean
}

interface SalaryCalculation {
  employeeId: string
  periodId: string
  baseSalary: number
  allowances: number
  overtime: number
  bonus: number
  deductions: number
  socialInsurance: number
  housingFund: number
  personalTax: number
  grossPay: number
  netPay: number
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { employeeId, periodId, includeBonus = false, includeOvertime = false } = 
      await req.json() as CalculateSalaryRequest

    // Get employee data
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        assignments:employee_assignments!inner(
          department_id,
          position_id,
          departments(name),
          positions(name, level)
        )
      `)
      .eq('id', employeeId)
      .eq('assignments.is_active', true)
      .single()

    if (employeeError) throw employeeError

    // Get salary configuration
    const { data: salaryConfig, error: salaryError } = await supabase
      .from('employee_salaries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_current', true)
      .single()

    if (salaryError) throw salaryError

    // Get period data
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .single()

    if (periodError) throw periodError

    // Calculate components
    const baseSalary = salaryConfig.base_salary || 0
    
    // Calculate allowances
    const allowances = (salaryConfig.position_allowance || 0) +
                      (salaryConfig.meal_allowance || 0) +
                      (salaryConfig.transport_allowance || 0) +
                      (salaryConfig.housing_allowance || 0) +
                      (salaryConfig.other_allowances || 0)

    // Calculate overtime (if included)
    let overtime = 0
    if (includeOvertime) {
      const { data: overtimeData } = await supabase
        .from('employee_overtime')
        .select('hours, rate')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .single()

      if (overtimeData) {
        overtime = overtimeData.hours * overtimeData.rate
      }
    }

    // Calculate bonus (if included)
    let bonus = 0
    if (includeBonus) {
      const { data: bonusData } = await supabase
        .from('employee_bonuses')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)

      bonus = bonusData?.reduce((sum, b) => sum + b.amount, 0) || 0
    }

    // Calculate social insurance
    const socialInsuranceBase = salaryConfig.social_insurance_base || baseSalary
    const socialInsurance = calculateSocialInsurance(socialInsuranceBase)

    // Calculate housing fund
    const housingFundBase = salaryConfig.housing_fund_base || baseSalary
    const housingFund = calculateHousingFund(housingFundBase)

    // Other deductions
    const { data: deductions } = await supabase
      .from('employee_deductions')
      .select('amount')
      .eq('employee_id', employeeId)
      .eq('period_id', periodId)

    const totalDeductions = deductions?.reduce((sum, d) => sum + d.amount, 0) || 0

    // Calculate gross pay
    const grossPay = baseSalary + allowances + overtime + bonus

    // Calculate personal income tax
    const taxableIncome = grossPay - socialInsurance - housingFund - 5000 // 5000 is the threshold
    const personalTax = calculatePersonalTax(taxableIncome)

    // Calculate net pay
    const netPay = grossPay - socialInsurance - housingFund - personalTax - totalDeductions

    const result: SalaryCalculation = {
      employeeId,
      periodId,
      baseSalary,
      allowances,
      overtime,
      bonus,
      deductions: totalDeductions,
      socialInsurance,
      housingFund,
      personalTax,
      grossPay,
      netPay
    }

    // Save calculation result
    await supabase
      .from('payroll_calculations')
      .upsert({
        employee_id: employeeId,
        period_id: periodId,
        ...result,
        calculated_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

// Social insurance calculation
function calculateSocialInsurance(base: number): number {
  // Simplified calculation - actual rates may vary by region
  const pensionRate = 0.08      // 养老保险 8%
  const medicalRate = 0.02      // 医疗保险 2%
  const unemploymentRate = 0.005 // 失业保险 0.5%
  const workInjuryRate = 0       // 工伤保险 0% (employer pays)
  const maternityRate = 0        // 生育保险 0% (employer pays)
  
  return base * (pensionRate + medicalRate + unemploymentRate + workInjuryRate + maternityRate)
}

// Housing fund calculation
function calculateHousingFund(base: number): number {
  const rate = 0.12 // 12% - may vary by region and company
  return base * rate
}

// Personal income tax calculation (China 2024)
function calculatePersonalTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  
  const brackets = [
    { min: 0, max: 3000, rate: 0.03, deduction: 0 },
    { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
    { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
    { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
    { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
    { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
    { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 }
  ]
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
      return taxableIncome * bracket.rate - bracket.deduction
    }
  }
  
  return 0
}