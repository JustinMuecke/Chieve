import { Link } from "react-router-dom";
import style from "./profile.module.scss";

import ProfileFeed from "../profileFeed/ProfileFeed";

import { useState } from "react";





type ProfileSection = "feed" | "guides" | "games";

type AchievementStats = {
  perfect: number;
  legendary: number;
  rare: number;
  uncommon: number;
  common: number;
  total: number;
};

type ProfileData = {
  user_id: number;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  followers_count: number;
  following_count: number;
  is_own_profile: boolean;
  is_following: boolean;
  achievements: AchievementStats;
};

function Profile() {
  const [activeSection, setActiveSection] = useState<ProfileSection>("feed");

  /**
   * TODO BACKEND:
   * Diese Mock-Daten später durch den echten Profile-Endpoint ersetzen.
   *
   * Mögliche Logik:
   *
   * - Wenn /profile aufgerufen wird:
   *   GET /me oder GET /profiles/me
   *
   * - Wenn /profile/:user_id aufgerufen wird:
   *   GET /profiles/:user_id
   *
   * Der Endpoint sollte direkt liefern:
   * - is_own_profile
   * - is_following
   * - followers_count
   * - following_count
   * - achievement counts nach Rarity
   */
  const profile: ProfileData = {
    user_id: 42,
    username: "Xelaly",
    avatar_url: null,
    banner_url: null,
    description:
      "Achievement hunter, backlog survivor, and occasional completionist. Currently trying to turn unfinished games into measurable regret.",
    followers_count: 128,
    following_count: 64,
    is_own_profile: true,
    is_following: false,
    achievements: {
      perfect: 7,
      legendary: 13,
      rare: 48,
      uncommon: 156,
      common: 312,
      total: 536,
    },
  };

  function handleFollowClick() {
    /**
     * TODO BACKEND:
     * Nur anzeigen/nutzen, wenn profile.is_own_profile === false.
     *
     * Wenn profile.is_following === false:
     * POST /social/follow/{profile.user_id}
     *
     * Wenn profile.is_following === true:
     * DELETE /social/follow/{profile.user_id}
     *
     * Danach Profile-Daten neu laden oder State lokal aktualisieren:
     * - is_following togglen
     * - followers_count +1 oder -1
     */
  }

  function handleEditClick() {
    /**
     * TODO:
     * Nur anzeigen, wenn profile.is_own_profile === true.
     *
     * Optionen:
     * - Modal öffnen
     * - zu /profile/edit navigieren
     * - Inline Edit für Banner, Avatar, Description
     */
  }

  const achievementItems = [
    {
      key: "perfect",
      label: "100%",
      value: profile.achievements.perfect,
      className: style.perfect,
    },
    {
      key: "legendary",
      label: "Legendary",
      value: profile.achievements.legendary,
      className: style.legendary,
    },
    {
      key: "rare",
      label: "Rare",
      value: profile.achievements.rare,
      className: style.rare,
    },
    {
      key: "uncommon",
      label: "Uncommon",
      value: profile.achievements.uncommon,
      className: style.uncommon,
    },
    {
      key: "common",
      label: "Common",
      value: profile.achievements.common,
      className: style.common,
    },
    {
      key: "total",
      label: "All",
      value: profile.achievements.total,
      className: style.total,
    },
  ];

  return (
    <main className={style.profilePage}>
      <section className={style.profileCard}>
        <div
          className={style.banner}
          style={
            profile.banner_url
              ? { backgroundImage: `url(${profile.banner_url})` }
              : undefined
          }
        />

        <div className={style.profileHead}>
          <div className={style.identityBlock}>
            <div className={style.avatarOuter}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.username} avatar`}
                  className={style.avatar}
                />
              ) : (
                <div className={style.avatarPlaceholder}>
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h1>{profile.username}</h1>
          </div>

          <div className={style.socialStats}>
            <article>
              <strong>{profile.followers_count}</strong>
              <span>Followers</span>
            </article>

            <article>
              <strong>{profile.following_count}</strong>
              <span>Following</span>
            </article>
          </div>

          <div className={style.profileActions}>
            {!profile.is_own_profile && (
              <button
                type="button"
                className={style.primaryButton}
                onClick={handleFollowClick}
              >
                {profile.is_following ? "Unfollow" : "Follow"}
              </button>
            )}

            {profile.is_own_profile && (
              <button
                type="button"
                className={style.secondaryButton}
                onClick={handleEditClick}
              >
                Edit profile
              </button>
            )}
          </div>
        </div>

        <section className={style.descriptionBox}>
          <h2>Description</h2>
          <p>
            {profile.description ||
              "No description yet. This player is mysterious, suspicious, or just busy hunting achievements."}
          </p>
        </section>

        <section className={style.achievementSection}>
          <div className={style.sectionHeader}>
            <p className={style.kicker}>Achievement Breakdown</p>
            <h2>Collected trophies</h2>
          </div>

          <div className={style.achievementRow}>
            {achievementItems.map((item) => (
              <article
                key={item.key}
                className={`${style.achievementItem} ${item.className}`}
              >
                <div className={style.trophyIcon}>🏆</div>
                <div>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className={style.profileNav}>
          <button
            type="button"
            className={`${style.profileNavButton} ${
              activeSection === "feed" ? style.profileNavButtonActive : ""
            }`}
            onClick={() => setActiveSection("feed")}
          >
            Feed
          </button>

          <button
            type="button"
            className={`${style.profileNavButton} ${
              activeSection === "guides" ? style.profileNavButtonActive : ""
            }`}
            onClick={() => setActiveSection("guides")}
          >
            Guides
          </button>

          <button
            type="button"
            className={`${style.profileNavButton} ${
              activeSection === "games" ? style.profileNavButtonActive : ""
            }`}
            onClick={() => setActiveSection("games")}
          >
            Games
          </button>
        </div>
      </section>




      <section className={style.profileSectionContent}>
        {activeSection === "feed" && (
          <ProfileFeed userId={profile.user_id} />
        )}

        {activeSection === "guides" && (
          <div className={style.placeholderPanel}>
            <h2>Guides</h2>
            <p>
              Here we will show guides written by this user.
            </p>
          </div>
        )}

        {activeSection === "games" && (
          <div className={style.placeholderPanel}>
            <h2>Games</h2>
            <p>
              Here we will show this user's tracked games.
            </p>
          </div>
        )}
      </section>


    </main>
  );
}

export default Profile;