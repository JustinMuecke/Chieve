import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameGuidesResponse } from './types';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useGuides(appId: string | undefined) {
  return useQuery<GameGuidesResponse>({
    queryKey: ['guides', appId],
    queryFn: () => fetchJson(`/api/achievements/guides/${appId}`),
    enabled: appId !== undefined,
  });
}

export function useCreateGuide(appId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      content,
      headerImage,
    }: {
      title: string;
      description: string;
      content: string;
      headerImage: File | null;
    }) => {
      const form = new FormData();
      form.append('title', title);
      if (description) form.append('description', description);
      form.append('file', new Blob([content], { type: 'text/markdown' }), 'guide.md');
      if (headerImage) form.append('header_image', headerImage);
      const res = await fetch(`/api/achievements/guides/${appId}`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guides', appId] }),
  });
}

export function useUpdateGuide(appId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      guideId,
      title,
      description,
      content,
      headerImage,
    }: {
      guideId: number;
      title: string;
      description: string;
      content: string;
      headerImage: File | null;
    }) => {
      const form = new FormData();
      form.append('title', title);
      if (description) form.append('description', description);
      form.append('file', new Blob([content], { type: 'text/markdown' }), 'guide.md');
      if (headerImage) form.append('header_image', headerImage);
      const res = await fetch(`/api/achievements/guides/${appId}/${guideId}`, {
        method: 'PUT',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guides', appId] }),
  });
}

export function useToggleFavorite(appId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      guideId,
      isFavorite,
    }: {
      guideId: number;
      isFavorite: boolean;
    }) => {
      const res = await fetch(`/api/achievements/guides/${guideId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guides', appId] }),
  });
}
