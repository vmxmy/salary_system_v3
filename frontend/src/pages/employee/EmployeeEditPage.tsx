import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useEmployee } from '../../hooks/useEmployee';
import { useToast } from '../../hooks/useToast';
import EmployeeForm from '../../components/employee/EmployeeForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { Employee } from '../../types/employee';

const EmployeeEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const { employee, loading, error, updateEmployee, saving, fetchEmployeeWithSensitiveData } = useEmployee({ 
    employeeId: '', // 不自动获取 
    autoFetch: false 
  });

  // 手动获取完整敏感信息用于编辑
  useEffect(() => {
    if (id) {
      fetchEmployeeWithSensitiveData(id);
    }
  }, [id, fetchEmployeeWithSensitiveData]);

  const handleSubmit = async (data: Partial<Employee> & { 
    education_level?: string; 
    phone_number?: string; 
    email?: string; 
    address?: string;
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    account_holder_name?: string;
    position?: string;
    job_level?: string;
    interrupted_service_years?: number;
    social_security_number?: string;
    housing_fund_number?: string;
    political_status?: string;
    marital_status?: string;
    id_number?: string;
    position_id?: string;
  }) => {
    if (!id) return;
    
    const success = await updateEmployee(id, data);
    if (success) {
      toast.success('员工信息更新成功！所有字段已保存');
      setTimeout(() => {
        navigate(`/employees/${id}`);
      }, 1000);
    }
  };

  const handleCancel = () => {
    navigate(`/employees/${id}`);
  };

  if (loading) {
    return <LoadingSpinner text="加载员工信息..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>加载员工信息失败: {error}</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>未找到员工信息</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleCancel}
            className="btn btn-ghost btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
          <h1 className="text-2xl font-bold">编辑员工: {employee.full_name}</h1>
        </div>

        <EmployeeForm
          employee={employee}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          isEdit={true}
        />
      </div>
    </>
  );
};

export default EmployeeEditPage;