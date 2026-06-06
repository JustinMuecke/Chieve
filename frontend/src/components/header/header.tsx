import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../../assets/logoImg.png";
import { useAuth } from "../../context/AuthContext";
import style from "./header.module.scss";

function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  async function handleLogout() {
    try {
      await fetch("/api/user/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // proceed regardless
    }
    window.location.href = "/";
  }

  return (
    <div className={style.profileWrap} ref={ref}>
      <button className={style.profileTrigger} onClick={() => setOpen(o => !o)}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className={style.profileAvatar} />
        ) : (
          <span className={style.profileInitial}>{user.username[0].toUpperCase()}</span>
        )}
        <span className={style.profileName}>{user.username}</span>
        <span className={style.profileChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={style.dropdown}>
          <button className={style.dropdownItem} onClick={() => { navigate("/profile"); setOpen(false); }}>
            Visit Profile
          </button>
          <button className={style.dropdownItem} onClick={() => { navigate("/settings"); setOpen(false); }}>
            Settings
          </button>
          <hr className={style.dropdownDivider} />
          <button className={`${style.dropdownItem} ${style.dropdownDanger}`} onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const navigate = useNavigate();

  return (
    <header className={style.header}>
      <div className={style.brand}>
        <Link to="/" className={style.brandLink}>
          <img src={logoImage} alt="Website Logo" className={style.logo} />
          <h1 className={style.title}>Chieve Collector</h1>
        </Link>
      </div>


      <div className={style.rightArea}>
        <button
          type="button"
          className={style.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Go back">
          ‹
        </button>
        <nav className={style.nav}>
          <Link to="/games">Games</Link>
          <Link to="/ranking">Ranking</Link>
        </nav>

        <ProfileDropdown />
      </div>
    </header>
  );
}

export default Header;