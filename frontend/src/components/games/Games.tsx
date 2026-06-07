import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { useGameCatalog, useMyGames } from '../../api/games';

import style from './games.module.scss';

type SortMode = 'alphabetical' | 'achievements' | 'popular';

function Games() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortMode>('alphabetical');
  const [asc, setAsc] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sortOpen) return;
    function onOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [sortOpen]);


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useGameCatalog({
    q: debouncedSearch || undefined,
    page,
    sortBy: sort,
    asc,
  });
  const { data: myGames } = useMyGames();
  const ownedAppIds = useMemo(
    () => new Set((myGames ?? []).map(g => g.app_id)),
    [myGames],
  );

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;
  const sortedGames = data?.games ?? [];

  return (
    <div className={style.gamesContainer}>
      <div className={style.toolbar}>
        <h2>GAME CATALOG</h2>
        <div className={style.toolbarRight}>
          <div className={style.sortControls} ref={sortRef}>
            <button
              className={style.sortTrigger}
              onClick={() => setSortOpen(o => !o)}
              title="Sort options"
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>
                {sort === 'alphabetical' ? 'Alphabetical' : sort === 'achievements' ? 'Achievements' : 'Popular'}
                {' '}{asc ? '↑' : '↓'}
              </span>
            </button>
            {sortOpen && (
              <div className={style.sortDropdown}>
                {(['alphabetical', 'achievements', 'popular'] as SortMode[]).map(mode => (
                  <button
                    key={mode}
                    className={`${style.sortOption} ${sort === mode ? style.sortOptionActive : ''}`}
                    onClick={() => { setSort(mode); setPage(1); setSortOpen(false); }}
                  >
                    {mode === 'alphabetical' ? 'Alphabetical' : mode === 'achievements' ? 'Achievements' : 'Popular'}
                  </button>
                ))}
                <hr className={style.sortDivider} />
                <button
                  className={style.sortOption}
                  onClick={() => { setAsc(a => !a); setSortOpen(false); }}
                >
                  {asc ? '↑ Ascending' : '↓ Descending'}
                </button>
              </div>
            )}
          </div>
          <input
            className={style.searchInput}
            type="search"
            placeholder="Search games…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <div className={style.state}>Loading games…</div>}
      {isError && <div className={style.state}>Failed to load games.</div>}
      {!isLoading && !isError && sortedGames.length === 0 && (
        <div className={style.state}>No games found.</div>
      )}

      {sortedGames.length > 0 && (
        <>
          <div className={style.grid}>
            {sortedGames.map(game => {
              const owned = ownedAppIds.has(game.app_id);
              return (
                <div
                  key={game.app_id}
                  className={`${style.card} ${owned ? style.cardOwned : ''}`}
                  onClick={() => navigate(`/games/${game.app_id}`)}
                >
                  <div className={style.cardImageWrap}>
                    {game.header_image_url ? (
                      <img src={game.header_image_url} alt={game.name} className={style.cardImage} />
                    ) : (
                      <div className={style.cardImagePlaceholder} />
                    )}
                    {owned && <IoCheckmarkCircle className={style.ownedTick} />}
                  </div>
                  <div className={style.cardBody}>
                    <p className={style.cardTitle}>{game.name}</p>
                    <div className={style.cardMeta}>
                      <span className={style.cardStat}>{game.total_achievements} achievements</span>
                      <span className={style.cardStat}>{game.player_count} players</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={style.pagination}>
              <button
                className={style.pageBtn}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              <span className={style.pageInfo}>{page} / {totalPages}</span>
              <button
                className={style.pageBtn}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Games;