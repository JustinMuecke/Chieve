import style from './ranglist.module.scss';


function Ranglist() {
    return (
        <div className={style.ranglistContainer}>
            <h2>YOUR Ranglist</h2>
            
            <div className={style.ranglistDetails}>
                <p><strong>Position 1:</strong> You will be at the top!</p>
                <p><strong>Position 2:</strong> Another user</p>
                <p><strong>Position 3:</strong> Yet another user</p>

                <button className={style.buttonMoreInfo}>More Info</button>
            </div>
        </div>
    );
}

/* Exports*/
export default Ranglist;