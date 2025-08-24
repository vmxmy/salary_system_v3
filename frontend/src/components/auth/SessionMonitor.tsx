/**
 * 会话监控组件
 * 
 * 负责监控用户会话状态，检测会话过期并触发重新验证
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

interface SessionMonitorProps {
  children: React.ReactNode;
}

export function SessionMonitor({ children }: SessionMonitorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, validateSession, requireReAuthentication } = useUnifiedAuth();
  
  const sessionCheckInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastActivityTime = useRef<number>(Date.now());
  const lastLogTime = useRef<number>(0);

  // 会话检查间隔 (10分钟，减少频率)
  const SESSION_CHECK_INTERVAL = 10 * 60 * 1000;
  // 会话警告时间 (55分钟，Supabase默认是1小时)
  const SESSION_WARNING_TIME = 55 * 60 * 1000;
  // 用户活动超时 (30分钟无活动)
  const ACTIVITY_TIMEOUT = 30 * 60 * 1000;

  // 更新最后活动时间
  const updateLastActivity = () => {
    lastActivityTime.current = Date.now();
  };

  // 定期检查会话状态
  const checkSessionStatus = async () => {
    if (!user) return;

    try {
      console.log('[SessionMonitor] Checking session status...');
      
      const isValid = await validateSession();
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime.current;

      if (!isValid) {
        console.warn('[SessionMonitor] Session is invalid, requiring re-authentication');
        requireReAuthentication('会话已过期');
        return;
      }

      // 检查用户长时间未活动
      if (timeSinceLastActivity > ACTIVITY_TIMEOUT) {
        console.warn('[SessionMonitor] User inactive for too long, requiring re-authentication');
        requireReAuthentication('长时间未操作，请重新验证');
        return;
      }

      // 检查是否接近会话过期
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // 转换为毫秒
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < SESSION_WARNING_TIME && timeUntilExpiry > 0) {
          console.warn('[SessionMonitor] Session will expire soon');
          // 静默处理：会话即将过期时不显示弹框，让其自然过期后重新认证
        }
      }

      // 限制日志输出频率 (每5分钟最多一条)
      if (now - lastLogTime.current > 5 * 60 * 1000) {
        console.log('[SessionMonitor] Session is valid');
        lastLogTime.current = now;
      }
    } catch (error) {
      console.error('[SessionMonitor] Session check failed:', error);
      // 网络错误等情况，不立即要求重新验证
    }
  };

  // 监听用户活动
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateLastActivity();
    };

    // 添加事件监听器
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 清理函数
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // 启动会话监控
  useEffect(() => {
    if (!user) {
      // 用户未登录，清除会话检查
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = undefined;
      }
      return;
    }

    console.log('[SessionMonitor] Starting session monitoring for user:', user.email);
    
    // 立即检查一次
    checkSessionStatus();
    
    // 设置定期检查
    sessionCheckInterval.current = setInterval(checkSessionStatus, SESSION_CHECK_INTERVAL);

    // 清理函数
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = undefined;
      }
    };
  }, [user]);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('[SessionMonitor] Page became visible, checking session...');
        updateLastActivity();
        checkSessionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        console.log('[SessionMonitor] Network reconnected, checking session...');
        checkSessionStatus();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  // 监听路由变化，在保护的路由上进行会话检查
  useEffect(() => {
    const protectedRoutes = ['/dashboard', '/employees', '/payroll', '/reports'];
    const isProtectedRoute = protectedRoutes.some(route => 
      location.pathname.startsWith(route)
    );

    if (isProtectedRoute && user) {
      console.log('[SessionMonitor] Navigated to protected route, checking session...');
      updateLastActivity();
      checkSessionStatus();
    }
  }, [location.pathname, user]);

  return <>{children}</>;
}