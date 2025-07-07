import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="hero min-h-full bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold">欢迎使用工资管理系统</h1>
          <p className="py-6">
            您好，{user?.user_metadata?.full_name || user?.email}！
            <br />
            您已成功登录系统。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">工资管理</h2>
                <p>管理员工工资信息和发放记录</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary">进入</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">员工管理</h2>
                <p>管理员工基本信息和部门分配</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary">进入</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">报表统计</h2>
                <p>查看工资统计和财务报表</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary">进入</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">系统设置</h2>
                <p>配置系统参数和用户权限</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary">进入</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 