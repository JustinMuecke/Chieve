import { Link } from 'react-router-dom';
import { useFriendsFeed } from '../../api/feed';
import type { FeedUserEntry, FeedAchievement, FeedGame, FeedGuide } from '../../api/types';
import style from './friendsFeed.module.scss';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayActivity {
  user: Pick<FeedUserEntry, 'user_id' | 'username' | 'avatar_url'>;
  games: FeedGame[];
  guides: FeedGuide[];
}

interface DayGroup {
  dateLabel: string;
  dateKey: string;
  entries: DayActivity[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(entries: FeedUserEntry[]): DayGroup[] {
  // day → user_id → DayActivity
  const dayMap = new Map<string, Map<number, DayActivity>>();

  for (const entry of entries) {
    for (const game of entry.games) {
      // Group achievements within this game by day
      const byDay = new Map<string, FeedAchievement[]>();
      for (const a of game.achievements) {
        const key = localDateStr(a.unlocked_at);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(a);
      }
      for (const [day, achs] of byDay) {
        if (!dayMap.has(day)) dayMap.set(day, new Map());
        const userMap = dayMap.get(day)!;
        if (!userMap.has(entry.user_id)) {
          userMap.set(entry.user_id, { user: entry, games: [], guides: [] });
        }
        userMap.get(entry.user_id)!.games.push({ ...game, achievements: achs });
      }
    }

    for (const guide of entry.guides) {
      const day = localDateStr(guide.published_at);
      if (!dayMap.has(day)) dayMap.set(day, new Map());
      const userMap = dayMap.get(day)!;
      if (!userMap.has(entry.user_id)) {
        userMap.set(entry.user_id, { user: entry, games: [], guides: [] });
      }
      userMap.get(entry.user_id)!.guides.push(guide);
    }
  }

  return [...dayMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, userMap]) => ({
      dateKey,
      dateLabel: formatDayLabel(dateKey),
      entries: [...userMap.values()],
    }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserActivity({ activity }: { activity: DayActivity }) {
  const { user, games, guides } = activity;
  return (
    <div className={style.userActivity}>
      <Link to={`/profile/${user.user_id}`} className={style.userLink}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className={style.avatar} />
          : <div className={style.avatarPlaceholder}>{user.username[0].toUpperCase()}</div>
        }
        <span className={style.username}>{user.username}</span>
      </Link>

      {games.map(game => (
        <Link key={game.app_id} to={`/games/${game.app_id}`} className={style.gameRow}>
          {game.header_image_url && <img src={game.header_image_url} alt="" className={style.gameThumb} />}
          <div className={style.gameInfo}>
            <span className={style.gameName}>{game.name}</span>
            <div className={style.achievementList}>
              {game.achievements.slice(0, 4).map(a => (
                <span key={a.api_name} className={style.achievementChip}>
                  {a.icon_url && <img src={a.icon_url} alt="" />}
                  {a.display_name ?? a.api_name}
                </span>
              ))}
              {game.achievements.length > 4 && (
                <span className={style.more}>+{game.achievements.length - 4} more</span>
              )}
            </div>
          </div>
        </Link>
      ))}

      {guides.map(g => (
        <Link key={g.guide_id} to={`/games/${g.app_id}`} state={{ tab: 'guides', guideId: g.guide_id }} className={style.guideRow}>
          <span className={style.guideIcon}>📖</span>
          <div className={style.guideInfo}>
            <span className={style.guideTitle}>{g.title}</span>
            <span className={style.guideGame}>{g.game_name}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function FriendsFeed() {
  const { data, isLoading, isError } = useFriendsFeed();

  const days = groupByDay(data?.entries ?? []);

  return (
    <div className={style.wrap}>
      <h2 className={style.title}>Friends Feed</h2>

      {isLoading && <p className={style.state}>Loading…</p>}
      {isError && <p className={style.state}>Could not load feed.</p>}
      {data && days.length === 0 && (
        <p className={style.state}>No recent activity from people you follow.</p>
      )}

      {days.map(day => (
        <div key={day.dateKey} className={style.dayGroup}>
          <span className={style.dayLabel}>{day.dateLabel}</span>
          {day.entries.map(activity => (
            <UserActivity key={activity.user.user_id} activity={activity} />
          ))}
        </div>
      ))}
    </div>
  );
}
