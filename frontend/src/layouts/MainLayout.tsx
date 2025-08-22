import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AIAssistant } from '@/components/ai';
import { OnboardingRenderer } from '@/components/onboarding';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input 
        id="drawer-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isSidebarOpen}
        onChange={(e) => setIsSidebarOpen(e.target.checked)}
      />
      
      <div className="drawer-content flex flex-col min-h-screen">
        {/* Header */}
        <Header />
        
        {/* Page Content - 紧凑化间距，优化MacBook显示宽度 */}
        <main className="flex-1 p-2 lg:p-3 min-h-0 flex flex-col">
          <div className="mx-auto w-full space-y-3 flex-1 min-h-0 flex flex-col" 
               style={{ maxWidth: 'calc(100vw - 2rem)' }}>
            <div className="flex-1 min-h-0">
              <Outlet />
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* AI Assistant - Floating Button */}
      <AIAssistant />
      
      {/* 新用户指导渲染器 - 全局可用 */}
      <OnboardingRenderer />
    </div>
  );
}