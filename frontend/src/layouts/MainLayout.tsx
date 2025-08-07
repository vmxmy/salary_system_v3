import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="drawer lg:drawer-open">
      <input 
        id="drawer-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isSidebarOpen}
        onChange={(e) => setIsSidebarOpen(e.target.checked)}
      />
      
      <div className="drawer-content flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page Content - 紧凑化间距 */}
        <main className="flex-1 p-2 lg:p-3">
          <div className="mx-auto max-w-7xl space-y-3">
            <Outlet />
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
    </div>
  );
}