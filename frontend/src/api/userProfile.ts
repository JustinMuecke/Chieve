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
  achievements: {
    perfect: number;
    legendary: number;
    rare: number;
    uncommon: number;
    common: number;
    total: number;
  };
};

export type UserGame = {
  app_id: number;
  name: string;
  header_image_url: string | null;
  total_achievements: number;
  unlocked_achievements: number;
  completion_percent: number;
};

export type UserGuide = {
  id: number;
  user_id: number;
  username: string | null;
  author_avatar_url: string | null;
  app_id: number;
  game_name: string;
  title: string;
  description: string | null;
  content_url: string;
  header_image_url: string | null;
  is_favorite: boolean;
  author_achievement_count: number;
  game_total_achievements: number;
  created_at: string;
  updated_at: string;
};

export type FeedAchievement = {
  api_name: string;
  display_name: string | null;
  icon_url: string | null;
  global_points: number;
  unlocked_at: string;
};

export type FeedGame = {
  app_id: number;
  name: string;
  header_image_url: string | null;
  achievements: FeedAchievement[];
};

export type FeedEntry = {
  user_id: number;
  username: string;
  avatar_url: string | null;
  games: FeedGame[];

  /**
   * BACKEND:
   * Laut Beispiel existiert guides: [] bereits.
   * Sobald klar ist, welche Felder Guide-Feed-Items haben,
   * kann dieser Typ präziser gemacht werden.
   */
  guides: unknown[];
};

export type UserFeed = {
  generated_at: string;
  days: number;
  entries: FeedEntry[];
};

/**
 * TODO CONFIG:
 * In frontend/.env setzen:
 *
 * VITE_USER_API_BASE_URL=http://localhost:8000
 * VITE_ACHIEVEMENTS_API_BASE_URL=http://localhost:8001
 *
 * Danach Vite/Docker neu starten.
 */
const USER_API_BASE =
  import.meta.env.VITE_USER_API_BASE_URL ?? "http://localhost:8000";

const ACHIEVEMENTS_API_BASE =
  import.meta.env.VITE_ACHIEVEMENTS_API_BASE_URL ?? "http://localhost:8001";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",

    /**
     * TODO AUTH:
     * credentials: "include" ist relevant, wenn ihr Cookie-/Session-Auth nutzt.
     * Falls ihr Bearer Token nutzt, muss hier stattdessen ein Authorization Header rein.
     */
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getUserProfile(userId: string | number): Promise<UserProfile> {
  /**
   * BACKEND:
   * GET http://localhost:8000/api/user/profile/{user_id}
   *
   * Liefert:
   * - username
   * - avatar_url
   * - banner_url
   * - description
   * - followers_count
   * - following_count
   * - is_own_profile
   * - is_following
   * - achievements breakdown
   */
  return fetchJson<UserProfile>(
    `${USER_API_BASE}/api/user/profile/${userId}`
  );
}

export async function getUserGames(userId: string | number): Promise<UserGame[]> {
  /**
   * BACKEND:
   * GET http://localhost:8001/api/achievements/users/{user_id}/games
   */
  return fetchJson<UserGame[]>(
    `${ACHIEVEMENTS_API_BASE}/api/achievements/users/${userId}/games`
  );
}

export async function getUserGuides(userId: string | number): Promise<UserGuide[]> {
  /**
   * BACKEND:
   * GET http://localhost:8001/api/achievements/users/{user_id}/guides
   */
  return fetchJson<UserGuide[]>(
    `${ACHIEVEMENTS_API_BASE}/api/achievements/users/${userId}/guides`
  );
}

export async function getUserFeed(userId: string | number): Promise<UserFeed> {
  /**
   * BACKEND:
   * GET http://localhost:8001/api/achievements/users/{user_id}/feed
   */
  return fetchJson<UserFeed>(
    `${ACHIEVEMENTS_API_BASE}/api/achievements/users/${userId}/feed`
  );
}