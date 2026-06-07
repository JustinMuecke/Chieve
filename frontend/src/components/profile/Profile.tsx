import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import style from "./profile.module.scss";
import ProfileFeed from "../profileFeed/ProfileFeed";

import ProfileGuides from "../profileGuides/ProfileGuides";
import ProfileGames from "../profileGames/ProfileGames";


import {
  followUser,
  getUserProfile,
  unfollowUser,
  type UserProfile,
  type AchievementStats,
} from "../../api/userProfile";








type ProfileSection = "feed" | "guides" | "games";
type AchievementType = keyof AchievementStats;

type AchievementItem = {
  key: AchievementType;
  label: string;
  value: number;
  className: string;
};

function Profile() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();

  /**
   * TODO:
   * Für /profile ohne user_id braucht ihr eigentlich die eigene User-ID.
   * Sauber wäre:
   * - entweder Header/Profile-Link direkt auf /profile/{ownUserId}
   * - oder separater Endpoint GET /api/me, um eigene ID zu holen.
   *
   * Fallback "1" ist nur für Entwicklung.
   */
  const resolvedUserId = user_id ?? "1";

  const [activeSection, setActiveSection] = useState<ProfileSection>("feed");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        /**
         * BACKEND:
         * Lädt das angezeigte Profil anhand der URL:
         * /profile/:user_id
         */
        const loadedProfile = await getUserProfile(resolvedUserId);

        if (isMounted) {
          setProfile(loadedProfile);
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setProfileError("Could not load profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [resolvedUserId]);

  async function handleFollowClick() {
    if (!profile || profile.is_own_profile) return;

    const wasFollowing = profile.is_following;

    /**
     * Optimistic UI:
     * Button und Follower-Zahl ändern sich sofort.
     * Falls Backend fehlschlägt, rollen wir zurück.
     */
    setProfile({
      ...profile,
      is_following: !wasFollowing,
      followers_count: wasFollowing
        ? profile.followers_count - 1
        : profile.followers_count + 1,
    });

    try {
      if (wasFollowing) {
        await unfollowUser(profile.user_id);
      } else {
        await followUser(profile.user_id);
      }
    } catch (error) {
      console.error(error);

      /**
       * Rollback.
       */
      setProfile(profile);
      setProfileError("Follow action failed.");
    }
  }

  function handleEditClick() {
    navigate("/settings");
  }

  if (isLoadingProfile) {
    return <main className={style.profilePage}>Loading profile…</main>;
  }

  if (profileError || !profile) {
    return (
      <main className={style.profilePage}>
        {profileError ?? "Profile not found."}
      </main>
    );
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


          <div className={style.achievementRow}>
            {achievementItems.map((item) => (
              <article
                key={item.key}
                className={`${style.achievementItem} ${item.className}`}
                tabIndex={0}
                aria-label={`${item.value} ${item.label} achievements`}
              >
                <div className={style.trophyIcon}>🏆</div>
                <span className={style.achievementCountBadge}>
                  {item.value.toLocaleString()}
                </span>
                <span className={style.achievementLabel}>
                  {item.label}
                </span>
              </article>
            ))}
          </div>

        <section className={style.descriptionBox}>
          <p>
            {profile.description ||
              "No description yet. This player is mysterious, suspicious, or just busy hunting achievements."}
          </p>
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

        <section className={style.profileSectionContent}>
          {activeSection === "feed" && <ProfileFeed userId={profile.user_id} />}

          {activeSection === "guides" && <ProfileGuides userId={profile.user_id} />}

          {activeSection === "games" && <ProfileGames userId={profile.user_id} />}
        </section>
      </section>
    </main>
  );
}

export default Profile;


