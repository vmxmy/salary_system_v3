import { supabase } from '@/lib/supabase';

// 导入日志级别
export type ImportLogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

// 导入日志条目
export interface ImportLogEntry {
  level: ImportLogLevel;
  message: string;
  timestamp: Date;
  context?: {
    operation?: string;
    periodId?: string;
    employeeId?: string;
    rowNumber?: number;
    batchSize?: number;
    duration?: number;
    additionalData?: any;
  };
  error?: Error | any;
}

// 导入日志会话
export interface ImportLogSession {
  sessionId: string;
  periodId: string;
  importType: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalRows: number;
  successCount: number;
  failedCount: number;
  logs: ImportLogEntry[];
}

/**
 * 导入日志记录器类
 */
export class ImportLogger {
  private session: ImportLogSession;
  private isConsoleEnabled: boolean = true;
  private isDatabaseEnabled: boolean = false; // 暂时禁用数据库存储
  
  constructor(
    periodId: string,
    importType: string,
    totalRows: number = 0,
    options: {
      enableConsole?: boolean;
      enableDatabase?: boolean;
    } = {}
  ) {
    this.isConsoleEnabled = options.enableConsole !== false;
    this.isDatabaseEnabled = options.enableDatabase === true;
    
    this.session = {
      sessionId: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      periodId,
      importType,
      startTime: new Date(),
      status: 'running',
      totalRows,
      successCount: 0,
      failedCount: 0,
      logs: []
    };
    
    this.info('导入会话开始', {
      operation: 'session_start',
      periodId,
      additionalData: { importType, totalRows }
    });
  }
  
  /**
   * 记录信息级别日志
   */
  info(message: string, context?: ImportLogEntry['context']): void {
    this.log('info', message, context);
  }
  
  /**
   * 记录警告级别日志
   */
  warn(message: string, context?: ImportLogEntry['context']): void {
    this.log('warn', message, context);
  }
  
  /**
   * 记录错误级别日志
   */
  error(message: string, error?: Error | any, context?: ImportLogEntry['context']): void {
    this.log('error', message, { ...context }, error);
  }
  
  /**
   * 记录调试级别日志
   */
  debug(message: string, context?: ImportLogEntry['context']): void {
    this.log('debug', message, context);
  }
  
  /**
   * 记录成功级别日志
   */
  success(message: string, context?: ImportLogEntry['context']): void {
    this.log('success', message, context);
  }
  
  /**
   * 记录批量处理开始
   */
  logBatchStart(operation: string, batchSize: number, batchNumber: number): void {
    this.info(`开始处理批次 ${batchNumber}`, {
      operation: `batch_start_${operation}`,
      batchSize,
      additionalData: { batchNumber }
    });
  }
  
  /**
   * 记录批量处理完成
   */
  logBatchComplete(
    operation: string, 
    batchNumber: number, 
    successCount: number, 
    errorCount: number,
    duration: number
  ): void {
    this.success(`批次 ${batchNumber} 处理完成`, {
      operation: `batch_complete_${operation}`,
      duration,
      additionalData: { 
        batchNumber, 
        successCount, 
        errorCount,
        batchSuccessRate: successCount / (successCount + errorCount) * 100
      }
    });
  }
  
  /**
   * 记录数据验证结果
   */
  logValidationResult(isValid: boolean, errorCount: number, warningCount: number): void {
    if (isValid) {
      this.success('数据验证通过', {
        operation: 'validation',
        additionalData: { errorCount, warningCount }
      });
    } else {
      this.error('数据验证失败', undefined, {
        operation: 'validation',
        additionalData: { errorCount, warningCount }
      });
    }
  }
  
  /**
   * 记录员工查找结果
   */
  logEmployeeResolution(foundCount: number, missingCount: number, totalCount: number): void {
    this.info('员工数据解析完成', {
      operation: 'employee_resolution',
      additionalData: {
        foundCount,
        missingCount,
        totalCount,
        foundRate: (foundCount / totalCount * 100).toFixed(2) + '%'
      }
    });
  }
  
  /**
   * 记录薪资组件匹配结果
   */
  logComponentMatching(matchedCount: number, unmatchedCount: number): void {
    this.info('薪资组件匹配完成', {
      operation: 'component_matching',
      additionalData: {
        matchedCount,
        unmatchedCount,
        matchRate: (matchedCount / (matchedCount + unmatchedCount) * 100).toFixed(2) + '%'
      }
    });
  }
  
  /**
   * 更新会话统计
   */
  updateStats(successCount: number, failedCount: number): void {
    this.session.successCount = successCount;
    this.session.failedCount = failedCount;
  }
  
  /**
   * 完成导入会话
   */
  completeSession(status: 'completed' | 'failed' | 'cancelled' = 'completed'): void {
    this.session.endTime = new Date();
    this.session.status = status;
    
    const duration = this.session.endTime.getTime() - this.session.startTime.getTime();
    const successRate = this.session.totalRows > 0 
      ? (this.session.successCount / this.session.totalRows * 100).toFixed(2) 
      : '0';
    
    this.info('导入会话结束', {
      operation: 'session_end',
      duration,
      additionalData: {
        status,
        totalRows: this.session.totalRows,
        successCount: this.session.successCount,
        failedCount: this.session.failedCount,
        successRate: successRate + '%',
        totalDuration: `${(duration / 1000).toFixed(2)}秒`
      }
    });
    
    // 如果启用了数据库存储，保存到数据库
    if (this.isDatabaseEnabled) {
      this.persistToDatabase().catch(error => {
        console.error('保存导入日志到数据库失败:', error);
      });
    }
  }
  
  /**
   * 获取会话摘要
   */
  getSessionSummary(): {
    sessionId: string;
    duration: number;
    totalRows: number;
    successCount: number;
    failedCount: number;
    successRate: string;
    errorLogs: ImportLogEntry[];
    warningLogs: ImportLogEntry[];
  } {
    const duration = this.session.endTime 
      ? this.session.endTime.getTime() - this.session.startTime.getTime()
      : Date.now() - this.session.startTime.getTime();
    
    const successRate = this.session.totalRows > 0 
      ? (this.session.successCount / this.session.totalRows * 100).toFixed(2) 
      : '0';
    
    return {
      sessionId: this.session.sessionId,
      duration,
      totalRows: this.session.totalRows,
      successCount: this.session.successCount,
      failedCount: this.session.failedCount,
      successRate: successRate + '%',
      errorLogs: this.session.logs.filter(log => log.level === 'error'),
      warningLogs: this.session.logs.filter(log => log.level === 'warn')
    };
  }
  
  /**
   * 核心日志记录方法
   */
  private log(
    level: ImportLogLevel, 
    message: string, 
    context?: ImportLogEntry['context'], 
    error?: Error | any
  ): void {
    const logEntry: ImportLogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error
    };
    
    // 添加到会话日志
    this.session.logs.push(logEntry);
    
    // 控制台输出
    if (this.isConsoleEnabled) {
      this.logToConsole(logEntry);
    }
  }
  
  /**
   * 输出到控制台
   */
  private logToConsole(entry: ImportLogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` [${entry.context.operation || 'unknown'}]` : '';
    const message = `[${timestamp}]${contextStr} ${entry.message}`;
    
    switch (entry.level) {
      case 'info':
        console.log(`ℹ️ ${message}`, entry.context);
        break;
      case 'success':
        console.log(`✅ ${message}`, entry.context);
        break;
      case 'warn':
        console.warn(`⚠️ ${message}`, entry.context);
        break;
      case 'error':
        console.error(`❌ ${message}`, entry.error || entry.context);
        break;
      case 'debug':
        console.debug(`🐛 ${message}`, entry.context);
        break;
    }
  }
  
  /**
   * 保存到数据库（预留功能）
   */
  private async persistToDatabase(): Promise<void> {
    // TODO: 实现数据库存储功能
    // 当前暂时禁用，将来可以创建 import_logs 表来存储日志
    /*
    try {
      const { error } = await supabase
        .from('import_logs')
        .insert({
          session_id: this.session.sessionId,
          period_id: this.session.periodId,
          import_type: this.session.importType,
          start_time: this.session.startTime.toISOString(),
          end_time: this.session.endTime?.toISOString(),
          status: this.session.status,
          total_rows: this.session.totalRows,
          success_count: this.session.successCount,
          failed_count: this.session.failedCount,
          logs_data: this.session.logs
        });
      
      if (error) {
        console.error('保存导入日志失败:', error);
      }
    } catch (error) {
      console.error('保存导入日志时发生异常:', error);
    }
    */
    console.info('📝 导入日志已准备好数据库持久化功能（当前未启用）');
  }
}

/**
 * 创建导入日志记录器的工厂方法
 */
export const createImportLogger = (
  periodId: string,
  importType: string,
  totalRows: number = 0,
  options?: {
    enableConsole?: boolean;
    enableDatabase?: boolean;
  }
): ImportLogger => {
  return new ImportLogger(periodId, importType, totalRows, options);
};

/**
 * 格式化持续时间
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  }
  return `${seconds}秒`;
};