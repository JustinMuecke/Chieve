import Footer from '../components/footer/Footer';
import Header from '../components/header/Header';
import React  from 'react';  
import mainPageImage from "../assets/mainPageImage.png";



function MainPage() {
    
    return (
        <>
        <div>
            <Header />
            {/* Other components or content */}
            <h1>Welcome to the Main Page</h1>
            <p>Here you can find all achievements from your various gaming plattforms. Enjoy the loss in your comparisons.</p>
            <img src={mainPageImage} alt="Main Page Image" style={{ width: '100%', height: 'auto' }} />
            <p>Collect. Compare. Compete.
                Join our cross-platform achievement hunting community. Improve your metascore by completing achievements in your favorite games. Compare your score with your friends.
                Now. Hit the top lists and boast your scores.
                All of gaming, together
                PlayTracker connects to the most popular gaming platforms out there and unites gamer data. All games, achievements, stats, and graphs - now in one place.

                Unite your gaming multiverse. Link your gaming platforms and PlayTracker will create a unified profile and game library for you, as well as pull interesting stats and graphs about your gaming career. Connect Steam, PlayStation, XBOX, Nintendo, GOG, Epic Games, Riot, Battle.Net, RetroAchievements, and more! Level up and show off
                As you play on any platform, your game data will automatically sync to PlayTracker and you'll earn XP and level up, unlocking new cosmetic options for your profile like cover images, user titles, and stickers. Enhanced support for the biggest games. Certain special games are a big part of your gaming career, and your gamer level needs to reflect those accomplishments. Enhanced tracking of in-game stats and achievements is available for World of Warcraft, League of Legends, Dota 2, Guild Wars 2, Sea of Thieves, and more. Complete exciting challenges Earn rewards each season by completing challenges, clearing your backlog, competing with friends, or ranking on achievement hunting leaderboards. The best players even get free games every season!
                </p>
            <Footer />

        </div>
        </>
    )
    ;
}


export default MainPage;
