import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = () => {
  const { user, signOut, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">SalarySystem</Link>
          
          {/* 主导航菜单 */}
          {user && (
            <div className="hidden lg:flex ml-6">
              <ul className="menu menu-horizontal px-1">
                <li>
                  <Link to="/" className="rounded-lg">
                    首页
                  </Link>
                </li>
                <li>
                  <details>
                    <summary>员工管理</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><Link to="/employees">员工列表</Link></li>
                      <li><Link to="/employees/create">新建员工</Link></li>
                      <li><Link to="/departments">部门管理</Link></li>
                      <li><Link to="/positions">职位管理</Link></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details>
                    <summary>工资管理</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><a>工资发放</a></li>
                      <li><a>工资标准</a></li>
                      <li><a>工资计算</a></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details>
                    <summary>报表统计</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><a>工资报表</a></li>
                      <li><a>人员统计</a></li>
                      <li><a>财务分析</a></li>
                    </ul>
                  </details>
                </li>
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex-none">
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* 移动端菜单 */}
              <div className="dropdown lg:hidden">
                <div tabIndex={0} role="button" className="btn btn-ghost">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 right-0">
                  <li><Link to="/">首页</Link></li>
                  <li>
                    <details>
                      <summary>员工管理</summary>
                      <ul>
                        <li><Link to="/employees">员工列表</Link></li>
                        <li><Link to="/employees/create">新建员工</Link></li>
                        <li><Link to="/departments">部门管理</Link></li>
                        <li><Link to="/positions">职位管理</Link></li>
                      </ul>
                    </details>
                  </li>
                  <li>
                    <details>
                      <summary>工资管理</summary>
                      <ul>
                        <li><a>工资发放</a></li>
                        <li><a>工资标准</a></li>
                        <li><a>工资计算</a></li>
                      </ul>
                    </details>
                  </li>
                  <li>
                    <details>
                      <summary>报表统计</summary>
                      <ul>
                        <li><a>工资报表</a></li>
                        <li><a>人员统计</a></li>
                        <li><a>财务分析</a></li>
                      </ul>
                    </details>
                  </li>
                </ul>
              </div>
              
              {/* 用户菜单 */}
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost">
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-8">
                        <span className="text-xs">
                          {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <span className="hidden sm:inline">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </div>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>个人资料</a></li>
                  <li><a>系统设置</a></li>
                  <li><hr /></li>
                  <li><button onClick={signOut}>登出</button></li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-ghost">登录</Link>
              <Link to="/register" className="btn btn-primary">注册</Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>

      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>Copyright © 2024 - All right reserved by SalarySystem Industries Ltd</p>
        </aside>
      </footer>
    </div>
  );
};

export default MainLayout;