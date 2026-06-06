import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import style from "./friends.module.scss";

import { RxOpenInNewWindow } from "react-icons/rx";
import { RiUserFollowLine, RiUserUnfollowLine } from "react-icons/ri";

type FriendUser = {
  id: number;
  username: string;
  avatar_url?: string | null;
};

type FriendTab = "following" | "followers";

function Friends() {
  const [activeTab, setActiveTab] = useState<FriendTab>("following");
  const [following, setFollowing] = useState<FriendUser[]>([]);
  const [followers, setFollowers] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    /**
     * TODO BACKEND:
     * Hier später echte Friend-Daten laden.
     *
     * Eure existierenden Endpunkte:
     *
     * GET /social/following
     * Gibt zurück: list[UserSummary]
     *
     * GET /social/followers
     * Gibt zurück: list[UserSummary]
     *
     * UserSummary enthält laut Backend:
     * {
     *   id: number;
     *   username: string;
     *   avatar_url: string | null;
     * }
     *
     * Beispiel später:
     *
     * async function loadFriends() {
     *   const followingResponse = await fetch("/social/following");
     *   const followingData = await followingResponse.json();
     *
     *   const followersResponse = await fetch("/social/followers");
     *   const followersData = await followersResponse.json();
     *
     *   setFollowing(followingData);
     *   setFollowers(followersData);
     * }
     *
     * loadFriends();
     */

    setFollowing([
      {
        id: 1,
        username: "AchievementHunter42",
        avatar_url: null,
      },
      {
        id: 2,
        username: "GuideWizard",
        avatar_url: null,
      },
      {
        id: 3,
        username: "BacklogDestroyer",
        avatar_url: null,
      },
    ]);

    setFollowers([
      {
        id: 4,
        username: "RareUnlocker",
        avatar_url: null,
      },
      {
        id: 2,
        username: "GuideWizard",
        avatar_url: null,
      },
    ]);
  }, []);

  const activeUsers = activeTab === "following" ? following : followers;

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return activeUsers;

    return activeUsers.filter((user) =>
      user.username.toLowerCase().includes(query)
    );
  }, [activeUsers, searchQuery]);

  function handleUnfollow(targetId: number) {
    /**
     * TODO BACKEND:
     * User entfolgen.
     *
     * Existierender Endpoint:
     * DELETE /social/follow/{target_id}
     *
     * Beispiel später:
     *
     * await fetch(`/social/follow/${targetId}`, {
     *   method: "DELETE",
     * });
     *
     * Danach entweder:
     * - lokale Liste aktualisieren
     * - oder following/followers neu laden
     */

    setFollowing((currentFollowing) =>
      currentFollowing.filter((user) => user.id !== targetId)
    );
  }

  function handleFollow(targetId: number) {
    /**
     * TODO BACKEND:
     * User folgen.
     *
     * Existierender Endpoint:
     * POST /social/follow/{target_id}
     *
     * Beispiel später:
     *
     * await fetch(`/social/follow/${targetId}`, {
     *   method: "POST",
     * });
     *
     * Wichtig:
     * Backend verhindert bereits Self-Follow:
     * if user_id == target_id -> 400
     */

    const userToFollow = followers.find((user) => user.id === targetId);

    if (!userToFollow) return;

    const alreadyFollowing = following.some((user) => user.id === targetId);

    if (!alreadyFollowing) {
      setFollowing((currentFollowing) => [...currentFollowing, userToFollow]);
    }
  }

  function isFollowing(userId: number) {
    return following.some((user) => user.id === userId);
  }

  return (
    <main className={style.friendsPage}>
      <section className={style.hero}>
        <div>
          <p className={style.kicker}>Social Hub</p>
          <h1>Friends</h1>
          <p className={style.intro}>
            Track your achievement circle, follow other players, and compare
            progress with the people who make your backlog worse.
          </p>
        </div>

        <div className={style.statsBox}>
          <article>
            <strong>{following.length}</strong>
            <span>Following</span>
          </article>

          <article>
            <strong>{followers.length}</strong>
            <span>Followers</span>
          </article>
        </div>
      </section>

      <section className={style.panel}>
        <div className={style.toolbar}>
          <div className={style.tabBar}>
            <button
              type="button"
              className={`${style.tabButton} ${
                activeTab === "following" ? style.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("following")}
            >
              Following
            </button>

            <button
              type="button"
              className={`${style.tabButton} ${
                activeTab === "followers" ? style.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("followers")}
            >
              Followers
            </button>
          </div>

          <input
            className={style.searchInput}
            value={searchQuery}
            placeholder="Search friends..."
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className={style.friendGrid}>
          {filteredUsers.length === 0 && (
            <div className={style.emptyState}>
              No users found in this list.
            </div>
          )}

          {filteredUsers.map((user) => (
            <article key={user.id} className={style.friendCard}>
              <div className={style.friendMain}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className={style.avatar}
                  />
                ) : (
                  <div className={style.avatarPlaceholder}>
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}

                <div className={style.friendInfo}>
                  <h2>{user.username}</h2>
                  
                </div>
              </div>

              <div className={style.friendActions}>
                <Link
                  to={`/profile/${user.id}`}
                  className={style.iconButton}
                  aria-label={`View profile of ${user.username}`}
                  title="View profile"
                >
                  <RxOpenInNewWindow />
                </Link>

                {activeTab === "following" && (
                  <button
                    type="button"
                    className={style.iconButton}
                    onClick={() => handleUnfollow(user.id)}
                    aria-label={`Unfollow ${user.username}`}
                    title="Unfollow"
                  >
                    <RiUserUnfollowLine />
                  </button>
                )}

                {activeTab === "followers" && !isFollowing(user.id) && (
                  <button
                    type="button"
                    className={style.iconButton}
                    onClick={() => handleFollow(user.id)}
                    aria-label={`Follow ${user.username}`}
                    title="Follow back"
                  >
                    <RiUserFollowLine />
                  </button>
                )}

                {activeTab === "followers" && isFollowing(user.id) && (
                  <span className={style.mutualBadge}>Mutual</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Friends;