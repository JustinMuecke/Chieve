import style from './header.module.scss';

import logoImage from "../../assets/logoImg.png";

function Header() {
    /* Header content */
    return (
        <header className={style.header}>
            <img src={logoImage} alt="Logo" style={{ width: '15%', height: 'auto' }} />
            <h1>Website Name</h1>
            <nav>
                <ul>
                    <li><a href="/Profile">Profile</a></li>
                    <li><a href="/Games">Games</a></li>
                    <li><a href="/Ranglist">Ranking</a></li>
                </ul>
            </nav>
        </header>
    );
}

/* Exports*/
export default Header;

