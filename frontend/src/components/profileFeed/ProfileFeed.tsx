import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserFeed, type UserFeed } from "../../api/userProfile";
import type { FeedAchievement, FeedGame, FeedGuide } from "../../api/types";
import style from "./profileFeed.module.scss";

type ProfileFeedProps = {
  userId: number;
};

type GameGroup = {
  game: FeedGame;
  achievements: FeedAchievement[];
  totalPoints: number;
};

type DayGroup = {
  dateKey: string;
  label: string;
  games: GameGroup[];
  guides: FeedGuide[];
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function buildTimeline(feed: UserFeed): DayGroup[] {
  const flatAchievements: { game: FeedGame; achievement: FeedAchievement }[] =
    feed.entries.flatMap((e) =>
      e.games.flatMap((g) => g.achievements.map((a) => ({ game: g, achievement: a })))
    );
  const flatGuides: FeedGuide[] = feed.entries.flatMap((e) => e.guides);

  // Collect all unique day keys from both sources
  const dayKeys = new Set<string>();
  for (const { achievement } of flatAchievements)
    dayKeys.add(new Date(achievement.unlocked_at).toDateString());
  for (const guide of flatGuides)
    dayKeys.add(new Date(guide.published_at).toDateString());

  const sortedKeys = [...dayKeys].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return sortedKeys.map((dateKey) => {
    const dayAchievements = flatAchievements.filter(
      ({ achievement }) => new Date(achievement.unlocked_at).toDateString() === dateKey
    );
    const dayGuides = flatGuides.filter(
      (g) => new Date(g.published_at).toDateString() === dateKey
    );

    const gameMap = new Map<number, GameGroup>();
    for (const { game, achievement } of dayAchievements) {
      if (!gameMap.has(game.app_id))
        gameMap.set(game.app_id, { game, achievements: [], totalPoints: 0 });
      const g = gameMap.get(game.app_id)!;
      g.achievements.push(achievement);
      g.totalPoints += achievement.global_points;
    }

    return {
      dateKey,
      label: formatDateLabel(dateKey),
      games: [...gameMap.values()],
      guides: dayGuides,
    };
  });
}

function ProfileFeed({ userId }: ProfileFeedProps) {
  const [feed, setFeed] = useState<UserFeed | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true);
      setError(null);
      try {
        setFeed(await getUserFeed(userId));
      } catch {
        setError("Could not load feed.");
      } finally {
        setIsLoading(false);
      }
    }
    loadFeed();
  }, [userId]);

  const timeline = feed ? buildTimeline(feed) : [];
  const totalUnlocks = timeline.reduce(
    (s, d) => s + d.games.reduce((gs, g) => gs + g.achievements.length, 0),
    0
  );

  if (isLoading) return <div className={style.emptyState}>Loading feed…</div>;
  if (error) return <div className={style.emptyState}>{error}</div>;

  return (
    <section className={style.profileFeed}>
      {timeline.length === 0 ? (
        <div className={style.emptyState}>
          <h4>No recent activity.</h4>
          <p>Nothing unlocked in the last 90 days.</p>
        </div>
      ) : (
        <div className={style.timeline}>
          {timeline.map((day) => (
            <div key={day.dateKey} className={style.dayGroup}>
              <div className={style.dayLabel}>
                <span>{day.label}</span>
              </div>

              <div className={style.dayItems}>
                {day.games.map(({ game, achievements, totalPoints }) => (
                  <article key={`game-${game.app_id}`} className={style.gameBlock}>
                    <Link to={`/games/${game.app_id}`} className={style.gameHeader}>
                      {game.header_image_url ? (
                        <img src={game.header_image_url} alt="" className={style.gameThumb} />
                      ) : (
                        <div className={style.gameThumbPlaceholder} />
                      )}
                      <span className={style.gameName}>{game.name}</span>
                      <span className={style.totalPts}>+{totalPoints} pts</span>
                    </Link>

                    <div className={style.iconRow}>
                      {achievements.map((a) => (
                        <div
                          key={`${a.api_name}-${a.unlocked_at}`}
                          className={style.iconWrapper}
                          data-tooltip={a.display_name ?? a.api_name}
                        >
                          {a.icon_url ? (
                            <img src={a.icon_url} alt="" className={style.iconImg} />
                          ) : (
                            <div className={style.iconFallback}>🏆</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}

                {day.guides.map((guide) => (
                  <Link
                    key={`guide-${guide.guide_id}`}
                    to={`/games/${guide.app_id}/guides/${guide.guide_id}`}
                    className={style.guideBlock}
                  >
                    <div className={style.guideIcon}>📖</div>
                    <div className={style.guideInfo}>
                      <span className={style.guideLabel}>Published a guide</span>
                      <span className={style.guideTitle}>{guide.title}</span>
                    </div>
                    <div className={style.guideBanner}>
                      <img
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${guide.app_id}/header.jpg`}
                        alt=""
                        className={style.guideBannerImg}
                      />
                      <span className={style.guideBannerName}>{guide.game_name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProfileFeed;
