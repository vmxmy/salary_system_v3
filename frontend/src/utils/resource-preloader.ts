/**
 * 智能资源预加载工具
 * 根据网络连接状况动态调整预加载策略
 */

// 网络连接类型检测
type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';

interface NetworkInfo {
  type: NetworkType;
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

class ResourcePreloader {
  private networkInfo: NetworkInfo | null = null;
  private preloadedResources = new Set<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.detectNetworkCapability();
    this.setupIntersectionObserver();
  }

  /**
   * 检测网络能力
   */
  private detectNetworkCapability(): void {
    // @ts-ignore - Navigator.connection is not in TypeScript yet
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.networkInfo = {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false
      };

      // 监听网络变化
      connection.addEventListener('change', () => {
        this.networkInfo = {
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false
        };
        console.log('Network condition changed:', this.networkInfo);
      });
    }
  }

  /**
   * 设置交集观察器，用于视口内资源预加载
   */
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const preloadUrl = element.dataset.preload;
            if (preloadUrl && this.shouldPreload()) {
              this.preloadResource(preloadUrl);
              this.observer?.unobserve(element);
            }
          }
        });
      }, {
        rootMargin: '50px', // 提前50px开始预加载
        threshold: 0.1
      });
    }
  }

  /**
   * 判断是否应该预加载资源
   */
  private shouldPreload(): boolean {
    // 如果用户启用了数据节省模式，则不预加载
    if (this.networkInfo?.saveData) {
      console.log('Data saver mode enabled, skipping preload');
      return false;
    }

    // 根据网络类型决定是否预加载
    if (this.networkInfo) {
      const { effectiveType, downlink } = this.networkInfo;
      
      // 慢网络或低带宽环境下限制预加载
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return false;
      }
      
      // 3G网络下只预加载小资源
      if (effectiveType === '3g' && downlink < 1.5) {
        return false;
      }
    }

    // 检查内存使用情况（如果可用）
    // @ts-ignore
    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      console.log('Low memory device detected, limiting preload');
      return false;
    }

    return true;
  }

  /**
   * 预加载单个资源
   */
  public preloadResource(url: string, type: 'script' | 'style' | 'image' | 'fetch' = 'fetch'): void {
    if (this.preloadedResources.has(url)) {
      return;
    }

    if (!this.shouldPreload()) {
      console.log(`Skipping preload for ${url} due to network/device constraints`);
      return;
    }

    this.preloadedResources.add(url);

    switch (type) {
      case 'script':
        this.preloadScript(url);
        break;
      case 'style':
        this.preloadStyle(url);
        break;
      case 'image':
        this.preloadImage(url);
        break;
      case 'fetch':
      default:
        this.preloadFetch(url);
        break;
    }
  }

  /**
   * 预加载脚本
   */
  private preloadScript(url: string): void {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    console.log(`Preloading script: ${url}`);
  }

  /**
   * 预加载样式
   */
  private preloadStyle(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    document.head.appendChild(link);
    console.log(`Preloading style: ${url}`);
  }

  /**
   * 预加载图片
   */
  private preloadImage(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
    console.log(`Preloading image: ${url}`);
  }

  /**
   * 预加载数据（fetch）
   */
  private preloadFetch(url: string): void {
    fetch(url, {
      method: 'GET',
      cache: 'force-cache', // 强制缓存
      priority: 'low' // 低优先级，不影响关键资源
    } as RequestInit).then(response => {
      if (response.ok) {
        console.log(`Successfully preloaded data: ${url}`);
      }
    }).catch(error => {
      console.warn(`Failed to preload data: ${url}`, error);
    });
  }

  /**
   * 批量预加载核心路由组件
   */
  public preloadCriticalRoutes(): void {
    if (!this.shouldPreload()) {
      return;
    }

    const criticalRoutes = [
      '/src/pages/employees/EmployeeListPage.tsx',
      '/src/pages/payroll/PayrollListPage.tsx',
      '/src/components/common/DataTable.tsx'
    ];

    console.log('Preloading critical route components...');
    criticalRoutes.forEach(route => {
      this.preloadResource(route, 'script');
    });
  }

  /**
   * 预加载Excel处理库（仅在需要时）
   */
  public preloadExcelLibraries(): void {
    // 只有在高速网络下才预加载Excel库
    if (this.networkInfo?.effectiveType === '4g' && this.networkInfo.downlink > 5) {
      console.log('High-speed network detected, preloading Excel libraries...');
      
      // 使用动态导入预加载，但不立即执行
      const preloadPromises = [
        import('xlsx').then(() => console.log('XLSX library preloaded')),
        import('exceljs').then(() => console.log('ExcelJS library preloaded'))
      ];

      Promise.allSettled(preloadPromises).then(() => {
        console.log('Excel libraries preload completed');
      });
    }
  }

  /**
   * 监听元素进入视口并预加载相关资源
   */
  public observeElement(element: HTMLElement): void {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  /**
   * 获取网络信息
   */
  public getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo;
  }

  /**
   * 销毁观察器
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// 创建全局实例
export const resourcePreloader = new ResourcePreloader();

// 页面加载完成后预加载核心路由
if (document.readyState === 'complete') {
  resourcePreloader.preloadCriticalRoutes();
} else {
  window.addEventListener('load', () => {
    // 延迟执行，避免阻塞主线程
    setTimeout(() => {
      resourcePreloader.preloadCriticalRoutes();
    }, 1000);
  });
}

export default ResourcePreloader;