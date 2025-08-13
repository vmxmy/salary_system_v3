import React from 'react';
import { ImportExecutionResult, DataGroupResult } from '@/services/smart-import-v2.service';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@/components/common/Icons';

interface ImportResultProps {
  result: ImportExecutionResult;
  onRollback?: () => void;
  onClose: () => void;
}

export const ImportResultComponent: React.FC<ImportResultProps> = ({
  result,
  onRollback,
  onClose
}) => {
  const { success, summary, dataGroups, errors, timestamp, rollbackId } = result;

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}毫秒`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
    return `${(ms / 60000).toFixed(1)}分钟`;
  };

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Step 4: 导入结果 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          {/* 结果标题 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-xl">
              {success ? (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-success" />
                  导入成功
                </>
              ) : (
                <>
                  <XCircleIcon className="w-6 h-6 text-error" />
                  导入完成（有错误）
                </>
              )}
            </h3>
            <div className="text-sm text-base-content/70">
              {formatTime(timestamp)}
            </div>
          </div>

          {/* 总体统计 */}
          <div className="stats stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">处理总数</div>
              <div className="stat-value">{summary.totalProcessed}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">成功</div>
              <div className="stat-value text-success">{summary.totalSucceeded}</div>
              <div className="stat-desc">
                {summary.totalProcessed > 0 
                  ? `${((summary.totalSucceeded / summary.totalProcessed) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">失败</div>
              <div className="stat-value text-error">{summary.totalFailed}</div>
              <div className="stat-desc">
                {summary.totalFailed > 0 && `${errors.length} 个错误`}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">用时</div>
              <div className="stat-value text-lg">{formatDuration(summary.duration)}</div>
            </div>
          </div>

          {/* 各数据组结果 */}
          <div className="divider">各数据组导入详情</div>
          
          <div className="space-y-4">
            {dataGroups.map((group, index) => (
              <DataGroupResultCard key={index} group={group} />
            ))}
          </div>

          {/* 错误详情 */}
          {errors.length > 0 && (
            <>
              <div className="divider">错误详情</div>
              <div className="alert alert-error">
                <XCircleIcon className="w-6 h-6" />
                <div>
                  <h4 className="font-bold">导入过程中出现以下错误：</h4>
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>数据组</th>
                          <th>行号</th>
                          <th>错误信息</th>
                          <th>错误代码</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.slice(0, 10).map((error, idx) => (
                          <tr key={idx}>
                            <td>{getGroupName(error.group)}</td>
                            <td>{error.row}</td>
                            <td>{error.message}</td>
                            <td><code className="text-xs">{error.errorCode}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {errors.length > 10 && (
                      <div className="text-sm text-base-content/70 mt-2">
                        还有 {errors.length - 10} 个错误未显示...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 操作按钮 */}
          <div className="card-actions justify-end mt-6">
            {rollbackId && onRollback && (
              <button 
                className="btn btn-error btn-outline"
                onClick={onRollback}
              >
                <ArrowPathIcon className="w-5 h-5" />
                撤销导入
              </button>
            )}
            
            <button 
              className="btn btn-primary"
              onClick={onClose}
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 数据组结果卡片
 */
const DataGroupResultCard: React.FC<{ group: DataGroupResult }> = ({ group }) => {
  const successRate = group.processed > 0 
    ? ((group.succeeded / group.processed) * 100).toFixed(1)
    : '0';

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold">
              {getGroupName(group.group)} - {group.sheetName}
            </h4>
            {group.failed === 0 ? (
              <CheckCircleIcon className="w-5 h-5 text-success" />
            ) : (
              <ExclamationCircleIcon className="w-5 h-5 text-warning" />
            )}
          </div>
          
          <div className="flex gap-2">
            <span className="badge badge-ghost">
              处理 {group.processed} 条
            </span>
            <span className="badge badge-success">
              成功 {group.succeeded} 条
            </span>
            {group.failed > 0 && (
              <span className="badge badge-error">
                失败 {group.failed} 条
              </span>
            )}
            <span className="badge badge-info">
              {successRate}%
            </span>
          </div>
        </div>

        {/* 详细信息 */}
        {(group.created.length > 0 || group.updated.length > 0) && (
          <div className="mt-3 text-sm">
            {group.created.length > 0 && (
              <div>
                <span className="text-success">✓ 创建了 {group.created.length} 条新记录</span>
              </div>
            )}
            {group.updated.length > 0 && (
              <div>
                <span className="text-warning">✓ 更新了 {group.updated.length} 条记录</span>
              </div>
            )}
          </div>
        )}

        {/* 失败行号 */}
        {group.failedRows.length > 0 && (
          <div className="mt-2">
            <div className="text-sm text-error">
              失败的行号：{group.failedRows.slice(0, 10).join(', ')}
              {group.failedRows.length > 10 && `... 还有${group.failedRows.length - 10}行`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 获取数据组名称
 */
function getGroupName(group: string): string {
  const names: Record<string, string> = {
    'EARNINGS': '收入数据',
    'CONTRIBUTION_BASES': '缴费基数',
    'CATEGORY_ASSIGNMENT': '人员类别',
    'JOB_ASSIGNMENT': '职务信息',
    'ALL': '全部数据'
  };
  return names[group] || group;
}

export default ImportResultComponent;