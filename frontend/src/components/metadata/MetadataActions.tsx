import { useState } from 'react';

interface MetadataActionsProps {
  selectedCount: number;
  onAction: (action: string) => void;
  isExporting: boolean;
  isImporting: boolean;
}

export function MetadataActions({
  selectedCount,
  onAction,
  isExporting,
  isImporting
}: MetadataActionsProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 左侧：批量操作 */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <>
              <span className="text-sm text-base-content/60">
                已选择 {selectedCount} 项
              </span>
              
              <div className="divider divider-horizontal mx-1"></div>
              
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onAction('export')}
                disabled={isExporting}
              >
                {isExporting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                导出选中
              </button>
              
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onAction('lock')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                锁定
              </button>
              
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onAction('unlock')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                解锁
              </button>
              
              <button
                className="btn btn-sm btn-ghost text-error"
                onClick={() => onAction('delete')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </>
          )}
        </div>

        {/* 右侧：主要操作 */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowImportDialog(true)}
            disabled={isImporting}
          >
            {isImporting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            导入Excel
          </button>
          
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onAction('export-all')}
            disabled={isExporting}
          >
            {isExporting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            导出全部
          </button>
          
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onAction('add')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增员工
          </button>
        </div>
      </div>

      {/* 导入对话框 */}
      {showImportDialog && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">导入Excel数据</h3>
            
            <div className="space-y-4">
              {/* 下载模板 */}
              <div className="alert alert-info">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-semibold">第一步：下载导入模板</div>
                  <div className="text-sm">请先下载Excel模板，按照模板格式填写数据</div>
                </div>
                <button className="btn btn-sm btn-outline">
                  下载模板
                </button>
              </div>

              {/* 上传文件 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">第二步：选择Excel文件</span>
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Selected file:', file.name);
                      // 文件处理逻辑将在后续实现
                    }
                  }}
                />
                <label className="label">
                  <span className="label-text-alt">支持 .xlsx 和 .xls 格式</span>
                </label>
              </div>

              {/* 导入选项 */}
              <div className="space-y-2">
                <div className="font-semibold text-sm">导入选项</div>
                <label className="label cursor-pointer">
                  <span className="label-text">覆盖已存在的数据</span>
                  <input type="checkbox" className="checkbox checkbox-sm" />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">自动创建不存在的部门/职位</span>
                  <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">验证数据完整性</span>
                  <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
                </label>
              </div>

              {/* 预览区域 */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-sm font-medium">
                  数据预览（点击展开）
                </div>
                <div className="collapse-content">
                  <div className="overflow-x-auto">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>行号</th>
                          <th>工号</th>
                          <th>姓名</th>
                          <th>部门</th>
                          <th>职位</th>
                          <th>基本工资</th>
                          <th>状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={7} className="text-center text-base-content/60">
                            请先选择文件
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  onAction('import');
                  setShowImportDialog(false);
                }}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    导入中...
                  </>
                ) : (
                  '开始导入'
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowImportDialog(false)}
              >
                取消
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowImportDialog(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}