import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useSelectAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (source: string) => {
      const res = await fetch('/api/user/me/avatar', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useUnlinkPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch(`/api/user/me/platforms/${platform}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useUploadCustomAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const res = await fetch('/api/user/me/avatar/upload', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const { upload_url } = await res.json();

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      const setRes = await fetch('/api/user/me/avatar', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'custom' }),
      });
      if (!setRes.ok) throw new Error(`${setRes.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}
