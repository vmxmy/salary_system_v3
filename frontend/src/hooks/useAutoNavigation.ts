/**
 * 自动导航钩子
 * 处理指导流程中的自动页面跳转
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnboardingStep } from '@/types/onboarding';

export const useAutoNavigation = () => {
  const navigate = useNavigate();

  const executeStepAction = useCallback(async (step: OnboardingStep) => {
    if (!step.action) return;

    console.log(`[useAutoNavigation] Executing step action:`, {
      stepId: step.id,
      actionType: step.action.type,
      actionTarget: step.action.target
    });

    try {
      switch (step.action.type) {
        case 'navigate':
          if (step.action.target) {
            console.log(`[useAutoNavigation] Navigating to: ${step.action.target}`);
            console.log(`[useAutoNavigation] Current location before navigation:`, window.location.pathname);
            
            // 给用户时间看到加载提示
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            navigate(step.action.target);
            
            // 等待页面加载完成
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log(`[useAutoNavigation] Navigation completed, new location:`, window.location.pathname);
          } else {
            console.warn('[useAutoNavigation] Navigate action missing target');
          }
          break;
          
        case 'click':
          if (step.action.target) {
            const element = document.querySelector(step.action.target);
            if (element) {
              (element as HTMLElement).click();
            }
          }
          break;
          
        case 'wait':
          const timeout = step.action.timeout || 1000;
          await new Promise(resolve => setTimeout(resolve, timeout));
          break;
          
        default:
          console.warn(`[useAutoNavigation] Unknown action type: ${step.action.type}`);
      }
    } catch (error) {
      console.error(`[useAutoNavigation] Error executing step action:`, error);
      throw error;
    }
  }, [navigate]);

  return {
    executeStepAction
  };
};