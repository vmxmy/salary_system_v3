import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/lib/utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { t } = useTranslation('auth');

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };

    if (!formData.email) {
      newErrors.email = t('validation.emailRequired', '请输入邮箱');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('validation.emailInvalid', '邮箱格式不正确');
    }

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired', '请输入密码');
    } else if (formData.password.length < 6) {
      newErrors.password = t('validation.passwordMinLength', '密码至少6位');
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to sign in with:', formData.email);
      await signIn(formData.email, formData.password);
      console.log('Sign in successful, navigating to:', from);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Sign in failed:', error);
      let errorMessage = t('login.failed');
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = t('login.invalidCredentials', '邮箱或密码错误');
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = t('login.emailNotConfirmed', '请先验证您的邮箱');
      }
      
      // For now, use alert - can be replaced with a proper toast system later
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl font-serif mb-2">
          {t('login.title')}
        </h2>
        <p className="text-base-content/60 mb-6">
          {t('login.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('login.email')}</span>
            </label>
            <input
              type="email"
              className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
            {errors.email && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.email}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('login.password')}</span>
            </label>
            <input
              type="password"
              className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setErrors({ ...errors, password: '' });
              }}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {errors.password && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.password}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">{t('login.rememberMe')}</span>
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/auth/forgot-password"
              className="link link-primary text-sm"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner"></span>}
            {t('login.submit')}
          </button>
        </form>

        <div className="divider">OR</div>

        <p className="text-center text-sm">
          {t('login.noAccount')}{' '}
          <Link to="/auth/register" className="link link-primary">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}