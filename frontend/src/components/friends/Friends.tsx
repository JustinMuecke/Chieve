import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import style from "./friends.module.scss";

import { RxOpenInNewWindow } from "react-icons/rx";
import { RiUserFollowLine, RiUserUnfollowLine } from "react-icons/ri";

import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  type UserSummary,
} from "../../api/social";

type FriendUser = UserSummary;

type FriendTab = "following" | "followers";






function Friends() {
  const [activeTab, setActiveTab] = useState<FriendTab>("following");
  const [following, setFollowing] = useState<FriendUser[]>([]);
  const [followers, setFollowers] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  let isMounted = true;

  async function loadFriends() {
    setIsLoading(true);
    setError(null);

    try {
      /**
       * BACKEND:
       * GET /api/user/social/following
       * GET /api/user/social/followers
       *
       * Beide Endpunkte geben UserSummary[] zurück:
       * {
       *   id: number,
       *   username: string,
       *   avatar_url: string | null
       * }
       */
      const [loadedFollowing, loadedFollowers] = await Promise.all([
        getFollowing(),
        getFollowers(),
      ]);

      if (!isMounted) return;

      setFollowing(loadedFollowing);
      setFollowers(loadedFollowers);
    } catch (error) {
      console.error(error);

      if (isMounted) {
        setError("Could not load friends.");
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  loadFriends();

  return () => {
    isMounted = false;
  };
}, []);


  const activeUsers = activeTab === "following" ? following : followers;

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return activeUsers;

    return activeUsers.filter((user) =>
      user.username.toLowerCase().includes(query)
    );
  }, [activeUsers, searchQuery]);

  async function handleUnfollow(targetId: number) {
  const previousFollowing = following;

  /**
   * Optimistic UI:
   * User verschwindet sofort aus Following.
   * Wenn der Backend-Call fehlschlägt, stellen wir den alten Zustand wieder her.
   */
  setFollowing((currentFollowing) =>
    currentFollowing.filter((user) => user.id !== targetId)
  );

  try {
    /**
     * BACKEND:
     * DELETE /api/user/social/follow/{target_id}
     */
    await unfollowUser(targetId);
  } catch (error) {
    console.error(error);
    setFollowing(previousFollowing);
    setError("Could not unfollow user.");
  }
}

  async function handleFollow(targetId: number) {
    const userToFollow = followers.find((user) => user.id === targetId);

    if (!userToFollow) return;

    const alreadyFollowing = following.some((user) => user.id === targetId);

    if (alreadyFollowing) return;

    /**
     * Optimistic UI:
     * User wird sofort zu Following hinzugefügt.
     * Wenn Backend fehlschlägt, entfernen wir ihn wieder.
     */
    setFollowing((currentFollowing) => [...currentFollowing, userToFollow]);

    try {
      /**
       * BACKEND:
       * POST /api/user/social/follow/{target_id}
       */
      await followUser(targetId);
    } catch (error) {
      console.error(error);

      setFollowing((currentFollowing) =>
        currentFollowing.filter((user) => user.id !== targetId)
      );

      setError("Could not follow user.");
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
          <p className={style.intro}>
            Follow your achievement circle, compare progress, and turn friendly rivalry into measurable motivation. Stalk their progress responsibly and find out who is actually finishing their backlog.
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

                {isLoading && (
          <div className={style.stateMessage}>Loading friends…</div>
        )}

        {error && !isLoading && (
          <div className={style.errorMessage}>{error}</div>
        )}

        {!isLoading && (
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
        )}
      </section>
    </main>
  );
}

export default Friends;