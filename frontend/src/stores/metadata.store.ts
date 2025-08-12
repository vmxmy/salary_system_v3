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
  setSelectedRows: (rows: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  
  // 统计操作
  setStatistics: (statistics: StatisticsInfo | null) => void;
  updateStatistics: () => void;
  
  // 批量操作
  batchUpdate: (ids: string[], updates: Partial<EmployeeMetadata>) => void;
  batchDelete: (ids: string[]) => void;
  batchLock: (ids: string[]) => void;
  batchUnlock: (ids: string[]) => void;
  
  // 操作状态
  setSaving: (saving: boolean) => void;
  setImporting: (importing: boolean) => void;
  setExporting: (exporting: boolean) => void;
  
  // 重置
  reset: () => void;
}

export type MetadataStore = MetadataState & MetadataActions;

const initialState: MetadataState = {
  employees: [],
  loading: false,
  error: null,
  
  filters: {
    period: undefined,
    departmentId: undefined,
    positionId: undefined,
    employeeStatus: undefined,
    dataStatus: undefined,
    searchText: undefined,
    salaryMin: undefined,
    salaryMax: undefined,
    hasAdjustment: undefined,
    sortField: undefined,
    sortOrder: undefined
  },
  
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
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
      (set: any, get: any): MetadataStore => ({
        ...initialState,

        // 数据操作
        setEmployees: (employees: EmployeeMetadata[]) => set(
          { employees, lastUpdated: new Date() },
          false,
          'setEmployees'
        ),

        addEmployee: (employee: EmployeeMetadata) => set(
          (state: MetadataStore) => ({
            employees: [...state.employees, employee],
            lastUpdated: new Date()
          }),
          false,
          'addEmployee'
        ),

        updateEmployee: (id: string, updates: Partial<EmployeeMetadata>) => set(
          (state: MetadataStore) => ({
            employees: state.employees.map((emp: EmployeeMetadata) => 
              emp.payroll_id === id ? { ...emp, ...updates } : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'updateEmployee'
        ),

        removeEmployee: (id: string) => set(
          (state: MetadataStore) => ({
            employees: state.employees.filter((emp: EmployeeMetadata) => emp.payroll_id !== id),
            selectedRows: state.selectedRows.filter((rowId: string) => rowId !== id),
            lastUpdated: new Date()
          }),
          false,
          'removeEmployee'
        ),

        // 状态操作
        setLoading: (loading: boolean) => set({ loading }, false, 'setLoading'),
        setError: (error: string | null) => set({ error }, false, 'setError'),

        // 筛选和分页
        setFilters: (filters: FilterOptions) => set({ filters }, false, 'setFilters'),
        resetFilters: () => set({ filters: initialState.filters }, false, 'resetFilters'),
        setPagination: (pagination: PaginationOptions) => set({ pagination }, false, 'setPagination'),

        // 选择操作
        setSelectedRows: (selectedRows: string[]) => set({ selectedRows }, false, 'setSelectedRows'),
        selectAll: () => set(
          (state: MetadataStore) => ({
            selectedRows: state.employees.map((emp: EmployeeMetadata) => emp.payroll_id)
          }),
          false,
          'selectAll'
        ),
        clearSelection: () => set({ selectedRows: [] }, false, 'clearSelection'),

        toggleSelection: (id: string) => set(
          (state: MetadataStore) => ({
            selectedRows: state.selectedRows.includes(id)
              ? state.selectedRows.filter((rowId: string) => rowId !== id)
              : [...state.selectedRows, id]
          }),
          false,
          'toggleSelection'
        ),

        // 统计操作
        setStatistics: (statistics: StatisticsInfo | null) => set({ statistics }, false, 'setStatistics'),
        
        updateStatistics: () => {
          const state = get() as MetadataStore;
          const { employees } = state;
          
          if (!employees.length) {
            set({ statistics: null }, false, 'updateStatistics');
            return;
          }

          const totalSalary = employees.reduce((sum: number, emp: EmployeeMetadata) => sum + parseFloat(emp.gross_pay || '0'), 0);
          const totalTax = employees.reduce((sum: number, emp: EmployeeMetadata) => sum + parseFloat(emp.total_deductions || '0'), 0);
          const averageSalary = totalSalary / employees.length;
          const departmentCount = new Set(employees.map((emp: EmployeeMetadata) => emp.department_name)).size;
          const positionCount = new Set(employees.map((emp: EmployeeMetadata) => emp.position_name)).size;

          set({
            statistics: {
              totalEmployees: employees.length,
              totalSalary,
              totalTax,
              averageSalary,
              departmentCount,
              positionCount
            }
          }, false, 'updateStatistics');
        },

        // 批量操作
        batchUpdate: (ids: string[], updates: Partial<EmployeeMetadata>) => set(
          (state: MetadataStore) => ({
            employees: state.employees.map((emp: EmployeeMetadata) =>
              ids.includes(emp.payroll_id) ? { ...emp, ...updates } : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'batchUpdate'
        ),

        batchDelete: (ids: string[]) => set(
          (state: MetadataStore) => ({
            employees: state.employees.filter((emp: EmployeeMetadata) => !ids.includes(emp.payroll_id)),
            selectedRows: state.selectedRows.filter((id: string) => !ids.includes(id)),
            lastUpdated: new Date()
          }),
          false,
          'batchDelete'
        ),

        batchLock: (ids: string[]) => {
          const now = new Date().toISOString();
          set(
            (state: MetadataStore) => ({
              employees: state.employees.map((emp: EmployeeMetadata) =>
                ids.includes(emp.payroll_id)
                  ? { 
                      ...emp, 
                      is_locked: true,
                      lock_reason: '批量锁定',
                      locked_at: now,
                      locked_by: 'current_user' // 需要从auth store获取
                    }
                  : emp
              ),
              lastUpdated: new Date()
            }),
            false,
            'batchLock'
          );
        },

        batchUnlock: (ids: string[]) => set(
          (state: MetadataStore) => ({
            employees: state.employees.map((emp: EmployeeMetadata) =>
              ids.includes(emp.payroll_id)
                ? { 
                    ...emp, 
                    is_locked: false,
                    lock_reason: null,
                    locked_at: null,
                    locked_by: null
                  }
                : emp
            ),
            lastUpdated: new Date()
          }),
          false,
          'batchUnlock'
        ),

        // 操作状态
        setSaving: (saving: boolean) => set({ saving }, false, 'setSaving'),
        setImporting: (importing: boolean) => set({ importing }, false, 'setImporting'),
        setExporting: (exporting: boolean) => set({ exporting }, false, 'setExporting'),

        // 重置
        reset: () => set(initialState, false, 'reset')
      })
    ),
    {
      name: 'metadata-store'
    }
  )
);

// 订阅employees变化，自动更新统计信息
useMetadataStore.subscribe(
  (state: MetadataStore) => state.employees,
  () => {
    const { updateStatistics } = useMetadataStore.getState();
    updateStatistics();
  }
);

// 订阅筛选条件变化，重置分页
useMetadataStore.subscribe(
  (state: MetadataStore) => ({ filters: state.filters, pagination: state.pagination }),
  (current: any, previous: any) => {
    if (JSON.stringify(current.filters) !== JSON.stringify(previous?.filters)) {
      const { setPagination } = useMetadataStore.getState();
      setPagination({ ...current.pagination, current: 1 });
    }
  }
);