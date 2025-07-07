import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 验证密码匹配
    if (password !== confirmPassword) {
      setError('密码不匹配');
      setLoading(false);
      return;
    }

    // 密码长度验证
    if (password.length < 6) {
      setError('密码长度至少需要6位');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        setSuccess(true);
      } else {
        // 如果邮箱确认已关闭，直接跳转到主页
        navigate('/');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="hero min-h-full bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-5xl font-bold mb-4">注册成功!</h1>
            <p className="py-6">
              我们已经向您的邮箱发送了确认邮件。请查收邮件并点击确认链接完成注册。
            </p>
            <div className="space-y-2">
              <Link to="/login" className="btn btn-primary">
                返回登录
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero min-h-full bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">立即注册!</h1>
          <p className="py-6">创建您的账户开始使用工资管理系统。</p>
        </div>
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <form className="card-body" onSubmit={handleRegister}>
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">姓名</span>
              </label>
              <input 
                type="text" 
                placeholder="请输入您的姓名" 
                className="input input-bordered" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">邮箱</span>
              </label>
              <input 
                type="email" 
                placeholder="请输入邮箱地址" 
                className="input input-bordered" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">密码</span>
              </label>
              <input 
                type="password" 
                placeholder="请输入密码(至少6位)" 
                className="input input-bordered" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">确认密码</span>
              </label>
              <input 
                type="password" 
                placeholder="请再次输入密码" 
                className="input input-bordered" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="form-control mt-6">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm">
                已有账户?{' '}
                <Link to="/login" className="link link-primary">
                  立即登录
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 