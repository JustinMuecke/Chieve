import style from "./profile.module.scss";

type Game = {
  id: number;
  title: string;
  platform: string;
  achievementsCompleted: number;
  achievementsTotal: number;
  playtimeHours: number;
};

function Profile() {
  /**
   * TODO später:
   * Diese Daten sollen nicht hardcoded bleiben.
   *
   * Mögliche spätere Datenquellen:
   * - Steam API für Avatar, Anzeigename, Steam-ID
   * - Eigene Datenbank für verknüpfte Plattformen
   * - Eigene Datenbank für Spiele, Achievements, Scores
   * - Backend-Endpoint z. B. GET /api/profile/:userId
   */
  const profileData = {
    displayName: "AchievementHunter42",
    steamName: "SteamUserPlaceholder",
    avatarUrl: "https://placehold.co/160x160/2a0023/c77dff?text=Avatar",
    level: 27,
    metaScore: 8420,
    completedAchievements: 318,
    totalAchievements: 920,
    linkedPlatforms: ["Steam", "Epic Games", "Xbox", "PlayStation"],
  };

  /**
   * TODO später:
   * games aus der Datenbank laden.
   * Beispiel:
   *
   * const games = await fetch("/api/user/games");
   */
  const games: Game[] = [
    {
      id: 1,
      title: "Portal 2",
      platform: "Steam",
      achievementsCompleted: 42,
      achievementsTotal: 51,
      playtimeHours: 28,
    },
    {
      id: 2,
      title: "Hades",
      platform: "Epic Games",
      achievementsCompleted: 31,
      achievementsTotal: 49,
      playtimeHours: 64,
    },
    {
      id: 3,
      title: "Elden Ring",
      platform: "Steam",
      achievementsCompleted: 24,
      achievementsTotal: 42,
      playtimeHours: 112,
    },
  ];

  return (
    <main className={style.profilePage}>
      <section className={style.profileHero}>
        <div className={style.avatarWrapper}>
          {/*
            TODO später:
            avatarUrl durch Steam-Avatar ersetzen.
            Beispiel: profileData.avatarUrl = steamUser.avatarFull
          */}
          <img
            src={profileData.avatarUrl}
            alt={`${profileData.displayName} profile avatar`}
            className={style.avatar}
          />
        </div>

        <div className={style.profileInfo}>
          <p className={style.kicker}>Player Profile</p>

          {/*
            TODO später:
            Anzeigename aus Steam / User-Datenbank setzen.
          */}
          <h1>{profileData.displayName}</h1>

          <p className={style.subtitle}>
            Connected as <strong>{profileData.steamName}</strong>. Track your
            achievements, compare your progress, and hunt down unfinished games.
          </p>

          <div className={style.platformList}>
            {profileData.linkedPlatforms.map((platform) => (
              <span key={platform}>{platform}</span>
            ))}
          </div>
        </div>

        <div className={style.scoreCard}>
          <p>Meta Score</p>
          <strong>{profileData.metaScore}</strong>
          <span>Level {profileData.level}</span>
        </div>
      </section>

      <section className={style.statsGrid}>
        <article>
          <span>Completed</span>
          <strong>{profileData.completedAchievements}</strong>
          <p>Achievements unlocked</p>
        </article>

        <article>
          <span>Total</span>
          <strong>{profileData.totalAchievements}</strong>
          <p>Achievements tracked</p>
        </article>

        <article>
          <span>Completion</span>
          <strong>
            {Math.round(
              (profileData.completedAchievements /
                profileData.totalAchievements) *
                100
            )}
            %
          </strong>
          <p>Across connected platforms</p>
        </article>
      </section>

      <section className={style.librarySection}>
        <div className={style.sectionHeader}>
          <div>
            <p className={style.kicker}>Game Library</p>
            <h2>Your tracked games</h2>
          </div>

          {/*
            TODO später:
            Button kann zu einer vollständigen GamesPage führen.
          */}
          <button>View all games</button>
        </div>

        <div className={style.gameGrid}>
          {games.map((game) => {
            const progress =
              (game.achievementsCompleted / game.achievementsTotal) * 100;

            return (
              <article className={style.gameCard} key={game.id}>
                <div className={style.gameTopRow}>
                  <div>
                    <h3>{game.title}</h3>
                    <p>{game.platform}</p>
                  </div>

                  <span>{Math.round(progress)}%</span>
                </div>

                <div className={style.progressBar}>
                  <div style={{ width: `${progress}%` }} />
                </div>

                <div className={style.gameMeta}>
                  <span>
                    {game.achievementsCompleted}/{game.achievementsTotal} achievements
                  </span>
                  <span>{game.playtimeHours}h played</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Profile;