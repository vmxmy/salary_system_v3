# 孔雀屏设计模式

孔雀屏是我们设计系统的核心模式，灵感来源于孔雀开屏时层次分明、渐次展开的视觉效果。这种模式强调信息的分层展示和渐进式披露，为用户提供直观、高效的信息浏览体验。

## 设计理念

### 🦚 孔雀开屏的隐喻
- **核心信息**: 如孔雀的头部，最重要、最醒目
- **主要信息**: 如羽毛的主体，支撑核心内容
- **次要信息**: 如羽毛的细节，丰富整体信息
- **背景信息**: 如羽毛的纹理，提供上下文环境

### 📊 信息层级结构
```
Level 1: 核心标识 (最高优先级)
├── Level 2: 主要内容 (高优先级)
│   ├── Level 3: 详细信息 (中优先级)
│   │   └── Level 4: 辅助信息 (低优先级)
│   └── Level 3: 操作控件 (中优先级)
└── Level 2: 状态指示 (高优先级)
```

## 实现原理

### 1. 视觉层次
通过字体大小、颜色对比度、空间关系建立清晰的视觉层次：

```css
/* 核心信息 - 最高对比度 */
.peacock-level-1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(15 23 42);
  margin-bottom: 1rem;
}

/* 主要信息 - 高对比度 */
.peacock-level-2 {
  font-size: 1rem;
  font-weight: 500;
  color: rgb(51 65 85);
  margin-bottom: 0.75rem;
}

/* 次要信息 - 中等对比度 */
.peacock-level-3 {
  font-size: 0.875rem;
  font-weight: 400;
  color: rgb(100 116 139);
  margin-bottom: 0.5rem;
}

/* 辅助信息 - 低对比度 */
.peacock-level-4 {
  font-size: 0.75rem;
  font-weight: 400;
  color: rgb(148 163 184);
}
```

### 2. 渐进式披露
使用折叠面板（AccordionSection）实现信息的渐进式展示：

```tsx
function PeacockScreenExample() {
  const [openSections, setOpenSections] = useState(['basic']);

  return (
    <div className="peacock-container">
      {/* Level 1: 核心标识 */}
      <div className="peacock-header">
        <h1 className="peacock-level-1">张三 - 2024年1月薪资详情</h1>
        <div className="peacock-level-2">
          <PayrollStatusBadge status="paid" />
        </div>
      </div>

      {/* Level 2: 主要内容区域 */}
      <div className="peacock-body space-y-4">
        {/* 基本信息 - 默认展开 */}
        <AccordionSection
          id="basic"
          title="基本信息"
          icon={<UserIcon />}
          isOpen={openSections.includes('basic')}
          onToggle={() => toggleSection('basic')}
        >
          {/* Level 3: 详细字段 */}
          <div className="space-y-3">
            <DetailField label="应发工资" value="¥15,000.00" level={3} />
            <DetailField label="实发工资" value="¥12,750.00" level={3} />
            
            {/* Level 4: 辅助信息 */}
            <div className="peacock-level-4">
              计算基准：基本工资 + 岗位津贴 + 绩效奖金
            </div>
          </div>
        </AccordionSection>

        {/* 五险一金 - 可展开 */}
        <AccordionSection
          id="insurance"
          title="五险一金"
          icon={<ShieldIcon />}
          isOpen={openSections.includes('insurance')}
          onToggle={() => toggleSection('insurance')}
        >
          <InsuranceDetails data={insuranceData} />
        </AccordionSection>
      </div>
    </div>
  );
}
```

### 3. 动画效果
平滑的展开收起动画增强用户体验：

```css
.peacock-section {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: height, opacity;
}

.peacock-section[data-state="open"] {
  animation: peacock-expand 0.3s ease-out;
}

.peacock-section[data-state="closed"] {
  animation: peacock-collapse 0.3s ease-in;
}

@keyframes peacock-expand {
  from {
    height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    height: auto;
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes peacock-collapse {
  from {
    height: auto;
    opacity: 1;
    transform: translateY(0);
  }
  to {
    height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

## 应用场景

### 1. 详情页面
员工详情、薪资详情等信息密集的页面：

```tsx
function EmployeeDetailModal() {
  return (
    <div className="peacock-modal">
      {/* 核心身份信息 */}
      <PeacockHeader 
        title="张三"
        subtitle="高级前端工程师"
        avatar="/avatars/zhangsan.jpg"
      />
      
      {/* 分层信息展示 */}
      <PeacockBody>
        <PeacockSection title="基本信息" defaultOpen>
          <PersonalInfo />
        </PeacockSection>
        
        <PeacockSection title="工作信息">
          <WorkInfo />
        </PeacockSection>
        
        <PeacockSection title="薪资信息">
          <SalaryInfo />
        </PeacockSection>
      </PeacockBody>
    </div>
  );
}
```

### 2. 数据卡片
在列表或网格布局中展示摘要信息：

```tsx
function EmployeeCard({ employee }) {
  return (
    <div className="peacock-card">
      {/* Level 1: 核心身份 */}
      <div className="peacock-level-1">
        {employee.name}
      </div>
      
      {/* Level 2: 关键信息 */}
      <div className="peacock-level-2">
        {employee.position} · {employee.department}
      </div>
      
      {/* Level 3: 状态信息 */}
      <div className="peacock-level-3">
        <EmployeeStatusBadge status={employee.status} />
        <span className="ml-2">{employee.joinDate}</span>
      </div>
    </div>
  );
}
```

### 3. 表单布局
复杂表单的分组和层次展示：

```tsx
function PayrollForm() {
  return (
    <form className="peacock-form">
      <PeacockSection title="基本设置" defaultOpen required>
        <FormGroup>
          <FormField label="发薪月份" required />
          <FormField label="发薪日期" required />
        </FormGroup>
      </PeacockSection>
      
      <PeacockSection title="薪资组成">
        <SalaryComponents />
      </PeacockSection>
      
      <PeacockSection title="扣款项目">
        <DeductionItems />
      </PeacockSection>
    </form>
  );
}
```

## 设计指导原则

### 1. 信息优先级
- **高优先级**: 用户最关心的信息，如姓名、金额、状态
- **中优先级**: 补充说明信息，如部门、日期、分类
- **低优先级**: 技术细节信息，如ID、创建时间、备注

### 2. 展开策略
- **默认展开**: 最重要的信息，如基本信息
- **按需展开**: 详细信息，如五险一金详情
- **智能展开**: 根据用户行为学习展开偏好

### 3. 视觉权重
```scss
// 权重递减的视觉设计
$peacock-weights: (
  level-1: (
    font-size: 1.5rem,
    font-weight: 600,
    color: var(--color-gray-900),
    margin-bottom: 1rem
  ),
  level-2: (
    font-size: 1.125rem,
    font-weight: 500,
    color: var(--color-gray-700),
    margin-bottom: 0.75rem
  ),
  level-3: (
    font-size: 1rem,
    font-weight: 400,
    color: var(--color-gray-600),
    margin-bottom: 0.5rem
  ),
  level-4: (
    font-size: 0.875rem,
    font-weight: 400,
    color: var(--color-gray-500),
    margin-bottom: 0.25rem
  )
);
```

## 响应式适配

### 移动端优化
```tsx
function ResponsivePeacockScreen() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className={cn(
      'peacock-container',
      isMobile && 'peacock-mobile'
    )}>
      {/* 移动端默认全部折叠，只显示最重要信息 */}
      {isMobile ? (
        <CompactPeacockView />
      ) : (
        <FullPeacockView />
      )}
    </div>
  );
}
```

### 触摸优化
```css
@media (hover: none) and (pointer: coarse) {
  .peacock-section-header {
    min-height: 44px; /* 确保触摸区域足够大 */
    padding: 12px 16px;
  }
  
  .peacock-toggle-button {
    transform: scale(1.2); /* 放大触摸目标 */
  }
}
```

## 性能考虑

### 懒加载
只渲染可见的 section 内容：

```tsx
function LazyPeacockSection({ id, children, isOpen }) {
  return (
    <AccordionSection id={id} isOpen={isOpen}>
      {isOpen && (
        <Suspense fallback={<SkeletonLoader />}>
          {children}
        </Suspense>
      )}
    </AccordionSection>
  );
}
```

### 虚拟化
对于大量数据的展示使用虚拟列表：

```tsx
function VirtualizedPeacockList({ items }) {
  const rowRenderer = ({ index, key, style }) => (
    <div key={key} style={style}>
      <PeacockCard data={items[index]} />
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          rowCount={items.length}
          rowHeight={120}
          rowRenderer={rowRenderer}
        />
      )}
    </AutoSizer>
  );
}
```

## 可访问性

### 语义化结构
```tsx
function AccessiblePeacockScreen() {
  return (
    <main className="peacock-container" role="main">
      <header className="peacock-header">
        <h1>页面标题</h1>
      </header>
      
      <section className="peacock-body">
        <details className="peacock-section" open>
          <summary className="peacock-section-header">
            基本信息
          </summary>
          <div className="peacock-section-content">
            内容区域
          </div>
        </details>
      </section>
    </main>
  );
}
```

### 键盘导航
- `Tab`: 在 section header 间导航
- `Space` / `Enter`: 展开/折叠 section
- `Arrow Keys`: 在 section 内的字段间导航

## 最佳实践

### ✅ 推荐做法
- 将最重要的信息放在顶层
- 使用一致的视觉层次
- 提供清晰的操作反馈
- 保持适当的信息密度

### ❌ 避免做法
- 不要将重要信息隐藏在深层
- 不要使用过多的层级（建议最多4层）
- 不要忽略加载状态
- 不要在移动端展示过多信息

## 相关组件

- [AccordionSection](../components/common/AccordionSection.md) - 折叠面板
- [EmployeeDetailModal](../components/employee/EmployeeDetailModal.md) - 员工详情模态框
- [PayrollDetailModal](../components/payroll/PayrollDetailModal.md) - 薪资详情模态框