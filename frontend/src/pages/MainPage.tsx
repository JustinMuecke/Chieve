import style from "./mainPage.module.scss";
import AchievementMap from "../components/achievementMap/AchievementMap";
import { Link } from "react-router-dom";

function MainPage() {
  return (
    <main className={style.mainPage}>
      <section className={style.hero}>
        <div className={style.heroText}>
          <p className={style.kicker}>Cross-platform achievement tracking</p>

          <h1>All your achievements. One place. Zero excuses.</h1>

          <p className={style.intro}>
            Track your progress across gaming platforms, compare your scores
            with friends, and find out which achievements still stand between
            you and leaderboard glory.
          </p>

          <div className={style.actions}>
            <Link to="/profile" className={style.primaryButton}>
              Start tracking
            </Link>

            <Link to="/ranking" className={style.secondaryButton}>
              View rankings
            </Link>
          </div>
        </div>

        <AchievementMap />
      </section>

      <section className={style.features}>
        <article>
          <h2>Collect</h2>
          <p>
            Bring achievements from your favorite platforms into one profile.
          </p>
        </article>

        <article>
          <h2>Compare</h2>
          <p>
            See how your progress stacks up against your friends.
          </p>
        </article>

        <article>
          <h2>Compete</h2>
          <p>
            Climb rankings, chase rare achievements, and improve your score.
            Your backlog is judging you. We just made it measurable.
          </p>
        </article>
      </section>

      <section className={style.feedback}>
        <h2>Human in the loop</h2>

        <p>
          Found something weird, unfair, broken, or suspiciously motivating?
          Tell us. The loop must continue.
        </p>

        <textarea placeholder="What should we improve next?" />

        <button>Send feedback into the loop</button>
      </section>
    </main>
  );
}

export default MainPage;