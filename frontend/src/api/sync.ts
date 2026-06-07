import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface SyncResponse {
  task_id: string;
  status: string;
}

interface TaskStatus {
  task_id: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RATE_LIMITED' | string;
  progress: number | null;
  error: string | null;
}

async function postSync(): Promise<SyncResponse> {
  const res = await fetch('/api/achievements/sync', {
    method: 'POST',
    credentials: 'include',
  });
  if (res.status === 429) throw new Error('rate_limited');
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function fetchTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`/api/achievements/sync/${taskId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useSync() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postSync,
    onSuccess: (data) => setTaskId(data.task_id),
  });

  const taskQuery = useQuery<TaskStatus>({
    queryKey: ['sync', 'task', taskId],
    queryFn: () => fetchTaskStatus(taskId!),
    enabled: taskId !== null,
    refetchInterval: (query) => {
      const status = (query.state.data as TaskStatus | undefined)?.status;
      return status === 'SUCCESS' || status === 'FAILURE' ? false : 2000;
    },
  });

  useEffect(() => {
    if (taskQuery.data?.status === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      setTaskId(null);
    }
    if (taskQuery.data?.status === 'FAILURE') {
      setTaskId(null);
    }
  }, [taskQuery.data?.status, queryClient]);

  const isRunning =
    mutation.isPending ||
    (taskId !== null &&
      taskQuery.data?.status !== 'SUCCESS' &&
      taskQuery.data?.status !== 'FAILURE');

  return {
    trigger: () => mutation.mutate(),
    isRunning,
    progress: taskQuery.data?.progress ?? null,
    isRateLimited: mutation.error?.message === 'rate_limited',
    isFailed: taskQuery.data?.status === 'FAILURE',
  };
}
