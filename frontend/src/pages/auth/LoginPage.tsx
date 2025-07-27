import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, cn } from '@/lib/utils';

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
      newErrors.email = t('validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('validation.passwordMinLength');
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
        errorMessage = t('login.invalidCredentials');
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = t('login.emailNotConfirmed');
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
        <h2 className={cn("card-title mb-2", "text-base")}>
          {t('login.title')}
        </h2>
        <p className={cn("text-base", "text-base-content/60 mb-6")}>
          {t('login.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className={cn("label-text", "text-base")}>{t('login.email')}</span>
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
                <span className={cn("label-text-alt text-error", "text-base")}>{errors.email}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className={cn("label-text", "text-base")}>{t('login.password')}</span>
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
                <span className={cn("label-text-alt text-error", "text-base")}>{errors.password}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className={cn("label-text", "text-base")}>{t('login.rememberMe')}</span>
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
              className={cn("link link-primary", "text-base")}
            >
              {t('login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            className={cn("btn btn-primary w-full", "text-base")}
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner"></span>}
            {t('login.submit')}
          </button>
        </form>

        <div className="divider">OR</div>

        <p className={cn("text-center", "text-base")}>
          {t('login.noAccount')}{' '}
          <Link to="/auth/register" className="link link-primary">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}