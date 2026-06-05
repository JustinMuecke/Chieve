import style from './games.module.scss';


function Games() {
    return (
        <div className={style.gamesContainer}>
            <h2>YOUR GAMES</h2>
            
            <div className={style.gamesDetails}>
                <p><strong>Game 1:</strong> You have completed this game only to 50%!</p>
                <p><strong>Game 2:</strong> Another game you played only for some minutes and completed under 1%</p>
                <p><strong>Game 3:</strong> No other games? - Find a new one to play!</p>

                <button className={style.buttonMoreInfo}>More Games</button>
            </div>
        </div>
    );
}

/* Exports*/
export default Games;