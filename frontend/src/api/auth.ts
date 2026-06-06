import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from './types';

export function useMe() {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/user/me', { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
