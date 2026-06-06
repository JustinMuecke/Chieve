import { useEffect, useMemo, useState } from "react";
import style from "./guidesTab.module.scss";

type Guide = {
  id: string;
  gameAppId: string;
  title: string;
  content: string;
  authorName: string;
  isOwn: boolean;
  isFavorite: boolean;
  updatedAt: string;
};

type EditorState = {
  mode: "create" | "edit";
  guideId?: string;
  title: string;
  content: string;
};

type GuidesTabProps = {
  appId: string | undefined;
};

function GuidesTab({ appId }: GuidesTabProps) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myGuides = useMemo(
    () => guides.filter((guide) => guide.isOwn),
    [guides]
  );

  const favoriteGuides = useMemo(
    () => guides.filter((guide) => guide.isFavorite),
    [guides]
  );

  useEffect(() => {
    if (!appId) return;

    /**
     * TODO BACKEND:
     * Hier später alle Guides für dieses Spiel laden.
     *
     * Endpoint-Vorschlag:
     * GET /api/games/:appId/guides
     *
     * Beispiel:
     * const response = await fetch(`/api/games/${appId}/guides`);
     * const data = await response.json();
     * setGuides(data.guides);
     *
     * Wichtig:
     * Das Backend sollte direkt mitschicken:
     * - isOwn: Gehört dieser Guide dem aktuell eingeloggten User?
     * - isFavorite: Hat der aktuell eingeloggte User diesen Guide favorisiert?
     */

    setGuides([
      {
        id: "guide-1",
        gameAppId: appId,
        title: "Achievement cleanup route",
        content:
          "## Goal\nFinish the remaining achievements efficiently.\n\n- Check missing collectibles\n- Finish side quests before final boss\n- Track rare achievements first",
        authorName: "You",
        isOwn: true,
        isFavorite: true,
        updatedAt: "2026-06-06",
      },
      {
        id: "guide-2",
        gameAppId: appId,
        title: "Beginner-friendly 100% guide",
        content:
          "## Recommended approach\nStart with story achievements, then move into optional challenges.\n\nThis avoids unnecessary backtracking.",
        authorName: "GuideWizard",
        isOwn: false,
        isFavorite: false,
        updatedAt: "2026-06-05",
      },
    ]);
  }, [appId]);

  function openCreateGuide() {
    setError(null);

    setEditor({
      mode: "create",
      title: "",
      content: "",
    });
  }

  function openEditGuide(guide: Guide) {
    setError(null);

    setEditor({
      mode: "edit",
      guideId: guide.id,
      title: guide.title,
      content: guide.content,
    });
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function saveGuide() {
    if (!appId || !editor) return;

    const trimmedTitle = editor.title.trim();
    const trimmedContent = editor.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setError("Please add a title and some guide content before saving.");
      return;
    }

    if (editor.mode === "edit" && editor.guideId) {
      /**
       * TODO BACKEND:
       * Hier später bestehenden eigenen Guide speichern.
       *
       * Endpoint-Vorschlag:
       * PUT /api/guides/:guideId
       *
       * Body:
       * {
       *   title: trimmedTitle,
       *   content: trimmedContent
       * }
       *
       * Wichtig:
       * Das Backend muss prüfen, ob der aktuell eingeloggte User
       * wirklich der Autor dieses Guides ist.
       */

      setGuides((currentGuides) =>
        currentGuides.map((guide) =>
          guide.id === editor.guideId
            ? {
                ...guide,
                title: trimmedTitle,
                content: trimmedContent,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : guide
        )
      );
    } else {
      /**
       * TODO BACKEND:
       * Hier später neuen Guide für dieses Spiel erstellen.
       *
       * Endpoint-Vorschlag:
       * POST /api/games/:appId/guides
       *
       * Body:
       * {
       *   title: trimmedTitle,
       *   content: trimmedContent
       * }
       *
       * Das Backend sollte zurückgeben:
       * {
       *   id,
       *   gameAppId,
       *   title,
       *   content,
       *   authorName,
       *   isOwn,
       *   isFavorite,
       *   updatedAt
       * }
       */

      const newGuide: Guide = {
        id: `guide-${Date.now()}`,
        gameAppId: appId,
        title: trimmedTitle,
        content: trimmedContent,
        authorName: "You",
        isOwn: true,
        isFavorite: false,
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      setGuides((currentGuides) => [newGuide, ...currentGuides]);
    }

    closeEditor();
  }

  function toggleFavorite(guide: Guide) {
    /**
     * TODO BACKEND:
     * Hier später Favorit setzen oder entfernen.
     *
     * Wenn guide.isFavorite === false:
     * POST /api/guides/:guideId/favorite
     *
     * Wenn guide.isFavorite === true:
     * DELETE /api/guides/:guideId/favorite
     *
     * Wichtig:
     * Favoriten gehören zum aktuell eingeloggten User.
     * Das Backend sollte also nicht userId aus dem Frontend vertrauen,
     * sondern User aus Session/JWT ableiten.
     */

    setGuides((currentGuides) =>
      currentGuides.map((currentGuide) =>
        currentGuide.id === guide.id
          ? {
              ...currentGuide,
              isFavorite: !currentGuide.isFavorite,
            }
          : currentGuide
      )
    );
  }

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

        <button
          type="button"
          className={style.createButton}
          onClick={openCreateGuide}
        >
          + Create guide
        </button>
      </div>

      <div className={style.summaryGrid}>
        <article>
          <span>{guides.length}</span>
          <p>Total guides</p>
        </article>

        <article>
          <span>{myGuides.length}</span>
          <p>Your guides</p>
        </article>

        <article>
          <span>{favoriteGuides.length}</span>
          <p>Favorites</p>
        </article>
      </div>

      {editor && (
        <section className={style.editorPanel}>
          <div className={style.editorHeader}>
            <div>
              <p className={style.kicker}>
                {editor.mode === "create" ? "New Guide" : "Edit Guide"}
              </p>
              <h4>
                {editor.mode === "create"
                  ? "Create a new markdown guide"
                  : "Update your guide"}
              </h4>
            </div>

            <button
              type="button"
              className={style.closeButton}
              onClick={closeEditor}
            >
              ×
            </button>
          </div>

          <label className={style.inputGroup}>
            <span>Guide title</span>
            <input
              value={editor.title}
              placeholder="e.g. Fastest route to 100%"
              onChange={(event) =>
                setEditor({
                  ...editor,
                  title: event.target.value,
                })
              }
            />
          </label>

          <div className={style.markdownGrid}>
            <label className={style.inputGroup}>
              <span>Markdown</span>
              <textarea
                value={editor.content}
                placeholder={"## Step 1\nDescribe your strategy here..."}
                onChange={(event) =>
                  setEditor({
                    ...editor,
                    content: event.target.value,
                  })
                }
              />
            </label>

            <div className={style.previewBox}>
              <span>Preview</span>

              {editor.content.trim() ? (
                <pre>{editor.content}</pre>
              ) : (
                <p className={style.emptyPreview}>
                  Your markdown preview will appear here.
                </p>
              )}
            </div>
          </div>

          {error && <p className={style.error}>{error}</p>}

          <div className={style.editorActions}>
            <button
              type="button"
              className={style.secondaryButton}
              onClick={closeEditor}
            >
              Cancel
            </button>

            <button
              type="button"
              className={style.saveButton}
              onClick={saveGuide}
            >
              Save guide
            </button>
          </div>
        </section>
      )}

      <div className={style.guideList}>
        {guides.length === 0 && (
          <div className={style.emptyState}>
            <h4>No guides yet.</h4>
            <p>Create the first guide and become dangerously helpful.</p>
          </div>
        )}

        {guides.map((guide) => (
          <article key={guide.id} className={style.guideCard}>
            <div className={style.guideTopRow}>
              <div>
                <div className={style.badgeRow}>
                  {guide.isOwn && <span className={style.ownBadge}>Your guide</span>}
                  {!guide.isOwn && (
                    <span className={style.communityBadge}>Community</span>
                  )}
                </div>

                <h4>{guide.title}</h4>

                <p className={style.meta}>
                  by {guide.authorName} · updated {guide.updatedAt}
                </p>
              </div>

              <button
                type="button"
                className={`${style.favoriteButton} ${
                  guide.isFavorite ? style.favoriteButtonActive : ""
                }`}
                onClick={() => toggleFavorite(guide)}
                aria-label={
                  guide.isFavorite
                    ? "Remove guide from favorites"
                    : "Add guide to favorites"
                }
              >
                {guide.isFavorite ? "★" : "☆"}
              </button>
            </div>

            <pre className={style.guidePreview}>{guide.content}</pre>

            <div className={style.cardActions}>
              {guide.isOwn && (
                <button
                  type="button"
                  className={style.editButton}
                  onClick={() => openEditGuide(guide)}
                >
                  Edit
                </button>
              )}

              <button type="button" className={style.readButton}>
                Read guide
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GuidesTab;