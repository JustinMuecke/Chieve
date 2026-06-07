import { Routes, Route } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { useMe } from "./api/auth";

import Header from "./components/header/header";
import Footer from "./components/footer/Footer";
import LoginPage from "./pages/LoginPage";

import MainPage from "./pages/MainPage";
import Profile from "./pages/ProfilePage";
import Games from "./pages/GamesPage";
import GameDetail from "./pages/GameDetailPage";
import Ranglist from "./pages/RanglistPage";
import Settings from "./pages/SettingsPage";

import FriendsPage from "./pages/FriendsPage";
import ProfilePage from "./pages/ProfilePage";
import DiscoverPage from "./pages/DiscoverPage";
import GuideViewPage from "./pages/GuideViewPage";
import GuideEditorPage from "./pages/GuideEditorPage";
import GuidesPage from "./pages/GuidesPage";

function App() {
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) return null;
  if (isError || !user) return <LoginPage />;

  return (
    <AuthContext.Provider value={{ user }}>
      <div style={{ display: 'contents' }}>
        <Header />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:user_id" element={<Profile />} />
            <Route path="/profile/:user_id" element={<ProfilePage />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:app_id" element={<GameDetail />} />
            <Route path="/games/:app_id/guides/new" element={<GuideEditorPage />} />
            <Route path="/games/:app_id/guides/:guide_id/edit" element={<GuideEditorPage />} />
            <Route path="/games/:app_id/guides/:guide_id" element={<GuideViewPage />} />
            <Route path="/ranking" element={<Ranglist />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/guides" element={<GuidesPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </AuthContext.Provider>
  );
}

export default App;