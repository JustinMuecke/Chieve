import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import style from "./guidesTab.module.scss";
import type { GuideWithOwner } from "../../api/types";

type GuideViewerProps = {
  guide: GuideWithOwner;
  appId: string | undefined;
  onBack: () => void;
};

function GuideViewer({ guide, onBack }: GuideViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    setContent(null);
    fetch(guide.content_url)
      .then((res) => { if (!res.ok) throw new Error(); return res.text(); })
      .then(setContent)
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [guide.content_url]);

  return (
    <section className={style.guideViewer}>
      {guide.header_image_url && (
        <img src={guide.header_image_url} alt="" className={style.viewerBanner} />
      )}

      <div className={style.viewerHeader}>
        <div className={style.viewerHeaderMain}>
          <div>
            <h2 className={style.viewerTitle}>{guide.title}</h2>
            {guide.description && (
              <p className={style.viewerDescription}>{guide.description}</p>
            )}
          </div>

          <div className={style.viewerAuthorBlock}>
            {guide.author_avatar_url ? (
              <img src={guide.author_avatar_url} alt={guide.username ?? ""} className={style.viewerAvatar} />
            ) : (
              <div className={style.viewerAvatarPlaceholder}>
                {(guide.username ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <Link to={`/user/${guide.user_id}`} className={style.viewerAuthorLink}>
                {guide.username ?? "Unknown"}
              </Link>
              <span className={style.viewerDate}>
                {new Date(guide.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
              <span className={style.viewerDate}>
                {guide.author_achievement_count} / {guide.game_total_achievements} achievements
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={style.viewerContent}>
        {isLoading && <p className={style.viewerState}>Loading guide…</p>}
        {isError && <p className={style.viewerState}>Failed to load guide content.</p>}
        {content !== null && <ReactMarkdown>{content}</ReactMarkdown>}
      </div>

      <button type="button" className={style.viewerBack} onClick={onBack}>
        ← Back to guides
      </button>
    </section>
  );
}

export default GuideViewer;
