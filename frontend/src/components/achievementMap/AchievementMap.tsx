import style from "./achievementMap.module.scss";

function AchievementMap() {
  return (
    <div className={style.map}>
      <div className={`${style.hex} ${style.center}`}>
        <span>🏆</span>
        <p>Unified Profile</p>
      </div>

      <div className={`${style.hex} ${style.steam}`}>
        <span>🎮</span>
        <p>Steam</p>
      </div>

      <div className={`${style.hex} ${style.epic}`}>
        <span>⚡</span>
        <p>Epic</p>
      </div>

      <div className={`${style.hex} ${style.achievements}`}>
        <span>⭐</span>
        <p>Achievements</p>
      </div>

      <div className={`${style.hex} ${style.ranking}`}>
        <span>📈</span>
        <p>Ranking</p>
      </div>

      <div className={`${style.hex} ${style.friends}`}>
        <span>👥</span>
        <p>Friends</p>
      </div>

      <div className={`${style.hex} ${style.stats}`}>
        <span>📊</span>
        <p>Stats</p>
      </div>
    </div>
  );
}

export default AchievementMap;