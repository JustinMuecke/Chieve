import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface RecommendationItem {
  app_id: number;
  name: string;
  header_image_url: string | null;
  description: string | null;
  tags: string[] | null;
  similarity_score: number;
  achievement_count: number;
  steam_url: string;
}

export interface WishlistItem {
  app_id: number;
  name: string;
  header_image_url: string | null;
  description: string | null;
  tags: string[] | null;
  achievement_count: number;
  added_at: string;
  steam_url: string;
}

export interface RecommendationsResponse {
  items: RecommendationItem[];
  anchor_game_name: string | null;
  anchor_app_id: number | null;
}

export async function fetchRecommendations(limit = 10): Promise<RecommendationsResponse> {
  const res = await fetch(`/api/recommendations?limit=${limit}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.json() as RecommendationsResponse;
}


export function useRecommendations(limit = 10) {
  return useQuery<RecommendationsResponse>({
    queryKey: ["recommendations", limit],
    queryFn: () => fetchRecommendations(limit),
  });
}



export function useWishlist() {
  return useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/recommendations/wishlist', { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return data.items as WishlistItem[];
    },
  });
}

export function useDismiss() {
  return useMutation({
    mutationFn: async (appId: number) => {
      const res = await fetch(`/api/recommendations/dismiss/${appId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appId: number) => {
      const res = await fetch(`/api/recommendations/wishlist/${appId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 409) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appId: number) => {
      const res = await fetch(`/api/recommendations/wishlist/${appId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}


