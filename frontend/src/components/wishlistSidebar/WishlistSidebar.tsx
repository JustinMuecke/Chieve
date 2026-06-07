import { Link } from 'react-router-dom';
import { useWishlist, useRemoveFromWishlist } from '../../api/recommendations';
import style from './wishlistSidebar.module.scss';

export default function WishlistSidebar() {
  const { data: items, isLoading, isError } = useWishlist();
  const remove = useRemoveFromWishlist();

  return (
    <div className={style.wrap}>
      <h2 className={style.title}>Wishlist</h2>

      {isLoading && <p className={style.state}>Loading…</p>}
      {isError && <p className={style.state}>Could not load wishlist.</p>}
      {items && items.length === 0 && (
        <p className={style.state}>
          Swipe right on a game in{' '}
          <Link to="/discover" className={style.discoverLink}>Discover</Link>{' '}
          to add it here.
        </p>
      )}

      {items && items.map(item => (
        <div key={item.app_id} className={style.item}>
          {item.header_image_url
            ? <img src={item.header_image_url} alt="" className={style.thumb} />
            : <div className={style.thumbPlaceholder} />
          }
          <div className={style.info}>
            <a href={item.steam_url} target="_blank" rel="noreferrer" className={style.name}>
              {item.name}
            </a>
            <span className={style.meta}>{item.achievement_count} achievements</span>
          </div>
          <button
            className={style.removeBtn}
            onClick={() => remove.mutate(item.app_id)}
            title="Remove from wishlist"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
