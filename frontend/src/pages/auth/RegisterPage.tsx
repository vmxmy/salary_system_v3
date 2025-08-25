import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/lib/utils';
import { useModal } from '@/components/common/Modal';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useUnifiedAuth();
  const { t } = useTranslation('auth');
  const modal = useModal();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    };

    if (!formData.fullName) {
      newErrors.fullName = t('validation.nameRequired');
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordMismatch');
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword && !newErrors.fullName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password);
      
      modal.showSuccess(t('register.success'));
      navigate('/dashboard');
    } catch (error: any) {
      let errorMessage = t('register.failed');
      
      if (error.message?.includes('already registered')) {
        errorMessage = t('register.emailExists');
      }
      
      modal.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl font-serif mb-2">
          {t('register.title')}
        </h2>
        <p className="text-base-content/60 mb-6">
          {t('register.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label htmlFor="register-fullname" className="label">
              <span className="label-text">{t('register.fullName')}</span>
            </label>
            <input
              id="register-fullname"
              name="fullName"
              type="text"
              className={`input input-bordered ${errors.fullName ? 'input-error' : ''}`}
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                setErrors({ ...errors, fullName: '' });
              }}
              required
              autoComplete="name"
              placeholder="请输入您的姓名"
              aria-describedby={errors.fullName ? "register-fullname-error" : undefined}
            />
            {errors.fullName && (
              <label className="label">
                <span id="register-fullname-error" className="label-text-alt text-error">{errors.fullName}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="register-email" className="label">
              <span className="label-text">{t('register.email')}</span>
            </label>
            <input
              id="register-email"
              name="email"
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
              aria-describedby={errors.email ? "register-email-error" : undefined}
            />
            {errors.email && (
              <label className="label">
                <span id="register-email-error" className="label-text-alt text-error">{errors.email}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="register-password" className="label">
              <span className="label-text">{t('register.password')}</span>
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setErrors({ ...errors, password: '' });
              }}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              aria-describedby={errors.password ? "register-password-error" : undefined}
            />
            {errors.password && (
              <label className="label">
                <span id="register-password-error" className="label-text-alt text-error">{errors.password}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="register-confirm-password" className="label">
              <span className="label-text">{t('register.confirmPassword')}</span>
            </label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              className={`input input-bordered ${errors.confirmPassword ? 'input-error' : ''}`}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                setErrors({ ...errors, confirmPassword: '' });
              }}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
            />
            {errors.confirmPassword && (
              <label className="label">
                <span id="register-confirm-password-error" className="label-text-alt text-error">{errors.confirmPassword}</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner"></span>}
            {t('register.submit')}
          </button>
        </form>

        <div className="divider">OR</div>

        <p className="text-center text-sm">
          {t('register.hasAccount')}{' '}
          <Link to="/auth/login" className="link link-primary">
            {t('register.login')}
          </Link>
        </p>
      </div>
      
      {/* Modal组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </div>
  );
}