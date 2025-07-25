import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';

/**
 * Create a column helper for type-safe column definitions
 * @example
 * const columnHelper = createDataTableColumnHelper<Employee>();
 * const columns = [
 *   columnHelper.accessor('name', { header: 'Name' }),
 *   columnHelper.accessor('email', { header: 'Email' }),
 * ];
 */
export function createDataTableColumnHelper<TData>() {
  return createColumnHelper<TData>();
}

/**
 * Create selection column for row selection
 */
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="checkbox checkbox-sm"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="checkbox checkbox-sm"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

/**
 * Export table data to CSV
 */
export function exportTableToCSV<TData extends Record<string, any>>(
  data: TData[],
  filename: string,
  columns?: string[]
) {
  if (data.length === 0) return;

  // Get all columns if not specified
  const headers = columns || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export table data to JSON
 */
export function exportTableToJSON<TData>(
  data: TData[],
  filename: string
) {
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export table data to Excel (.xlsx)
 */
export async function exportTableToExcel<TData extends Record<string, any>>(
  data: TData[],
  filename: string,
  columns?: string[],
  sheetName = 'Sheet1'
) {
  if (data.length === 0) return;

  try {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');
    
    // Get headers
    const headers = columns || Object.keys(data[0]);
    
    // Create worksheet data with headers
    const wsData = [
      headers, // Headers row
      ...data.map(row => headers.map(header => row[header] || ''))
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 15 }));
    ws['!cols'] = colWidths;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Failed to export Excel file:', error);
    throw new Error('Excel export failed');
  }
}