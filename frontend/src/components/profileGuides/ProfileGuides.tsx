import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGuides, type UserGuide } from "../../api/userProfile";
import style from "./profileGuides.module.scss";

type ProfileGuidesProps = {
  userId: number;
};

function ProfileGuides({ userId }: ProfileGuidesProps) {
  const [guides, setGuides] = useState<UserGuide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGuides() {
      setIsLoading(true);
      setError(null);

      try {
        /**
         * BACKEND:
         * GET /api/achievements/users/{user_id}/guides
         */
        const loadedGuides = await getUserGuides(userId);
        setGuides(loadedGuides);
      } catch (error) {
        console.error(error);
        setError("Could not load guides.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGuides();
  }, [userId]);

  if (isLoading) return <div>Loading guides…</div>;
  if (error) return <div>{error}</div>;

  return (
    <section className={style.guidesGrid}>
      {guides.map((guide) => (
        <article key={guide.id} className={style.guideCard}>
          {guide.header_image_url && (
            <img src={guide.header_image_url} alt="" />
          )}

          <div className={style.guideInfo}>
            <h3>{guide.title}</h3>

            <p>{guide.description || "No description provided."}</p>

            <span>{guide.game_name}</span>

            <div className={style.guideMeta}>
              <span>
                {guide.author_achievement_count}/{guide.game_total_achievements} achievements
              </span>

              {guide.is_favorite && <span>★ Favorite</span>}
            </div>

            <Link to={`/games/${guide.app_id}`}>
              Open game
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

export default ProfileGuides;