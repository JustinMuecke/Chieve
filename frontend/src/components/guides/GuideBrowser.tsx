import { useNavigate } from "react-router-dom";
import style from "./guidesTab.module.scss";
import { useGuides, useToggleFavorite } from "../../api/guides";
import type { GuideWithOwner } from "../../api/types";

type GuideBrowserProps = {
  appId: string | undefined;
};

function AuthorAvatar({ url, username }: { url: string | null; username: string | null }) {
  if (url) return <img src={url} alt={username ?? ""} className={style.cardAvatar} />;
  return (
    <div className={style.cardAvatarPlaceholder}>
      {(username ?? "?")[0].toUpperCase()}
    </div>
  );
}

function GuideCard({
  guide,
  onToggleFavorite,
  appId,
}: {
  guide: GuideWithOwner;
  onToggleFavorite: (g: GuideWithOwner) => void;
  appId: string | undefined;
}) {
  const navigate = useNavigate();

  return (
    <article className={style.guideCard} onClick={() => navigate(`/games/${appId}/guides/${guide.id}`)}>
      {guide.header_image_url && (
        <img src={guide.header_image_url} alt="" className={style.cardHeaderImage} />
      )}

      <div className={style.cardBody}>
        <div className={style.guideTopRow}>
          <div className={style.cardAuthorRow}>
            <AuthorAvatar url={guide.author_avatar_url} username={guide.username} />
            <span className={style.cardAuthorName}>{guide.username ?? "Unknown"}</span>
            <span className={style.cardDate}>
              {new Date(guide.updated_at).toLocaleDateString()}
            </span>
          </div>

          <div className={style.cardControls} onClick={e => e.stopPropagation()}>
            {guide.isOwn && (
              <button
                type="button"
                className={style.editButton}
                onClick={() => navigate(`/games/${appId}/guides/${guide.id}/edit`)}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className={`${style.favoriteButton} ${guide.is_favorite ? style.favoriteButtonActive : ""}`}
              onClick={() => onToggleFavorite(guide)}
              aria-label={guide.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {guide.is_favorite ? "★" : "☆"}
            </button>
          </div>
        </div>

        <h4 className={style.cardTitle}>{guide.title}</h4>
        {guide.description && (
          <p className={style.cardDescription}>{guide.description}</p>
        )}
      </div>
    </article>
  );
}

function GuideBrowser({ appId }: GuideBrowserProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGuides(appId);
  const toggleFavorite = useToggleFavorite(appId);

  const myGuides: GuideWithOwner[] = (data?.my_guides ?? []).map(g => ({ ...g, isOwn: true }));
  const otherGuides: GuideWithOwner[] = (data?.other_guides ?? []).map(g => ({ ...g, isOwn: false }));
  const totalCount = myGuides.length + otherGuides.length;
  const favoriteCount = [...myGuides, ...otherGuides].filter(g => g.is_favorite).length;

  function handleToggleFavorite(guide: GuideWithOwner) {
    toggleFavorite.mutate({ guideId: guide.id, isFavorite: guide.is_favorite });
  }

  if (isLoading) return <div className={style.emptyState}>Loading guides…</div>;
  if (isError) return <div className={style.emptyState}>Failed to load guides.</div>;

  return (
    <section className={style.guidesTab}>
      <div className={style.summaryGrid}>
        <article><span>{totalCount}</span><p>Total guides</p></article>
        <article><span>{myGuides.length}</span><p>Your guides</p></article>
        <article><span>{favoriteCount}</span><p>Favorites</p></article>
      </div>

      {totalCount === 0 && (
        <div className={style.emptyState}>
          <h4>No guides yet.</h4>
          <p>Create the first guide and become dangerously helpful.</p>
        </div>
      )}

      <div className={style.guideSection}>
        <div className={style.sectionLabelRow}>
          <h4 className={style.sectionLabel}>Your Guides</h4>
          <button
            type="button"
            className={style.createButton}
            onClick={() => navigate(`/games/${appId}/guides/new`)}
          >
            + Create guide
          </button>
        </div>
        {myGuides.length > 0 && (
          <div className={style.guideList}>
            {myGuides.map(guide => (
              <GuideCard key={guide.id} guide={guide} appId={appId} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        )}
      </div>

      {otherGuides.length > 0 && (
        <div className={style.guideSection}>
          <h4 className={style.sectionLabel}>Other Users' Guides</h4>
          <div className={style.guideList}>
            {otherGuides.map(guide => (
              <GuideCard key={guide.id} guide={guide} appId={appId} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default GuideBrowser;
