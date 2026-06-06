import { useQuery } from '@tanstack/react-query';
import type { LeaderboardResponse } from './types';

interface LeaderboardParams {
  sort_by: 'global_points' | 'community_points';
  scope: 'global' | 'friends';
  page: number;
}

export function useLeaderboard({ sort_by, scope, page }: LeaderboardParams) {
  return useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', sort_by, scope, page],
    queryFn: async () => {
      const params = new URLSearchParams({ sort_by, scope, page: String(page) });
      const res = await fetch(`/api/achievements/leaderboard?${params}`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
