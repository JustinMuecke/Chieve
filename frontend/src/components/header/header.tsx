import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../../assets/logoImg.png";
import { useAuth } from "../../context/AuthContext";
import style from "./header.module.scss";

import HeaderSearch from "../searchBar/HeaderSearch";

import { CgGames, CgProfile } from "react-icons/cg";
import { PiRankingFill } from "react-icons/pi";
import { MdReadMore } from "react-icons/md";
import { LiaUserFriendsSolid } from "react-icons/lia";
import { IoSettingsOutline, IoArrowBackOutline, IoArrowForwardOutline } from "react-icons/io5";
import { IoMdLogOut } from "react-icons/io";


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
      </button>

      {open && (
        <div className={style.dropdown}>
          <button className={style.dropdownItem} onClick={() => { navigate(`/profile/${user.id}`); setOpen(false); }}>
            <CgProfile /><span>Profile</span>
          </button>
          <button className={style.dropdownItem} onClick={() => { navigate("/friends"); setOpen(false); }}>
            <LiaUserFriendsSolid /><span>Friends</span>
          </button>
          <button className={style.dropdownItem} onClick={() => { navigate("/settings"); setOpen(false); }}>
            <IoSettingsOutline /><span>Settings</span>
          </button>
          <hr className={style.dropdownDivider} />
          <button className={`${style.dropdownItem} ${style.dropdownDanger}`} onClick={handleLogout}>
            <IoMdLogOut /><span>Logout</span>
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
      {/* Left: brand */}
      <Link to="/" className={style.brandLink}>
        <img src={logoImage} alt="Website Logo" className={style.logo} />
        <h1 className={style.title}>Chieve Collector</h1>
      </Link>

      {/* Center: back · search · forward */}
      <div className={style.searchCenter}>
        <button type="button" className={style.historyBtn} onClick={() => navigate(-1)} aria-label="Go back" title="Go back"><IoArrowBackOutline /></button>
        <HeaderSearch />
        <button type="button" className={style.historyBtn} onClick={() => navigate(1)} aria-label="Go forward" title="Go forward"><IoArrowForwardOutline /></button>
      </div>

      {/* Right: nav + profile */}
      <div className={style.rightArea}>
        <nav className={style.nav}>
          <Link to="/games" aria-label="Games" title="Games"><CgGames /></Link>
          <Link to="/ranking" aria-label="Ranking" title="Ranking"><PiRankingFill /></Link>
          <Link to="/discover" aria-label="Discover" title="Discover"><MdReadMore /></Link>
        </nav>

        <ProfileDropdown />
      </div>
    </header>
  );
}

export default Header;
