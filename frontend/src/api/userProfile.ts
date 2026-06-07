import type { FeedResponse, GameSummary, GuideResponse } from "./types";

export type { FeedResponse as UserFeed };
export type UserGuide = GuideResponse;

export async function getUserFeed(userId: number): Promise<FeedResponse> {
  const params = new URLSearchParams({ days: "90" });
  const response = await fetch(
    `/api/achievements/users/${userId}/feed?${params}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to load user feed.");
  return response.json();
}

export async function getUserGuides(userId: number): Promise<GuideResponse[]> {
  const response = await fetch(
    `/api/achievements/users/${userId}/guides`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to load user guides.");
  return response.json();
}

export type UserGame = GameSummary;

export async function getUserGames(userId: number): Promise<GameSummary[]> {
  const response = await fetch(
    `/api/achievements/users/${userId}/games`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to load user games.");
  return response.json();
}

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

export async function getUserProfile(
  userId: string | number
): Promise<UserProfile> {
  const response = await fetch(`/api/user/profile/${userId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load user profile.");
  }

  return response.json();
}

export async function followUser(userId: number): Promise<void> {
  const response = await fetch(`/api/user/social/follow/${userId}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to follow user.");
  }
}

export async function unfollowUser(userId: number): Promise<void> {
  const response = await fetch(`/api/user/social/follow/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow user.");
  }
}