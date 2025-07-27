# 员工详情模态框与现有系统集成方案

## 当前系统分析

### 现有架构特点
1. **数据层**: 基于 React Query + Supabase 的数据管理
2. **UI 组件**: 使用 TanStack Table + DaisyUI 的现代表格组件
3. **页面结构**: EmployeeListPage (已实现) + EmployeeDetailPage (待实现)
4. **配置系统**: 动态字段配置和表格个性化

### 现有组件资产
- `DataTable`: 功能完整的数据表格组件
- `FieldSelector`: 字段选择器
- `AdvancedSearchBox`: 搜索组件
- `useEmployees`: 员工数据管理 Hook
- `useTableConfiguration`: 表格配置管理

## 集成策略

### 1. 模态框触发机制

#### 在 EmployeeListPage 中添加模态框触发
```typescript
// 更新 EmployeeListPage.tsx
import { EmployeeDetailModal } from '@/components/employee/EmployeeDetailModal';

export default function EmployeeListPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // 添加行点击处理
  const handleRowClick = (employee: EmployeeListItem) => {
    setSelectedEmployeeId(employee.id);
  };

  // 在 DataTable 中添加 actions
  const rowActions = (employee: EmployeeListItem) => (
    <div className="flex gap-2">
      <button 
        className="btn btn-sm btn-primary"
        onClick={() => handleRowClick(employee)}
      >
        查看详情
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* 现有内容 */}
      
      <DataTable
        // 现有属性
        actions={rowActions}
      />

      {/* 新增模态框 */}
      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        open={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
      />
    </div>
  );
}
```

### 2. 替换 EmployeeDetailPage

#### 将详情页面改为模态框模式
```typescript
// 更新路由配置，详情页重定向到列表页
// router/routes.tsx
{
  path: '/employees/:id',
  element: <Navigate to="/employees" replace />,
}
```

### 3. 数据层集成

#### 扩展现有 useEmployees Hook
```typescript
// hooks/useEmployees.ts 扩展
export function useEmployeeFullDetails(id: string) {
  return useQuery({
    queryKey: [...employeeQueryKeys.detail(id), 'full'],
    queryFn: () => employeeService.getFullDetails(id), // 新的详细数据接口
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
}

// 实时协作相关
export function useEmployeeRealtimeUpdates(id: string) {
  // Supabase Realtime 订阅逻辑
}
```

#### 新建服务层方法
```typescript
// services/employee.service.ts 扩展
class EmployeeService {
  // 现有方法...

  async getFullDetails(id: string) {
    // 使用设计的 view_employee_complete_details
    const { data, error } = await supabase
      .from('view_employee_complete_details')
      .select('*')
      .eq('employee_id', id)
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateField(employeeId: string, field: string, value: any) {
    // 单字段更新逻辑，支持乐观更新
  }
}
```

### 4. 组件集成架构

#### 组件层次结构
```
EmployeeListPage
├── DataTable (现有)
├── FieldSelector (现有)
├── AdvancedSearchBox (现有)
└── EmployeeDetailModal (新建)
    ├── ModalContainer (features/03-accordion-ui-components)
    ├── EmployeeAccordion (features/03-accordion-ui-components)
    │   ├── BasicInfoSection
    │   ├── JobInfoSection
    │   ├── ContactInfoSection
    │   ├── BankInfoSection
    │   ├── DocumentsSection (features/05-document-management)
    │   └── AuditLogsSection (features/06-audit-logs)
    ├── InlineEditorProvider (features/04-inline-editors)
    ├── RealtimeCollaboration (features/01-realtime-collaboration)
    └── PerformanceOptimizer (features/07-performance-optimization)
```

### 5. 具体实施步骤

#### 第一阶段：基础集成 (1周)
1. **创建基础模态框组件**
   ```typescript
   // components/employee/EmployeeDetailModal.tsx
   interface EmployeeDetailModalProps {
     employeeId: string | null;
     open: boolean;
     onClose: () => void;
   }
   ```

2. **集成到现有列表页面**
   - 在 EmployeeListPage 中添加模态框触发
   - 修改 DataTable 的 actions 属性

3. **基础数据获取**
   - 复用现有的 useEmployee Hook
   - 创建简单的详情展示

#### 第二阶段：手风琴界面 (1周)
1. **实现手风琴组件**
   ```typescript
   // components/employee/EmployeeAccordion.tsx
   const sections = [
     { key: 'basic', title: '基本信息', fields: basicFields },
     { key: 'job', title: '工作信息', fields: jobFields },
     { key: 'contact', title: '联系信息', fields: contactFields },
     { key: 'bank', title: '银行信息', fields: bankFields },
   ];
   ```

2. **字段分组和展示**
   - 复用现有的字段配置系统
   - 实现响应式布局

#### 第三阶段：内联编辑 (1周)
1. **实现内联编辑器**
   ```typescript
   // components/employee/InlineFieldEditor.tsx
   interface InlineFieldEditorProps {
     field: FieldMetadata;
     value: any;
     onSave: (value: any) => Promise<void>;
     readOnly?: boolean;
   }
   ```

2. **集成表单验证**
   - 使用 Zod 进行客户端验证
   - 实现自动保存机制

#### 第四阶段：高级功能 (2周)
1. **实时协作功能**
   - Supabase Realtime 集成
   - 字段锁定机制

2. **文档管理**
   - Supabase Storage 集成
   - 文件上传和预览

3. **审计日志**
   - 数据库触发器
   - 变更历史展示

#### 第五阶段：性能优化 (1周)
1. **虚拟滚动和懒加载**
2. **缓存优化**
3. **性能监控**

### 6. 现有代码复用策略

#### 复用现有组件
1. **DataTable**: 
   - 添加 `onRowClick` 支持
   - 扩展 `actions` 配置

2. **FieldSelector**:
   - 在模态框中复用字段选择逻辑
   - 支持分组字段配置

3. **useTableConfiguration**:
   - 扩展为通用字段配置 Hook
   - 支持模态框字段布局配置

#### 数据层复用
1. **useEmployees**:
   - 扩展支持详细数据查询
   - 添加实时更新支持

2. **employee.service**:
   - 添加单字段更新方法
   - 集成文档管理接口

### 7. 配置迁移

#### 字段配置扩展
```typescript
// types/fieldConfiguration.ts 扩展
interface FieldMetadata {
  // 现有属性
  name: string;
  label: string;
  type: FieldType;
  // 新增属性
  section?: 'basic' | 'job' | 'contact' | 'bank' | 'documents';
  editType?: 'inline' | 'modal' | 'readonly';
  validationSchema?: ZodSchema;
  permissions?: {
    read: Role[];
    write: Role[];
  };
}
```

#### 用户配置迁移
```typescript
// 扩展现有用户配置
interface UserTableConfig {
  // 现有配置
  visibleFields: string[];
  fieldOrder: string[];
  // 新增配置
  modalLayout?: {
    sectionOrder: string[];
    collapsedSections: string[];
    fieldGrouping: Record<string, string[]>;
  };
}
```

### 8. 渐进式迁移计划

#### 阶段1: 基础替换
- 保持现有列表页面功能不变
- 添加模态框作为详情查看方式
- 用户可以选择使用新旧界面

#### 阶段2: 功能增强
- 逐步添加内联编辑功能
- 实现实时协作
- 添加文档管理

#### 阶段3: 完全替换
- 移除旧的详情页面
- 优化性能和用户体验
- 完善权限控制

### 9. 兼容性保证

#### API 兼容性
- 保持现有 employee.service 接口不变
- 新增接口采用扩展方式
- 使用版本控制避免破坏性变更

#### UI 兼容性
- 保持现有列表页面功能
- 新功能通过配置开关控制
- 支持用户偏好设置

#### 数据兼容性
- 复用现有数据库视图
- 新增字段采用可选方式
- 保持向后兼容

### 10. 测试策略

#### 单元测试
- 新组件的独立测试
- 现有组件的回归测试
- 数据层接口测试

#### 集成测试
- 列表页面与模态框交互
- 数据流完整性测试
- 权限控制测试

#### 用户测试
- A/B 测试新旧界面
- 用户接受度调研
- 性能基准测试

## 总结

这个集成方案充分利用了现有系统的架构优势，通过渐进式的方式引入新的员工详情模态框功能。主要特点：

1. **最小化破坏性变更**: 保持现有功能完整性
2. **充分复用现有资产**: 利用已有的组件和数据层
3. **渐进式迁移**: 分阶段实施，降低风险
4. **向前兼容**: 支持新旧功能并存
5. **性能优化**: 提前规划性能优化策略

通过这个方案，可以在保证系统稳定性的前提下，为用户提供更现代化、更高效的员工信息管理体验。