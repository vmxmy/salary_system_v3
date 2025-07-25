# DataTable Component

A comprehensive, enterprise-grade data table component built with TanStack Table v8 for React applications with full TypeScript support and modern UX patterns.

## Features

### Core Features
- ✅ **Multi-Column Sorting** - Click column headers to sort data with visual indicators
- ✅ **Advanced Pagination** - Navigate through large datasets with customizable page sizes (10, 20, 30, 40, 50, 100)
- ✅ **Global Search** - Search across all visible columns with instant results
- ✅ **Column Filtering** - Individual column filters with dropdown UI and search functionality
- ✅ **Column Visibility** - Show/hide columns dynamically with intuitive toggle interface
- ✅ **Column Resizing** - Drag column borders to adjust widths with smooth visual feedback
- ✅ **Row Selection** - Select single or multiple rows with checkboxes and bulk actions
- ✅ **Export Capabilities** - Export to Excel (.xlsx), CSV, and JSON formats with visible columns only
- ✅ **Responsive Design** - Mobile-first design that works on all screen sizes
- ✅ **Loading States** - Built-in loading indicators and empty state handling
- ✅ **Action Columns** - Custom action buttons for each row (view, edit, delete, etc.)

### Advanced Features
- ✅ **TypeScript Support** - Full type safety with generic types and strict typing
- ✅ **Internationalization** - Complete i18n support with Chinese and English translations
- ✅ **Performance Optimized** - Memoized components and efficient re-rendering
- ✅ **Server-Side Operations** - Support for server-side pagination, sorting, and filtering
- ✅ **Customizable Styling** - DaisyUI integration with theme support and custom CSS classes
- ✅ **Accessibility** - WCAG compliant with keyboard navigation and screen reader support
- ✅ **Browser Compatibility** - Works in all modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

## Basic Usage

```tsx
import { DataTable, DataTableColumnHeader, createDataTableColumnHelper } from '@/components/common/DataTable';
import { useTranslation } from '@/hooks/useTranslation';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department_name: string;
  employment_status: string;
}

function EmployeeList() {
  const { t } = useTranslation(['employee', 'common']);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Create type-safe column helper
  const columnHelper = createDataTableColumnHelper<Employee>();

  // Define columns with sorting and filtering
  const columns = useMemo(() => [
    columnHelper.accessor('employee_id', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('fields.employeeId')} />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-medium">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('full_name', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('fields.name')} />
      ),
      cell: ({ getValue }) => (
        <div className="font-medium text-base-content">{getValue()}</div>
      ),
    }),
    columnHelper.accessor('email', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('fields.email')} />
      ),
      cell: ({ getValue }) => {
        const email = getValue();
        return email ? (
          <a href={`mailto:${email}`} className="link link-primary">
            {email}
          </a>
        ) : (
          <span className="text-base-content/50">-</span>
        );
      },
    }),
    columnHelper.accessor('department_name', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('fields.department')} />
      ),
    }),
    columnHelper.accessor('employment_status', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('fields.status')} />
      ),
      cell: ({ getValue }) => {
        const status = getValue();
        const isActive = status === 'active';
        return (
          <span className={`badge badge-sm ${isActive ? 'badge-success' : 'badge-error'}`}>
            {isActive ? t('status.active') : t('status.inactive')}
          </span>
        );
      },
    }),
  ], [t]);

  return (
    <DataTable
      data={employees}
      columns={columns}
      loading={loading}
      enableRowSelection
      enableExport
      exportFileName="employees"
      onGlobalFilterChange={(search) => handleSearch(search)}
    />
  );
}
```

## Advanced Usage

### With Row Selection

```tsx
import { createSelectionColumn } from '@/components/common/DataTable/utils';

const columns = [
  createSelectionColumn<Person>(),
  // ... other columns
];

<DataTable
  columns={columns}
  data={data}
  enableRowSelection
  onRowSelectionChange={(selection) => {
    console.log('Selected rows:', selection);
  }}
/>
```

### With Actions

```tsx
const actions = (row: Person) => (
  <div className="flex gap-2">
    <button onClick={() => handleView(row.id)}>View</button>
    <button onClick={() => handleEdit(row.id)}>Edit</button>
    <button onClick={() => handleDelete(row.id)}>Delete</button>
  </div>
);

<DataTable
  columns={columns}
  data={data}
  actions={actions}
/>
```

### With Server-Side Pagination

```tsx
const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 10,
});

// Fetch data based on pagination state
const { data, pageCount } = useQuery({
  queryKey: ['users', pagination],
  queryFn: () => fetchUsers(pagination),
});

<DataTable
  columns={columns}
  data={data}
  pageCount={pageCount}
  onPaginationChange={setPagination}
/>
```

### With Global Search

```tsx
const [globalFilter, setGlobalFilter] = useState('');

<DataTable
  columns={columns}
  data={data}
  globalFilter={globalFilter}
  onGlobalFilterChange={setGlobalFilter}
  showGlobalFilter
/>
```

### With Export

```tsx
<DataTable
  columns={columns}
  data={data}
  enableExport
  exportFileName="my-data"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | Required | Column definitions |
| `data` | `TData[]` | Required | Data to display |
| `pageCount` | `number` | - | Total page count for server-side pagination |
| `onPaginationChange` | `(pagination: PaginationState) => void` | - | Callback for pagination changes |
| `onSortingChange` | `(sorting: SortingState) => void` | - | Callback for sorting changes |
| `onColumnFiltersChange` | `(filters: ColumnFiltersState) => void` | - | Callback for filter changes |
| `globalFilter` | `string` | `''` | Global filter value |
| `onGlobalFilterChange` | `(filter: string) => void` | - | Callback for global filter changes |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `onRowSelectionChange` | `(selection: RowSelectionState) => void` | - | Callback for selection changes |
| `onColumnVisibilityChange` | `(visibility: VisibilityState) => void` | - | Callback for column visibility changes |
| `loading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | - | Custom empty state message |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `showPagination` | `boolean` | `true` | Show pagination |
| `showColumnToggle` | `boolean` | `true` | Show column visibility toggle |
| `showGlobalFilter` | `boolean` | `true` | Show global filter input |
| `actions` | `(row: TData) => React.ReactNode` | - | Render actions for each row |
| `enableExport` | `boolean` | `false` | Enable export functionality |
| `exportFileName` | `string` | `'data'` | Export file name |
| `className` | `string` | - | Additional CSS classes |
| `striped` | `boolean` | `false` | Striped rows |
| `hover` | `boolean` | `true` | Hover effect on rows |
| `compact` | `boolean` | `false` | Compact table layout |

## Utility Functions

### createDataTableColumnHelper

Creates a type-safe column helper for defining columns:

```tsx
const columnHelper = createDataTableColumnHelper<YourDataType>();
```

### createSelectionColumn

Creates a checkbox column for row selection:

```tsx
const selectionColumn = createSelectionColumn<YourDataType>();
```

### exportTableToCSV

Export data to CSV format:

```tsx
exportTableToCSV(data, filename, columns);
```

### exportTableToJSON

Export data to JSON format:

```tsx
exportTableToJSON(data, filename);
```

### exportTableToExcel

Export data to Excel (.xlsx) format:

```tsx
await exportTableToExcel(data, filename, columns, sheetName);
```

## New Features in v3

### Column Filtering

Individual column filters with search functionality:

```tsx
// Column filters are automatically enabled with DataTableColumnHeader
columnHelper.accessor('department', {
  header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Department" 
      enableFilter={true} // Default: true
    />
  ),
  enableColumnFilter: true, // Enable filtering for this column
})
```

### Column Resizing

Drag column borders to adjust widths:

```tsx
const { table } = useDataTable({
  data,
  columns,
  enableColumnResizing: true, // Enable column resizing
});

// Columns can be resized by dragging the resize handle on the right edge
```

### Excel Export

Export data to Excel format with proper formatting:

```tsx
<DataTable
  data={data}
  columns={columns}
  enableExport
  exportFileName="employee-report"
  // Export dropdown will include Excel, CSV, and JSON options
/>

// Manual export
import { exportTableToExcel } from '@/components/common/DataTable';

const handleExportExcel = async () => {
  await exportTableToExcel(
    data, 
    'employee-report', 
    ['employee_id', 'full_name', 'email'], // specific columns
    'Employee Data' // sheet name
  );
};
```

### Enhanced Column Headers

New DataTableColumnHeader component with integrated sorting and filtering:

```tsx
import { DataTableColumnHeader } from '@/components/common/DataTable';

columnHelper.accessor('field_name', {
  header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Display Name"
      enableFilter={true} // Show filter button
    />
  ),
  enableSorting: true,
  enableColumnFilter: true,
})
```

## Migration Guide

### From v2 to v3

1. **Update imports**: Add new components
```tsx
// Old
import { DataTable, createDataTableColumnHelper } from '@/components/common/DataTable';

// New
import { 
  DataTable, 
  DataTableColumnHeader,
  DataTableColumnFilter,
  createDataTableColumnHelper 
} from '@/components/common/DataTable';
```

2. **Update column headers**: Use new DataTableColumnHeader
```tsx
// Old
columnHelper.accessor('name', {
  header: 'Name',
})

// New
columnHelper.accessor('name', {
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Name" />
  ),
})
```

3. **Excel export**: Now available by default
```tsx
// Excel export is now included in the export dropdown
<DataTable enableExport exportFileName="my-data" />
```

## Custom Hooks

### useDataTable

Advanced hook for complete control over table state:

```tsx
const { table, sorting, setSorting, /* ... */ } = useDataTable({
  data,
  columns,
  pageCount,
  enableRowSelection: true,
  initialSorting: [{ id: 'name', desc: false }],
});
```

## Styling

The component uses DaisyUI classes and supports theming. You can customize the appearance with:

- `className` prop for the wrapper
- `striped`, `hover`, and `compact` props for table variants
- Custom cell renderers in column definitions

## Examples

See `DataTable.example.tsx` for a complete working example with all features.