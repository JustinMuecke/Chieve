import style from "./footer.module.scss";

function Footer() {
  return (
    <footer className={style.footer}>
      <div className={style.footerContent}>
        <div>
          <h3 className={style.footerTitle}>Best Team</h3>
          <p className={style.footerText}>
            One profile. Every platform. Infinite reasons to grind.
          </p>
        </div>

        <div className={style.footerMeta}>
          <p>© 2026 Chieve Collector</p>
          <p>Hackathon UUlm</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;