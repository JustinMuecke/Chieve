import { Link } from 'react-router-dom';
import { useWishlist, useRemoveFromWishlist } from '../../api/recommendations';
import style from './profileWishlist.module.scss';

export default function ProfileWishlist() {
  const { data: items, isLoading, isError } = useWishlist();
  const remove = useRemoveFromWishlist();

  if (isLoading) return <div className={style.emptyState}>Loading wishlist…</div>;
  if (isError) return <div className={style.emptyState}>Could not load wishlist.</div>;

  return (
    <section className={style.profileWishlist}>
      <div className={style.summaryGrid}>
        <article>
          <span>{items?.length ?? 0}</span>
          <p>Saved games</p>
        </article>
        <article>
          <span>{items?.reduce((s, i) => s + i.achievement_count, 0) ?? 0}</span>
          <p>Total achievements</p>
        </article>
        <article>
          <span>{items?.filter(i => i.achievement_count > 50).length ?? 0}</span>
          <p>Large games</p>
        </article>
      </div>

      {!items || items.length === 0 ? (
        <div className={style.emptyState}>
          <h4>Wishlist is empty.</h4>
          <p>
            Head to <Link to="/discover" className={style.link}>Discover</Link> and swipe right on games you want to play.
          </p>
        </div>
      ) : (
        <div className={style.wishlistGrid}>
          {items.map(item => (
            <div key={item.app_id} className={style.wishlistCard}>
              {item.header_image_url && (
                <img src={item.header_image_url} alt="" />
              )}
              <div className={style.cardInfo}>
                <a href={item.steam_url} target="_blank" rel="noreferrer" className={style.cardTitle}>
                  {item.name}
                </a>
                {item.tags && item.tags.length > 0 && (
                  <p className={style.cardTags}>{item.tags.slice(0, 4).join(' · ')}</p>
                )}
                <div className={style.cardMeta}>
                  <span>{item.achievement_count} achievements</span>
                  <button
                    className={style.removeBtn}
                    onClick={() => remove.mutate(item.app_id)}
                    title="Remove from wishlist"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
