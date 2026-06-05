import { Link, useNavigate } from "react-router-dom";
import logoImage from "../../assets/logoImg.png";
import style from "./header.module.scss";

function Header() {
  const navigate = useNavigate();

  return (
    <header className={style.header}>
      <div className={style.brand}>
        <img src={logoImage} alt="Website Logo" className={style.logo} />
        <h1 className={style.title}>Chieve Collector</h1>
      </div>

      <div className={style.rightArea}>
        <nav className={style.nav}>
          <Link to="/profile">Profile</Link>
          <Link to="/games">Games</Link>
          <Link to="/ranking">Ranking</Link>    
        </nav>

        <button className={style.backButton} onClick={() => navigate(-1)}>
          ←
        </button>
      </div>
    </header>
  );
}

export default Header;