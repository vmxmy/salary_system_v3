import { useState, useEffect } from 'react';
import { cardEffects } from '@/styles/design-effects';
import type { ReportGenerationConfig, GenerationState } from '@/hooks/reports';
import { useReportTemplates } from '@/hooks/reports';

interface ReportGenerationModalProps {
  isOpen: boolean;
  templateId: string;
  availableMonths: Array<{
    month: string;
    periodId?: string;
    hasData: boolean;
  }>;
  onClose: () => void;
  onGenerate: (config: ReportGenerationConfig) => void;
  generationState: GenerationState;
}

export function ReportGenerationModal({
  isOpen,
  templateId,
  availableMonths,
  onClose,
  onGenerate,
  generationState
}: ReportGenerationModalProps) {
  const [config, setConfig] = useState<ReportGenerationConfig>({
    templateId,
    format: 'xlsx',
    filters: {}
  });

  const { data: templates } = useReportTemplates();
  const template = templates?.find(t => t.id === templateId);

  // 重置配置
  useEffect(() => {
    if (isOpen && templateId) {
      setConfig({
        templateId,
        format: 'xlsx',
        filters: {}
      });
    }
  }, [isOpen, templateId]);

  if (!isOpen || !template) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  const selectedMonth = availableMonths.find(m => m.periodId === config.periodId);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">生成报表</h3>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={generationState.isGenerating}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 模板信息 */}
          <div className={`${cardEffects.standard} bg-base-200 p-4 rounded-lg`}>
            <h4 className="font-medium mb-2">报表模板</h4>
            <div className="text-sm text-base-content/70">
              <div>名称: {template.template_name}</div>
              <div>类型: {template.category}</div>
              <div>字段数: {template.field_mappings.filter((f: any) => f.visible).length}</div>
            </div>
          </div>

          {/* 数据范围选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">数据范围 *</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={config.periodId || ''}
              onChange={(e) => {
                const periodId = e.target.value;
                const month = availableMonths.find(m => m.periodId === periodId);
                setConfig((prev: ReportGenerationConfig) => ({
                  ...prev,
                  periodId: periodId || undefined,
                  periodName: month?.month
                }));
              }}
              required
            >
              <option value="">请选择薪资周期</option>
              {availableMonths.map((month) => (
                <option 
                  key={month.periodId || month.month} 
                  value={month.periodId || ''}
                  disabled={!month.hasData}
                >
                  {month.month} {!month.hasData ? '(无数据)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 输出格式选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">输出格式 *</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {template.output_formats?.map((format) => (
                <label key={format} className="cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={config.format === format}
                    onChange={(e) => setConfig((prev: ReportGenerationConfig) => ({ 
                      ...prev, 
                      format: e.target.value as 'xlsx' | 'pdf' | 'csv' 
                    }))}
                    className="radio radio-primary mr-2"
                  />
                  <span className="label-text">{format.toUpperCase()}</span>
                </label>
              )) || []}
            </div>
          </div>

          {/* 筛选条件 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">筛选条件</span>
              <span className="label-text-alt">可选</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 状态筛选 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">状态</span>
                </label>
                <select 
                  className="select select-bordered select-sm"
                  value={config.filters?.statusFilter || 'all'}
                  onChange={(e) => setConfig((prev: ReportGenerationConfig) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      statusFilter: e.target.value === 'all' ? undefined : e.target.value
                    }
                  }))}
                >
                  <option value="all">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="approved">已审批</option>
                  <option value="paid">已发放</option>
                </select>
              </div>

              {/* 搜索关键字 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">关键字</span>
                </label>
                <input 
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder="搜索员工、部门..."
                  value={config.filters?.searchQuery || ''}
                  onChange={(e) => setConfig((prev: ReportGenerationConfig) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      searchQuery: e.target.value || undefined
                    }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* 生成进度 */}
          {generationState.isGenerating && (
            <div className={`${cardEffects.standard} bg-info/10 border border-info/20 p-4 rounded-lg`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="loading loading-spinner loading-sm text-info"></div>
                <span className="text-info font-medium">正在生成报表...</span>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{generationState.currentStep}</span>
                  <span>{generationState.progress}%</span>
                </div>
                <progress 
                  className="progress progress-info w-full" 
                  value={generationState.progress} 
                  max="100"
                ></progress>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {generationState.error && (
            <div className="alert alert-error">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{generationState.error}</span>
            </div>
          )}

          {/* 预览信息 */}
          {config.periodId && selectedMonth && (
            <div className={`${cardEffects.standard} bg-base-200 p-4 rounded-lg`}>
              <h4 className="font-medium mb-2">生成预览</h4>
              <div className="text-sm space-y-1">
                <div>报表名称: {template.template_name}</div>
                <div>数据周期: {config.periodName}</div>
                <div>输出格式: {config.format.toUpperCase()}</div>
                <div>预计字段: {template.field_mappings.filter((f: any) => f.visible).length} 个</div>
                {config.filters?.statusFilter && (
                  <div>状态筛选: {config.filters.statusFilter}</div>
                )}
                {config.filters?.searchQuery && (
                  <div>搜索条件: {config.filters.searchQuery}</div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="modal-action">
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={onClose}
              disabled={generationState.isGenerating}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!config.periodId || generationState.isGenerating}
            >
              {generationState.isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  生成报表
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={!generationState.isGenerating ? onClose : undefined}>
        <button disabled={generationState.isGenerating}>close</button>
      </div>
    </div>
  );
}