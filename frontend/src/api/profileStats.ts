import { useQuery } from '@tanstack/react-query';

export interface StatsTimelineEntry {
  date: string;
  daily_achievements: number;
  daily_points: number;
  cumulative_points: number;
}

export interface StatsResponse {
  timeline: StatsTimelineEntry[];
}

async function fetchStats(userId: string): Promise<StatsResponse> {
  const url = userId === 'me'
    ? '/api/achievements/stats'
    : `/api/achievements/stats/${userId}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useProfileStats(userId: string) {
  return useQuery<StatsResponse>({
    queryKey: ['profile-stats', userId],
    queryFn: () => fetchStats(userId),
  });
}
