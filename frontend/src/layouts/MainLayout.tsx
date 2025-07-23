import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRef, useEffect } from 'react';

const MainLayout = () => {
  const { user, signOut, loading } = useAuth();
  
  // 引用所有的 details 元素
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([]);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // 关闭所有下拉菜单
  const closeAllDropdowns = () => {
    // 关闭所有 details 元素
    detailsRefs.current.forEach(details => {
      if (details) details.open = false;
    });
    
    // 关闭所有 dropdown（移除焦点）
    dropdownRefs.current.forEach(dropdown => {
      if (dropdown) {
        const activeElement = dropdown.querySelector('[tabindex="0"]');
        if (activeElement && activeElement instanceof HTMLElement) {
          activeElement.blur();
        }
      }
    });
  };
  
  // 点击页面其他地方时关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // 检查是否点击了导航栏外部
      if (!target.closest('.navbar')) {
        closeAllDropdowns();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
                  <details ref={el => { detailsRefs.current[0] = el; }}>
                    <summary>员工管理</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><Link to="/employees" onClick={closeAllDropdowns}>员工列表</Link></li>
                      <li><Link to="/employees/create" onClick={closeAllDropdowns}>新建员工</Link></li>
                      <li><Link to="/departments" onClick={closeAllDropdowns}>部门管理</Link></li>
                      <li><Link to="/positions" onClick={closeAllDropdowns}>职位管理</Link></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details ref={el => { detailsRefs.current[1] = el; }}>
                    <summary>工资管理</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><a onClick={closeAllDropdowns}>工资发放</a></li>
                      <li><a onClick={closeAllDropdowns}>工资标准</a></li>
                      <li><a onClick={closeAllDropdowns}>工资计算</a></li>
                      <li><hr /></li>
                      <li><Link to="/payroll/insurance-config" onClick={closeAllDropdowns}>五险一金配置</Link></li>
                      <li><Link to="/payroll/tax-config" onClick={closeAllDropdowns}>个税配置</Link></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details ref={el => { detailsRefs.current[2] = el; }}>
                    <summary>报表统计</summary>
                    <ul className="p-2 bg-base-100 rounded-t-none min-w-max">
                      <li><a onClick={closeAllDropdowns}>工资报表</a></li>
                      <li><a onClick={closeAllDropdowns}>人员统计</a></li>
                      <li><a onClick={closeAllDropdowns}>财务分析</a></li>
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
              <div className="dropdown lg:hidden" ref={el => { dropdownRefs.current[0] = el; }}>
                <div tabIndex={0} role="button" className="btn btn-ghost">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 right-0">
                  <li><Link to="/" onClick={closeAllDropdowns}>首页</Link></li>
                  <li>
                    <details ref={el => { detailsRefs.current[3] = el; }}>
                      <summary>员工管理</summary>
                      <ul>
                        <li><Link to="/employees" onClick={closeAllDropdowns}>员工列表</Link></li>
                        <li><Link to="/employees/create" onClick={closeAllDropdowns}>新建员工</Link></li>
                        <li><Link to="/departments" onClick={closeAllDropdowns}>部门管理</Link></li>
                        <li><Link to="/positions" onClick={closeAllDropdowns}>职位管理</Link></li>
                      </ul>
                    </details>
                  </li>
                  <li>
                    <details ref={el => { detailsRefs.current[4] = el; }}>
                      <summary>工资管理</summary>
                      <ul>
                        <li><a onClick={closeAllDropdowns}>工资发放</a></li>
                        <li><a onClick={closeAllDropdowns}>工资标准</a></li>
                        <li><a onClick={closeAllDropdowns}>工资计算</a></li>
                        <li><hr /></li>
                        <li><Link to="/payroll/insurance-config" onClick={closeAllDropdowns}>五险一金配置</Link></li>
                        <li><Link to="/payroll/tax-config" onClick={closeAllDropdowns}>个税配置</Link></li>
                      </ul>
                    </details>
                  </li>
                  <li>
                    <details ref={el => { detailsRefs.current[5] = el; }}>
                      <summary>报表统计</summary>
                      <ul>
                        <li><a onClick={closeAllDropdowns}>工资报表</a></li>
                        <li><a onClick={closeAllDropdowns}>人员统计</a></li>
                        <li><a onClick={closeAllDropdowns}>财务分析</a></li>
                      </ul>
                    </details>
                  </li>
                </ul>
              </div>
              
              {/* 用户菜单 */}
              <div className="dropdown dropdown-end" ref={el => { dropdownRefs.current[1] = el; }}>
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
                  <li><a onClick={closeAllDropdowns}>个人资料</a></li>
                  <li><a onClick={closeAllDropdowns}>系统设置</a></li>
                  <li><hr /></li>
                  <li><button onClick={() => { signOut(); closeAllDropdowns(); }}>登出</button></li>
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