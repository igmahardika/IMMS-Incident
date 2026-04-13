import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';

export function useEscalationSettings() {
  return useQuery({
    queryKey: ['settings', 'escalation'],
    queryFn: () => api.getEscalation(),
  });
}

export function useUpdateEscalationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.updateEscalation(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'escalation'] });
    },
  });
}

export function useTestEscalationSettings() {
  return useMutation({
    mutationFn: () => api.testEscalation(),
  });
}
