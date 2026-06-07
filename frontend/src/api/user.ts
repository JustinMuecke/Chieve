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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (description: string | null) => {
      const res = await fetch('/api/user/me/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useUploadBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const res = await fetch('/api/user/me/banner/upload', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const { upload_url } = await res.json();

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        body: await file.arrayBuffer(),
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      const setRes = await fetch('/api/user/me/banner', {
        method: 'PUT',
        credentials: 'include',
      });
      if (!setRes.ok) throw new Error(`${setRes.status}`);
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
        body: await file.arrayBuffer(),
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
