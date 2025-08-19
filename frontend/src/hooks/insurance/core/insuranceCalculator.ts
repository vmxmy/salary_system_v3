/**
 * 保险计算引擎 - 封装所有计算逻辑
 */

export interface CalculationResult {
  success: boolean;
  amount: number;
  details: {
    employeeId: string;
    insuranceType: string;
    insuranceTypeName: string;
    employeeCategory: string;
    contributionBase: number;
    rate: number;
    baseFloor: number;
    baseCeiling: number;
    isEmployer: boolean;
    isApplicable: boolean;
    periodId: string;
    calculationFormula: string;
    rawAmount?: number;
    roundedAmount?: number;
    roundingApplied?: boolean;
  } | null;
  errorMessage: string | null;
}

export class InsuranceCalculator {
  /**
   * 住房公积金特殊取整规则
   */
  private static applyHousingFundRounding(amount: number): number {
    return Math.round(amount);
  }

  /**
   * 应用基数限制
   */
  private static applyBaseLimits(
    base: number,
    floor: number,
    ceiling: number
  ): number {
    return Math.max(floor || 0, Math.min(ceiling || 999999, base));
  }

  /**
   * 计算保险金额
   */
  private static calculateAmount(
    base: number,
    rate: number,
    insuranceType?: string
  ): { amount: number; rawAmount?: number; roundingApplied: boolean } {
    const rawAmount = Math.round(base * rate * 100) / 100;
    let amount = rawAmount;
    let roundingApplied = false;

    // 住房公积金特殊处理
    if (insuranceType === 'housing_fund') {
      amount = this.applyHousingFundRounding(rawAmount);
      roundingApplied = true;
    }

    return {
      amount,
      ...(roundingApplied && { rawAmount }),
      roundingApplied
    };
  }

  /**
   * 计算单项保险
   */
  static calculate(params: {
    employeeId: string;
    periodId: string;
    insuranceType: string;
    insuranceTypeName: string;
    employeeCategory: string;
    contributionBase: number;
    rate: number;
    baseFloor: number;
    baseCeiling: number;
    isEmployer: boolean;
    isApplicable: boolean;
  }): CalculationResult {
    const {
      employeeId,
      periodId,
      insuranceType,
      insuranceTypeName,
      employeeCategory,
      contributionBase,
      rate,
      baseFloor,
      baseCeiling,
      isEmployer,
      isApplicable
    } = params;

    // 不适用的保险返回0
    if (!isApplicable) {
      return {
        success: true,
        amount: 0,
        details: {
          employeeId,
          insuranceType,
          insuranceTypeName,
          employeeCategory,
          contributionBase: 0,
          rate: 0,
          baseFloor: 0,
          baseCeiling: 0,
          isEmployer,
          isApplicable: false,
          periodId,
          calculationFormula: 'Not applicable'
        },
        errorMessage: null
      };
    }

    // 应用基数限制
    const adjustedBase = this.applyBaseLimits(contributionBase, baseFloor, baseCeiling);

    // 计算金额
    const { amount, rawAmount, roundingApplied } = this.calculateAmount(
      adjustedBase,
      rate,
      insuranceType
    );

    return {
      success: true,
      amount,
      details: {
        employeeId,
        insuranceType,
        insuranceTypeName,
        employeeCategory,
        contributionBase: adjustedBase,
        rate,
        baseFloor,
        baseCeiling,
        isEmployer,
        isApplicable: true,
        periodId,
        calculationFormula: `${adjustedBase} * ${rate} = ${amount}`,
        ...(roundingApplied && {
          rawAmount,
          roundedAmount: amount,
          roundingApplied
        })
      },
      errorMessage: null
    };
  }

  /**
   * 批量计算多个保险项目
   */
  static calculateBatch(
    items: Array<Parameters<typeof InsuranceCalculator.calculate>[0]>
  ): CalculationResult[] {
    return items.map(item => this.calculate(item));
  }

  /**
   * 计算总额
   */
  static calculateTotals(results: CalculationResult[]): {
    employeeTotal: number;
    employerTotal: number;
  } {
    let employeeTotal = 0;
    let employerTotal = 0;

    for (const result of results) {
      if (result.success && result.details) {
        if (result.details.isEmployer) {
          employerTotal += result.amount;
        } else {
          employeeTotal += result.amount;
        }
      }
    }

    return { employeeTotal, employerTotal };
  }

  /**
   * 验证计算参数
   */
  static validateParams(params: any): string[] {
    const errors: string[] = [];

    if (!params.employeeId) {
      errors.push('Employee ID is required');
    }
    if (!params.periodId) {
      errors.push('Period ID is required');
    }
    if (params.rate === undefined || params.rate === null) {
      errors.push('Rate is required');
    }
    if (params.contributionBase === undefined || params.contributionBase === null) {
      errors.push('Contribution base is required');
    }

    return errors;
  }
}