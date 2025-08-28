/**
 * 网络感知的超时配置工具
 * 根据网络连接质量动态调整API请求超时时间
 */

// 网络质量等级
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

// 超时配置接口
export interface TimeoutConfig {
  api: number;          // API请求超时
  download: number;     // 下载超时
  upload: number;       // 上传超时
  database: number;     // 数据库查询超时
}

// 网络质量检测结果
export interface NetworkQualityInfo {
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  timeouts: TimeoutConfig;
}

class NetworkAwareTimeout {
  private currentQuality: NetworkQuality = 'good'; // 默认为good而不是poor，提供更好的初始体验
  private listeners: Array<(info: NetworkQualityInfo) => void> = [];
  private networkInfo: any = null;

  // 基础超时配置（毫秒）- 提高容错性，适应低网速环境
  private readonly timeoutConfigs: Record<NetworkQuality, TimeoutConfig> = {
    excellent: {
      api: 15000,       // 15秒（从5秒提高）
      download: 60000,  // 1分钟（从30秒提高）
      upload: 120000,   // 2分钟（从1分钟提高）
      database: 20000   // 20秒（从8秒提高）
    },
    good: {
      api: 30000,       // 30秒（从10秒提高）
      download: 120000, // 2分钟（从1分钟提高）
      upload: 240000,   // 4分钟（从2分钟提高）
      database: 40000   // 40秒（从15秒提高）
    },
    fair: {
      api: 60000,       // 1分钟（从20秒提高）
      download: 300000, // 5分钟（从2分钟提高）
      upload: 600000,   // 10分钟（从5分钟提高）
      database: 90000   // 1.5分钟（从25秒提高）
    },
    poor: {
      api: 120000,      // 2分钟（从30秒提高）
      download: 600000, // 10分钟（从5分钟提高）
      upload: 1200000,  // 20分钟（从10分钟提高）
      database: 180000  // 3分钟（从40秒提高）
    },
    offline: {
      api: 3000,        // 3秒（从1秒提高，给网络恢复一些时间）
      download: 3000,   // 3秒
      upload: 3000,     // 3秒
      database: 5000    // 5秒（从2秒提高）
    }
  };

  constructor() {
    this.initializeNetworkMonitoring();
    this.detectInitialNetworkQuality();
  }

  /**
   * 初始化网络监控
   */
  private initializeNetworkMonitoring(): void {
    // @ts-ignore - Navigator.connection may not be available in TypeScript
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.networkInfo = connection;
      
      // 监听网络变化
      connection.addEventListener('change', () => {
        this.updateNetworkQuality();
      });
    }

    // 监听在线状态变化
    window.addEventListener('online', () => {
      this.updateNetworkQuality();
    });

    window.addEventListener('offline', () => {
      this.currentQuality = 'offline';
      this.notifyListeners();
    });
  }

  /**
   * 检测初始网络质量
   */
  private detectInitialNetworkQuality(): void {
    if (!navigator.onLine) {
      this.currentQuality = 'offline';
      return;
    }

    // 使用网络信息API进行粗略估计
    if (this.networkInfo) {
      this.updateNetworkQuality();
    } else {
      // 如果没有网络信息API，进行简单的延迟测试
      this.performLatencyTest();
    }
  }

  /**
   * 更新网络质量评估
   */
  private updateNetworkQuality(): void {
    if (!navigator.onLine) {
      this.currentQuality = 'offline';
      this.notifyListeners();
      return;
    }

    if (this.networkInfo) {
      const { effectiveType, downlink, rtt, saveData } = this.networkInfo;
      
      // 更宽容的网络质量评估，提供更好的用户体验
      if (saveData || effectiveType === 'slow-2g' || rtt > 3000 || downlink < 0.25) {
        this.currentQuality = 'poor';
      } else if (effectiveType === '2g' || rtt > 1500 || downlink < 1.0) {
        this.currentQuality = 'fair';
      } else if (effectiveType === '3g' || rtt > 800 || downlink < 3) {
        this.currentQuality = 'good';
      } else {
        this.currentQuality = 'excellent';
      }
      
      console.log(`[NetworkTimeout] Network quality: ${this.currentQuality} (type: ${effectiveType}, RTT: ${rtt}ms, downlink: ${downlink}Mbps, saveData: ${saveData})`);
    } else {
      // 备用检测方法
      this.performLatencyTest();
    }

    this.notifyListeners();
  }

  /**
   * 执行延迟测试来评估网络质量
   */
  private async performLatencyTest(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // 使用小的请求测试延迟
      await fetch('/vite.svg', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      const latency = performance.now() - startTime;
      
      // 更宽容的延迟评估标准，适应真实网络环境
      if (latency < 200) {
        this.currentQuality = 'excellent';
      } else if (latency < 800) {
        this.currentQuality = 'good';
      } else if (latency < 2000) {
        this.currentQuality = 'fair';
      } else {
        this.currentQuality = 'poor';
      }
      
      console.log(`[NetworkTimeout] Latency test result: ${latency}ms -> ${this.currentQuality}`);
    } catch (error) {
      // 如果测试失败，假设网络较差
      this.currentQuality = 'poor';
      console.warn('Network latency test failed:', error);
    }

    this.notifyListeners();
  }

  /**
   * 通知所有监听器网络质量变化
   */
  private notifyListeners(): void {
    const info = this.getNetworkInfo();
    this.listeners.forEach(listener => {
      try {
        listener(info);
      } catch (error) {
        console.error('Error in network quality listener:', error);
      }
    });
  }

  /**
   * 获取当前网络质量信息
   */
  public getNetworkInfo(): NetworkQualityInfo {
    const baseInfo = {
      quality: this.currentQuality,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };

    if (this.networkInfo) {
      baseInfo.effectiveType = this.networkInfo.effectiveType || 'unknown';
      baseInfo.downlink = this.networkInfo.downlink || 0;
      baseInfo.rtt = this.networkInfo.rtt || 0;
      baseInfo.saveData = this.networkInfo.saveData || false;
    }

    return {
      ...baseInfo,
      timeouts: this.getTimeouts()
    };
  }

  /**
   * 获取当前网络质量对应的超时配置
   */
  public getTimeouts(): TimeoutConfig {
    return { ...this.timeoutConfigs[this.currentQuality] };
  }

  /**
   * 获取特定操作的超时时间
   */
  public getTimeout(operation: keyof TimeoutConfig): number {
    return this.timeoutConfigs[this.currentQuality][operation];
  }

  /**
   * 为特定操作创建AbortSignal
   */
  public createAbortSignal(operation: keyof TimeoutConfig): AbortSignal {
    const timeout = this.getTimeout(operation);
    return AbortSignal.timeout(timeout);
  }

  /**
   * 添加网络质量变化监听器
   */
  public addListener(callback: (info: NetworkQualityInfo) => void): () => void {
    this.listeners.push(callback);
    
    // 立即调用一次，提供当前状态
    callback(this.getNetworkInfo());
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 手动触发网络质量检测
   */
  public async refresh(): Promise<void> {
    await this.performLatencyTest();
  }

  /**
   * 检查当前网络是否适合大文件操作
   */
  public canHandleLargeFiles(): boolean {
    return ['excellent', 'good'].includes(this.currentQuality);
  }

  /**
   * 检查是否应该启用数据节省模式
   */
  public shouldSaveData(): boolean {
    return this.currentQuality === 'poor' || 
           this.currentQuality === 'offline' || 
           (this.networkInfo?.saveData === true);
  }

  /**
   * 获取推荐的并发请求数
   */
  public getRecommendedConcurrency(): number {
    switch (this.currentQuality) {
      case 'excellent': return 6;
      case 'good': return 4;
      case 'fair': return 2;
      case 'poor': return 1;
      case 'offline': return 0;
      default: return 2;
    }
  }
}

// 创建全局实例
export const networkAwareTimeout = new NetworkAwareTimeout();

// 导出工具函数
export const createTimeoutSignal = (operation: keyof TimeoutConfig): AbortSignal => {
  return networkAwareTimeout.createAbortSignal(operation);
};

export const getNetworkTimeout = (operation: keyof TimeoutConfig): number => {
  return networkAwareTimeout.getTimeout(operation);
};

export const isNetworkSlow = (): boolean => {
  const quality = networkAwareTimeout.getNetworkInfo().quality;
  return ['poor', 'fair'].includes(quality);
};

export const isOffline = (): boolean => {
  return networkAwareTimeout.getNetworkInfo().quality === 'offline';
};

// React Hook 已移动到 src/hooks/core/useNetworkQuality.ts
// 这里保持网络工具的纯JavaScript实现，不依赖React

export default networkAwareTimeout;