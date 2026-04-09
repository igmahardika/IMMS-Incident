import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { cn } from '../../lib/utils.js';

/**
 * MasterLayout: The unified shell for the IMMS platform.
 * Refactored to tailwind v4 native flexbox.
 */
export default function MasterLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background font-sans antialiased">
      
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Area */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={closeMobile} mobileOpen={mobileOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20 overflow-hidden">
        <Topbar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto w-full transition-all duration-300">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
