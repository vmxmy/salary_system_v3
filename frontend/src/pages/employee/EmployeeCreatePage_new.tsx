import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useEmployee } from '../../hooks/useEmployee_new';
import EmployeeForm from '../../components/employee/EmployeeForm_new';

const EmployeeCreatePage = () => {
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const { createEmployee, saving } = useEmployee({ autoFetch: false });

  const handleSubmit = async (data: any) => {
    const result = await createEmployee(data);
    if (result) {
      toast.success('员工创建成功！');
      setTimeout(() => {
        navigate(`/employees/${result.id}/detail-new`);
      }, 1000);
    }
  };

  const handleCancel = () => {
    navigate('/employees');
  };

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
          <h1 className="text-2xl font-bold">新建员工（新版本）</h1>
        </div>

        <EmployeeForm
          employee={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          isEdit={false}
        />
      </div>
    </>
  );
};

export default EmployeeCreatePage;