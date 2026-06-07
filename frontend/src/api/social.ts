export type UserSummary = {
  id: number;
  username: string;
  avatar_url: string | null;
};

const BASE = "/api/user/social";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getFollowing(): Promise<UserSummary[]> {
  return fetchJson<UserSummary[]>(`${BASE}/following`);
}

export async function getFollowers(): Promise<UserSummary[]> {
  return fetchJson<UserSummary[]>(`${BASE}/followers`);
}

export async function followUser(targetId: number): Promise<void> {
  const response = await fetch(`${BASE}/follow/${targetId}`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Follow failed: ${response.status} ${response.statusText}`);
  }
}

export async function unfollowUser(targetId: number): Promise<void> {
  const response = await fetch(`${BASE}/follow/${targetId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Unfollow failed: ${response.status} ${response.statusText}`);
  }
}
