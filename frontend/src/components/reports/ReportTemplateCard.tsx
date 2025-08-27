import { useState } from 'react';
import { cardEffects } from '@/styles/design-effects';
import type { ReportTemplate } from '@/hooks/reports/useReportManagementMock';

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onQuickGenerate: () => void;
  onGenerate: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isGenerating?: boolean;
  isQuickGenerating?: boolean;
}

export function ReportTemplateCard({
  template,
  onQuickGenerate,
  onGenerate,
  onEdit,
  onDelete,
  isGenerating = false,
  isQuickGenerating = false
}: ReportTemplateCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 获取分类显示名称
  const getCategoryDisplay = (category: string) => {
    const categoryMap = {
      payroll: '薪资报表',
      employee: '人员报表',
      department: '部门报表',
      statistics: '统计报表'
    };
    return categoryMap[category as keyof typeof categoryMap] || category;
  };

  // 获取输出格式图标
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

  return (
    <div className={`${cardEffects.standard} bg-base-100 hover:shadow-lg transition-all duration-200`}>
      <div className="card-body p-4">
        {/* 头部 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="card-title text-sm mb-1">{template.template_name}</h3>
            <div className="badge badge-outline badge-sm">
              {getCategoryDisplay(template.category)}
            </div>
          </div>
          
          {/* 操作菜单 */}
          <div className="dropdown dropdown-end">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-ghost btn-xs"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>
            {isDropdownOpen && (
              <ul className="dropdown-content menu bg-base-100 rounded-box z-10 w-32 p-2 shadow">
                <li>
                  <button onClick={onEdit} className="text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                </li>
                {onDelete && (
                  <li>
                    <button onClick={onDelete} className="text-sm text-error">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* 描述 */}
        {template.description && (
          <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        {/* 字段数量 */}
        <div className="flex items-center gap-4 text-xs text-base-content/60 mb-3">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{template.field_mappings.filter(f => f.visible).length} 个字段</span>
          </div>

          {template.is_scheduled && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>定时生成</span>
            </div>
          )}
        </div>

        {/* 支持的输出格式 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-base-content/60">支持格式:</span>
          <div className="flex gap-1">
            {template.output_formats.map((format) => (
              <div 
                key={format} 
                className="tooltip" 
                data-tip={format.toUpperCase()}
              >
                <div className="btn btn-ghost btn-xs p-1">
                  {getFormatIcon(format)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="card-actions justify-end gap-2">
          <button 
            className={`btn btn-outline btn-sm ${isGenerating ? 'loading' : ''}`}
            onClick={onGenerate}
            disabled={isGenerating || isQuickGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                生成报表
              </>
            )}
          </button>
          <button 
            className={`btn btn-primary btn-sm ${isQuickGenerating ? 'loading' : ''}`}
            onClick={onQuickGenerate}
            disabled={isGenerating || isQuickGenerating}
          >
            {isQuickGenerating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                快速生成
              </>
            )}
          </button>
        </div>

        {/* 状态指示 */}
        <div className="flex justify-between items-center text-xs text-base-content/50 mt-2">
          <span>更新于 {new Date(template.updated_at).toLocaleDateString()}</span>
          <div className={`badge badge-xs ${template.is_active ? 'badge-success' : 'badge-neutral'}`}>
            {template.is_active ? '启用' : '禁用'}
          </div>
        </div>
      </div>
    </div>
  );
}