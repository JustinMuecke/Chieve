import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllGuides } from '../api/guides';
import { useGameCatalog } from '../api/games';
import type { GameCatalogEntry } from '../api/types';
import style from './guidesPage.module.scss';

type SortMode = 'favorites' | 'recent';

function GameFilter({
  selectedAppId,
  selectedName,
  onSelect,
  onClear,
}: {
  selectedAppId: number | undefined;
  selectedName: string;
  onSelect: (g: GameCatalogEntry) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(selectedName); }, [selectedName]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (!open) return;
    function onOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [open]);

  const { data } = useGameCatalog({ q: debouncedQ || undefined, pageSize: 8 });

  return (
    <div className={style.gameFilter} ref={wrapRef}>
      <input
        className={style.filterInput}
        value={query}
        placeholder="Filter by game…"
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {selectedAppId !== undefined && (
        <button className={style.clearBtn} onClick={() => { onClear(); setQuery(''); }} title="Clear filter">×</button>
      )}
      {open && data && data.games.length > 0 && (
        <div className={style.gameDropdown}>
          {data.games.map(g => (
            <button
              key={g.app_id}
              type="button"
              className={`${style.gameDropdownItem} ${g.app_id === selectedAppId ? style.gameDropdownItemActive : ''}`}
              onClick={() => { onSelect(g); setQuery(g.name); setOpen(false); }}
            >
              {g.header_image_url && <img src={g.header_image_url} alt="" className={style.gameThumb} />}
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuidesPage() {
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortMode>('favorites');
  const [asc, setAsc] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filterAppId, setFilterAppId] = useState<number | undefined>();
  const [filterGameName, setFilterGameName] = useState('');
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    function onOut(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [sortOpen]);

  const { data, isLoading, isError } = useAllGuides({
    appId: filterAppId,
    sortBy: sort,
    order: asc ? 'asc' : 'desc',
    page,
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className={style.container}>
      <div className={style.toolbar}>
        <h2>GUIDES</h2>
        <div className={style.toolbarRight}>
          <GameFilter
            selectedAppId={filterAppId}
            selectedName={filterGameName}
            onSelect={g => { setFilterAppId(g.app_id); setFilterGameName(g.name); setPage(1); }}
            onClear={() => { setFilterAppId(undefined); setFilterGameName(''); setPage(1); }}
          />

          <div className={style.sortControls} ref={sortRef}>
            <button className={style.sortTrigger} onClick={() => setSortOpen(o => !o)}>
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>{sort === 'favorites' ? 'Stars' : 'Recent'} {asc ? '↑' : '↓'}</span>
            </button>
            {sortOpen && (
              <div className={style.sortDropdown}>
                {(['favorites', 'recent'] as SortMode[]).map(m => (
                  <button
                    key={m}
                    className={`${style.sortOption} ${sort === m ? style.sortOptionActive : ''}`}
                    onClick={() => { setSort(m); setPage(1); setSortOpen(false); }}
                  >
                    {m === 'favorites' ? 'Stars' : 'Most recent'}
                  </button>
                ))}
                <hr className={style.sortDivider} />
                <button className={style.sortOption} onClick={() => { setAsc(a => !a); setSortOpen(false); }}>
                  {asc ? '↑ Ascending' : '↓ Descending'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className={style.state}>Loading guides…</div>}
      {isError && <div className={style.state}>Failed to load guides.</div>}
      {!isLoading && !isError && data?.guides.length === 0 && (
        <div className={style.state}>No guides found.</div>
      )}

      {data && data.guides.length > 0 && (
        <>
          <div className={style.grid}>
            {data.guides.map(guide => (
              <article
                key={guide.id}
                className={style.card}
                onClick={() => navigate(`/games/${guide.app_id}/guides/${guide.id}`)}
              >
                {guide.header_image_url ? (
                  <img src={guide.header_image_url} alt="" className={style.cardImage} />
                ) : (
                  <div className={style.cardImagePlaceholder} />
                )}
                <div className={style.cardBody}>
                  <p className={style.cardGame}>{guide.game_name}</p>
                  <p className={style.cardTitle}>{guide.title}</p>
                  {guide.description && (
                    <p className={style.cardDesc}>{guide.description}</p>
                  )}
                  <div className={style.cardFooter}>
                    <span className={style.cardAuthor}>
                      {guide.author_avatar_url
                        ? <img src={guide.author_avatar_url} alt="" className={style.cardAvatar} />
                        : <span className={style.cardAvatarFallback}>{(guide.username ?? '?')[0].toUpperCase()}</span>
                      }
                      {guide.username ?? 'Unknown'}
                    </span>
                    <span className={style.cardStars}>★ {guide.favorite_count}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={style.pagination}>
              <button className={style.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
              <span className={style.pageInfo}>{page} / {totalPages}</span>
              <button className={style.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GuidesPage;
