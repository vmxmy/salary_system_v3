import { useParams, Link } from 'react-router-dom';
import { useEmployee } from '../../hooks/useEmployee';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { employee, loading, error } = useEmployee({ employeeId: id || '', autoFetch: true });

  if (loading) {
    return <LoadingSpinner />;
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

  const InfoItem = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-base-content/70">{label}</span>
      <span className={`text-base ${className}`}>{value || '未填写'}</span>
    </div>
  );

  const StatusBadge = ({ active }: { active: boolean }) => (
    <div className={`badge ${active ? 'badge-success' : 'badge-error'} badge-lg`}>
      {active ? '在职' : '离职'}
    </div>
  );

  const GenderBadge = ({ gender }: { gender: string }) => {
    let bgClass = '';
    if (gender === '男') {
      bgClass = 'bg-blue-100 text-blue-800';
    } else if (gender === '女') {
      bgClass = 'bg-pink-100 text-pink-800';
    } else {
      bgClass = 'bg-gray-100 text-gray-600';
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${bgClass}`}>
        {gender || '未知'}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">{employee.full_name}</h1>
          <p className="text-base-content/70 mt-1">工号: {employee.employee_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge active={employee.current_status === 'active'} />
          <Link 
            to={`/employees/${id}/edit`} 
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑
          </Link>
          <Link 
            to="/employees" 
            className="btn btn-outline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息卡片 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              基本信息
            </h2>
            <div className="space-y-4">
              <InfoItem label="姓名" value={employee.full_name} className="font-semibold text-lg" />
              <InfoItem label="工号" value={employee.employee_code} />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-base-content/70">性别</span>
                <GenderBadge gender={employee.gender} />
              </div>
              <InfoItem 
                label="入职日期" 
                value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('zh-CN') : null} 
              />
              <InfoItem 
                label="出生日期" 
                value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('zh-CN') : null} 
              />
              <InfoItem label="身份证号" value={employee.id_number_reference} />
            </div>
          </div>
        </div>

        {/* 组织信息卡片 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              组织信息
            </h2>
            <div className="space-y-4">
              <InfoItem label="部门" value={employee.department_name} />
              <InfoItem label="职位" value={employee.position} />
              <InfoItem label="职级" value={employee.job_level} />
              <InfoItem label="人员类别" value={employee.personnel_category_name} />
              <div className="divider my-2"></div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-base-content/70">在职状态</span>
                <StatusBadge active={employee.current_status === 'active'} />
              </div>
            </div>
          </div>
        </div>

        {/* 联系信息卡片 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              联系信息
            </h2>
            <div className="space-y-4">
              <InfoItem label="电话号码" value={employee.phone_number} />
              <InfoItem label="电子邮箱" value={employee.email} />
              <InfoItem label="公积金账号" value={employee.housing_fund_number} />
            </div>
          </div>
        </div>
      </div>

      {/* 时间信息卡片 */}
      <div className="card bg-base-100 shadow-lg mt-6">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            时间记录
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoItem 
              label="入职日期" 
              value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : null}
            />
            <InfoItem 
              label="创建时间" 
              value={new Date(employee.created_at).toLocaleString('zh-CN')}
            />
            <InfoItem 
              label="最后更新" 
              value={new Date(employee.updated_at).toLocaleString('zh-CN')}
            />
          </div>
        </div>
      </div>

      {/* 操作历史 - 未来功能 */}
      <div className="card bg-base-100 shadow-lg mt-6">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            操作历史
          </h2>
          <div className="text-center text-base-content/50 py-8">
            <p>暂无操作历史记录</p>
            <p className="text-sm mt-2">此功能将在后续版本中实现</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;