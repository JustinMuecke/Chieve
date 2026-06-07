import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameCatalog } from '../../api/games';

import style from './games.module.scss';

function Games() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useGameCatalog({ q: debouncedSearch || undefined, page });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;


  return (
    <div className={style.gamesContainer}>
      <div className={style.toolbar}>
        <h2>GAME CATALOG</h2>
        <div className={style.toolbarRight}>
          
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
      {!isLoading && !isError && data?.games.length === 0 && (
        <div className={style.state}>No games found.</div>
      )}

      {data && data.games.length > 0 && (
        <>
          <div className={style.grid}>
            {data.games.map(game => (
              <div
                key={game.app_id}
                className={style.card}
                onClick={() => navigate(`/games/${game.app_id}`)}
              >
                {game.header_image_url ? (
                  <img src={game.header_image_url} alt={game.name} className={style.cardImage} />
                ) : (
                  <div className={style.cardImagePlaceholder} />
                )}
                <div className={style.cardBody}>
                  <p className={style.cardTitle}>{game.name}</p>
                  <span className={style.cardStat}>{game.total_achievements} achievements</span>
                </div>
              </div>
            ))}
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