import React, { useCallback, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { cn } from '../../lib/utils.js';
import { useSocket } from '../../hooks/useSocket.js';

export const SidebarContext = React.createContext({ mobileOpen: false, setMobileOpen: () => {} });

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useSocket();

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
            aria-label="Close navigation overlay"
          />
        ) : null}

        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
