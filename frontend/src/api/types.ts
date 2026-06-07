// ── Auth / User ───────────────────────────────────────────────────────────────

export interface AvatarOption {
  source: string;
  url: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  avatar_options: AvatarOption[];
  linked_platforms: string[];
}

// ── Games ─────────────────────────────────────────────────────────────────────

export interface GameCatalogEntry {
  app_id: number;
  name: string;
  header_image_url: string | null;
  total_achievements: number;
  player_count: number;
}

export interface GameCatalogResponse {
  page: number;
  page_size: number;
  total: number;
  games: GameCatalogEntry[];
}

export interface GameSummary {
  app_id: number;
  name: string;
  header_image_url: string | null;
  total_achievements: number;
  unlocked_achievements: number;
  completion_percent: number;
}

export interface AchievementDetail {
  api_name: string;
  display_name: string | null;
  description: string | null;
  icon_url: string | null;
  global_unlock_percent: number | null;
  global_points: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface GameDetail {
  app_id: number;
  name: string;
  header_image_url: string | null;
  achievements: AchievementDetail[];
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export interface FeedAchievement {
  api_name: string;
  display_name: string | null;
  icon_url: string | null;
  global_points: number;
  unlocked_at: string;
}

export interface FeedGame {
  app_id: number;
  name: string;
  header_image_url: string | null;
  achievements: FeedAchievement[];
}

export interface FeedGuide {
  guide_id: number;
  title: string;
  description: string | null;
  game_name: string;
  app_id: number;
  published_at: string;
}

export interface FeedUserEntry {
  user_id: number;
  username: string;
  avatar_url: string | null;
  games: FeedGame[];
  guides: FeedGuide[];
}

export interface FeedResponse {
  generated_at: string;
  days: number;
  entries: FeedUserEntry[];
}

// ── Guides ────────────────────────────────────────────────────────────────────

export interface GuideResponse {
  id: number;
  user_id: number;
  username: string | null;
  app_id: number;
  game_name: string;
  title: string;
  content_url: string;
  description: string | null;
  header_image_url: string | null;
  author_avatar_url: string | null;
  is_favorite: boolean;
  author_achievement_count: number;
  game_total_achievements: number;
  created_at: string;
  updated_at: string;
}

export interface GameGuidesResponse {
  app_id: number;
  game_name: string;
  my_guides: GuideResponse[];
  other_guides: GuideResponse[];
}

export type GuideWithOwner = GuideResponse & { isOwn: boolean };

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  total_achievements: number;
  total_global_points: number;
  total_community_points: number;
}

export interface LeaderboardResponse {
  scope: string;
  sort_by: string;
  page: number;
  page_size: number;
  total: number;
  entries: LeaderboardEntry[];
}
