import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { 
  EmployeeMetadata, 
  FilterOptions, 
  PaginationOptions,
  StatisticsInfo,
  ImportResult,
  BatchOperationResult
} from '@/types/metadata';

interface MetadataState {
  // 数据状态
  employees: EmployeeMetadata[];
  loading: boolean;
  error: string | null;
  
  // 筛选和分页
  filters: FilterOptions;
  pagination: PaginationOptions;
  
  // 选择状态
  selectedRows: string[];
  
  // 统计信息
  statistics: StatisticsInfo | null;
  
  // 操作状态
  saving: boolean;
  importing: boolean;
  exporting: boolean;
  
  // 最后更新时间
  lastUpdated: Date | null;
}

interface MetadataActions {
  // 数据操作
  setEmployees: (employees: EmployeeMetadata[]) => void;
  addEmployee: (employee: EmployeeMetadata) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeMetadata>) => void;
  removeEmployee: (id: string) => void;
  
  // 状态操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 筛选和分页
  setFilters: (filters: FilterOptions) => void;
  resetFilters: () => void;
  setPagination: (pagination: PaginationOptions) => void;
  
  // 选择操作
  setSelectedRows: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  
  // 统计信息
  setStatistics: (statistics: StatisticsInfo) => void;
  calculateStatistics: () => void;
  
  // 批量操作
  batchUpdate: (ids: string[], updates: Partial<EmployeeMetadata>) => void;
  batchDelete: (ids: string[]) => void;
  batchLock: (ids: string[]) => void;
  batchUnlock: (ids: string[]) => void;
  
  // 操作状态
  setSaving: (saving: boolean) => void;
  setImporting: (importing: boolean) => void;
  setExporting: (exporting: boolean) => void;
  
  // 重置状态
  reset: () => void;
}

type MetadataStore = MetadataState & MetadataActions;

const initialState: MetadataState = {
  employees: [],
  loading: false,
  error: null,
  
  filters: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: true
  },
  
  selectedRows: [],
  statistics: null,
  
  saving: false,
  importing: false,
  exporting: false,
  
  lastUpdated: null
};

export const useMetadataStore = create<MetadataStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        ...initialState,

        // 数据操作
        setEmployees: (employees) => set(
          { employees, lastUpdated: new Date() },
          false,
          'setEmployees'
        ),

        addEmployee: (employee) => set(
          (state) => ({
            employees: [...state.employees, employee],
            lastUpdated: new Date()
          }),
          false,
          'addEmployee'
        ),

        updateEmployee: (id, updates) => set(
          (state) => ({
            employees: state.employees.map(emp => 
              emp.payroll_id === id ? { ...emp, ...updates } : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'updateEmployee'
        ),

        removeEmployee: (id) => set(
          (state) => ({
            employees: state.employees.filter(emp => emp.payroll_id !== id),
            selectedRows: state.selectedRows.filter(rowId => rowId !== id),
            lastUpdated: new Date()
          }),
          false,
          'removeEmployee'
        ),

        // 状态操作
        setLoading: (loading) => set({ loading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),

        // 筛选和分页
        setFilters: (filters) => set({ filters }, false, 'setFilters'),
        resetFilters: () => set({ filters: {} }, false, 'resetFilters'),
        setPagination: (pagination) => set({ pagination }, false, 'setPagination'),

        // 选择操作
        setSelectedRows: (selectedRows) => set({ selectedRows }, false, 'setSelectedRows'),
        
        selectAll: () => set(
          (state) => ({
            selectedRows: state.employees.map(emp => emp.payroll_id)
          }),
          false,
          'selectAll'
        ),

        clearSelection: () => set({ selectedRows: [] }, false, 'clearSelection'),

        toggleSelection: (id) => set(
          (state) => ({
            selectedRows: state.selectedRows.includes(id)
              ? state.selectedRows.filter(rowId => rowId !== id)
              : [...state.selectedRows, id]
          }),
          false,
          'toggleSelection'
        ),

        // 统计信息
        setStatistics: (statistics) => set({ statistics }, false, 'setStatistics'),

        calculateStatistics: () => {
          const { employees, pagination } = get();
          
          if (employees.length === 0) {
            set({ statistics: null });
            return;
          }

          const totalSalary = employees.reduce((sum, emp) => sum + parseFloat(emp.gross_pay || '0'), 0);
          const totalTax = employees.reduce((sum, emp) => sum + parseFloat(emp.total_deductions || '0'), 0);
          const averageSalary = totalSalary / employees.length;
          const departmentCount = new Set(employees.map(emp => emp.department_name)).size;
          const positionCount = new Set(employees.map(emp => emp.position_name)).size;

          const statistics: StatisticsInfo = {
            totalEmployees: pagination.total,
            totalSalary,
            totalTax,
            averageSalary,
            departmentCount,
            positionCount
          };

          set({ statistics }, false, 'calculateStatistics');
        },

        // 批量操作
        batchUpdate: (ids, updates) => set(
          (state) => ({
            employees: state.employees.map(emp =>
              ids.includes(emp.payroll_id) 
                ? { ...emp, ...updates, updated_at: new Date().toISOString() }
                : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'batchUpdate'
        ),

        batchDelete: (ids) => set(
          (state) => ({
            employees: state.employees.filter(emp => !ids.includes(emp.payroll_id)),
            selectedRows: state.selectedRows.filter(id => !ids.includes(id)),
            lastUpdated: new Date()
          }),
          false,
          'batchDelete'
        ),

        batchLock: (ids) => {
          const now = new Date().toISOString();
          set(
            (state) => ({
              employees: state.employees.map(emp =>
                ids.includes(emp.payroll_id)
                  ? { 
                      ...emp, 
                      is_locked: true, 
                      locked_at: now,
                      status: 'locked' as const
                    }
                  : emp
              ),
              lastUpdated: new Date()
            }),
            false,
            'batchLock'
          );
        },

        batchUnlock: (ids) => set(
          (state) => ({
            employees: state.employees.map(emp =>
              ids.includes(emp.payroll_id)
                ? { 
                    ...emp, 
                    is_locked: false, 
                    locked_at: undefined,
                    status: 'confirmed' as const
                  }
                : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'batchUnlock'
        ),

        // 操作状态
        setSaving: (saving) => set({ saving }, false, 'setSaving'),
        setImporting: (importing) => set({ importing }, false, 'setImporting'),
        setExporting: (exporting) => set({ exporting }, false, 'setExporting'),

        // 重置状态
        reset: () => set(initialState, false, 'reset')
      })
    ),
    {
      name: 'metadata-store',
      partialize: (state: any) => ({
        filters: state.filters,
        pagination: state.pagination
      })
    }
  )
);

// 订阅变化，自动计算统计信息
useMetadataStore.subscribe(
  (state) => state.employees,
  () => {
    useMetadataStore.getState().calculateStatistics();
  }
);

// 持久化筛选条件
useMetadataStore.subscribe(
  (state) => ({ filters: state.filters, pagination: state.pagination }),
  (current, previous) => {
    if (current.filters !== previous.filters || current.pagination !== previous.pagination) {
      localStorage.setItem(
        'metadata-filters', 
        JSON.stringify({
          filters: current.filters,
          pagination: current.pagination
        })
      );
    }
  }
);

// 从本地存储恢复状态
const savedState = localStorage.getItem('metadata-filters');
if (savedState) {
  try {
    const { filters, pagination } = JSON.parse(savedState);
    useMetadataStore.setState({
      filters: filters || {},
      pagination: { ...initialState.pagination, ...pagination }
    });
  } catch (error) {
    console.warn('Failed to restore saved filters:', error);
  }
}