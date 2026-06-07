import { useParams } from "react-router-dom";
import { useGameDetail } from "../api/games";
import GameDetails from "../components/gameDetails/GameDetails";

function GameDetailPage() {
  const { app_id } = useParams<{ app_id: string }>();
  const { data: game, isLoading, isError } = useGameDetail(app_id);

  if (isLoading) return <div>Loading game…</div>;
  if (isError || !game) return <div>Failed to load game.</div>;

  return <GameDetails appId={app_id} game={game} />;
}

export default GameDetailPage;