import { Link } from 'react-router-dom';
import { useFriendsFeed } from '../../api/feed';
import type { FeedUserEntry } from '../../api/types';
import style from './friendsFeed.module.scss';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function UserEntry({ entry }: { entry: FeedUserEntry }) {
  const totalAchievements = entry.games.reduce((s, g) => s + g.achievements.length, 0);

  return (
    <div className={style.userEntry}>
      <div className={style.entryHeader}>
        <Link to={`/profile/${entry.user_id}`} className={style.userLink}>
          {entry.avatar_url
            ? <img src={entry.avatar_url} alt="" className={style.avatar} />
            : <div className={style.avatarPlaceholder}>{entry.username[0].toUpperCase()}</div>
          }
          <span className={style.username}>{entry.username}</span>
        </Link>
        <span className={style.summary}>
          {totalAchievements > 0 && `${totalAchievements} achievement${totalAchievements !== 1 ? 's' : ''}`}
          {totalAchievements > 0 && entry.guides.length > 0 && ' · '}
          {entry.guides.length > 0 && `${entry.guides.length} guide${entry.guides.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {entry.games.slice(0, 2).map(game => (
        <Link key={game.app_id} to={`/games/${game.app_id}`} className={style.gameRow}>
          {game.header_image_url && <img src={game.header_image_url} alt="" className={style.gameThumb} />}
          <div className={style.gameInfo}>
            <span className={style.gameName}>{game.name}</span>
            <div className={style.achievementList}>
              {game.achievements.slice(0, 3).map(a => (
                <span key={a.api_name} className={style.achievementChip}>
                  {a.icon_url && <img src={a.icon_url} alt="" />}
                  {a.display_name ?? a.api_name}
                </span>
              ))}
              {game.achievements.length > 3 && (
                <span className={style.more}>+{game.achievements.length - 3} more</span>
              )}
            </div>
          </div>
          <span className={style.timestamp}>{timeAgo(game.achievements[0].unlocked_at)}</span>
        </Link>
      ))}

      {entry.guides.map(g => (
        <Link key={g.guide_id} to={`/games/${g.app_id}`} state={{ tab: 'guides', guideId: g.guide_id }} className={style.guideRow}>
          <span className={style.guideIcon}>📖</span>
          <div className={style.guideInfo}>
            <span className={style.guideTitle}>{g.title}</span>
            <span className={style.guideGame}>{g.game_name}</span>
          </div>
          <span className={style.timestamp}>{timeAgo(g.published_at)}</span>
        </Link>
      ))}
    </div>
  );
}

export default function FriendsFeed() {
  const { data, isLoading, isError } = useFriendsFeed();

  return (
    <div className={style.wrap}>
      <h2 className={style.title}>Friends Feed</h2>

      {isLoading && <p className={style.state}>Loading…</p>}
      {isError && <p className={style.state}>Could not load feed.</p>}
      {data && data.entries.length === 0 && (
        <p className={style.state}>No recent activity from people you follow.</p>
      )}
      {data && data.entries.map(entry => (
        <UserEntry key={entry.user_id} entry={entry} />
      ))}
    </div>
  );
}
