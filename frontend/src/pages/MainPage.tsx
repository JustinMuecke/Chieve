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
            <Footer />

        </div>
        </>
    )
    ;
}


export default MainPage;
