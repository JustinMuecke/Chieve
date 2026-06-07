import { useQuery } from '@tanstack/react-query';
import type { GameCatalogResponse, GameDetail, GameSummary } from './types';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useGameCatalog(params: { q?: string; page?: number; pageSize?: number; sortBy?: string; asc?: boolean } = {}) {
  const { q, page = 1, pageSize = 50, sortBy = 'alphabetical', asc = true } = params;
  const search = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    order: asc ? 'asc' : 'desc',
  });
  if (q) search.set('q', q);
  return useQuery<GameCatalogResponse>({
    queryKey: ['games', 'catalog', q ?? '', page, pageSize, sortBy, asc],
    queryFn: () => fetchJson(`/api/achievements/games?${search}`),
  });
}

export function useMyGames() {
  return useQuery<GameSummary[]>({
    queryKey: ['games', 'mine'],
    queryFn: () => fetchJson('/api/achievements/me/games'),
  });
}

export function useGameDetail(appId: string | undefined) {
  return useQuery<GameDetail>({
    queryKey: ['games', 'detail', appId],
    queryFn: () => fetchJson(`/api/achievements/games/${appId}`),
    enabled: appId !== undefined,
  });
}
