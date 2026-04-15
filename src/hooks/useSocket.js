import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredUserSession } from '../utils/api.js';

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

    const session = getStoredUserSession();
    if (session?.id) {
      socket.emit('register-session', { userId: session.id, role: session.role });
    }

    const handleIncidentUpdate = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboard'] });

      const incidentId = payload?.id ?? payload?.incident?.id;
      if (incidentId) {
        queryClient.invalidateQueries({ queryKey: ['incident', String(incidentId)] });
        queryClient.invalidateQueries({ queryKey: ['incident', Number(incidentId)] });
      }
    };

    socket.on('incident-updated', handleIncidentUpdate);

    return () => {
      socket.off('incident-updated', handleIncidentUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  return socket;
}
