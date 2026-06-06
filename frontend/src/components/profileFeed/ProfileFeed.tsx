import { Link } from "react-router-dom";
import style from "./profileFeed.module.scss";

type FeedActivityType =
  | "achievement_unlocked"
  | "game_completed"
  | "guide_created"
  | "guide_favorited"
  | "followed_user";

type ProfileFeedItem = {
  id: string;
  type: FeedActivityType;
  created_at: string;

  game?: {
    app_id: number;
    name: string;
    header_image_url?: string | null;
  };

  achievement?: {
    api_name: string;
    display_name: string;
    icon_url?: string | null;
    rarity_label?: string;
    global_points?: number;
  };

  guide?: {
    id: number;
    title: string;
  };

  target_user?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  };
};

type ProfileFeedProps = {
  userId?: number;
};

function getActivityLabel(item: ProfileFeedItem): string {
  switch (item.type) {
    case "achievement_unlocked":
      return "Unlocked achievement";
    case "game_completed":
      return "Completed game";
    case "guide_created":
      return "Created guide";
    case "guide_favorited":
      return "Favorited guide";
    case "followed_user":
      return "Started following";
    default:
      return "Activity";
  }
}

function getActivityIcon(item: ProfileFeedItem): string {
  switch (item.type) {
    case "achievement_unlocked":
      return "🏆";
    case "game_completed":
      return "💯";
    case "guide_created":
      return "📝";
    case "guide_favorited":
      return "★";
    case "followed_user":
      return "👥";
    default:
      return "•";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProfileFeed({ userId }: ProfileFeedProps) {
  /**
   * TODO BACKEND:
   * Diese Mock-Daten später durch echten Feed-Endpoint ersetzen.
   *
   * Endpoint-Vorschlag:
   * GET /profiles/{user_id}/feed
   *
   * Oder für eigenes Profil:
   * GET /me/feed
   *
   * Response sollte eine Liste von Aktivitäten liefern:
   * {
   *   id,
   *   type,
   *   created_at,
   *   game?,
   *   achievement?,
   *   guide?,
   *   target_user?
   * }
   *
   * userId kommt später aus:
   * - /profile/:user_id
   * - oder aus dem geladenen ProfileData-Objekt
   */
  const activities: ProfileFeedItem[] = [
    {
      id: "activity-1",
      type: "achievement_unlocked",
      created_at: "2026-06-06T12:30:00Z",
      game: {
        app_id: 620,
        name: "Portal 2",
        header_image_url:
          "https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg",
      },
      achievement: {
        api_name: "ACH.SHOOT_THE_MOON",
        display_name: "Shoot the Moon",
        icon_url: null,
        rarity_label: "Rare",
        global_points: 50,
      },
    },
    {
      id: "activity-2",
      type: "game_completed",
      created_at: "2026-06-05T19:15:00Z",
      game: {
        app_id: 367520,
        name: "Hollow Knight",
        header_image_url:
          "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg",
      },
    },
    {
      id: "activity-3",
      type: "guide_created",
      created_at: "2026-06-04T16:10:00Z",
      game: {
        app_id: 1245620,
        name: "Elden Ring",
        header_image_url:
          "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
      },
      guide: {
        id: 12,
        title: "Clean route for late-game achievements",
      },
    },
    {
      id: "activity-4",
      type: "followed_user",
      created_at: "2026-06-03T09:45:00Z",
      target_user: {
        id: 7,
        username: "GuideWizard",
        avatar_url: null,
      },
    },
  ];

  return (
    <section className={style.feedSection}>
      <div className={style.header}>
        <div>
          <p className={style.kicker}>Recent Activity</p>
          <h2>Player feed</h2>
        </div>

        <span className={style.userHint}>
          {userId ? `User ID ${userId}` : "Mock profile"}
        </span>
      </div>

      <div className={style.feedList}>
        {activities.length === 0 && (
          <div className={style.emptyState}>
            No recent activity yet.
          </div>
        )}

        {activities.map((item) => (
          <article key={item.id} className={style.feedItem}>
            <div className={style.activityIcon}>
              {getActivityIcon(item)}
            </div>

            <div className={style.activityMain}>
              <div className={style.activityTopRow}>
                <span className={style.activityLabel}>
                  {getActivityLabel(item)}
                </span>

                <time className={style.activityDate}>
                  {formatDate(item.created_at)}
                </time>
              </div>

              {item.type === "achievement_unlocked" && item.achievement && (
                <div className={style.activityContent}>
                  <div>
                    <h3>{item.achievement.display_name}</h3>
                    <p>
                      in{" "}
                      {item.game ? (
                        <Link to={`/games/${item.game.app_id}`}>
                          {item.game.name}
                        </Link>
                      ) : (
                        "Unknown game"
                      )}
                    </p>
                  </div>

                  <div className={style.badgeGroup}>
                    {item.achievement.rarity_label && (
                      <span>{item.achievement.rarity_label}</span>
                    )}
                    {item.achievement.global_points && (
                      <span>{item.achievement.global_points} pts</span>
                    )}
                  </div>
                </div>
              )}

              {item.type === "game_completed" && item.game && (
                <div className={style.activityContent}>
                  <div>
                    <h3>100% completed</h3>
                    <p>
                      <Link to={`/games/${item.game.app_id}`}>
                        {item.game.name}
                      </Link>
                    </p>
                  </div>

                  <span className={style.perfectBadge}>100%</span>
                </div>
              )}

              {item.type === "guide_created" && item.guide && (
                <div className={style.activityContent}>
                  <div>
                    <h3>{item.guide.title}</h3>
                    <p>
                      Guide for{" "}
                      {item.game ? (
                        <Link to={`/games/${item.game.app_id}`}>
                          {item.game.name}
                        </Link>
                      ) : (
                        "Unknown game"
                      )}
                    </p>
                  </div>

                  <span className={style.guideBadge}>Guide</span>
                </div>
              )}

              {item.type === "guide_favorited" && item.guide && (
                <div className={style.activityContent}>
                  <div>
                    <h3>{item.guide.title}</h3>
                    <p>Added to favorites</p>
                  </div>

                  <span className={style.favoriteBadge}>★</span>
                </div>
              )}

              {item.type === "followed_user" && item.target_user && (
                <div className={style.activityContent}>
                  <div className={style.userMini}>
                    {item.target_user.avatar_url ? (
                      <img src={item.target_user.avatar_url} alt="" />
                    ) : (
                      <div>
                        {item.target_user.username[0]?.toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h3>{item.target_user.username}</h3>
                      <p>
                        <Link to={`/profile/${item.target_user.id}`}>
                          View profile
                        </Link>
                      </p>
                    </div>
                  </div>

                  <span className={style.followBadge}>Follow</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProfileFeed;