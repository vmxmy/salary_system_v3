# 性能优化指南

本文档详细介绍了薪资管理系统中使用的性能优化策略和技术，帮助开发者创建高性能的用户界面。

## 核心原则

### 1. 硬件加速优先 🚀
充分利用 GPU 加速，减少 CPU 负担：

```css
/* 启用硬件加速 */
.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

/* 高频动画元素 */
.high-frequency-animation {
  will-change: transform, opacity;
  contain: layout style paint;
}
```

### 2. 渲染优化 📊
减少重绘和重排，提升渲染效率：

```css
/* CSS 容器查询优化 */
.container-optimized {
  contain: layout style;
}

.strict-containment {
  contain: strict; /* layout + style + paint + size */
}

/* 避免布局抖动 */
.layout-stable {
  contain: layout;
  min-height: 100px; /* 预留空间 */
}
```

### 3. 内存管理 💾
合理管理组件生命周期和内存使用：

```tsx
// 使用 React.memo 防止不必要的重渲染
const OptimizedComponent = React.memo(({ data }) => {
  return <div>{data.title}</div>;
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});

// 清理副作用
function ComponentWithCleanup() {
  useEffect(() => {
    const subscription = subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
```

## 动画性能优化

### 1. 硬件加速动画
使用 transform 和 opacity 属性进行动画：

```css
/* ✅ 推荐：GPU加速的动画 */
@keyframes slideInOptimized {
  from {
    transform: translate3d(0, 20px, 0);
    opacity: 0;
  }
  to {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

.slide-in {
  animation: slideInOptimized 0.3s ease-out;
  will-change: transform, opacity;
}

/* ❌ 避免：导致重排的动画 */
@keyframes slideInBad {
  from {
    top: 20px; /* 触发重排 */
    height: 0px; /* 触发重排 */
  }
  to {
    top: 0px;
    height: auto;
  }
}
```

### 2. 关键帧优化
使用高效的关键帧定义：

```css
/* 按钮点击效果 */
@keyframes buttonPressOptimized {
  0% { transform: scale3d(1, 1, 1); }
  50% { transform: scale3d(0.98, 0.98, 1); }
  100% { transform: scale3d(1, 1, 1); }
}

/* 加载动画 */
@keyframes spinOptimized {
  from { transform: rotate3d(0, 0, 1, 0deg); }
  to { transform: rotate3d(0, 0, 1, 360deg); }
}

/* 脉冲效果 */
@keyframes pulseOptimized {
  0%, 100% { 
    opacity: 1;
    transform: translateZ(0);
  }
  50% { 
    opacity: 0.5;
    transform: translateZ(0);
  }
}
```

### 3. 动画生命周期管理
合理控制动画的开始和结束：

```tsx
function AnimatedComponent({ isVisible }) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // 延迟移除，等待退出动画完成
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);
  
  if (!shouldRender) return null;
  
  return (
    <div 
      className={cn(
        'animated-element',
        isVisible ? 'animate-enter' : 'animate-exit'
      )}
    >
      内容
    </div>
  );
}
```

## 渲染性能优化

### 1. 虚拟化长列表
对于大数据集使用虚拟化技术：

```tsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="list-item">
      {items[index].name}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
      itemData={items}
    >
      {Row}
    </List>
  );
}
```

### 2. 分页和懒加载
减少初始渲染负担：

```tsx
function LazyDataTable({ data }) {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);
  
  return (
    <div>
      <Table data={paginatedData} />
      <Pagination 
        current={page}
        total={data.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </div>
  );
}
```

### 3. 图片优化
使用现代图片格式和懒加载：

```tsx
function OptimizedImage({ src, alt, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);
  
  return (
    <div className="image-container">
      {!isLoaded && <div className="image-skeleton" />}
      {imageSrc && (
        <img 
          src={imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
```

## React 性能优化

### 1. 状态管理优化
合理设计状态结构：

```tsx
// ✅ 推荐：扁平化状态结构
interface AppState {
  employees: Record<string, Employee>;
  payrolls: Record<string, Payroll>;
  ui: {
    loading: boolean;
    selectedEmployeeId: string | null;
  };
}

// ❌ 避免：深层嵌套状态
interface BadState {
  data: {
    employees: {
      list: Employee[];
      details: {
        [id: string]: {
          info: EmployeeDetail;
          payrolls: Payroll[];
        };
      };
    };
  };
}
```

### 2. 计算属性缓存
使用 useMemo 缓存计算结果：

```tsx
function ExpensiveComponent({ employees, filters }) {
  // 缓存过滤结果
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      return emp.department === filters.department &&
             emp.status === filters.status;
    });
  }, [employees, filters.department, filters.status]);
  
  // 缓存统计数据
  const statistics = useMemo(() => {
    return {
      total: filteredEmployees.length,
      averageSalary: filteredEmployees.reduce((sum, emp) => 
        sum + emp.salary, 0) / filteredEmployees.length
    };
  }, [filteredEmployees]);
  
  return (
    <div>
      <div>总计: {statistics.total}</div>
      <div>平均薪资: {statistics.averageSalary}</div>
      <EmployeeList employees={filteredEmployees} />
    </div>
  );
}
```

### 3. 事件处理优化
避免在渲染时创建新函数：

```tsx
// ✅ 推荐：使用 useCallback
function EmployeeList({ employees, onSelect }) {
  const handleSelect = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);
  
  return (
    <div>
      {employees.map(emp => (
        <EmployeeCard 
          key={emp.id}
          employee={emp}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

// ❌ 避免：在渲染时创建函数
function BadEmployeeList({ employees, onSelect }) {
  return (
    <div>
      {employees.map(emp => (
        <EmployeeCard 
          key={emp.id}
          employee={emp}
          onSelect={() => onSelect(emp.id)} // 每次渲染都创建新函数
        />
      ))}
    </div>
  );
}
```

## 网络性能优化

### 1. 数据预加载
预加载可能需要的数据：

```tsx
function useEmployeeData() {
  const [cache, setCache] = useState(new Map());
  
  const preloadEmployee = useCallback(async (id: string) => {
    if (!cache.has(id)) {
      const employee = await fetchEmployee(id);
      setCache(prev => new Map(prev).set(id, employee));
    }
  }, [cache]);
  
  const getEmployee = useCallback((id: string) => {
    return cache.get(id);
  }, [cache]);
  
  return { preloadEmployee, getEmployee };
}
```

### 2. 请求去重和缓存
避免重复请求：

```tsx
const requestCache = new Map();

async function cachedFetch(url: string) {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }
  
  const promise = fetch(url).then(res => res.json());
  requestCache.set(url, promise);
  
  // 清理过期缓存
  setTimeout(() => {
    requestCache.delete(url);
  }, 5 * 60 * 1000); // 5分钟后清理
  
  return promise;
}
```

### 3. 增量更新
只更新变化的数据：

```tsx
function useIncrementalUpdate<T extends { id: string; updatedAt: string }>(
  initialData: T[],
  fetchUpdates: (lastUpdate: string) => Promise<T[]>
) {
  const [data, setData] = useState(initialData);
  const [lastUpdate, setLastUpdate] = useState(
    Math.max(...initialData.map(item => new Date(item.updatedAt).getTime()))
  );
  
  const updateData = useCallback(async () => {
    const updates = await fetchUpdates(new Date(lastUpdate).toISOString());
    
    setData(prevData => {
      const dataMap = new Map(prevData.map(item => [item.id, item]));
      
      updates.forEach(update => {
        dataMap.set(update.id, update);
      });
      
      return Array.from(dataMap.values());
    });
    
    setLastUpdate(Date.now());
  }, [lastUpdate, fetchUpdates]);
  
  return { data, updateData };
}
```

## 性能监控

### 1. 性能指标收集
监控关键性能指标：

```tsx
function PerformanceMonitor({ children }) {
  useEffect(() => {
    // 监控 LCP (Largest Contentful Paint)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      console.log('LCP:', lastEntry.startTime);
      // 发送到监控服务
      analytics.track('performance.lcp', {
        value: lastEntry.startTime,
        url: window.location.pathname
      });
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    
    return () => observer.disconnect();
  }, []);
  
  return children;
}
```

### 2. 组件渲染时间监控
测量组件渲染性能：

```tsx
function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    const startTime = performance.now();
    
    useLayoutEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // 超过一帧的时间
        console.warn(`${componentName} 渲染时间过长: ${renderTime}ms`);
      }
    });
    
    return <Component {...props} />;
  });
}

// 使用
const MonitoredDataTable = withPerformanceMonitoring(DataTable, 'DataTable');
```

## 最佳实践总结

### ✅ 推荐做法

1. **动画优化**
   - 使用 transform 和 opacity 进行动画
   - 添加 will-change 属性提前优化
   - 使用 GPU 加速的 3D 变换

2. **渲染优化**
   - 使用 React.memo 防止不必要的重渲染
   - 合理使用 useMemo 和 useCallback
   - 实现虚拟化长列表

3. **内存管理**
   - 及时清理事件监听器和定时器
   - 使用弱引用避免内存泄漏
   - 合理管理组件状态

### ❌ 避免做法

1. **性能陷阱**
   - 在渲染函数中创建新对象或函数
   - 过度使用 useEffect 和 useState
   - 忽略组件的清理工作

2. **动画错误**
   - 使用导致重排的 CSS 属性动画
   - 同时运行过多动画
   - 忽略动画的性能影响

3. **渲染问题**
   - 不合理的组件拆分
   - 过深的组件嵌套
   - 忽略 key 属性的重要性

## 性能调试工具

### 1. React DevTools Profiler
使用 React DevTools 分析组件性能：

```tsx
// 在开发环境启用性能分析
if (process.env.NODE_ENV === 'development') {
  const { whyDidYouUpdate } = require('@welldone-software/why-did-you-render');
  whyDidYouUpdate(React);
}
```

### 2. Chrome DevTools
利用 Chrome 的性能分析工具：
- Performance 面板：分析渲染性能
- Memory 面板：检查内存泄漏
- Lighthouse：整体性能评估

### 3. Web Vitals
监控核心网页指标：

```tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}

// 在应用启动时调用
reportWebVitals();
```

通过遵循这些性能优化指南，可以确保薪资管理系统在各种设备和网络条件下都能提供流畅的用户体验。