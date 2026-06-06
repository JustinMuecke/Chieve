import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import style from "./guidesTab.module.scss";
import { useGuides, useCreateGuide, useUpdateGuide, useToggleFavorite } from "../../api/guides";
import type { GuideWithOwner } from "../../api/types";

type GuideBrowserProps = {
  appId: string | undefined;
  onReadGuide: (guide: GuideWithOwner) => void;
};

type EditorState = {
  mode: "create" | "edit";
  guideId?: number;
  title: string;
  description: string;
  content: string;
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
  onRead,
  onEdit,
  onToggleFavorite,
}: {
  guide: GuideWithOwner;
  onRead: (g: GuideWithOwner) => void;
  onEdit: (g: GuideWithOwner) => void;
  onToggleFavorite: (g: GuideWithOwner) => void;
}) {
  return (
    <article className={style.guideCard} onClick={() => onRead(guide)}>
      {guide.header_image_url && (
        <img
          src={guide.header_image_url}
          alt=""
          className={style.cardHeaderImage}
        />
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

          <div className={style.cardControls} onClick={(e) => e.stopPropagation()}>
            {guide.isOwn && (
              <button
                type="button"
                className={style.editButton}
                onClick={() => onEdit(guide)}
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

function GuideBrowser({ appId, onReadGuide }: GuideBrowserProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headerImageRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useGuides(appId);
  const createGuide = useCreateGuide(appId);
  const updateGuide = useUpdateGuide(appId);
  const toggleFavorite = useToggleFavorite(appId);

  const myGuides: GuideWithOwner[] = (data?.my_guides ?? []).map((g) => ({ ...g, isOwn: true }));
  const otherGuides: GuideWithOwner[] = (data?.other_guides ?? []).map((g) => ({ ...g, isOwn: false }));
  const totalCount = myGuides.length + otherGuides.length;
  const favoriteCount = [...myGuides, ...otherGuides].filter((g) => g.is_favorite).length;
  const isSaving = createGuide.isPending || updateGuide.isPending;

  async function openEditGuide(guide: GuideWithOwner) {
    setError(null);
    setHeaderImageFile(null);
    setHeaderImagePreview(guide.header_image_url);
    let content = "";
    try {
      const res = await fetch(guide.content_url);
      if (res.ok) content = await res.text();
    } catch { /* leave empty */ }
    setEditor({
      mode: "edit",
      guideId: guide.id,
      title: guide.title,
      description: guide.description ?? "",
      content,
    });
  }

  function openCreateGuide() {
    setError(null);
    setHeaderImageFile(null);
    setHeaderImagePreview(null);
    setEditor({ mode: "create", title: "", description: "", content: "" });
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
    setHeaderImageFile(null);
    setHeaderImagePreview(null);
  }

  function handleHeaderImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeaderImageFile(file);
    if (file) setHeaderImagePreview(URL.createObjectURL(file));
  }

  async function saveGuide() {
    if (!appId || !editor) return;
    const trimmedTitle = editor.title.trim();
    const trimmedContent = editor.content.trim();
    if (!trimmedTitle || !trimmedContent) {
      setError("Please add a title and some guide content before saving.");
      return;
    }
    try {
      if (editor.mode === "edit" && editor.guideId !== undefined) {
        await updateGuide.mutateAsync({
          guideId: editor.guideId,
          title: trimmedTitle,
          description: editor.description,
          content: trimmedContent,
          headerImage: headerImageFile,
        });
      } else {
        await createGuide.mutateAsync({
          title: trimmedTitle,
          description: editor.description,
          content: trimmedContent,
          headerImage: headerImageFile,
        });
      }
      closeEditor();
    } catch {
      setError("Failed to save guide. Please try again.");
    }
  }

  function handleToggleFavorite(guide: GuideWithOwner) {
    toggleFavorite.mutate({ guideId: guide.id, isFavorite: guide.is_favorite });
  }

  if (isLoading) return <div className={style.emptyState}>Loading guides…</div>;
  if (isError) return <div className={style.emptyState}>Failed to load guides.</div>;

  return (
    <section className={style.guidesTab}>
      <div className={style.header}>
        <div>
          <p className={style.kicker}>Community Knowledge</p>
          <h3>Guides</h3>
          <p className={style.description}>
            Write markdown guides, edit your own notes, and favorite the best
            strategies from other players.
          </p>
        </div>
        <button type="button" className={style.createButton} onClick={openCreateGuide}>
          + Create guide
        </button>
      </div>

      <div className={style.summaryGrid}>
        <article><span>{totalCount}</span><p>Total guides</p></article>
        <article><span>{myGuides.length}</span><p>Your guides</p></article>
        <article><span>{favoriteCount}</span><p>Favorites</p></article>
      </div>

      {editor && (
        <section className={style.editorPanel}>
          <div className={style.editorHeader}>
            <div>
              <p className={style.kicker}>
                {editor.mode === "create" ? "New Guide" : "Edit Guide"}
              </p>
              <h4>
                {editor.mode === "create" ? "Create a new markdown guide" : "Update your guide"}
              </h4>
            </div>
            <button type="button" className={style.closeButton} onClick={closeEditor}>×</button>
          </div>

          <div className={style.editorMeta}>
            <label className={style.inputGroup}>
              <span>Title</span>
              <input
                value={editor.title}
                placeholder="e.g. Fastest route to 100%"
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
              />
            </label>

            <label className={style.inputGroup}>
              <span>Short description <span className={style.optional}>(optional)</span></span>
              <input
                value={editor.description}
                placeholder="One sentence about what this guide covers"
                maxLength={500}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              />
            </label>

            <div className={style.inputGroup}>
              <span>Header image <span className={style.optional}>(optional)</span></span>
              {headerImagePreview && (
                <img src={headerImagePreview} alt="Header preview" className={style.headerImagePreview} />
              )}
              <input
                ref={headerImageRef}
                type="file"
                accept="image/*"
                className={style.fileInput}
                onChange={handleHeaderImageChange}
              />
            </div>
          </div>

          <div className={style.markdownGrid}>
            <label className={style.inputGroup}>
              <span>Markdown</span>
              <textarea
                value={editor.content}
                placeholder={"## Step 1\nDescribe your strategy here..."}
                onChange={(e) => setEditor({ ...editor, content: e.target.value })}
              />
            </label>

            <div className={style.previewBox}>
              <span>Preview</span>
              {editor.content.trim() ? (
                <div className={style.markdownPreview}>
                  <ReactMarkdown>{editor.content}</ReactMarkdown>
                </div>
              ) : (
                <p className={style.emptyPreview}>Your markdown preview will appear here.</p>
              )}
            </div>
          </div>

          {error && <p className={style.error}>{error}</p>}

          <div className={style.editorActions}>
            <button type="button" className={style.secondaryButton} onClick={closeEditor} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" className={style.saveButton} onClick={saveGuide} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save guide"}
            </button>
          </div>
        </section>
      )}

      {totalCount === 0 && (
        <div className={style.emptyState}>
          <h4>No guides yet.</h4>
          <p>Create the first guide and become dangerously helpful.</p>
        </div>
      )}

      {myGuides.length > 0 && (
        <div className={style.guideSection}>
          <h4 className={style.sectionLabel}>Your Guides</h4>
          <div className={style.guideList}>
            {myGuides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} onRead={onReadGuide} onEdit={openEditGuide} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        </div>
      )}

      {otherGuides.length > 0 && (
        <div className={style.guideSection}>
          <h4 className={style.sectionLabel}>Other Users' Guides</h4>
          <div className={style.guideList}>
            {otherGuides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} onRead={onReadGuide} onEdit={openEditGuide} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default GuideBrowser;
