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
    queryFn: async () => {
      const users = await api.getUsers();

      return users
        .filter((user) => user.is_active && ['technician', 'noc'].includes(user.role))
        .map((user) => ({
          id: user.id,
          no: user.employee_id || '',
          name: user.name,
          unit: user.role.toUpperCase(),
          role: user.role,
          email: user.email || '',
          is_active: user.is_active,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
  });
}
