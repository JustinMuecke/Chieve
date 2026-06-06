import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserFeed, type UserFeed } from "../../api/userProfile";
import style from "./profileFeed.module.scss";

type ProfileFeedProps = {
  userId: number;
};

function ProfileFeed({ userId }: ProfileFeedProps) {
  const [feed, setFeed] = useState<UserFeed | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true);
      setError(null);

      try {
        /**
         * BACKEND:
         * GET /api/achievements/users/{user_id}/feed
         */
        const loadedFeed = await getUserFeed(userId);
        setFeed(loadedFeed);
      } catch (error) {
        console.error(error);
        setError("Could not load feed.");
      } finally {
        setIsLoading(false);
      }
    }

    loadFeed();
  }, [userId]);

  if (isLoading) return <div>Loading feed…</div>;
  if (error) return <div>{error}</div>;
  if (!feed || feed.entries.length === 0) {
    return <div>No recent activity yet.</div>;
  }

  return (
    <section className={style.feedList}>
      {feed.entries.map((entry) =>
        entry.games.map((game) =>
          game.achievements.map((achievement) => (
            <article
              key={`${game.app_id}-${achievement.api_name}-${achievement.unlocked_at}`}
              className={style.feedItem}
            >
              <div className={style.activityIcon}>
                {achievement.icon_url ? (
                  <img src={achievement.icon_url} alt="" />
                ) : (
                  <span>🏆</span>
                )}
              </div>

              <div className={style.activityContent}>
                <div>
                  <p className={style.activityLabel}>
                    Unlocked achievement
                  </p>

                  <h3>
                    {achievement.display_name ?? achievement.api_name}
                  </h3>

                  <p>
                    in{" "}
                    <Link to={`/games/${game.app_id}`}>
                      {game.name}
                    </Link>
                  </p>
                </div>

                <div className={style.activityMeta}>
                  <span>{achievement.global_points} pts</span>
                  <time>
                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </time>
                </div>
              </div>
            </article>
          ))
        )
      )}
    </section>
  );
}

export default ProfileFeed;