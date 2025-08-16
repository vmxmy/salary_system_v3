/**
 * Hook测试页面
 * 用于测试重构后的新Hook是否正常工作
 */
import React, { useState } from 'react';
import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
import { useEmployeeDetail } from '@/hooks/employee/useEmployeeDetail';
import { useDepartments } from '@/hooks/department/useDepartments';
import { usePositions } from '@/hooks/position/usePositions';
import { usePersonnelCategories } from '@/hooks/category/usePersonnelCategories';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';
import { useLoadingState } from '@/hooks/core/useLoadingState';

export function HookTestPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  
  // 测试错误处理Hook
  const { handleError } = useErrorHandlerWithToast();
  
  // 测试加载状态Hook
  const { loadingStates, withLoading } = useLoadingState();
  
  // 测试员工列表Hook
  const employeeList = useEmployeeList();
  
  // 测试员工详情Hook
  const employeeDetail = useEmployeeDetail(selectedEmployeeId);
  
  // 测试部门Hook
  const departments = useDepartments();
  
  // 测试职位Hook
  const positions = usePositions();
  
  // 测试人员类别Hook
  const categories = usePersonnelCategories();

  // 测试创建员工
  const testCreateEmployee = async () => {
    try {
      await withLoading('isCreating', async () => {
        await employeeList.actions.create({
          employee_name: `测试员工_${Date.now()}`,
          id_number: `TEST${Date.now()}`,
          gender: 'male',
          hire_date: new Date().toISOString().split('T')[0],
          employment_status: 'active'
        });
        
        setTestResults(prev => ({
          ...prev,
          createEmployee: '✅ 创建成功'
        }));
      });
    } catch (error) {
      handleError(error as Error);
      setTestResults(prev => ({
        ...prev,
        createEmployee: `❌ 创建失败: ${error}`
      }));
    }
  };

  // 测试更新员工
  const testUpdateEmployee = async () => {
    if (!employeeList.employees[0]) {
      setTestResults(prev => ({
        ...prev,
        updateEmployee: '❌ 没有可更新的员工'
      }));
      return;
    }

    try {
      await withLoading('isUpdating', async () => {
        await employeeList.actions.update({
          id: employeeList.employees[0].id,
          updates: {
            employee_name: `更新_${Date.now()}`
          }
        });
        
        setTestResults(prev => ({
          ...prev,
          updateEmployee: '✅ 更新成功'
        }));
      });
    } catch (error) {
      handleError(error as Error);
      setTestResults(prev => ({
        ...prev,
        updateEmployee: `❌ 更新失败: ${error}`
      }));
    }
  };

  // 测试删除员工
  const testDeleteEmployee = async () => {
    const testEmployee = employeeList.employees.find(e => 
      e.employee_name?.startsWith('测试员工_')
    );
    
    if (!testEmployee) {
      setTestResults(prev => ({
        ...prev,
        deleteEmployee: '❌ 没有测试员工可删除'
      }));
      return;
    }

    try {
      await withLoading('isDeleting', async () => {
        await employeeList.actions.delete(testEmployee.id);
        
        setTestResults(prev => ({
          ...prev,
          deleteEmployee: '✅ 删除成功'
        }));
      });
    } catch (error) {
      handleError(error as Error);
      setTestResults(prev => ({
        ...prev,
        deleteEmployee: `❌ 删除失败: ${error}`
      }));
    }
  };

  // 测试错误处理
  const testErrorHandling = () => {
    try {
      throw new Error('这是一个测试错误');
    } catch (error) {
      handleError(error as Error);
      setTestResults(prev => ({
        ...prev,
        errorHandling: '✅ 错误处理正常'
      }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Hook测试页面</h1>
      
      {/* Hook状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 员工列表Hook状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">员工列表Hook</h2>
            <div className="space-y-2">
              <p>总数: {employeeList.employees.length}</p>
              <p>加载中: {employeeList.loadingStates.isInitialLoading ? '是' : '否'}</p>
              <p>刷新中: {employeeList.loadingStates.isRefetching ? '是' : '否'}</p>
              <p>创建中: {employeeList.loadingStates.isCreating ? '是' : '否'}</p>
              <p>更新中: {employeeList.loadingStates.isUpdating ? '是' : '否'}</p>
              <p>删除中: {employeeList.loadingStates.isDeleting ? '是' : '否'}</p>
              <p>错误: {employeeList.error ? employeeList.error.message : '无'}</p>
            </div>
          </div>
        </div>

        {/* 部门Hook状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">部门Hook</h2>
            <div className="space-y-2">
              <p>总数: {departments.departments.length}</p>
              <p>加载中: {departments.isLoading ? '是' : '否'}</p>
              <p>错误: {departments.error ? departments.error.message : '无'}</p>
              {departments.departments.slice(0, 3).map(dept => (
                <p key={dept.id} className="text-sm">- {dept.name}</p>
              ))}
            </div>
          </div>
        </div>

        {/* 职位Hook状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">职位Hook</h2>
            <div className="space-y-2">
              <p>总数: {positions.positions.length}</p>
              <p>加载中: {positions.isLoading ? '是' : '否'}</p>
              <p>错误: {positions.error ? positions.error.message : '无'}</p>
              {positions.positions.slice(0, 3).map(pos => (
                <p key={pos.id} className="text-sm">- {pos.name}</p>
              ))}
            </div>
          </div>
        </div>

        {/* 人员类别Hook状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">人员类别Hook</h2>
            <div className="space-y-2">
              <p>总数: {categories.categories.length}</p>
              <p>加载中: {categories.isLoading ? '是' : '否'}</p>
              <p>错误: {categories.error ? categories.error.message : '无'}</p>
              {categories.categories.slice(0, 3).map(cat => (
                <p key={cat.id} className="text-sm">- {cat.name}</p>
              ))}
            </div>
          </div>
        </div>

        {/* 加载状态Hook */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">加载状态Hook</h2>
            <div className="space-y-2">
              <p>初始加载: {loadingStates.isInitialLoading ? '是' : '否'}</p>
              <p>刷新中: {loadingStates.isRefetching ? '是' : '否'}</p>
              <p>创建中: {loadingStates.isCreating ? '是' : '否'}</p>
              <p>更新中: {loadingStates.isUpdating ? '是' : '否'}</p>
              <p>删除中: {loadingStates.isDeleting ? '是' : '否'}</p>
            </div>
          </div>
        </div>

        {/* 员工详情Hook状态 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">员工详情Hook</h2>
            <div className="space-y-2">
              <p>选中ID: {selectedEmployeeId || '未选择'}</p>
              <p>加载中: {employeeDetail.isLoading ? '是' : '否'}</p>
              <p>错误: {employeeDetail.error ? employeeDetail.error.message : '无'}</p>
              {employeeDetail.employee && (
                <>
                  <p>姓名: {employeeDetail.employee.employee_name}</p>
                  <p>部门: {employeeDetail.employee.department_name}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 测试操作 */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">测试操作</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              className="btn btn-primary"
              onClick={testCreateEmployee}
              disabled={loadingStates.isCreating}
            >
              {loadingStates.isCreating ? '创建中...' : '测试创建员工'}
            </button>
            
            <button 
              className="btn btn-info"
              onClick={testUpdateEmployee}
              disabled={loadingStates.isUpdating || employeeList.employees.length === 0}
            >
              {loadingStates.isUpdating ? '更新中...' : '测试更新员工'}
            </button>
            
            <button 
              className="btn btn-warning"
              onClick={testDeleteEmployee}
              disabled={loadingStates.isDeleting}
            >
              {loadingStates.isDeleting ? '删除中...' : '测试删除员工'}
            </button>
            
            <button 
              className="btn btn-error"
              onClick={testErrorHandling}
            >
              测试错误处理
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => employeeList.actions.refresh()}
            >
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {Object.keys(testResults).length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">测试结果</h2>
            <div className="space-y-2">
              {Object.entries(testResults).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-mono">{key}:</span>
                  <span className={value.includes('✅') ? 'text-success' : 'text-error'}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 员工列表 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">员工列表（前10个）</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>选择</th>
                  <th>姓名</th>
                  <th>部门</th>
                  <th>职位</th>
                  <th>状态</th>
                  <th>入职日期</th>
                </tr>
              </thead>
              <tbody>
                {employeeList.employees.slice(0, 10).map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => setSelectedEmployeeId(employee.id)}
                      >
                        查看
                      </button>
                    </td>
                    <td>{employee.employee_name}</td>
                    <td>{employee.department_name || '-'}</td>
                    <td>{employee.position_name || '-'}</td>
                    <td>
                      <span className={`badge ${
                        employee.employment_status === 'active' ? 'badge-success' : 'badge-error'
                      }`}>
                        {employee.employment_status}
                      </span>
                    </td>
                    <td>{employee.hire_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}