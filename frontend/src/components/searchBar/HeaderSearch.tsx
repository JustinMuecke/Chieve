import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, type GameSearchResult, type UserSearchResult } from '../../api/search';
import style from './HeaderSearch.module.scss';

type SearchResult =
  | ({ type: 'game' } & GameSearchResult)
  | ({ type: 'user' } & UserSearchResult);

function HeaderSearch() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isFetching } = useGlobalSearch(debouncedQuery);

  const games: SearchResult[] = (data?.games ?? []).map((g) => ({ type: 'game', ...g }));
  const users: SearchResult[] = (data?.users ?? []).map((u) => ({ type: 'user', ...u }));
  const hasResults = games.length > 0 || users.length > 0;
  const shouldShowDropdown = isOpen && debouncedQuery.trim().length >= 2;

  function handleSelect(result: SearchResult) {
    setQuery('');
    setIsOpen(false);
    if (result.type === 'game') {
      navigate(`/games/${result.app_id}`);
    } else {
      navigate(`/profile/${result.id}`);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const first = games[0] ?? users[0];
    if (first) handleSelect(first);
  }

  return (
    <div className={style.searchWrap} ref={searchRef}>
      <form className={style.searchForm} onSubmit={handleSubmit}>
        <span className={style.searchIcon}>⌕</span>
        <input
          value={query}
          type="search"
          placeholder="Search games or users..."
          className={style.searchInput}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </form>

      {shouldShowDropdown && (
        <div className={style.dropdown}>
          {isFetching && !hasResults && (
            <div className={style.emptyState}>Searching…</div>
          )}

          {!isFetching && !hasResults && (
            <div className={style.emptyState}>No games or users found.</div>
          )}

          {games.length > 0 && (
            <section className={style.resultSection}>
              <p className={style.sectionTitle}>Games</p>
              {games.map((g) => {
                if (g.type !== 'game') return null;
                return (
                  <button
                    key={g.app_id}
                    type="button"
                    className={style.resultItem}
                    onClick={() => handleSelect(g)}
                  >
                    {g.header_image_url ? (
                      <img src={g.header_image_url} alt="" className={style.gameThumb} />
                    ) : (
                      <div className={style.gameThumbPlaceholder}>🎮</div>
                    )}
                    <div className={style.resultText}>
                      <span>{g.name}</span>
                      <small>Game · App ID {g.app_id}</small>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {users.length > 0 && (
            <section className={style.resultSection}>
              <p className={style.sectionTitle}>Users</p>
              {users.map((u) => {
                if (u.type !== 'user') return null;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={style.resultItem}
                    onClick={() => handleSelect(u)}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className={style.userAvatar} />
                    ) : (
                      <div className={style.userAvatarPlaceholder}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className={style.resultText}>
                      <span>{u.username}</span>
                      <small>User</small>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default HeaderSearch;
