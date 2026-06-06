export type AchievementStats = {
  perfect: number;
  legendary: number;
  rare: number;
  uncommon: number;
  common: number;
  total: number;
};

export type UserProfile = {
  user_id: number;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  followers_count: number;
  following_count: number;
  is_own_profile: boolean;
  is_following: boolean;
  achievements: AchievementStats;
};

const USER_API_BASE =
  import.meta.env.VITE_USER_API_BASE_URL ?? "http://localhost:8000";

export async function getUserProfile(
  userId: string | number
): Promise<UserProfile> {
  /**
   * BACKEND:
   * GET /api/user/profile/{user_id}
   *
   * Dieser Endpoint liefert:
   * - Userdaten
   * - Avatar/Banner/Description
   * - Follow-Zahlen
   * - is_own_profile
   * - is_following
   * - Achievement-Zählungen
   */
  const response = await fetch(`${USER_API_BASE}/api/user/profile/${userId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load user profile.");
  }

  return response.json();
}

export async function followUser(userId: number): Promise<void> {
  /**
   * BACKEND:
   * Vermutlich:
   * POST /api/social/follow/{target_id}
   *
   * Falls euer Backend ohne /api mounted, dann zu /social/follow ändern.
   */
  const response = await fetch(`${USER_API_BASE}/api/social/follow/${userId}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to follow user.");
  }
}

export async function unfollowUser(userId: number): Promise<void> {
  /**
   * BACKEND:
   * Vermutlich:
   * DELETE /api/social/follow/{target_id}
   *
   * Falls euer Backend ohne /api mounted, dann zu /social/follow ändern.
   */
  const response = await fetch(`${USER_API_BASE}/api/social/follow/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow user.");
  }
}