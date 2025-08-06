import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to dashboard
          console.log('Magic link authentication successful');
          navigate('/dashboard', { replace: true });
        } else {
          // Handle the auth tokens from URL
          const accessToken = searchParams.get('access_token');
          const refreshToken = searchParams.get('refresh_token');
          const type = searchParams.get('type');
          
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              setError(sessionError.message);
              return;
            }
            
            // Determine redirect based on type
            if (type === 'recovery') {
              navigate('/auth/reset-password', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            setError('Missing authentication tokens');
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Authentication failed');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (isProcessing) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col items-center space-y-4">
            <span className="loading loading-spinner loading-lg"></span>
            <h2 className={cn("card-title", "text-base")}>
              {t('authCallback.processing') || 'Processing authentication...'}
            </h2>
            <p className={cn("text-center", "text-base-content/60", "text-base")}>
              {t('authCallback.processingDescription') || 'Please wait while we complete your sign in.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className={cn("card-title text-error mb-2", "text-base")}>
            {t('authCallback.error') || 'Authentication Error'}
          </h2>
          <p className={cn("text-base", "text-base-content/60 mb-6")}>
            {t('authCallback.errorDescription') || 'There was a problem completing your authentication:'}
          </p>
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/auth/login', { replace: true })}
              className={cn("btn btn-primary w-full", "text-base")}
            >
              {t('authCallback.backToLogin') || 'Back to Login'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className={cn("btn btn-outline w-full", "text-base")}
            >
              {t('authCallback.tryAgain') || 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}