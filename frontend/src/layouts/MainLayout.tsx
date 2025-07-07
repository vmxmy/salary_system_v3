import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = () => {
  const { user, signOut, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">SalarySystem</Link>
        </div>
        <div className="flex-none">
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : user ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost">
                {user.email}
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li><button onClick={signOut}>登出</button></li>
              </ul>
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