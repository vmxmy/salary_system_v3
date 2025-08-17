/**
 * 权重进度计算器
 * 根据操作复杂度分配不同的权重，提供更准确的进度计算
 */

export interface ProgressPhase {
  name: string;
  weight: number; // 权重，0-1之间
  totalSteps: number;
  completedSteps: number;
  isActive: boolean;
  isCompleted: boolean;
  subPhases?: ProgressPhase[];
}

export interface WeightedProgressConfig {
  phases: ProgressPhase[];
  smoothingFactor?: number; // 平滑因子，0-1之间
}

export interface ProgressSnapshot {
  totalProgress: number; // 总体进度百分比
  currentPhase: string;
  currentPhaseProgress: number; // 当前阶段进度百分比
  estimatedTimeRemaining?: number; // 预估剩余时间（秒）
  averageSpeed?: number; // 平均处理速度（记录/秒）
}

export class WeightedProgressCalculator {
  private config: WeightedProgressConfig;
  private startTime: number;
  private phaseStartTimes: Map<string, number>;
  private progressHistory: Array<{ time: number; progress: number }>;
  private maxHistorySize = 10;

  constructor(config: WeightedProgressConfig) {
    this.config = {
      ...config,
      smoothingFactor: config.smoothingFactor ?? 0.3,
    };
    this.startTime = Date.now();
    this.phaseStartTimes = new Map();
    this.progressHistory = [];

    // 验证权重总和
    this.validateWeights();
  }

  /**
   * 创建标准的薪资导入进度阶段配置
   */
  static createPayrollImportPhases(totalRecords: number, dataGroups: string[]): ProgressPhase[] {
    return [
      {
        name: 'parsing',
        weight: 0.15, // 解析Excel文件相对较快
        totalSteps: dataGroups.length,
        completedSteps: 0,
        isActive: false,
        isCompleted: false,
      },
      {
        name: 'validating',
        weight: 0.25, // 数据验证需要更多时间
        totalSteps: totalRecords,
        completedSteps: 0,
        isActive: false,
        isCompleted: false,
      },
      {
        name: 'creating_payrolls',
        weight: 0.20, // 创建薪资记录
        totalSteps: totalRecords,
        completedSteps: 0,
        isActive: false,
        isCompleted: false,
      },
      {
        name: 'inserting_items',
        weight: 0.35, // 插入明细项目最耗时
        totalSteps: totalRecords * 10, // 假设每条记录平均10个明细项
        completedSteps: 0,
        isActive: false,
        isCompleted: false,
      },
      {
        name: 'completed',
        weight: 0.05, // 完成后的清理工作
        totalSteps: 1,
        completedSteps: 0,
        isActive: false,
        isCompleted: false,
      },
    ];
  }

  /**
   * 更新阶段进度
   */
  updatePhase(phaseName: string, completedSteps: number, isActive = true): void {
    const phase = this.findPhase(phaseName);
    if (!phase) {
      console.warn(`Phase "${phaseName}" not found`);
      return;
    }

    // 记录阶段开始时间
    if (isActive && !this.phaseStartTimes.has(phaseName)) {
      this.phaseStartTimes.set(phaseName, Date.now());
    }

    // 标记之前的阶段为已完成
    this.markPreviousPhasesCompleted(phaseName);

    // 更新当前阶段
    phase.completedSteps = Math.min(completedSteps, phase.totalSteps);
    phase.isActive = isActive;
    phase.isCompleted = phase.completedSteps >= phase.totalSteps;

    // 如果阶段完成，标记为非活跃
    if (phase.isCompleted) {
      phase.isActive = false;
    }

    // 更新进度历史
    this.updateProgressHistory();
  }

  /**
   * 更新子阶段进度
   */
  updateSubPhase(phaseName: string, subPhaseName: string, completedSteps: number): void {
    const phase = this.findPhase(phaseName);
    if (!phase?.subPhases) return;

    const subPhase = phase.subPhases.find(sp => sp.name === subPhaseName);
    if (!subPhase) return;

    subPhase.completedSteps = Math.min(completedSteps, subPhase.totalSteps);
    subPhase.isCompleted = subPhase.completedSteps >= subPhase.totalSteps;

    // 计算父阶段的总进度
    const totalSubSteps = phase.subPhases.reduce((sum, sp) => sum + sp.totalSteps, 0);
    const completedSubSteps = phase.subPhases.reduce((sum, sp) => sum + sp.completedSteps, 0);
    
    phase.completedSteps = Math.floor((completedSubSteps / totalSubSteps) * phase.totalSteps);
    phase.isCompleted = phase.completedSteps >= phase.totalSteps;

    this.updateProgressHistory();
  }

  /**
   * 计算总体进度快照
   */
  getProgressSnapshot(): ProgressSnapshot {
    const totalProgress = this.calculateTotalProgress();
    const currentPhase = this.getCurrentPhase();
    const currentPhaseProgress = this.calculateCurrentPhaseProgress();
    
    const estimatedTimeRemaining = this.estimateTimeRemaining();
    const averageSpeed = this.calculateAverageSpeed();

    return {
      totalProgress,
      currentPhase: currentPhase?.name || 'unknown',
      currentPhaseProgress,
      estimatedTimeRemaining,
      averageSpeed,
    };
  }

  /**
   * 计算总体进度百分比
   */
  calculateTotalProgress(): number {
    let weightedProgress = 0;

    for (const phase of this.config.phases) {
      const phaseProgress = phase.totalSteps > 0 
        ? phase.completedSteps / phase.totalSteps 
        : 0;
      weightedProgress += phaseProgress * phase.weight;
    }

    // 应用平滑因子
    if (this.progressHistory.length > 0) {
      const lastProgress = this.progressHistory[this.progressHistory.length - 1].progress;
      const smoothingFactor = this.config.smoothingFactor!;
      weightedProgress = lastProgress * (1 - smoothingFactor) + weightedProgress * smoothingFactor;
    }

    return Math.min(Math.max(weightedProgress * 100, 0), 100);
  }

  /**
   * 获取当前活跃阶段
   */
  getCurrentPhase(): ProgressPhase | null {
    return this.config.phases.find(phase => phase.isActive) || null;
  }

  /**
   * 计算当前阶段进度
   */
  calculateCurrentPhaseProgress(): number {
    const currentPhase = this.getCurrentPhase();
    if (!currentPhase || currentPhase.totalSteps === 0) return 0;

    return Math.min((currentPhase.completedSteps / currentPhase.totalSteps) * 100, 100);
  }

  /**
   * 预估剩余时间
   */
  estimateTimeRemaining(): number | undefined {
    if (this.progressHistory.length < 2) return undefined;

    const now = Date.now();
    const elapsedTime = now - this.startTime;
    const totalProgress = this.calculateTotalProgress();

    if (totalProgress <= 0) return undefined;

    const estimatedTotalTime = elapsedTime / (totalProgress / 100);
    return Math.max(estimatedTotalTime - elapsedTime, 0) / 1000; // 返回秒数
  }

  /**
   * 计算平均处理速度
   */
  calculateAverageSpeed(): number | undefined {
    if (this.progressHistory.length < 2) return undefined;

    const now = Date.now();
    const elapsedTime = (now - this.startTime) / 1000; // 秒
    
    // 计算已完成的总步数
    const completedSteps = this.config.phases.reduce((sum, phase) => {
      return sum + phase.completedSteps;
    }, 0);

    return elapsedTime > 0 ? completedSteps / elapsedTime : undefined;
  }

  /**
   * 重置进度计算器
   */
  reset(): void {
    this.startTime = Date.now();
    this.phaseStartTimes.clear();
    this.progressHistory = [];

    // 重置所有阶段
    this.config.phases.forEach(phase => {
      phase.completedSteps = 0;
      phase.isActive = false;
      phase.isCompleted = false;
      
      if (phase.subPhases) {
        phase.subPhases.forEach(subPhase => {
          subPhase.completedSteps = 0;
          subPhase.isActive = false;
          subPhase.isCompleted = false;
        });
      }
    });
  }

  /**
   * 获取阶段详情
   */
  getPhaseDetails(): ProgressPhase[] {
    return this.config.phases.map(phase => ({ ...phase }));
  }

  // 私有方法

  private findPhase(phaseName: string): ProgressPhase | undefined {
    return this.config.phases.find(phase => phase.name === phaseName);
  }

  private markPreviousPhasesCompleted(currentPhaseName: string): void {
    const currentIndex = this.config.phases.findIndex(phase => phase.name === currentPhaseName);
    if (currentIndex === -1) return;

    for (let i = 0; i < currentIndex; i++) {
      const phase = this.config.phases[i];
      if (!phase.isCompleted) {
        phase.completedSteps = phase.totalSteps;
        phase.isCompleted = true;
        phase.isActive = false;
      }
    }
  }

  private updateProgressHistory(): void {
    const now = Date.now();
    const progress = this.calculateTotalProgress();

    this.progressHistory.push({ time: now, progress });

    // 保持历史记录大小限制
    if (this.progressHistory.length > this.maxHistorySize) {
      this.progressHistory.shift();
    }
  }

  private validateWeights(): void {
    const totalWeight = this.config.phases.reduce((sum, phase) => sum + phase.weight, 0);
    const tolerance = 0.01;

    if (Math.abs(totalWeight - 1) > tolerance) {
      console.warn(`Phase weights sum to ${totalWeight}, expected 1.0`);
    }
  }
}