import { cardEffects } from '@/styles/design-effects';
import type { ReportJob } from '@/hooks/reports';
import { formatJobStatus, formatFileSize } from '@/hooks/reports';

interface ReportJobsPanelProps {
  jobs: ReportJob[];
  loading: boolean;
}

export function ReportJobsPanel({ jobs, loading }: ReportJobsPanelProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-base-content/60">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">暂无执行任务</p>
          <p className="text-sm mt-2">报表生成任务将在这里显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">执行任务</h3>
      
      <div className="space-y-3">
        {jobs.map((job) => {
          const statusInfo = formatJobStatus(job.status || 'unknown');
          
          return (
            <div key={job.id} className={`${cardEffects.standard} bg-base-100 p-4`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">{job.job_name}</h4>
                  <div className="text-sm text-base-content/70">
                    {job.job_name}
                  </div>
                </div>
                <div className={`badge ${statusInfo.color}`}>
                  {statusInfo.label}
                </div>
              </div>

              {/* 进度条 */}
              {job.status === 'running' && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>进度</span>
                    <span>{job.progress}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={job.progress || 0} 
                    max="100"
                  ></progress>
                </div>
              )}

              {/* 错误信息 */}
              {job.error_message && (
                <div className="alert alert-error alert-sm mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm">{job.error_message}</span>
                </div>
              )}

              {/* 任务信息 */}
              <div className="flex justify-between items-center text-sm text-base-content/60">
                <div className="flex gap-4">
                  <span>创建于 {job.created_at ? new Date(job.created_at).toLocaleString() : '未知'}</span>
                  {job.completed_at && (
                    <span>完成于 {new Date(job.completed_at).toLocaleString()}</span>
                  )}
                </div>
                
                {job.file_size && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{formatFileSize(job.file_size)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}