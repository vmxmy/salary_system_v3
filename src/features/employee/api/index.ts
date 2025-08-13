/**
 * 员工 API 统一导出
 */

export { employeeQueries } from './queries'
export { employeeMutations } from './mutations'

// 统一的 API 对象
export const employeeApi = {
  ...employeeQueries,
  ...employeeMutations
}