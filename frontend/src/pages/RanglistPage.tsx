import Footer from '../components/footer/Footer';
import Header from '../components/header/Header';
import React from 'react';
import Ranglist from '../components/ranglist/Ranglist';

function RanglistPage() {
    return (
        <>
            <div>
                <Header />
                <Ranglist />
                <Footer />
                {/* Other components or content */}
            </div>
        </>
    );
}


export default RanglistPage;