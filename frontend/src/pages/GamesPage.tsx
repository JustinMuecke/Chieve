import Games from '../components/games/Games';
import Header from '../components/header/Header';
import React  from 'react';  
import Footer from '../components/footer/Footer';

function GamesPage() {
    
    return (
        <>
        
        <div>
            <Header />
            <Games />
            <Footer />
            {/* Other components or content */}
        </div>
        </>
    )
    ;
}


export default GamesPage;