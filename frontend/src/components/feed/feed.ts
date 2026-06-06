// Interfaces definieren die Struktur der Backend-Daten
interface Achievement {
    title: string;
    timestamp: string | number | Date; // Akzeptiert ISO-Strings, Timestamps oder Date-Objekte
}

interface Player {
    id: string | number;
    name: string;
    game: string;
    achievements: Achievement[];
}

// Wir importieren die Funktion. (Hinweis: Je nach Projektkonfiguration importiert man in TS oft ohne die Endung '.js')
import { fetchFeed } from './api.js';

// 'as HTMLDivElement' stellt sicher, dass TS weiß, dass es sich um ein valides Container-Element handelt
const feedContainer = document.getElementById('feed-container') as HTMLDivElement | null;

function renderFeed(): void {
    // Falls der Container im DOM nicht existiert, brechen wir sicherheitshalber ab
    if (!feedContainer) return;

    // Wir sagen TS, dass die empfangenen Daten ein Array von Playern sind
    const feedData: Player[] = fetchFeed();
    feedContainer.innerHTML = '';

    feedData.forEach((player: Player) => {
        const card = document.createElement('div');
        card.className = 'feed-card';

        const achievementsHTML: string = player.achievements.map((ach: Achievement) => {
            const dateFormatted = new Date(ach.timestamp).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `<li><strong>${ach.title}</strong> <span style="font-size: 11px; color: #8892b0; margin-left: 10px;">(${dateFormatted})</span></li>`;
        }).join('');

        card.innerHTML = `
            <div class="feed-header">
                <h3>${player.name} (${player.game})</h3>
            </div>
            <ul class="achievements-list show" id="list-${player.id}">
                ${achievementsHTML}
            </ul>
        `;

        feedContainer.appendChild(card);
    });
}

renderFeed();
