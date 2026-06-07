import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGuides, useToggleFavorite } from "../api/guides";
import style from "../components/guides/guidesTab.module.scss";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type TocEntry = { level: number; text: string; slug: string };

function parseToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const entries: TocEntry[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)/);
    if (m) entries.push({ level: m[1].length, text: m[2].trim(), slug: slugify(m[2]) });
  }
  return entries;
}

const headingComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children);
    return <h1 id={slugify(text)} {...props}>{children}</h1>;
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children);
    return <h2 id={slugify(text)} {...props}>{children}</h2>;
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children);
    return <h3 id={slugify(text)} {...props}>{children}</h3>;
  },
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children);
    return <h4 id={slugify(text)} {...props}>{children}</h4>;
  },
};

function TableOfContents({ entries }: { entries: TocEntry[] }) {
  if (entries.length < 2) return null;
  return (
    <nav className={style.toc}>
      <p className={style.tocTitle}>Contents</p>
      <ul className={style.tocList}>
        {entries.map((e, i) => (
          <li key={i} className={style.tocItem} style={{ paddingLeft: `${(e.level - 1) * 12}px` }}>
            <a href={`#${e.slug}`} className={style.tocLink}>{e.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function GuideViewPage() {
  const { app_id, guide_id } = useParams<{ app_id: string; guide_id: string }>();
  const navigate = useNavigate();

  const { data, isLoading: guidesLoading } = useGuides(app_id);
  const toggleFavorite = useToggleFavorite(app_id);

  const allGuides = [
    ...(data?.my_guides ?? []).map(g => ({ ...g, isOwn: true })),
    ...(data?.other_guides ?? []).map(g => ({ ...g, isOwn: false })),
  ];
  const guide = allGuides.find(g => String(g.id) === guide_id);

  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);

  useEffect(() => {
    if (!guide?.content_url) return;
    setContentLoading(true);
    setContentError(false);
    setContent(null);
    fetch(guide.content_url, { credentials: "include" })
      .then(res => { if (!res.ok) throw new Error(); return res.text(); })
      .then(setContent)
      .catch(() => setContentError(true))
      .finally(() => setContentLoading(false));
  }, [guide?.content_url]);

  const toc = useMemo(() => (content ? parseToc(content) : []), [content]);

  if (guidesLoading) return <div className={style.emptyState}>Loading…</div>;
  if (!guide) return <div className={style.emptyState}>Guide not found.</div>;

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

          <div className={style.viewerMeta}>
            <div className={style.viewerAuthorBlock}>
              {guide.author_avatar_url ? (
                <img src={guide.author_avatar_url} alt={guide.username ?? ""} className={style.viewerAvatar} />
              ) : (
                <div className={style.viewerAvatarPlaceholder}>
                  {(guide.username ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <Link to={`/profile/${guide.user_id}`} className={style.viewerAuthorLink}>
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

            <div className={style.viewerActions}>
              {guide.isOwn && (
                <button
                  type="button"
                  className={style.editButton}
                  onClick={() => navigate(`/games/${app_id}/guides/${guide_id}/edit`)}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className={`${style.favoriteButton} ${guide.is_favorite ? style.favoriteButtonActive : ""}`}
                onClick={() => toggleFavorite.mutate({ guideId: guide.id, isFavorite: guide.is_favorite })}
                aria-label={guide.is_favorite ? "Remove from favorites" : "Add to favorites"}
              >
                {guide.is_favorite ? "★" : "☆"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={style.viewerBody}>
        <TableOfContents entries={toc} />

        <div className={style.viewerContent}>
          {contentLoading && <p className={style.viewerState}>Loading guide…</p>}
          {contentError && <p className={style.viewerState}>Failed to load guide content.</p>}
          {content !== null && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={headingComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>

      <button type="button" className={style.viewerBack} onClick={() => navigate(-1)}>
        ← Back to guides
      </button>
    </section>
  );
}

export default GuideViewPage;
