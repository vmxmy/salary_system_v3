import React, { useState, useEffect } from 'react';
import { EmployeeAPI } from '../lib/employeeApi_new';
import type { EmployeeWithDetails } from '../types/employee_new';

const TestEmployeePage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await EmployeeAPI.getEmployees(0, 10);
      setEmployees(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取员工列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    try {
      // 创建一个示例员工
      const newEmployee = await EmployeeAPI.createEmployee({
        full_name: '测试员工',
        gender: 'male',
        date_of_birth: '1990-01-01',
        id_number: '110101199001011234',
        hire_date: new Date().toISOString(),
        current_status: 'active',
        employment_status: 'active'
      });
      
      if (newEmployee) {
        console.log('创建员工成功:', newEmployee);
        fetchEmployees(); // 刷新列表
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建员工失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">员工管理测试页面</h1>
      
      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button 
          className="btn btn-primary"
          onClick={fetchEmployees}
        >
          刷新列表
        </button>
        <button 
          className="btn btn-secondary"
          onClick={handleCreateEmployee}
        >
          创建测试员工
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>ID</th>
              <th>姓名</th>
              <th>性别</th>
              <th>部门</th>
              <th>职位</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id.substring(0, 8)}</td>
                <td>{employee.full_name}</td>
                <td>{employee.gender}</td>
                <td>{employee.department_name || '未分配'}</td>
                <td>{employee.position || '未分配'}</td>
                <td>
                  <span className={`badge ${employee.current_status === 'active' ? 'badge-success' : 'badge-error'}`}>
                    {employee.current_status === 'active' ? '在职' : '离职'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && !loading && (
        <div className="text-center py-8 text-base-content/50">
          <p>暂无员工数据</p>
        </div>
      )}
    </div>
  );
};

export default TestEmployeePage;