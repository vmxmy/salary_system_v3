/**
 * 员工状态管理
 * 
 * 使用 Zustand 管理客户端状态
 * 包括选中项、过滤器、UI 状态等
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Employee, EmployeeFilters } from '../types'

interface EmployeeStore {
  // 状态
  selectedEmployee: Employee | null
  selectedEmployeeIds: Set<string>
  filters: EmployeeFilters
  viewMode: 'grid' | 'list' | 'table'
  isImportModalOpen: boolean
  isCreateModalOpen: boolean
  
  // Actions
  setSelectedEmployee: (employee: Employee | null) => void
  toggleEmployeeSelection: (id: string) => void
  selectAllEmployees: (ids: string[]) => void
  clearSelection: () => void
  setFilters: (filters: Partial<EmployeeFilters>) => void
  resetFilters: () => void
  setViewMode: (mode: 'grid' | 'list' | 'table') => void
  openImportModal: () => void
  closeImportModal: () => void
  openCreateModal: () => void
  closeCreateModal: () => void
}

const defaultFilters: EmployeeFilters = {
  keyword: '',
  departmentId: undefined,
  positionId: undefined,
  status: 'active',
  page: 1,
  pageSize: 20,
  sortBy: 'hire_date',
  sortOrder: 'desc'
}

export const useEmployeeStore = create<EmployeeStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer((set) => ({
          // 初始状态
          selectedEmployee: null,
          selectedEmployeeIds: new Set(),
          filters: defaultFilters,
          viewMode: 'table',
          isImportModalOpen: false,
          isCreateModalOpen: false,
          
          // Actions
          setSelectedEmployee: (employee) =>
            set((state) => {
              state.selectedEmployee = employee
            }),
            
          toggleEmployeeSelection: (id) =>
            set((state) => {
              if (state.selectedEmployeeIds.has(id)) {
                state.selectedEmployeeIds.delete(id)
              } else {
                state.selectedEmployeeIds.add(id)
              }
            }),
            
          selectAllEmployees: (ids) =>
            set((state) => {
              state.selectedEmployeeIds = new Set(ids)
            }),
            
          clearSelection: () =>
            set((state) => {
              state.selectedEmployeeIds.clear()
            }),
            
          setFilters: (filters) =>
            set((state) => {
              state.filters = { ...state.filters, ...filters }
              // 重置页码
              if (!filters.page) {
                state.filters.page = 1
              }
            }),
            
          resetFilters: () =>
            set((state) => {
              state.filters = defaultFilters
            }),
            
          setViewMode: (mode) =>
            set((state) => {
              state.viewMode = mode
            }),
            
          openImportModal: () =>
            set((state) => {
              state.isImportModalOpen = true
            }),
            
          closeImportModal: () =>
            set((state) => {
              state.isImportModalOpen = false
            }),
            
          openCreateModal: () =>
            set((state) => {
              state.isCreateModalOpen = true
            }),
            
          closeCreateModal: () =>
            set((state) => {
              state.isCreateModalOpen = false
            })
        })),
        {
          name: 'employee-store',
          partialize: (state) => ({
            filters: state.filters,
            viewMode: state.viewMode
          })
        }
      )
    )
  )
)

// Selectors
export const useSelectedEmployee = () => 
  useEmployeeStore((state) => state.selectedEmployee)

export const useEmployeeFilters = () => 
  useEmployeeStore((state) => state.filters)

export const useEmployeeViewMode = () => 
  useEmployeeStore((state) => state.viewMode)

export const useSelectedEmployeeIds = () => 
  useEmployeeStore((state) => state.selectedEmployeeIds)

// 订阅过滤器变化
useEmployeeStore.subscribe(
  (state) => state.filters,
  (filters) => {
    console.log('Filters changed:', filters)
  }
)