import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export const SidebarContext = React.createContext({ mobileOpen: false, setMobileOpen: () => {} });

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="app-layout">
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
          onClick={closeMobile}
        />

        <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />

        <div className="main-area">
          <Topbar />
          <main className="page-content fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
