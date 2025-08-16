/**
 * 简化版Hook测试页面
 * 用于测试重构后的新Hook是否正常工作
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

export default function SimpleHookTestPage() {
  const { showSuccess, showError, showInfo } = useToast();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<string[]>([]);

  // 简单的员工查询Hook
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['test-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });

  // 创建测试员工
  const createMutation = useMutation({
    mutationFn: async () => {
      const testData = {
        employee_name: `测试员工_${Date.now()}`,
        id_number: `TEST${Date.now()}`,
        gender: 'male',
        hire_date: new Date().toISOString().split('T')[0],
        employment_status: 'active'
      };
      
      const { data, error } = await supabase
        .from('employees')
        .insert(testData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('创建成功');
      queryClient.invalidateQueries({ queryKey: ['test-employees'] });
      setTestResults(prev => [...prev, '✅ 创建员工成功']);
    },
    onError: (error: any) => {
      showError(`创建失败: ${error.message}`);
      setTestResults(prev => [...prev, `❌ 创建失败: ${error.message}`]);
    }
  });

  // 测试错误处理
  const testError = () => {
    try {
      throw new Error('这是一个测试错误');
    } catch (error: any) {
      showError(error.message);
      setTestResults(prev => [...prev, '✅ 错误处理测试成功']);
    }
  };

  // 测试部门查询
  const testDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      
      setTestResults(prev => [...prev, `✅ 获取${data?.length || 0}个部门成功`]);
      showSuccess('部门查询成功');
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ 部门查询失败: ${error.message}`]);
      showError(error.message);
    }
  };

  // 测试职位查询
  const testPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      
      setTestResults(prev => [...prev, `✅ 获取${data?.length || 0}个职位成功`]);
      showSuccess('职位查询成功');
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ 职位查询失败: ${error.message}`]);
      showError(error.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">简化版Hook测试页面</h1>
      
      {/* 状态显示 */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">当前状态</h2>
          <div className="space-y-2">
            <p>加载中: {isLoading ? '是' : '否'}</p>
            <p>员工数量: {employees?.length || 0}</p>
            <p>错误: {error ? (error as Error).message : '无'}</p>
          </div>
        </div>
      </div>

      {/* 测试按钮 */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">测试操作</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              className="btn btn-primary"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '创建中...' : '创建测试员工'}
            </button>
            
            <button 
              className="btn btn-info"
              onClick={testDepartments}
            >
              测试部门查询
            </button>
            
            <button 
              className="btn btn-warning"
              onClick={testPositions}
            >
              测试职位查询
            </button>
            
            <button 
              className="btn btn-error"
              onClick={testError}
            >
              测试错误处理
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['test-employees'] })}
            >
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">测试结果</h2>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className={result.includes('✅') ? 'text-success' : 'text-error'}>
                  {result}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 员工列表 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">员工列表（前10个）</h2>
          {isLoading ? (
            <div>加载中...</div>
          ) : error ? (
            <div className="text-error">加载失败: {(error as Error).message}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>部门</th>
                    <th>职位</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {employees?.map((emp: any) => (
                    <tr key={emp.employee_id}>
                      <td>{emp.employee_name}</td>
                      <td>{emp.department_name || '-'}</td>
                      <td>{emp.position_name || '-'}</td>
                      <td>
                        <span className={`badge ${
                          emp.employment_status === 'active' ? 'badge-success' : 'badge-error'
                        }`}>
                          {emp.employment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}