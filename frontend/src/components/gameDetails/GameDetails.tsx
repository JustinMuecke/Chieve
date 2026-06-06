import { useState } from "react";
import { useGameFeed } from "../../api/feed";
import type { AchievementDetail, FeedUserEntry } from "../../api/types";
import style from "./gameDetails.module.scss";

import GuidesTab from "../guides/GuidesTab";

type Tab = "feed" | "achievements" | "guides";

type GameDetailsGame = {
  name: string;
  header_image_url?: string | null;
  achievements: AchievementDetail[];
};

type GameDetailsProps = {
  appId: string | undefined;
  game: GameDetailsGame;
};

// ── Rarity helpers ────────────────────────────────────────────────────────────

function rarityLabel(percent: number | null): string {
  if (percent === null) return "";
  if (percent < 1) return "Legendary";
  if (percent < 5) return "Epic";
  if (percent < 15) return "Rare";
  if (percent < 30) return "Uncommon";
  return "Common";
}

function rarityClass(percent: number | null): string {
  if (percent === null) return "";
  if (percent < 1) return style.legendary;
  if (percent < 5) return style.epic;
  if (percent < 15) return style.rare;
  if (percent < 30) return style.uncommon;
  return style.common;
}

// ── Achievement row ───────────────────────────────────────────────────────────

function AchievementRow({ a }: { a: AchievementDetail }) {
  return (
    <li
      className={`${style.achievementRow} ${
        a.unlocked ? style.unlockedRow : style.lockedRow
      }`}
    >
      <div className={style.iconWrap}>
        {a.icon_url ? (
          <img src={a.icon_url} alt="" className={style.icon} />
        ) : (
          <div className={style.iconPlaceholder} />
        )}
      </div>

      <div className={style.achievementInfo}>
        <span className={style.achievementName}>
          {a.display_name ?? a.api_name}
        </span>

        {a.description && (
          <span className={style.achievementDesc}>{a.description}</span>
        )}
      </div>

      <div className={style.achievementMeta}>
        <span className={style.rarityLine}>
          {a.global_unlock_percent !== null && (
            <span
              className={`${style.rarityBadge} ${rarityClass(
                a.global_unlock_percent
              )}`}
            >
              {rarityLabel(a.global_unlock_percent)}
            </span>
          )}

          <span className={style.pointsBadge}>{a.global_points} pts</span>
        </span>

        {a.unlocked_at && (
          <span className={style.unlockedDate}>
            {new Date(a.unlocked_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </li>
  );
}

// ── Friends feed tab ──────────────────────────────────────────────────────────

function FeedTab({ appId }: { appId: string | undefined }) {
  const { data, isLoading, isError } = useGameFeed(appId);

  if (isLoading) return <div className={style.tabState}>Loading…</div>;
  if (isError) return <div className={style.tabState}>Failed to load feed.</div>;

  if (!data || data.entries.length === 0) {
    return (
      <div className={style.tabState}>
        No friends have unlocked achievements in this game recently.
      </div>
    );
  }

  return (
    <div className={style.feedList}>
      {data.entries.map((entry: FeedUserEntry) => {
        const gameEntry = entry.games[0];
        if (!gameEntry) return null;

        return (
          <div key={entry.user_id} className={style.feedUserBlock}>
            <div className={style.feedUserHeader}>
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt="" className={style.feedAvatar} />
              ) : (
                <div className={style.feedAvatarPlaceholder}>
                  {entry.username[0]?.toUpperCase()}
                </div>
              )}

              <span className={style.feedUsername}>{entry.username}</span>

              <span className={style.feedCount}>
                {gameEntry.achievements.length} achievement
                {gameEntry.achievements.length !== 1 ? "s" : ""}
              </span>
            </div>

            <ul className={style.feedAchievements}>
              {gameEntry.achievements.map((a) => (
                <li key={a.api_name} className={style.feedAchievementRow}>
                  {a.icon_url ? (
                    <img src={a.icon_url} alt="" className={style.feedIcon} />
                  ) : (
                    <div className={style.feedIconPlaceholder} />
                  )}

                  <span className={style.feedAchName}>
                    {a.display_name ?? a.api_name}
                  </span>

                  <span className={style.feedDate}>
                    {new Date(a.unlocked_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ── Guides tab ────────────────────────────────────────────────────────────────

function GuidesTab() {
  return (
    <section className={style.guidesSection}>
      <div className={style.guidesHeader}>
        <div>
          <h3>Guides</h3>
          <p>
            Write your own guides, edit them later, and mark useful community
            guides as favorites.
          </p>
        </div>

        <button className={style.primaryBtn}>+ Create guide</button>
      </div>

      <div className={style.guidePlaceholder}>
        <p>No guides yet.</p>
        <p>Create the first guide and become dangerously helpful.</p>
      </div>
    </section>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

function GameDetails({ appId, game }: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("achievements");

  const unlocked = game.achievements.filter((a) => a.unlocked);
  const locked = game.achievements.filter((a) => !a.unlocked);

  const completionPercent = game.achievements.length
    ? Math.round((unlocked.length / game.achievements.length) * 100)
    : 0;

  const heroUrl = appId
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`
    : game.header_image_url;

  return (
    <div className={style.page}>
      {(heroUrl || game.header_image_url) && (
        <img
          src={heroUrl ?? game.header_image_url!}
          alt={game.name}
          className={style.bannerImg}
          onError={(e) => {
            if (
              game.header_image_url &&
              e.currentTarget.src !== game.header_image_url
            ) {
              e.currentTarget.src = game.header_image_url;
            }
          }}
        />
      )}

      <div className={style.progressBar}>
        <div
          className={style.progressFill}
          style={{
            width: `${completionPercent}%`,
            filter: `saturate(${0.3 + (completionPercent / 100) * 1.2})`,
          }}
        />
      </div>

      <div className={style.gameInfo}>
        <h2 className={style.gameName}>{game.name}</h2>

        <p className={style.gameStat}>
          <span className={style.completionPercent}>{completionPercent}%</span>
          <span className={style.statDivider}>|</span>
          <span>
            {unlocked.length} / {game.achievements.length}
          </span>
        </p>
      </div>

      <div className={style.tabBar}>
        <button
          className={`${style.tabBtn} ${
            activeTab === "feed" ? style.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("feed")}
        >
          Friends Feed
        </button>

        <button
          className={`${style.tabBtn} ${
            activeTab === "achievements" ? style.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("achievements")}
        >
          My Achievements
        </button>

        <button
          className={`${style.tabBtn} ${
            activeTab === "guides" ? style.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("guides")}
        >
          Guides
        </button>
      </div>

      <div className={style.tabContent}>
        {activeTab === "feed" && <FeedTab appId={appId} />}

        {activeTab === "achievements" && (
          <>
            {unlocked.length > 0 && (
              <section className={style.section}>
                <h3 className={style.sectionTitle}>
                  Unlocked <span className={style.count}>{unlocked.length}</span>
                </h3>

                <ul className={style.list}>
                  {unlocked.map((a) => (
                    <AchievementRow key={a.api_name} a={a} />
                  ))}
                </ul>
              </section>
            )}

            {locked.length > 0 && (
              <section className={style.section}>
                <h3 className={style.sectionTitle}>
                  Locked <span className={style.count}>{locked.length}</span>
                </h3>

                <ul className={style.list}>
                  {locked.map((a) => (
                    <AchievementRow key={a.api_name} a={a} />
                  ))}
                </ul>
              </section>
            )}

            {unlocked.length === 0 && locked.length === 0 && (
              <div className={style.tabState}>
                No achievements found for this game.
              </div>
            )}
          </>
        )}

        {activeTab === "guides" && <GuidesTab appId={appId} />}
      </div>
    </div>
  );
}

export default GameDetails;