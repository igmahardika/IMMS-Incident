import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api.js';

export function useMasterCustomers() {
  return useQuery({
    queryKey: ['master', 'customers'],
    queryFn: () => api.getCustomers(),
    staleTime: 60 * 1000 * 5, // 5 minutes
  });
}

export function useMasterClassifications() {
  return useQuery({
    queryKey: ['master', 'classifications'],
    queryFn: () => api.getClassifications(),
  });
}

export function useMasterDistribusi() {
  return useQuery({
    queryKey: ['master', 'distribusi'],
    queryFn: () => api.getDistribusi(),
  });
}

export function useMasterTechnicalSupport() {
  return useQuery({
    queryKey: ['master', 'technical-support'],
    queryFn: () => api.getTechnicalSupport(),
  });
}

export function useMasterActions() {
  return useQuery({
    queryKey: ['master', 'actions'],
    queryFn: () => api.getActions(),
  });
}
