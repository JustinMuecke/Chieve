import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGuides, useCreateGuide, useUpdateGuide, uploadGuideImage } from "../api/guides";
import { useGameDetail, useGameCatalog } from "../api/games";
import type { GameCatalogEntry } from "../api/types";
import style from "../components/guides/guidesTab.module.scss";

function GameSelector({
  selectedAppId,
  selectedName,
  onSelect,
  disabled,
}: {
  selectedAppId: string | undefined;
  selectedName: string;
  onSelect: (entry: GameCatalogEntry) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(selectedName); }, [selectedName]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const { data } = useGameCatalog({ q: debouncedQ || undefined, pageSize: 8 });

  if (disabled) {
    return (
      <div className={style.inputGroup}>
        <span>Game</span>
        <input value={selectedName} disabled className={style.gameInputDisabled} />
      </div>
    );
  }

  return (
    <div className={style.inputGroup} ref={wrapRef} style={{ position: "relative" }}>
      <span>Game</span>
      <input
        value={query}
        placeholder="Search for a game…"
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={selectedAppId ? style.gameInputSelected : ""}
      />
      {open && data && data.games.length > 0 && (
        <div className={style.gameDropdown}>
          {data.games.map(g => (
            <button
              key={g.app_id}
              type="button"
              className={`${style.gameDropdownItem} ${String(g.app_id) === selectedAppId ? style.gameDropdownItemActive : ""}`}
              onClick={() => { onSelect(g); setQuery(g.name); setOpen(false); }}
            >
              {g.header_image_url && (
                <img src={g.header_image_url} alt="" className={style.gameDropdownThumb} />
              )}
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuideEditorPage() {
  const { app_id, guide_id } = useParams<{ app_id: string; guide_id?: string }>();
  const navigate = useNavigate();
  const isEdit = guide_id !== undefined;

  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(app_id);
  const [selectedGameName, setSelectedGameName] = useState("");

  const { data: gameDetail } = useGameDetail(app_id);
  useEffect(() => {
    if (gameDetail?.name && !selectedGameName) setSelectedGameName(gameDetail.name);
  }, [gameDetail?.name]);

  const { data: guidesData } = useGuides(app_id);
  const createGuide = useCreateGuide(selectedAppId);
  const updateGuide = useUpdateGuide(app_id);
  const isSaving = createGuide.isPending || updateGuide.isPending;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [uploadingImage, setUploadingImage] = useState(false);
  const headerImageRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(insertion: string) {
    const ta = textareaRef.current;
    if (!ta) { setContent(c => c + insertion); return; }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + insertion + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  }

  async function handleImageFiles(files: FileList | File[]) {
    const images = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploadingImage(true);
    try {
      for (const img of images) {
        const url = await uploadGuideImage(img);
        insertAtCursor(`![](${url})`);
      }
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleImageFiles(e.target.files);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/"));
    if (!images.length) return;
    e.preventDefault();
    handleImageFiles(images);
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const images = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!images.length) return;
    e.preventDefault();
    handleImageFiles(images);
  }

  useEffect(() => {
    if (!isEdit || !guidesData) return;
    const allGuides = [...(guidesData.my_guides ?? []), ...(guidesData.other_guides ?? [])];
    const guide = allGuides.find(g => String(g.id) === guide_id);
    if (!guide) return;
    setTitle(guide.title);
    setDescription(guide.description ?? "");
    setHeaderImagePreview(guide.header_image_url);
    fetch(guide.content_url)
      .then(res => { if (!res.ok) throw new Error(); return res.text(); })
      .then(setContent)
      .catch(() => {});
  }, [isEdit, guide_id, guidesData]);

  const handleSelectGame = useCallback((entry: GameCatalogEntry) => {
    setSelectedAppId(String(entry.app_id));
    setSelectedGameName(entry.name);
  }, []);

  function handleHeaderImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeaderImageFile(file);
    if (file) setHeaderImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!selectedAppId) { setError("Please select a game for this guide."); return; }
    if (!trimmedTitle || !trimmedContent) {
      setError("Please add a title and some guide content before saving.");
      return;
    }
    try {
      if (isEdit && guide_id !== undefined) {
        await updateGuide.mutateAsync({
          guideId: Number(guide_id),
          title: trimmedTitle,
          description,
          content: trimmedContent,
          headerImage: headerImageFile,
        });
        navigate(`/games/${app_id}/guides/${guide_id}`);
      } else {
        const result = await createGuide.mutateAsync({
          title: trimmedTitle,
          description,
          content: trimmedContent,
          headerImage: headerImageFile,
        });
        navigate(`/games/${selectedAppId}/guides/${result.id}`);
      }
    } catch {
      setError("Failed to save guide. Please try again.");
    }
  }

  return (
    <section className={style.editorPanel} style={{ margin: "32px auto", maxWidth: 900 }}>
      <div className={style.editorHeader}>
        <div>
          <p className={style.kicker}>{isEdit ? "Edit Guide" : "New Guide"}</p>
          <h4>{isEdit ? "Update your guide" : "Create a new markdown guide"}</h4>
        </div>
        <button type="button" className={style.closeButton} onClick={() => navigate(-1)}>×</button>
      </div>

      <div className={style.editorMeta}>
        <GameSelector
          selectedAppId={selectedAppId}
          selectedName={selectedGameName}
          onSelect={handleSelectGame}
          disabled={isEdit}
        />

        <label className={style.inputGroup}>
          <span>Title</span>
          <input
            value={title}
            placeholder="e.g. Fastest route to 100%"
            onChange={e => setTitle(e.target.value)}
          />
        </label>

        <label className={style.inputGroup}>
          <span>Short description <span className={style.optional}>(optional)</span></span>
          <input
            value={description}
            placeholder="One sentence about what this guide covers"
            maxLength={500}
            onChange={e => setDescription(e.target.value)}
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

      <div className={style.markdownEditor}>
        <div className={style.markdownTabs}>
          <button
            type="button"
            className={`${style.markdownTab} ${editorTab === "write" ? style.markdownTabActive : ""}`}
            onClick={() => setEditorTab("write")}
          >
            Write
          </button>
          <button
            type="button"
            className={`${style.markdownTab} ${editorTab === "preview" ? style.markdownTabActive : ""}`}
            onClick={() => setEditorTab("preview")}
          >
            Preview
          </button>
          <div className={style.markdownTabSpacer} />
          <button
            type="button"
            className={style.imageInsertBtn}
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage || editorTab === "preview"}
            title="Insert image"
          >
            {uploadingImage ? "Uploading…" : "🖼 Image"}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleImageInputChange}
          />
        </div>

        {editorTab === "write" ? (
          <textarea
            ref={textareaRef}
            className={style.markdownTextarea}
            value={content}
            placeholder={"## Step 1\nDescribe your strategy here...\n\nPaste or drop images directly into this editor."}
            onChange={e => setContent(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          />
        ) : content.trim() ? (
          <div className={style.markdownPreview}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className={style.emptyPreview}>Nothing to preview yet.</p>
        )}
      </div>

      {error && <p className={style.error}>{error}</p>}

      <div className={style.editorActions}>
        <button type="button" className={style.secondaryButton} onClick={() => navigate(-1)} disabled={isSaving}>
          Cancel
        </button>
        <button type="button" className={style.saveButton} onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save guide"}
        </button>
      </div>
    </section>
  );
}

export default GuideEditorPage;
