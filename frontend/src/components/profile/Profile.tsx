import style from './profile.module.scss';


function Profile() {
    return (
        <div className={style.profileContainer}>
            <h2>YOUR Profile</h2>
            
            <div className={style.profileDetails}>
                <p><strong>Name:</strong> Your profile display name</p>
                <p><strong>Tags:</strong> You, need, to, play, moooore</p>
            </div>

            <div className={style.achievements}>
                <h3>Achievements</h3>
                <ul>
                    
                    <li>Achievement 1: Description of achievement 1</li>
                    <li>Achievement 2: Description of achievement 2</li>
                    <li>Achievement 3: Description of achievement 3</li>
                </ul>
                <button className={style.buttonMoreInfo}>More Achievements</button>
            </div>
        </div>
    );
}

/* Exports*/
export default Profile;