import { useQuery } from '@tanstack/react-query';

export type GameSearchResult = {
  app_id: number;
  name: string;
  header_image_url: string | null;
};

export type UserSearchResult = {
  id: number;
  username: string;
  avatar_url: string | null;
};

export type GlobalSearchResponse = {
  games: GameSearchResult[];
  users: UserSearchResult[];
};

async function fetchGlobalSearch(q: string): Promise<GlobalSearchResponse> {
  const res = await fetch(
    `/api/achievements/search/global?q=${encodeURIComponent(q)}&limit=5`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useGlobalSearch(q: string) {
  return useQuery<GlobalSearchResponse>({
    queryKey: ['search', 'global', q],
    queryFn: () => fetchGlobalSearch(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });
}
