import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { cn } from '../../lib/utils.js';
import { useSocket } from '../../hooks/useSocket.js';

export const SidebarContext = React.createContext({ mobileOpen: false, setMobileOpen: () => {} });

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  
  useSocket(); // Mount socket listener to subscribe to server invalidations

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        
        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}
        
        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <Sidebar onClose={closeMobile} />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Topbar />
          <main className="flex-1 overflow-hidden flex flex-col p-3 md:p-5 bg-muted/30">
            {children}
          </main>
        </div>

      </div>
    </SidebarContext.Provider>
  );
}
