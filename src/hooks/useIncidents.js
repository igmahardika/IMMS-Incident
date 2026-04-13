import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';

export function useActiveIncidents() {
  return useQuery({
    queryKey: ['incidents', 'active'],
    queryFn: () => api.getIncidents(),
    refetchInterval: 30000,
  });
}

export function useIncident(id) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => api.getIncident(id),
    enabled: !!id,
  });
}

export function useCloseIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.closeIncident(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useStartIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.startAction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function usePauseIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.pauseIncident(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useResumeIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.resumeIncident(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useIncidentHistory(params) {
  return useQuery({
    queryKey: ['incidents', 'history', params],
    queryFn: () => api.getHistory(params),
    keepPreviousData: true,
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 60000,
  });
}
