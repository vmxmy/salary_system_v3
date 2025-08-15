import { useEffect } from 'react';
import { useTableMetadata } from '@/hooks/core/useTableMetadata';
import { useSmartTableColumns } from '@/hooks/core/useSmartTableColumns';

export default function TestMetadata() {
  const { data: metadata, isLoading, error } = useTableMetadata('view_employees_with_details');
  const smartColumns = useSmartTableColumns('view_employees_with_details', {
    enableRowSelection: true,
    enableActions: true,
  });

  useEffect(() => {
    if (metadata) {
      console.log('=== 元数据测试结果 ===');
      console.log('表名:', metadata.tableName);
      console.log('总字段数:', metadata.columns.length);
      console.log('字段列表:', metadata.columns.map(col => col.name));
      console.log('系统字段:', metadata.columns.filter(col => col.isSystemColumn).map(col => col.name));
      console.log('非系统字段:', metadata.columns.filter(col => !col.isSystemColumn).map(col => col.name));
    }
  }, [metadata]);

  useEffect(() => {
    if (smartColumns.columns) {
      console.log('=== 智能列生成结果 ===');
      console.log('生成的列数:', smartColumns.columns.length);
      console.log('列ID列表:', smartColumns.columns.map(col => col.id));
      console.log('初始可见性配置:', smartColumns.initialColumnVisibility);
      const visibleCount = Object.values(smartColumns.initialColumnVisibility || {}).filter(v => v).length;
      console.log('初始可见列数:', visibleCount);
    }
  }, [smartColumns]);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">表格元数据测试</h1>
      
      <div className="card bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">元数据信息</h2>
          <p>表名: {metadata?.tableName}</p>
          <p>显示名: {metadata?.displayName}</p>
          <p>总字段数: {metadata?.columns.length}</p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">智能列生成</h2>
          <p>生成的列数: {smartColumns.columns.length}</p>
          <p>可见列数: {smartColumns.visibleColumns.length}</p>
          <p>搜索字段数: {smartColumns.searchableFields.length}</p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">所有字段列表</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>字段名</th>
                  <th>标签</th>
                  <th>类型</th>
                  <th>系统字段</th>
                  <th>初始可见</th>
                </tr>
              </thead>
              <tbody>
                {metadata?.columns.map(col => (
                  <tr key={col.name}>
                    <td>{col.name}</td>
                    <td>{col.label}</td>
                    <td>{col.type}</td>
                    <td>{col.isSystemColumn ? '是' : '否'}</td>
                    <td>{smartColumns.initialColumnVisibility?.[col.name] ? '是' : '否'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}