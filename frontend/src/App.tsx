import { Routes, Route } from "react-router-dom";

import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";

import MainPage from "./pages/MainPage";
import Profile from "./pages/ProfilePage";
import Games from "./pages/GamesPage";
import Ranglist from "./pages/RanglistPage";

function App() {
  return (
    <>
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/games" element={<Games />} />
          <Route path="/ranking" element={<Ranglist />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;