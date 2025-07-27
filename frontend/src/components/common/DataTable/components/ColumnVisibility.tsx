import { useState } from 'react';
import type { Table, VisibilityState } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface ColumnVisibilityProps<TData> {
  table: Table<TData>;
  onVisibilityChange?: (visibility: VisibilityState) => void;
  className?: string;
}

export function ColumnVisibility<TData>({
  table,
  onVisibilityChange,
  className,
}: ColumnVisibilityProps<TData>) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleableColumns = table.getAllColumns().filter(column => 
    column.getCanHide() && column.id !== 'select' && column.id !== 'actions'
  );

  const visibleCount = toggleableColumns.filter(column => column.getIsVisible()).length;

  const filteredColumns = toggleableColumns.filter(column => {
    const header = typeof column.columnDef.header === 'string' 
      ? column.columnDef.header 
      : column.id;
    return header.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleColumn = (columnId: string, visible: boolean) => {
    table.getColumn(columnId)?.toggleVisibility(visible);
    onVisibilityChange?.(table.getState().columnVisibility);
  };

  const toggleAll = (visible: boolean) => {
    toggleableColumns.forEach(column => {
      column.toggleVisibility(visible);
    });
    onVisibilityChange?.(table.getState().columnVisibility);
  };

  const resetVisibility = () => {
    table.resetColumnVisibility();
    onVisibilityChange?.({});
  };

  const createPreset = () => {
    // This would typically save to localStorage or user preferences
    const currentVisibility = table.getState().columnVisibility;
    const presetName = prompt(t('columns.enterPresetName'));
    
    if (presetName) {
      const presets = JSON.parse(localStorage.getItem('columnPresets') || '{}');
      presets[presetName] = currentVisibility;
      localStorage.setItem('columnPresets', JSON.stringify(presets));
      alert(t('columns.presetSaved', { name: presetName }));
    }
  };

  const loadPreset = (presetName: string, preset: VisibilityState) => {
    table.setColumnVisibility(preset);
    onVisibilityChange?.(preset);
    setIsOpen(false);
  };

  // Load saved presets
  const savedPresets = JSON.parse(localStorage.getItem('columnPresets') || '{}');

  return (
    <div className={cn('column-visibility', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline btn-sm gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3m2 4h10M7 7h3m0 0v3m0-3h3m-3 3h3" />
        </svg>
        {t('columns.columns')}
        <span className="badge badge-sm">
          {visibleCount}/{toggleableColumns.length}
        </span>
      </button>

      {/* Column Panel */}
      {isOpen && (
        <div className="dropdown-content card bg-base-100 shadow-xl mt-2 w-80">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-base">{t('columns.columnVisibility')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="form-control mb-4">
              <input
                type="text"
                placeholder={t('columns.searchColumns')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => toggleAll(true)}
                className="btn btn-sm btn-outline flex-1"
              >
                {t('columns.showAll')}
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="btn btn-sm btn-outline flex-1"
              >
                {t('columns.hideAll')}
              </button>
              <button
                onClick={resetVisibility}
                className="btn btn-sm btn-ghost"
                title={t('columns.reset')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Column List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredColumns.map(column => {
                const header = typeof column.columnDef.header === 'string' 
                  ? column.columnDef.header 
                  : column.id;
                const isVisible = column.getIsVisible();

                return (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => toggleColumn(column.id, e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className={cn(
                      'flex-1 text-sm',
                      !isVisible && 'opacity-50'
                    )}>
                      {header}
                    </span>
                    {!isVisible && (
                      <span className="badge badge-ghost badge-xs">
                        {t('columns.hidden')}
                      </span>
                    )}
                  </label>
                );
              })}

              {filteredColumns.length === 0 && (
                <div className="text-center py-4 text-base-content/60">
                  <p className="text-sm">{t('columns.noColumnsFound')}</p>
                </div>
              )}
            </div>

            {/* Presets Section */}
            {Object.keys(savedPresets).length > 0 && (
              <>
                <div className="divider text-xs">{t('columns.presets')}</div>
                <div className="space-y-2">
                  {Object.entries(savedPresets).map(([name, preset]) => (
                    <div key={name} className="flex items-center gap-2">
                      <button
                        onClick={() => loadPreset(name, preset as VisibilityState)}
                        className="btn btn-sm btn-ghost flex-1 justify-start"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {name}
                      </button>
                      <button
                        onClick={() => {
                          const presets = JSON.parse(localStorage.getItem('columnPresets') || '{}');
                          delete presets[name];
                          localStorage.setItem('columnPresets', JSON.stringify(presets));
                          // Force re-render by closing and opening
                          setIsOpen(false);
                          setTimeout(() => setIsOpen(true), 0);
                        }}
                        className="btn btn-ghost btn-xs btn-circle"
                        title={t('columns.deletePreset')}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Save Preset */}
            <div className="divider text-xs">{t('columns.actions')}</div>
            <button
              onClick={createPreset}
              className="btn btn-sm btn-outline w-full gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {t('columns.saveAsPreset')}
            </button>

            {/* Info */}
            <div className="mt-4 p-3 bg-info/10 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-info mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs">
                  <p className="font-medium text-info">{t('columns.tip')}</p>
                  <p className="text-base-content/70 mt-1">{t('columns.tipDescription')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}