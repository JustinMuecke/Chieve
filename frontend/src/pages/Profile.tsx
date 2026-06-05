import Profile from '../components/profile/Profile';
import Header from '../components/header/Header';
import React  from 'react';  
import Footer from '../components/footer/Footer';

function ProfilePage() {
    
    return (
        <>
        <div>
            <Header />
            <Profile />
            <Footer />
            {/* Other components or content */}
        </div>
        </>
    )
    ;
}


export default ProfilePage;