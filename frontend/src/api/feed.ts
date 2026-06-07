import { useQuery } from '@tanstack/react-query';
import type { FeedResponse } from './types';

export function useGameFeed(appId: string | undefined) {
  return useQuery<FeedResponse>({
    queryKey: ['feed', 'game', appId],
    queryFn: async () => {
      const params = new URLSearchParams({ days: '90', app_id: appId! });
      const res = await fetch(`/api/achievements/feed?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load feed');
      return res.json();
    },
    enabled: !!appId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFriendsFeed(days = 90) {
  return useQuery<FeedResponse>({
    queryKey: ['feed', 'friends', days],
    queryFn: async () => {
      const res = await fetch(`/api/achievements/feed?days=${days}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load feed');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}
