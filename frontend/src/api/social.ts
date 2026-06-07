export type UserSummary = {
  id: number;
  username: string;
  avatar_url: string | null;
};

/**
 * TODO CONFIG:
 * In frontend/.env:
 *
 * VITE_USER_API_BASE_URL=http://localhost:8000
 *
 * Danach Vite/Docker neu starten.
 */
const USER_API_BASE =
  import.meta.env.VITE_USER_API_BASE_URL ?? "http://localhost:8000";


/**
 * BACKEND:
 * Laut Swagger:
 *
 * GET /api/user/social/followers
 * GET /api/user/social/following
 *
 * Falls euer Backend stattdessen direkt /social/... nutzt,
 * ändere diesen Wert zu:
 *
 * const SOCIAL_BASE_PATH = "/social";
 */
const SOCIAL_BASE_PATH = "/api/user/social";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",

    /**
     * TODO AUTH:
     * credentials: "include" ist wichtig, wenn ihr Cookie-/Session-Auth nutzt.
     * Falls ihr Bearer Tokens nutzt, muss hier später ein Authorization Header rein.
     */
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getFollowing(): Promise<UserSummary[]> {
  /**
   * BACKEND:
   * GET /api/user/social/following
   *
   * Response:
   * [
   *   {
   *     id: number,
   *     username: string,
   *     avatar_url: string | null
   *   }
   * ]
   */
  return fetchJson<UserSummary[]>(
    `${USER_API_BASE}${SOCIAL_BASE_PATH}/following`
  );
}

export async function getFollowers(): Promise<UserSummary[]> {
  /**
   * BACKEND:
   * GET /api/user/social/followers
   *
   * Response:
   * [
   *   {
   *     id: number,
   *     username: string,
   *     avatar_url: string | null
   *   }
   * ]
   */
  return fetchJson<UserSummary[]>(
    `${USER_API_BASE}${SOCIAL_BASE_PATH}/followers`
  );
}

export async function followUser(targetId: number): Promise<void> {
  /**
   * BACKEND:
   * POST /api/user/social/follow/{target_id}
   *
   * Wird genutzt für "Follow back".
   */
  const response = await fetch(
    `${USER_API_BASE}${SOCIAL_BASE_PATH}/follow/${targetId}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Follow failed: ${response.status} ${response.statusText}`);
  }
}

export async function unfollowUser(targetId: number): Promise<void> {
  /**
   * BACKEND:
   * DELETE /api/user/social/follow/{target_id}
   *
   * Wird genutzt für "Unfollow".
   */
  const response = await fetch(
    `${USER_API_BASE}${SOCIAL_BASE_PATH}/follow/${targetId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unfollow failed: ${response.status} ${response.statusText}`
    );
  }
}