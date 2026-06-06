import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import style from "./HeaderSearch.module.scss";

type GameSearchResult = {
  type: "game";
  app_id: string;
  name: string;
  image_url?: string;
};

type UserSearchResult = {
  type: "user";
  id: number;
  username: string;
  avatar_url?: string;
};

type SearchResult = GameSearchResult | UserSearchResult;

/**
 * MOCK DATA
 *
 * TODO BACKEND:
 * Diese Mock-Daten später entfernen.
 *
 * Später mögliche Endpunkte:
 *
 * Variante A: Ein gemeinsamer Search-Endpoint:
 * GET /api/search?q=portal
 *
 * Response:
 * {
 *   games: GameSearchResult[],
 *   users: UserSearchResult[]
 * }
 *
 * Variante B: Zwei getrennte Endpunkte:
 * GET /api/games/search?q=portal
 * GET /api/users/search?q=portal
 *
 * Für User/Friends sollte das Backend laut eurem Backend-Code
 * mindestens diese Felder liefern:
 * - id
 * - username
 * - avatar_url
 *
 * Achtung:
 * Im Backend heißt die ID bei UserSummary "id".
 * Im Frontend können wir sie als user.id verwenden.
 */
const mockGames: GameSearchResult[] = [
  {
    type: "game",
    app_id: "620",
    name: "Portal 2",
    image_url: "https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg",
  },
  {
    type: "game",
    app_id: "1174180",
    name: "Red Dead Redemption 2",
    image_url: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
  },
  {
    type: "game",
    app_id: "1245620",
    name: "Elden Ring",
    image_url: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
  },
  {
    type: "game",
    app_id: "367520",
    name: "Hollow Knight",
    image_url: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg",
  },
];

const mockUsers: UserSearchResult[] = [
  {
    type: "user",
    id: 1,
    username: "AchievementHunter42",
  },
  {
    type: "user",
    id: 2,
    username: "GuideWizard",
  },
  {
    type: "user",
    id: 3,
    username: "BacklogDestroyer",
  },
];

function HeaderSearch() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const trimmedQuery = query.trim().toLowerCase();

  /**
   * MOCK SEARCH
   *
   * TODO BACKEND:
   * Diese useMemo-Filterung später durch einen API-Aufruf ersetzen.
   *
   * Beispiel mit gemeinsamem Endpoint:
   *
   * useEffect(() => {
   *   if (query.trim().length < 2) return;
   *
   *   const timeout = setTimeout(async () => {
   *     const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
   *     const data = await response.json();
   *     setResults([...data.games, ...data.users]);
   *   }, 250);
   *
   *   return () => clearTimeout(timeout);
   * }, [query]);
   *
   * Wichtig:
   * Debounce verwenden, damit nicht bei jedem Tastendruck
   * sofort ein Backend-Request passiert.
   */
  const filteredGames = useMemo(() => {
    if (trimmedQuery.length < 2) return [];

    return mockGames.filter((game) =>
      game.name.toLowerCase().includes(trimmedQuery)
    );
  }, [trimmedQuery]);

  const filteredUsers = useMemo(() => {
    if (trimmedQuery.length < 2) return [];

    return mockUsers.filter((user) =>
      user.username.toLowerCase().includes(trimmedQuery)
    );
  }, [trimmedQuery]);

  const hasResults = filteredGames.length > 0 || filteredUsers.length > 0;
  const shouldShowDropdown = isOpen && trimmedQuery.length >= 2;

  function handleSelectResult(result: SearchResult) {
    setQuery("");
    setIsOpen(false);

    if (result.type === "game") {
      /**
       * TODO ROUTING:
       * Falls eure GameDetail-Route anders heißt, hier anpassen.
       *
       * Aktuell angenommen:
       * /games/:app_id
       */
      navigate(`/games/${result.app_id}`);
      return;
    }

    /**
     * TODO ROUTING:
     * Für Friend/Profile-Search braucht ihr eine Route mit user_id.
     *
     * Vorschlag:
     * /profile/:user_id
     *
     * Falls ihr aktuell nur /profile habt, zeigt das vermutlich nur
     * das eigene Profil. Für Freunde braucht ihr langfristig eine
     * öffentliche Profilseite, z. B.:
     *
     * <Route path="/profile/:user_id" element={<ProfilePage />} />
     */
    navigate(`/profile/${result.id}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstResult = filteredGames[0] ?? filteredUsers[0];

    if (firstResult) {
      handleSelectResult(firstResult);
    }
  }

  return (
    <div className={style.searchWrap} ref={searchRef}>
      <form className={style.searchForm} onSubmit={handleSubmit}>
        <span className={style.searchIcon}>⌕</span>

        <input
          value={query}
          type="search"
          placeholder="Search games or friends..."
          className={style.searchInput}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </form>

      {shouldShowDropdown && (
        <div className={style.dropdown}>
          {!hasResults && (
            <div className={style.emptyState}>
              No games or friends found.
            </div>
          )}

          {filteredGames.length > 0 && (
            <section className={style.resultSection}>
              <p className={style.sectionTitle}>Games</p>

              {filteredGames.map((game) => (
                <button
                  key={game.app_id}
                  type="button"
                  className={style.resultItem}
                  onClick={() => handleSelectResult(game)}
                >
                  {game.image_url ? (
                    <img
                      src={game.image_url}
                      alt=""
                      className={style.gameThumb}
                    />
                  ) : (
                    <div className={style.gameThumbPlaceholder}>🎮</div>
                  )}

                  <div className={style.resultText}>
                    <span>{game.name}</span>
                    <small>Game · App ID {game.app_id}</small>
                  </div>
                </button>
              ))}
            </section>
          )}

          {filteredUsers.length > 0 && (
            <section className={style.resultSection}>
              <p className={style.sectionTitle}>Friends</p>

              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={style.resultItem}
                  onClick={() => handleSelectResult(user)}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className={style.userAvatar}
                    />
                  ) : (
                    <div className={style.userAvatarPlaceholder}>
                      {user.username[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className={style.resultText}>
                    <span>{user.username}</span>
                    <small>Friend · User ID {user.id}</small>
                  </div>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default HeaderSearch;