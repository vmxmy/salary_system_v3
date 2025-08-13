import React from 'react';
import { ImportPreviewV2, DataGroupPreview } from '@/services/smart-import-v2.service';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, InfoIcon } from '@/components/common/Icons';

interface ImportPreviewProps {
  preview: ImportPreviewV2;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ImportPreviewComponent: React.FC<ImportPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const { validation, dataGroups, summary } = preview;

  return (
    <div className="space-y-6">
      {/* Step 2: 验证结果 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg">
            <InfoIcon className="w-5 h-5" />
            数据验证结果
          </h3>
          
          {/* 验证摘要 */}
          <div className="stats stats-horizontal shadow">
            <div className="stat">
              <div className="stat-title">工作表</div>
              <div className="stat-value text-2xl">{validation.summary.totalSheets}</div>
              <div className="stat-desc">
                {validation.summary.validSheets} 个有效
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">员工数</div>
              <div className="stat-value text-2xl">{validation.summary.employeeCount}</div>
              <div className="stat-desc">
                {validation.summary.employeeConsistency.isConsistent ? (
                  <span className="text-success">一致性通过</span>
                ) : (
                  <span className="text-error">存在差异</span>
                )}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">错误</div>
              <div className="stat-value text-2xl text-error">
                {validation.errors.length}
              </div>
              <div className="stat-desc">
                {validation.warnings.length} 个警告
              </div>
            </div>
          </div>

          {/* 错误列表 */}
          {validation.errors.length > 0 && (
            <div className="alert alert-error mt-4">
              <XCircleIcon className="w-6 h-6" />
              <div>
                <h4 className="font-bold">发现以下错误：</h4>
                <ul className="list-disc list-inside mt-2">
                  {validation.errors.map((error, index) => (
                    <li key={index}>
                      {error.sheetName && <span className="font-semibold">[{error.sheetName}]</span>}
                      {' '}{error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 警告列表 */}
          {validation.warnings.length > 0 && (
            <div className="alert alert-warning mt-4">
              <ExclamationCircleIcon className="w-6 h-6" />
              <div>
                <h4 className="font-bold">警告：</h4>
                <ul className="list-disc list-inside mt-2">
                  {validation.warnings.slice(0, 3).map((warning, index) => (
                    <li key={index}>
                      {warning.sheetName && <span className="font-semibold">[{warning.sheetName}]</span>}
                      {' '}{warning.message}
                    </li>
                  ))}
                  {validation.warnings.length > 3 && (
                    <li>还有 {validation.warnings.length - 3} 个警告...</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* 员工一致性详情 */}
          {!validation.summary.employeeConsistency.isConsistent && (
            <div className="alert alert-info mt-4">
              <InfoIcon className="w-6 h-6" />
              <div>
                <h4 className="font-bold">员工一致性问题：</h4>
                <ul className="list-disc list-inside mt-2">
                  {validation.summary.employeeConsistency.differences?.map((diff, index) => (
                    <li key={index}>{diff}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: 导入预览 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg">
            <InfoIcon className="w-5 h-5" />
            导入预览
          </h3>

          {/* 导入摘要 */}
          <div className="stats stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">数据组</div>
              <div className="stat-value text-2xl">{summary.totalGroups}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">总记录</div>
              <div className="stat-value text-2xl">{summary.totalRecords}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">将创建</div>
              <div className="stat-value text-2xl text-success">{summary.totalCreate}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">将更新</div>
              <div className="stat-value text-2xl text-warning">{summary.totalUpdate}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">预计用时</div>
              <div className="stat-value text-xl">{summary.estimatedTime}</div>
            </div>
          </div>

          {/* 各数据组详情 */}
          <div className="space-y-4 mt-6">
            {dataGroups.map((group, index) => (
              <DataGroupPreviewCard key={index} group={group} />
            ))}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <button 
          className="btn btn-ghost btn-lg"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button 
          className="btn btn-primary btn-lg"
          onClick={onConfirm}
          disabled={!preview.isReady || loading}
        >
          {loading && <span className="loading loading-spinner"></span>}
          {loading ? '导入中...' : '确认导入'}
        </button>
      </div>
    </div>
  );
};

/**
 * 数据组预览卡片
 */
const DataGroupPreviewCard: React.FC<{ group: DataGroupPreview }> = ({ group }) => {
  const getGroupName = (groupType: string) => {
    const names: Record<string, string> = {
      'EARNINGS': '收入数据',
      'CONTRIBUTION_BASES': '缴费基数',
      'CATEGORY_ASSIGNMENT': '人员类别',
      'JOB_ASSIGNMENT': '职务信息'
    };
    return names[groupType] || groupType;
  };

  return (
    <div className="collapse collapse-arrow bg-base-200">
      <input type="checkbox" />
      <div className="collapse-title font-medium">
        <div className="flex items-center justify-between">
          <span>{getGroupName(group.group)} - {group.sheetName}</span>
          <div className="flex gap-4 text-sm">
            <span className="badge badge-info">共 {group.records.total} 条</span>
            <span className="badge badge-success">新增 {group.records.toCreate}</span>
            <span className="badge badge-warning">更新 {group.records.toUpdate}</span>
            {group.records.toSkip > 0 && (
              <span className="badge">跳过 {group.records.toSkip}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="collapse-content">
        {/* 示例数据 */}
        {group.samples.create.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">将创建的记录示例：</h4>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    {Object.keys(group.samples.create[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.samples.create.map((sample, idx) => (
                    <tr key={idx}>
                      {Object.values(sample).map((value: any, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {group.samples.update.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">将更新的记录示例：</h4>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    {Object.keys(group.samples.update[0])
                      .filter(key => !key.startsWith('_'))
                      .map(key => (
                        <th key={key}>{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {group.samples.update.map((sample, idx) => (
                    <tr key={idx}>
                      {Object.entries(sample)
                        .filter(([key]) => !key.startsWith('_'))
                        .map(([_, value]: [string, any], i) => (
                          <td key={i}>{value}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 错误和警告 */}
        {group.errors.length > 0 && (
          <div className="alert alert-error">
            <XCircleIcon className="w-5 h-5" />
            <div>
              <h4 className="font-bold">错误：</h4>
              <ul className="list-disc list-inside">
                {group.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {group.warnings.length > 0 && (
          <div className="alert alert-warning mt-2">
            <ExclamationCircleIcon className="w-5 h-5" />
            <div>
              <h4 className="font-bold">警告：</h4>
              <ul className="list-disc list-inside">
                {group.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPreviewComponent;