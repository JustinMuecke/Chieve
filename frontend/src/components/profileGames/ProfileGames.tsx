import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGames, type UserGame } from "../../api/userProfile";
import style from "./profileGames.module.scss";

type SortMode = "achievements" | "alphabetical";

type ProfileGamesProps = {
  userId: number;
};

function ProfileGames({ userId }: ProfileGamesProps) {
  const [games, setGames] = useState<UserGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("achievements");

  useEffect(() => {
    async function loadGames() {
      setIsLoading(true);
      setError(null);
      try {
        setGames(await getUserGames(userId));
      } catch {
        setError("Could not load games.");
      } finally {
        setIsLoading(false);
      }
    }
    loadGames();
  }, [userId]);

  const sortedGames = [...games].sort((a, b) =>
    sort === "alphabetical"
      ? a.name.localeCompare(b.name)
      : b.completion_percent - a.completion_percent
  );

  const totalAchievements = games.reduce((s, g) => s + g.unlocked_achievements, 0);
  const avgCompletion =
    games.length > 0
      ? Math.round(games.reduce((s, g) => s + g.completion_percent, 0) / games.length)
      : 0;

  if (isLoading) return <div className={style.emptyState}>Loading games…</div>;
  if (error) return <div className={style.emptyState}>{error}</div>;

  return (
    <section className={style.profileGames}>
      <div className={style.summaryGrid}>
        <article>
          <span>{games.length}</span>
          <p>Games played</p>
        </article>
        <article>
          <span>{totalAchievements}</span>
          <p>Achievements unlocked</p>
        </article>
        <article>
          <span>{avgCompletion}%</span>
          <p>Avg. completion</p>
        </article>
      </div>

      {games.length === 0 ? (
        <div className={style.emptyState}>
          <h4>No games yet.</h4>
          <p>Sync your Steam account to load your library.</p>
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
            <option value="achievements">Completion %</option>
            <option value="alphabetical">A – Z</option>
          </select>
        </div>
        <div className={style.gamesGrid}>
          {sortedGames.map((game) => (
            <Link key={game.app_id} to={`/games/${game.app_id}`} className={style.gameCard}>
              {game.header_image_url && (
                <img src={game.header_image_url} alt="" />
              )}
              <div className={style.gameInfo}>
                <h3>{game.name}</h3>
                <div className={style.gameStats}>
                  <span>
                    {game.unlocked_achievements}/{game.total_achievements} achievements
                  </span>
                  <span className={style.completionPct}>
                    {Math.round(game.completion_percent)}%
                  </span>
                </div>
                <div className={style.progressBar}>
                  <div style={{ width: `${game.completion_percent}%` }} />
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

export default ProfileGames;
