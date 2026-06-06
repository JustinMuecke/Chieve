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

function App() {
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) return null;
  if (isError || !user) return <LoginPage />;

  return (
    <AuthContext.Provider value={{ user }}>
      <div>
        <Header />

        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:app_id" element={<GameDetail />} />
          <Route path="/ranking" element={<Ranglist />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/friends" element={<FriendsPage />} />
        </Routes>

        <Footer />
      </div>
    </AuthContext.Provider>
  );
}

export default App;