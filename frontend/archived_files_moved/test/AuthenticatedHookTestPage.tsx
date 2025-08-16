/**
 * 认证版Hook测试页面
 * 确保用户已登录才能进行测试
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';

export default function AuthenticatedHookTestPage() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<string>('检查中...');

  // 检查认证状态
  useEffect(() => {
    checkAuthStatus();
  }, [user]);

  const checkAuthStatus = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setAuthStatus(`✅ 已认证: ${currentUser.email}`);
      showInfo(`当前用户: ${currentUser.email}`);
    } else {
      setAuthStatus('❌ 未认证 - 请先登录');
      showWarning('请先登录后再进行测试');
    }
  };

  // 简单的员工查询Hook
  const { data: employees, isLoading, error, refetch } = useQuery({
    queryKey: ['test-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .limit(10)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user // 只有用户登录后才执行查询
  });

  // 创建测试员工
  const createMutation = useMutation({
    mutationFn: async () => {
      // 确保用户已认证
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('用户未认证，请先登录');
      }

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
      
      if (error) {
        console.error('创建失败详情:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      showSuccess('创建成功');
      queryClient.invalidateQueries({ queryKey: ['test-employees'] });
      setTestResults(prev => [...prev, `✅ 创建员工成功: ${data.employee_name}`]);
    },
    onError: (error: any) => {
      const errorMsg = error.message || '未知错误';
      showError(`创建失败: ${errorMsg}`);
      setTestResults(prev => [...prev, `❌ 创建失败: ${errorMsg}`]);
      
      // 如果是RLS错误，提供更多帮助信息
      if (errorMsg.includes('row-level security')) {
        showWarning('提示: 确保您已登录且有创建权限');
      }
    }
  });

  // 更新测试员工
  const updateMutation = useMutation({
    mutationFn: async () => {
      const testEmployee = employees?.find(e => 
        e.employee_name?.startsWith('测试员工_')
      );
      
      if (!testEmployee) {
        throw new Error('没有找到测试员工');
      }

      const { data, error } = await supabase
        .from('employees')
        .update({ 
          employee_name: `测试员工_更新_${Date.now()}`
        })
        .eq('id', testEmployee.employee_id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      showSuccess('更新成功');
      queryClient.invalidateQueries({ queryKey: ['test-employees'] });
      setTestResults(prev => [...prev, `✅ 更新员工成功: ${data.employee_name}`]);
    },
    onError: (error: any) => {
      showError(`更新失败: ${error.message}`);
      setTestResults(prev => [...prev, `❌ 更新失败: ${error.message}`]);
    }
  });

  // 删除测试员工
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const testEmployee = employees?.find(e => 
        e.employee_name?.startsWith('测试员工_')
      );
      
      if (!testEmployee) {
        throw new Error('没有找到测试员工');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', testEmployee.employee_id);
      
      if (error) throw error;
      return testEmployee.employee_name;
    },
    onSuccess: (name) => {
      showSuccess('删除成功');
      queryClient.invalidateQueries({ queryKey: ['test-employees'] });
      setTestResults(prev => [...prev, `✅ 删除员工成功: ${name}`]);
    },
    onError: (error: any) => {
      showError(`删除失败: ${error.message}`);
      setTestResults(prev => [...prev, `❌ 删除失败: ${error.message}`]);
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

  // 清理测试数据
  const cleanupTestData = async () => {
    try {
      const testEmployees = employees?.filter(e => 
        e.employee_name?.startsWith('测试员工_')
      ) || [];

      if (testEmployees.length === 0) {
        showInfo('没有测试数据需要清理');
        return;
      }

      for (const emp of testEmployees) {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', emp.employee_id);
        
        if (error) {
          console.error(`清理失败: ${emp.employee_name}`, error);
        }
      }

      showSuccess(`清理了 ${testEmployees.length} 条测试数据`);
      setTestResults(prev => [...prev, `✅ 清理了 ${testEmployees.length} 条测试数据`]);
      refetch();
    } catch (error: any) {
      showError(`清理失败: ${error.message}`);
      setTestResults(prev => [...prev, `❌ 清理失败: ${error.message}`]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">认证版Hook测试页面</h1>
      
      {/* 认证状态 */}
      <div className="alert alert-info mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>认证状态: {authStatus}</span>
      </div>

      {/* 状态显示 */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">当前状态</h2>
          <div className="space-y-2">
            <p>用户: {user?.email || '未登录'}</p>
            <p>加载中: {isLoading ? '是' : '否'}</p>
            <p>员工数量: {employees?.length || 0}</p>
            <p>测试员工数量: {employees?.filter(e => e.employee_name?.startsWith('测试员工_')).length || 0}</p>
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
              disabled={!user || createMutation.isPending}
            >
              {createMutation.isPending ? '创建中...' : '创建测试员工'}
            </button>
            
            <button 
              className="btn btn-info"
              onClick={() => updateMutation.mutate()}
              disabled={!user || updateMutation.isPending || !employees?.some(e => e.employee_name?.startsWith('测试员工_'))}
            >
              {updateMutation.isPending ? '更新中...' : '更新测试员工'}
            </button>
            
            <button 
              className="btn btn-warning"
              onClick={() => deleteMutation.mutate()}
              disabled={!user || deleteMutation.isPending || !employees?.some(e => e.employee_name?.startsWith('测试员工_'))}
            >
              {deleteMutation.isPending ? '删除中...' : '删除测试员工'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={testDepartments}
              disabled={!user}
            >
              测试部门查询
            </button>
            
            <button 
              className="btn btn-error"
              onClick={testError}
            >
              测试错误处理
            </button>
            
            <button 
              className="btn btn-ghost"
              onClick={() => refetch()}
              disabled={!user}
            >
              刷新数据
            </button>
            
            <button 
              className="btn btn-outline btn-error"
              onClick={cleanupTestData}
              disabled={!user || !employees?.some(e => e.employee_name?.startsWith('测试员工_'))}
            >
              清理测试数据
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">测试结果</h2>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => setTestResults([])}
              >
                清空结果
              </button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
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
          <h2 className="card-title">员工列表（最新10个）</h2>
          {!user ? (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>请先登录后查看数据</span>
            </div>
          ) : isLoading ? (
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
                    <th>类型</th>
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
                      <td>
                        {emp.employee_name?.startsWith('测试员工_') && (
                          <span className="badge badge-warning">测试</span>
                        )}
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