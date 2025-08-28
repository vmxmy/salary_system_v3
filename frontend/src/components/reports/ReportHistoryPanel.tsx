import { useState } from 'react';
import { cardEffects } from '@/styles/design-effects';
import type { ReportHistory } from '@/hooks/reports';
import { formatFileSize } from '@/hooks/reports';

interface ReportHistoryPanelProps {
  history: ReportHistory[];
  loading: boolean;
}

export function ReportHistoryPanel({ history, loading }: ReportHistoryPanelProps) {
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-base-content/60">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">暂无历史记录</p>
          <p className="text-sm mt-2">报表生成历史将在这里显示</p>
        </div>
      </div>
    );
  }

  // 获取格式图标
  const getFormatIcon = (format: string) => {
    const icons = {
      xlsx: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      pdf: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      csv: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    };
    return icons[format as keyof typeof icons] || icons.xlsx;
  };

  // 处理文件下载
  const handleDownload = async (record: ReportHistory) => {
    if (!record.file_path) {
      console.error('No file path available for download');
      return;
    }

    const recordId = record.id;
    setDownloadingItems(prev => new Set(prev).add(recordId));

    try {
      // 创建隐藏的链接进行下载
      const link = document.createElement('a');
      link.href = record.file_path;
      link.download = `report_${record.id}.${record.file_format || 'xlsx'}`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      // 延迟移除loading状态，给用户一些视觉反馈
      setTimeout(() => {
        setDownloadingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">历史记录</h3>
      
      <div className="space-y-3">
        {history.map((record) => (
          <div key={record.id} className={`${cardEffects.standard} bg-base-100 p-4`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{record.report_name}</h4>
                  <div className="flex items-center gap-1">
                    {getFormatIcon(record.file_format || 'xlsx')}
                    <span className="text-xs badge badge-outline">
                      {(record.file_format || 'xlsx').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-base-content/70">
                  {record.period_name}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 文件大小 */}
                {record.file_size && (
                  <div className="text-xs text-base-content/60 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {formatFileSize(record.file_size)}
                  </div>
                )}
                
                {/* 下载按钮 */}
                {record.file_path && (
                  <button 
                    className={`btn btn-ghost btn-xs ${downloadingItems.has(record.id) ? 'loading' : ''}`}
                    onClick={() => handleDownload(record)}
                    disabled={downloadingItems.has(record.id)}
                    title="下载文件"
                  >
                    {downloadingItems.has(record.id) ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>


            {/* 时间信息 */}
            <div className="flex justify-between items-center text-sm text-base-content/60">
              <div className="flex gap-4">
                <span>生成于 {record.generated_at ? new Date(record.generated_at).toLocaleString() : '未知'}</span>
                {record.generated_by && (
                  <span>操作人: {record.generated_by}</span>
                )}
              </div>
              
              {record.record_count && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{record.record_count} 条记录</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 - TODO: 添加分页支持 */}
      {history.length >= 20 && (
        <div className="text-center pt-4">
          <div className="text-sm text-base-content/60">
            显示最近 {history.length} 条记录
          </div>
        </div>
      )}
    </div>
  );
}