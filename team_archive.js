class TeamArchive {
    constructor() {
        this.listContainer = document.getElementById('archive-list');
        this.loadArchive();
    }

    loadArchive() {
        const raw = localStorage.getItem('tt_team_archive');
        if (!raw) {
            this.renderEmpty();
            return;
        }

        try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || data.length === 0) {
                this.renderEmpty();
                return;
            }

            // Sort by Date Descending
            data.sort((a, b) => b.id - a.id);
            this.renderList(data);
        } catch (e) {
            console.error('Failed to parse archive', e);
            this.renderEmpty();
        }
    }

    renderEmpty() {
        this.listContainer.innerHTML = '<div class="empty-archive">Zatiaľ žiadne uložené zápasy.</div>';
    }

    renderList(data) {
        this.listContainer.innerHTML = '';
        data.forEach(item => {
            const el = document.createElement('div');
            el.className = 'archive-item';
            el.id = `archive-item-${item.id}`;

            // Format Date
            const d = new Date(item.date);
            const dateStr = d.toLocaleDateString('sk-SK');

            el.innerHTML = `
                <div class="archive-header" onclick="archive.toggle(${item.id})">
                    <div class="archive-info">
                        <span class="archive-date">${dateStr}</span>
                        <span class="archive-teams">${item.homeTeam} vs ${item.guestTeam}</span>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <span class="archive-score">${item.finalScore}</span>
                        <button class="btn-expand">▼</button>
                    </div>
                </div>
                <div class="archive-details" id="details-${item.id}">
                    <div class="details-content">
                        <!-- Stats Summary -->
                        <div class="stat-grid">
                            <div class="stat-item">
                                <h4>ZÁPASY</h4>
                                <strong>${item.statistics.matches}</strong>
                            </div>
                            <div class="stat-item">
                                <h4>SETY</h4>
                                <strong>${item.statistics.sets}</strong>
                            </div>
                            <div class="stat-item">
                                <h4>LOPTIČKY</h4>
                                <strong>${item.statistics.balls}</strong>
                            </div>
                        </div>

                        <!-- Match Table -->
                        <table class="match-table" style="margin-bottom: 1rem;">
                            <thead>
                                <tr>
                                    <th style="width: 40px;">#</th>
                                    <th>Domáci</th>
                                    <th>Hostia</th>
                                    <th>Sety (Detail)</th>
                                    <th>Sety</th>
                                    <th>Stav</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateRows(item.matches)}
                            </tbody>
                        </table>

                        <div style="text-align: right; margin-top: 1rem;">
                            <button class="btn-danger" onclick="archive.deleteItem(${item.id}, event)">ODSTRÁNIŤ ZÁZNAM</button>
                        </div>
                    </div>
                </div>
            `;

            this.listContainer.appendChild(el);
        });
    }

    generateRows(matches) {
        return matches.map(m => `
            <tr>
                <td>${m.number}</td>
                <td>${m.homePlayer}</td>
                <td>${m.guestPlayer}</td>
                <td style="color: var(--secondary-text); font-family: monospace;">${m.sets.filter(s => s).join(' | ')}</td>
                <td style="font-weight: bold;">${m.setsResult}</td>
                <td style="font-weight: bold; color: var(--score-color);">${m.runningScore}</td>
            </tr>
        `).join('');
    }

    toggle(id) {
        const item = document.getElementById(`archive-item-${id}`);
        item.classList.toggle('expanded');
    }

    deleteItem(id, event) {
        event.stopPropagation(); // prevent toggle
        if (!confirm('Naozaj chcete odstrániť tento zápas z archívu?')) return;

        const raw = localStorage.getItem('tt_team_archive');
        if (raw) {
            let data = JSON.parse(raw);
            data = data.filter(i => i.id !== id);
            localStorage.setItem('tt_team_archive', JSON.stringify(data));
            this.loadArchive();
        }
    }
}

const archive = new TeamArchive();
window.archive = archive;
