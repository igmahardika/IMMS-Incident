import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

// Ideally VITE_API_URL is properly configured in environment. Fallback for local.
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.connect();

    const handleIncidentUpdate = (payload) => {
      console.log('[Socket] Incident data changed on server:', payload);
      // Immediately invalidate any active incidents query so the UI re-fetches
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      // We can further optimize by individually updating cache, but invalidation is safest
    };

    socket.on('incident-updated', handleIncidentUpdate);

    return () => {
      socket.off('incident-updated', handleIncidentUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  return socket;
}
