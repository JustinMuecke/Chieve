import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGuides, type UserGuide } from "../../api/userProfile";
import style from "./profileGuides.module.scss";

type SortMode = "newest" | "alphabetical";

type ProfileGuidesProps = {
  userId: number;
};

function ProfileGuides({ userId }: ProfileGuidesProps) {
  const [guides, setGuides] = useState<UserGuide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");

  useEffect(() => {
    async function loadGuides() {
      setIsLoading(true);
      setError(null);
      try {
        setGuides(await getUserGuides(userId));
      } catch {
        setError("Could not load guides.");
      } finally {
        setIsLoading(false);
      }
    }
    loadGuides();
  }, [userId]);

  const favoriteCount = guides.filter((g) => g.is_favorite).length;

  const sortedGuides = [...guides].sort((a, b) =>
    sort === "alphabetical"
      ? a.title.localeCompare(b.title)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (isLoading) return <div className={style.emptyState}>Loading guides…</div>;
  if (error) return <div className={style.emptyState}>{error}</div>;

  return (
    <section className={style.profileGuides}>
      <div className={style.summaryGrid}>
        <article>
          <span>{guides.length}</span>
          <p>Total guides</p>
        </article>
        <article>
          <span>{favoriteCount}</span>
          <p>Favorites</p>
        </article>
        <article>
          <span>{guides.length > 0 ? guides[0].game_name : "—"}</span>
          <p>Latest game</p>
        </article>
      </div>

      {guides.length === 0 ? (
        <div className={style.emptyState}>
          <h4>No guides yet.</h4>
          <p>This player hasn't written any guides.</p>
        </div>
      ) : (
        <>
        <div className={style.sortControls}>
          <svg className={style.sortIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <select
            className={style.sortSelect}
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
          >
            <option value="newest">Newest</option>
            <option value="alphabetical">A – Z</option>
          </select>
        </div>
        <div className={style.guidesGrid}>
          {sortedGuides.map((guide) => (
            <Link key={guide.id} to={`/games/${guide.app_id}`} className={style.guideCard}>
              {guide.header_image_url && (
                <img src={guide.header_image_url} alt="" />
              )}
              <div className={style.guideInfo}>
                <span className={style.gameBadge}>{guide.game_name}</span>
                <h3>{guide.title}</h3>
                {guide.description && <p>{guide.description}</p>}
                <div className={style.guideMeta}>
                  <span className={style.metaBadge}>
                    {guide.author_achievement_count}/{guide.game_total_achievements} achievements
                  </span>
                  {guide.is_favorite && (
                    <span className={style.favoriteBadge}>★ Favorite</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        </>
      )}
    </section>
  );
}

export default ProfileGuides;
