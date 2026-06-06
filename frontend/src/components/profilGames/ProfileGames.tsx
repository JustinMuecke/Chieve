import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGames, type UserGame } from "../../api/userProfile";
import style from "./profileGames.module.scss";

type ProfileGamesProps = {
  userId: number;
};

function ProfileGames({ userId }: ProfileGamesProps) {
  const [games, setGames] = useState<UserGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGames() {
      setIsLoading(true);
      setError(null);

      try {
        /**
         * BACKEND:
         * GET /api/achievements/users/{user_id}/games
         */
        const loadedGames = await getUserGames(userId);
        setGames(loadedGames);
      } catch (error) {
        console.error(error);
        setError("Could not load games.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGames();
  }, [userId]);

  if (isLoading) return <div>Loading games…</div>;
  if (error) return <div>{error}</div>;

  return (
    <section className={style.gamesGrid}>
      {games.map((game) => (
        <Link
          key={game.app_id}
          to={`/games/${game.app_id}`}
          className={style.gameCard}
        >
          {game.header_image_url && (
            <img src={game.header_image_url} alt="" />
          )}

          <div className={style.gameInfo}>
            <h3>{game.name}</h3>

            <p>
              {game.unlocked_achievements}/{game.total_achievements} achievements
            </p>

            <div className={style.progressBar}>
              <div style={{ width: `${game.completion_percent}%` }} />
            </div>

            <span>{Math.round(game.completion_percent)}%</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

export default ProfileGames;