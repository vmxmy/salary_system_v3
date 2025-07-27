# DataTable 组件

高性能数据表格组件，支持排序、筛选、分页、导出等功能。基于 TanStack Table 构建，提供丰富的数据展示和交互能力。

## 特性

- 📊 **高性能**: 虚拟化渲染，支持大数据集
- 🔍 **全局搜索**: 实时搜索和筛选
- 📁 **高级筛选**: 多条件筛选和排序
- 📄 **分页控制**: 灵活的分页配置
- 📤 **数据导出**: CSV、JSON、Excel 格式导出
- 🎛️ **列控制**: 动态显示/隐藏列
- 📱 **响应式**: 移动端优化显示
- ♿ **可访问性**: 键盘导航和屏幕阅读器支持

## 基本用法

```tsx
import { DataTable } from '@/components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
  status: 'active' | 'inactive';
}

const columnHelper = createColumnHelper<Employee>();

const columns = [
  columnHelper.accessor('name', {
    header: '姓名',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('department', {
    header: '部门',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('salary', {
    header: '薪资',
    cell: info => `¥${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('status', {
    header: '状态',
    cell: info => (
      <span className={`badge ${
        info.getValue() === 'active' ? 'badge-success' : 'badge-error'
      }`}>
        {info.getValue() === 'active' ? '在职' : '离职'}
      </span>
    ),
  }),
];

function BasicExample() {
  const data: Employee[] = [
    { id: '1', name: '张三', department: '技术部', salary: 15000, status: 'active' },
    { id: '2', name: '李四', department: '人事部', salary: 12000, status: 'active' },
    // 更多数据...
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      showToolbar={true}
      showPagination={true}
      enableExport={true}
      exportFileName="employees"
    />
  );
}
```

## 服务端分页

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

function ServerPaginationExample() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', pagination],
    queryFn: async () => {
      const response = await fetch(`/api/employees?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`);
      return response.json();
    },
  });

  return (
    <DataTable
      columns={columns}
      data={data?.items || []}
      pageCount={data?.totalPages}
      totalRows={data?.total}
      currentPage={pagination.pageIndex + 1}
      onPaginationChange={setPagination}
      loading={isLoading}
    />
  );
}
```

## 行选择

```tsx
function RowSelectionExample() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleRowSelectionChange = (rowSelection: Record<string, boolean>) => {
    const selectedRows = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)]?.id)
      .filter(Boolean);
    setSelectedIds(selectedRows);
  };

  const handleBatchDelete = async () => {
    // 批量删除逻辑
    console.log('删除选中的行:', selectedIds);
  };

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span>已选择 {selectedIds.length} 项</span>
          <div className="space-x-2">
            <ModernButton variant="secondary" size="sm">
              批量编辑
            </ModernButton>
            <ModernButton variant="danger" size="sm" onClick={handleBatchDelete}>
              批量删除
            </ModernButton>
          </div>
        </div>
      )}
      
      <DataTable
        columns={columns}
        data={data}
        enableRowSelection={true}
        onRowSelectionChange={handleRowSelectionChange}
      />
    </>
  );
}
```

## 自定义筛选

```tsx
function CustomFilterExample() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);

  return (
    <DataTable
      columns={columns}
      data={data}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      onColumnFiltersChange={setColumnFilters}
      showGlobalFilter={true}
      emptyMessage="没有找到匹配的员工记录"
    />
  );
}
```

## 自定义操作列

```tsx
const actionsColumn = columnHelper.display({
  id: 'actions',
  header: '操作',
  cell: ({ row }) => (
    <div className="flex items-center space-x-1">
      <ModernButton
        variant="ghost"
        size="sm"
        onClick={() => handleView(row.original.id)}
        icon={<EyeIcon className="w-4 h-4" />}
      >
        查看
      </ModernButton>
      <ModernButton
        variant="ghost"
        size="sm"
        onClick={() => handleEdit(row.original.id)}
        icon={<EditIcon className="w-4 h-4" />}
      >
        编辑
      </ModernButton>
      <ModernButton
        variant="ghost"
        size="sm"
        onClick={() => handleDelete(row.original.id)}
        icon={<TrashIcon className="w-4 h-4" />}
      >
        删除
      </ModernButton>
    </div>
  ),
});

function ActionsExample() {
  const columnsWithActions = [...columns, actionsColumn];

  return (
    <DataTable
      columns={columnsWithActions}
      data={data}
      actions={true}
    />
  );
}
```

## 数据导出

```tsx
function ExportExample() {
  const handleCustomExport = (data: any[], format: string) => {
    if (format === 'pdf') {
      // 自定义 PDF 导出逻辑
      generatePDFReport(data);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      enableExport={true}
      exportFileName="employee_report"
      onCustomExport={handleCustomExport}
    />
  );
}
```

## 响应式显示

```tsx
function ResponsiveExample() {
  return (
    <DataTable
      columns={columns}
      data={data}
      striped={true}
      hover={true}
      compact={window.innerWidth < 768} // 移动端紧凑模式
      className="responsive-table"
    />
  );
}
```

## API 参考

### DataTableProps

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `columns` | `ColumnDef<TData, TValue>[]` | - | 表格列定义 |
| `data` | `TData[]` | - | 表格数据 |
| `pageCount` | `number` | - | 总页数（服务端分页） |
| `totalRows` | `number` | - | 总行数 |
| `currentPage` | `number` | - | 当前页码 |
| `onPaginationChange` | `(pagination: PaginationState) => void` | - | 分页变化回调 |
| `onSortingChange` | `(sorting: SortingState) => void` | - | 排序变化回调 |
| `onColumnFiltersChange` | `(filters: ColumnFiltersState) => void` | - | 列筛选变化回调 |
| `globalFilter` | `string` | - | 全局搜索值 |
| `onGlobalFilterChange` | `(value: string) => void` | - | 全局搜索变化回调 |
| `enableRowSelection` | `boolean` | `false` | 启用行选择 |
| `onRowSelectionChange` | `(selection: RowSelectionState) => void` | - | 行选择变化回调 |
| `onColumnVisibilityChange` | `(visibility: VisibilityState) => void` | - | 列可见性变化回调 |
| `loading` | `boolean` | `false` | 加载状态 |
| `emptyMessage` | `string` | - | 空数据提示信息 |
| `showToolbar` | `boolean` | `true` | 显示工具栏 |
| `showPagination` | `boolean` | `true` | 显示分页控件 |
| `showColumnToggle` | `boolean` | `true` | 显示列切换 |
| `showGlobalFilter` | `boolean` | `true` | 显示全局搜索 |
| `actions` | `boolean` | `false` | 是否有操作列 |
| `enableExport` | `boolean` | `false` | 启用数据导出 |
| `exportFileName` | `string` | `'data'` | 导出文件名 |
| `className` | `string` | - | 自定义样式类 |
| `striped` | `boolean` | `false` | 斑马纹样式 |
| `hover` | `boolean` | `true` | 悬停效果 |
| `compact` | `boolean` | `false` | 紧凑模式 |

## 性能优化

### 虚拟化渲染
对于大数据集（>1000行），表格会自动启用虚拟化渲染：

```tsx
function VirtualizedExample() {
  const largeData = useMemo(() => 
    Array.from({ length: 10000 }, (_, i) => ({
      id: i.toString(),
      name: `用户 ${i}`,
      // ... 其他字段
    }))
  , []);

  return (
    <DataTable
      columns={columns}
      data={largeData}
      // 自动启用虚拟化
    />
  );
}
```

### 记忆化优化
使用 React.memo 和 useMemo 优化渲染性能：

```tsx
const memoizedColumns = useMemo(() => columns, []);
const memoizedData = useMemo(() => data, [data]);

function OptimizedExample() {
  return (
    <DataTable
      columns={memoizedColumns}
      data={memoizedData}
    />
  );
}
```

## 样式定制

### 主题变量
```css
.data-table {
  --table-header-bg: rgb(248 250 252);
  --table-header-color: rgb(71 85 105);
  --table-row-hover: rgb(241 245 249);
  --table-border: rgb(226 232 240);
}
```

### 自定义样式
```tsx
function CustomStyledTable() {
  return (
    <DataTable
      columns={columns}
      data={data}
      className="custom-table"
      style={{
        '--table-header-bg': '#f8fafc',
        '--table-row-hover': '#f1f5f9',
      } as CSSProperties}
    />
  );
}
```

## 可访问性

### 键盘导航
- `Tab` / `Shift + Tab`: 在可聚焦元素间导航
- `Arrow Keys`: 在表格单元格间导航
- `Space`: 选择/取消选择行
- `Enter`: 激活操作按钮

### 屏幕阅读器
- 使用语义化的 `table` 元素
- 提供适当的 `aria-label` 和 `aria-describedby`
- 排序状态有语音提示
- 分页信息清晰播报

## 最佳实践

### ✅ 推荐做法
- 为数字列使用等宽字体
- 为重要操作列固定在右侧
- 使用合适的分页大小（20-50行）
- 提供清晰的空状态提示

### ❌ 避免做法
- 不要在移动端显示过多列
- 不要忽略加载状态显示
- 不要使用过小的字体
- 不要忽略数据验证

## 相关组件

- [ModernButton](./ModernButton.md) - 表格操作按钮
- [LoadingScreen](./LoadingScreen.md) - 加载状态
- [MonthPicker](./MonthPicker.md) - 日期筛选