import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  fetchRecommendations,
  useAddToWishlist,
  useDismiss,
  useRemoveFromWishlist,
  useWishlist,
  type RecommendationItem,
} from '../api/recommendations';
import style from './discoverPage.module.scss';

type Tab = 'discover' | 'wishlist';
type ExitDir = 'left' | 'right' | null;

function RecommendCard({
  item,
  exitDir,
  depth,
  anchorGameName,
}: {
  item: RecommendationItem;
  exitDir: ExitDir;
  depth: number;
  anchorGameName: string | null;
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [descTruncated, setDescTruncated] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (el) setDescTruncated(el.scrollHeight > el.clientHeight);
  }, []);

  const depthClass = depth === 0 ? '' : depth === 1 ? style.cardDepth1 : style.cardDepth2;
  const exitClass = exitDir === 'left' ? style.exitLeft : exitDir === 'right' ? style.exitRight : '';

  return (
    <div className={`${style.card} ${depthClass} ${exitClass}`}>

      {depth === 0 && anchorGameName && (
        <div className={style.cardHeader}>
          <span>Similar to <strong>{anchorGameName}</strong></span>
          <span className={style.matchText}>{Math.round(item.similarity_score * 100)}% match</span>
        </div>
      )}

      <div className={style.cardImage}>
        {item.header_image_url
          ? <img src={item.header_image_url} alt={item.name} />
          : <div className={style.cardImageFallback} />}
        <div className={style.cardImageOverlay} />
        <div className={style.cardBannerBottom}>
          <h2 className={style.cardTitle}>{item.name}</h2>
        </div>
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className={style.tagRow}>
          {item.tags.slice(0, 5).map((tag, i) => (
            <span key={tag} className={style.tag}>
              {i > 0 && <span className={style.tagSep}> · </span>}{tag}
            </span>
          ))}
        </div>
      )}

      <div className={style.cardBody}>
        {item.description && (
          <div className={style.descriptionBox}>
            <p
              ref={descRef}
              className={`${style.cardDescription} ${descExpanded ? style.cardDescriptionExpanded : ''}`}
            >
              {item.description}
            </p>
            {(descTruncated || descExpanded) && (
              <button
                type="button"
                className={style.descToggle}
                onClick={e => { e.stopPropagation(); setDescExpanded(v => !v); }}
              >
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <div className={style.cardMeta}>
          <span className={style.achievementCount}>🏆 {item.achievement_count} achievements</span>
          <a
            href={item.steam_url}
            target="_blank"
            rel="noopener noreferrer"
            className={style.steamLink}
            onClick={e => e.stopPropagation()}
          >
            Steam ↗
          </a>
        </div>
      </div>

    </div>
  );
}

interface BufferedCard {
  item: RecommendationItem;
  anchorGameName: string | null;
}

const BUFFER_SIZE = 3;

function DiscoverStack() {
  const [buffer, setBuffer] = useState<BufferedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [exitDir, setExitDir] = useState<ExitDir>(null);
  const isBusy = useRef(false);
  const seenIds = useRef(new Set<number>());

  const dismiss = useDismiss();
  const addToWishlist = useAddToWishlist();

  const fetchOne = useCallback(async () => {
    try {
      const data = await fetchRecommendations(1);
      if (!data.items.length) {
        setExhausted(true);
        return;
      }
      const item = data.items[0];
      if (seenIds.current.has(item.app_id)) return;
      seenIds.current.add(item.app_id);
      setBuffer(prev => [...prev, { item, anchorGameName: data.anchor_game_name }]);
    } catch {
      setExhausted(true);
    }
  }, []);

  useEffect(() => {
    Promise.all(Array.from({ length: BUFFER_SIZE }, fetchOne))
      .finally(() => setIsLoading(false));
  }, [fetchOne]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handleAction('left');
      if (e.key === 'ArrowRight') handleAction('right');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function handleAction(dir: 'left' | 'right') {
    if (!buffer[0] || isBusy.current) return;
    isBusy.current = true;

    const card = buffer[0];
    setExitDir(dir);

    if (dir === 'right') {
      addToWishlist.mutate(card.item.app_id);
    } else {
      dismiss.mutate(card.item.app_id);
    }

    setTimeout(() => {
      setBuffer(prev => prev.slice(1));
      setExitDir(null);
      isBusy.current = false;
      if (!exhausted) fetchOne();
    }, 300);
  }

  if (isLoading) {
    return (
      <div className={style.emptyState}>
        <div className={style.spinner} />
        <p>Finding games for you…</p>
      </div>
    );
  }

  if (buffer.length === 0) {
    return (
      <div className={style.emptyState}>
        <span className={style.emptyIcon}>🎮</span>
        <h3>You've seen it all</h3>
        <p>Check back after syncing more games — we'll find new matches.</p>
      </div>
    );
  }

  return (
    <div className={style.stackArea}>
      <button
        type="button"
        className={`${style.actionBtn} ${style.dismissBtn}`}
        onClick={() => handleAction('left')}
        title="Skip (←)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span className={style.btnLabel}>Skip</span>
      </button>

      <div className={style.stack}>
        {buffer.slice(0, 3).map((card, i) => (
          <RecommendCard
            key={card.item.app_id}
            item={card.item}
            exitDir={i === 0 ? exitDir : null}
            depth={i}
            anchorGameName={i === 0 ? card.anchorGameName : null}
          />
        ))}
      </div>

      <button
        type="button"
        className={`${style.actionBtn} ${style.wishlistBtn}`}
        onClick={() => handleAction('right')}
        title="Save to wishlist (→)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
        <span className={style.btnLabel}>Save</span>
      </button>
    </div>
  );
}

function WishlistGrid() {
  const { data: items, isLoading, isError } = useWishlist();
  const remove = useRemoveFromWishlist();

  if (isLoading) return <div className={style.emptyState}><div className={style.spinner} /><p>Loading wishlist…</p></div>;
  if (isError) return <div className={style.emptyState}><p>Could not load wishlist.</p></div>;
  if (!items || items.length === 0) {
    return (
      <div className={style.emptyState}>
        <span className={style.emptyIcon}>★</span>
        <h3>Your wishlist is empty</h3>
        <p>Save games from the Discover tab to build your list.</p>
      </div>
    );
  }

  return (
    <div className={style.wishlistGrid}>
      {items.map(item => (
        <div key={item.app_id} className={style.wishCard}>
          {item.header_image_url && (
            <img src={item.header_image_url} alt={item.name} className={style.wishCardImg} />
          )}
          <div className={style.wishCardBody}>
            <h3 className={style.wishCardTitle}>{item.name}</h3>
            {item.tags && item.tags.length > 0 && (
              <div className={style.tagRow}>
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag} className={style.tag}>{tag}</span>
                ))}
              </div>
            )}
            <div className={style.wishCardMeta}>
              <span className={style.achievementCount}>🏆 {item.achievement_count}</span>
              <div className={style.wishCardActions}>
                <a
                  href={item.steam_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={style.steamLink}
                >
                  Steam ↗
                </a>
                <button
                  type="button"
                  className={style.removeBtn}
                  onClick={() => remove.mutate(item.app_id)}
                  disabled={remove.isPending}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('discover');

  return (
    <main className={style.page}>
      <div className={style.inner}>
        <div className={style.tabBar}>
          <button
            type="button"
            className={`${style.tabBtn} ${tab === 'discover' ? style.tabBtnActive : ''}`}
            onClick={() => setTab('discover')}
          >
            Discover
          </button>
          <button
            type="button"
            className={`${style.tabBtn} ${tab === 'wishlist' ? style.tabBtnActive : ''}`}
            onClick={() => setTab('wishlist')}
          >
            Wishlist
          </button>
        </div>

        {tab === 'discover' ? <DiscoverStack /> : <WishlistGrid />}
      </div>
    </main>
  );
}

export default DiscoverPage;
