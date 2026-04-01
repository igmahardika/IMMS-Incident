import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

/**
 * MasterLayout: The unified shell for the IMMS platform.
 * Implements the Drawer component for responsive nav and a centralized bg-base-200 content area.
 */
export default function MasterLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="drawer lg:drawer-open font-sans antialiased">
      <input 
        id="sidebar-drawer" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={mobileOpen} 
        onChange={(e) => setMobileOpen(e.target.checked)} 
      />
      
      <div className="drawer-content flex flex-col min-h-screen bg-base-200 selection:bg-primary/20 selection:text-primary overflow-x-hidden">
        {/* Global Navigation Bar */}
        <Topbar />
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto w-full transition-all duration-300">
            {children}
          </div>
        </main>

        {/* Optional Global Footer could go here */}
      </div>

      <div className="drawer-side z-50">
        <label 
          htmlFor="sidebar-drawer" 
          aria-label="close sidebar" 
          className="drawer-overlay" 
          onClick={closeMobile}
        ></label>
        <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />
      </div>
    </div>
  );
}
