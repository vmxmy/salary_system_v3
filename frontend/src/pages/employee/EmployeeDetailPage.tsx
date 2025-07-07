import { useParams, Link } from 'react-router-dom';
import { useEmployee } from '../../hooks/useEmployee';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { employee, loading, error } = useEmployee(id || '');

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>加载员工信息失败: {error}</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="alert alert-warning">
        <span>未找到员工信息</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">员工详情</h1>
        <div className="flex gap-2">
          <Link to={`/employees/${id}/edit`} className="btn btn-primary">
            编辑
          </Link>
          <Link to="/employees" className="btn btn-outline">
            返回列表
          </Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">基本信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-600">姓名:</label>
                  <p className="text-lg">{employee.name}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">工号:</label>
                  <p>{employee.employee_number}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">部门:</label>
                  <p>{employee.department_name || '未分配'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">职位:</label>
                  <p>{employee.position_name || '未分配'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">人员类别:</label>
                  <p>{employee.personnel_category_name || '未分配'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">状态:</label>
                  <span className={`badge ${employee.is_active ? 'badge-success' : 'badge-error'}`}>
                    {employee.is_active ? '在职' : '离职'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">联系信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-600">电话:</label>
                  <p>{employee.phone_number || '未填写'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">邮箱:</label>
                  <p>{employee.email || '未填写'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">身份证号:</label>
                  <p>{employee.id_number_masked || '未填写'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">教育程度:</label>
                  <p>{employee.education_level || '未填写'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">公积金账号:</label>
                  <p>{employee.housing_fund_number || '未填写'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">时间信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-medium text-gray-600">入职日期:</label>
                <p>{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('zh-CN') : '未填写'}</p>
              </div>
              <div>
                <label className="font-medium text-gray-600">创建时间:</label>
                <p>{new Date(employee.created_at).toLocaleDateString('zh-CN')}</p>
              </div>
              <div>
                <label className="font-medium text-gray-600">更新时间:</label>
                <p>{new Date(employee.updated_at).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;