import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLeaderboard } from '../../api/leaderboard';
import type { LeaderboardEntry } from '../../api/types';
import style from './ranglist.module.scss';

type SortBy = 'global_points' | 'community_points';
type Scope = 'global' | 'friends';

const PAGE_SIZE = 25;

function rankMedal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function EntryRow({
  entry,
  sortBy,
  isSelf,
}: {
  entry: LeaderboardEntry;
  sortBy: SortBy;
  isSelf: boolean;
}) {
  const medal = rankMedal(entry.rank);
  const score =
    sortBy === 'global_points'
      ? entry.total_global_points
      : entry.total_community_points;

  const rowClass = [
    style.row,
    isSelf ? style.selfRow : '',
    entry.rank === 1 ? style.top1 : entry.rank === 2 ? style.top2 : entry.rank === 3 ? style.top3 : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClass}>
      <span className={style.rank}>
        {medal ?? <span className={style.rankNum}>#{entry.rank}</span>}
      </span>

      <div className={style.userInfo}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className={style.avatar} />
        ) : (
          <div className={style.avatarPlaceholder}>
            {entry.username[0]?.toUpperCase()}
          </div>
        )}
        <span className={style.username}>
          {entry.username}
          {isSelf && <span className={style.youBadge}>you</span>}
        </span>
      </div>

      <div className={style.stats}>
        <span className={style.score}>{score.toLocaleString()}</span>
        <span className={style.achievementCount}>{entry.total_achievements} achievements</span>
      </div>
    </div>
  );
}

function Ranglist() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortBy>('global_points');
  const [scope, setScope] = useState<Scope>('global');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useLeaderboard({ sort_by: sortBy, scope, page });

  function handleTabChange(newSort: SortBy) {
    setSortBy(newSort);
    setPage(1);
  }

  function handleScopeChange(newScope: Scope) {
    setScope(newScope);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className={style.container}>
      <div className={style.controls}>
        <div className={style.tabs}>
          <button
            className={`${style.tab} ${sortBy === 'global_points' ? style.tabActive : ''}`}
            onClick={() => handleTabChange('global_points')}
          >
            Steam
          </button>
          <button
            className={`${style.tab} ${sortBy === 'community_points' ? style.tabActive : ''}`}
            onClick={() => handleTabChange('community_points')}
          >
            Community
          </button>
        </div>

        <div className={style.scopeToggle}>
          <button
            className={`${style.scopeBtn} ${scope === 'global' ? style.scopeActive : ''}`}
            onClick={() => handleScopeChange('global')}
          >
            Global
          </button>
          <button
            className={`${style.scopeBtn} ${scope === 'friends' ? style.scopeActive : ''}`}
            onClick={() => handleScopeChange('friends')}
          >
            Friends
          </button>
        </div>
      </div>

      <p className={style.scoreLabel}>
        {sortBy === 'global_points'
          ? 'Score based on Steam global rarity — rarer achievements earn more points'
          : 'Score based on Chieve community rarity — fewer users having it means more points'}
      </p>

      {isLoading && <div className={style.state}>Loading…</div>}
      {isError && <div className={style.state}>Failed to load leaderboard.</div>}

      {data && data.entries.length === 0 && (
        <div className={style.state}>
          {scope === 'friends'
            ? 'Follow some users to see a friends leaderboard.'
            : 'No data yet — sync your games to appear here.'}
        </div>
      )}

      {data && data.entries.length > 0 && (
        <>
          <div className={style.list}>
            {data.entries.map(entry => (
              <EntryRow
                key={entry.user_id}
                entry={entry}
                sortBy={sortBy}
                isSelf={entry.user_id === user.id}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={style.pagination}>
              <button
                className={style.pageBtn}
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className={style.pageInfo}>Page {page} / {totalPages}</span>
              <button
                className={style.pageBtn}
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Ranglist;
