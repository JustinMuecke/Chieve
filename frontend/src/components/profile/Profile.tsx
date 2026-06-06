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

type AchievementType = keyof AchievementStats;

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

type AchievementItem = {
  key: AchievementType;
  label: string;
  value: number;
  className: string;
};

function Profile() {
  const [activeSection, setActiveSection] = useState<ProfileSection>("feed");

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
     * POST /social/follow/{profile.user_id}
     * DELETE /social/follow/{profile.user_id}
     */
  }

  function handleEditClick() {
    /**
     * TODO:
     * Modal öffnen, zu /profile/edit navigieren oder Inline Edit starten.
     */
  }

  const achievementItems: AchievementItem[] = [
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

          <div className={style.achievementRow}>
            {achievementItems.map((item) => (
              <article
                key={item.key}
                className={`${style.achievementItem} ${item.className}`}
                tabIndex={0}
                aria-label={`${item.value} ${item.label} achievements`}
              >
                <div className={style.trophyIcon}>🏆</div>

                <div className={style.achievementCountBadge}>
                  {item.value}
                </div>

                <div className={style.achievementTooltip}>
                  {item.label}
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
        {activeSection === "feed" && <ProfileFeed userId={profile.user_id} />}

        {activeSection === "guides" && (
          <div className={style.placeholderPanel}>
            <h2>Guides</h2>
            <p>Here we will show guides written by this user.</p>
          </div>
        )}

        {activeSection === "games" && (
          <div className={style.placeholderPanel}>
            <h2>Games</h2>
            <p>Here we will show this user's tracked games.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default Profile;