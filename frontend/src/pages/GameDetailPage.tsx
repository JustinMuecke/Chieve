import { useParams } from 'react-router-dom';
import { useGameDetail } from '../api/games';
import type { AchievementDetail } from '../api/types';
import style from './gameDetail.module.scss';

function rarityLabel(percent: number | null): string {
  if (percent === null) return '';
  if (percent < 1) return 'Legendary';
  if (percent < 5) return 'Epic';
  if (percent < 15) return 'Rare';
  if (percent < 30) return 'Uncommon';
  return 'Common';
}

function rarityClass(percent: number | null): string {
  if (percent === null) return '';
  if (percent < 1) return style.legendary;
  if (percent < 5) return style.epic;
  if (percent < 15) return style.rare;
  if (percent < 30) return style.uncommon;
  return style.common;
}

function AchievementRow({ a }: { a: AchievementDetail }) {
  return (
    <li className={`${style.achievementRow} ${a.unlocked ? style.unlockedRow : style.lockedRow}`}>
      <div className={style.iconWrap}>
        {a.icon_url ? (
          <img src={a.icon_url} alt="" className={style.icon} />
        ) : (
          <div className={style.iconPlaceholder} />
        )}
      </div>
      <div className={style.achievementInfo}>
        <span className={style.achievementName}>{a.display_name ?? a.api_name}</span>
        {a.description && <span className={style.achievementDesc}>{a.description}</span>}
      </div>
      <div className={style.achievementMeta}>
        {a.global_unlock_percent !== null && (
          <span className={`${style.rarityBadge} ${rarityClass(a.global_unlock_percent)}`}>
            {rarityLabel(a.global_unlock_percent)} · {a.global_unlock_percent.toFixed(1)}%
          </span>
        )}
        <span className={style.pointsBadge}>{a.global_points} pts</span>
        {a.unlocked_at && (
          <span className={style.unlockedDate}>
            {new Date(a.unlocked_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </li>
  );
}

function GameDetailPage() {
  const { app_id } = useParams<{ app_id: string }>();
  const { data: game, isLoading, isError } = useGameDetail(app_id);

  if (isLoading) return <div className={style.state}>Loading game…</div>;
  if (isError || !game) return <div className={style.state}>Failed to load game.</div>;

  const unlocked = game.achievements.filter(a => a.unlocked);
  const locked = game.achievements.filter(a => !a.unlocked);
  const completionPercent = game.achievements.length
    ? Math.round((unlocked.length / game.achievements.length) * 100)
    : 0;

  const heroUrl = app_id
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${app_id}/library_hero.jpg`
    : game.header_image_url;

  return (
    <div className={style.page}>
      {(heroUrl || game.header_image_url) && (
        <img
          src={heroUrl ?? game.header_image_url!}
          alt={game.name}
          className={style.bannerImg}
          onError={e => {
            if (game.header_image_url && e.currentTarget.src !== game.header_image_url) {
              e.currentTarget.src = game.header_image_url;
            }
          }}
        />
      )}

      <div className={style.progressBar}>
        <div
          className={style.progressFill}
          style={{
            width: `${completionPercent}%`,
            filter: `saturate(${0.3 + (completionPercent / 100) * 1.2})`,
          }}
        />
      </div>

      <div className={style.gameInfo}>
        <h2 className={style.gameName}>{game.name}</h2>
        <p className={style.gameStat}>
          <span className={style.completionPercent}>{completionPercent}%</span>
          <span className={style.statDivider}>|</span>
          <span>{unlocked.length} / {game.achievements.length}</span>
        </p>
      </div>

      {unlocked.length > 0 && (
        <section className={style.section}>
          <h3 className={style.sectionTitle}>
            Unlocked <span className={style.count}>{unlocked.length}</span>
          </h3>
          <ul className={style.list}>
            {unlocked.map(a => <AchievementRow key={a.api_name} a={a} />)}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section className={style.section}>
          <h3 className={style.sectionTitle}>
            Locked <span className={style.count}>{locked.length}</span>
          </h3>
          <ul className={style.list}>
            {locked.map(a => <AchievementRow key={a.api_name} a={a} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

export default GameDetailPage;
