/**
 * Hook测试面板组件
 * 可以嵌入到其他页面中进行测试
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function HookTestPanel() {
  // 测试基本查询
  const { data, isLoading, error } = useQuery({
    queryKey: ['hook-test'],
    queryFn: async () => {
      const results = {
        employees: 0,
        departments: 0,
        positions: 0,
        categories: 0
      };

      try {
        // 测试员工查询
        const { data: empData } = await supabase
          .from('view_employee_basic_info')
          .select('employee_id', { count: 'exact', head: true });
        results.employees = empData?.length || 0;

        // 测试部门查询
        const { count: deptCount } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true });
        results.departments = deptCount || 0;

        // 测试职位查询
        const { count: posCount } = await supabase
          .from('positions')
          .select('*', { count: 'exact', head: true });
        results.positions = posCount || 0;

        // 测试人员类别查询
        const { count: catCount } = await supabase
          .from('employee_categories')
          .select('*', { count: 'exact', head: true });
        results.categories = catCount || 0;

      } catch (err) {
        console.error('测试查询失败:', err);
      }

      return results;
    },
    refetchInterval: 30000 // 每30秒刷新一次
  });

  if (isLoading) {
    return (
      <div className="alert alert-info">
        <span className="loading loading-spinner"></span>
        正在测试Hook连接...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Hook测试失败: {(error as Error).message}</span>
      </div>
    );
  }

  return (
    <div className="alert alert-success">
      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h3 className="font-bold">Hook测试成功！</h3>
        <div className="text-xs">
          员工: {data?.employees || 0} | 
          部门: {data?.departments || 0} | 
          职位: {data?.positions || 0} | 
          类别: {data?.categories || 0}
        </div>
      </div>
      <a href="/hook-test" className="btn btn-sm">查看完整测试</a>
    </div>
  );
}