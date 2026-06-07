import style from "./mainPage.module.scss";
import FriendsFeed from "../components/friendsFeed/FriendsFeed";
import WishlistSidebar from "../components/wishlistSidebar/WishlistSidebar";

function MainPage() {
  return (
    <main className={style.mainPage}>
      <div className={style.dashboardSection}>
        <div className={style.feedColumn}>
          <FriendsFeed />
        </div>
        <div className={style.wishlistColumn}>
          <WishlistSidebar />
        </div>
      </div>
    </main>
  );
}

export default MainPage;
