import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export const SidebarContext = React.createContext({ mobileOpen: false, setMobileOpen: () => {} });

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="drawer lg:drawer-open h-dvh w-full bg-base-100">
        <input 
          id="main-drawer" 
          type="checkbox" 
          className="drawer-toggle" 
          checked={mobileOpen}
          onChange={(e) => setMobileOpen(e.target.checked)} 
        />
        
        <div className="drawer-content flex flex-col h-full overflow-hidden">
          {/* Navbar */}
          <Topbar />
          
          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-3 md:p-4 lg:p-6 bg-base-200">
            {children}
          </main>
        </div> 
        
        <div className="drawer-side z-[100]">
          <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
