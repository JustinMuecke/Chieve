import style from "./footer.module.scss";

function Footer() {
  return (
    <footer className={style.footer}>
      <div className={style.footerContent}>
        <div>
          <h3 className={style.footerTitle}>Best team combinations</h3>
          <p className={style.footerText}>
            Discover your gaming achievements across different platforms.
          </p>
        </div>

        <div className={style.footerMeta}>
          <p>© 2026 Your Company</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;