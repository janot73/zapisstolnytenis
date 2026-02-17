class Game {
  constructor() {
    this.state = {
      players: [
        { name: 'Hráč 1', club: 'Klub A', score: 0, sets: 0 },
        { name: 'Hráč 2', club: 'Klub B', score: 0, sets: 0 }
      ],
      currentSet: 1,
      matchFinished: false,
      firstServerOfSet: 0, // 0 for Player 1, 1 for Player 2
      history: [] // Array of string results "11-9"
    };

    this.winningSetsRequired = 3; // Default Best of 5

    // Initialize UI
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Inputs
    document.querySelector('#player1 .player-name').addEventListener('input', (e) => {
      this.state.players[0].name = e.target.value;
      this.updateUI(); // Update history labels
    });
    document.querySelector('#player1 .player-club').addEventListener('input', (e) => {
      this.state.players[0].club = e.target.value;
    });
    document.querySelector('#player2 .player-name').addEventListener('input', (e) => {
      this.state.players[1].name = e.target.value;
      this.updateUI();
    });
    document.querySelector('#player2 .player-club').addEventListener('input', (e) => {
      this.state.players[1].club = e.target.value;
    });
  }

  setMatchLength(val) {
    if (this.state.players[0].score > 0 || this.state.players[1].score > 0 || this.state.history.length > 0) {
      if (!confirm('Zmena dĺžky zápasu počas hry môže ovplyvniť výsledok. Pokračovať?')) {
        // Revert select check? For simplicity leaving as is, user warned.
        return;
      }
    }
    const total = parseInt(val);
    this.winningSetsRequired = Math.ceil(total / 2);
    this.updateUI();
  }

  updateScore(playerIndex, delta) {
    if (this.state.matchFinished) return;

    const p = this.state.players[playerIndex];

    // Prevent negative score
    if (delta < 0 && p.score === 0) return;

    p.score += delta;

    this.updateUI();
  }

  confirmSetEnd() {
    const p1 = this.state.players[0];
    const p2 = this.state.players[1];

    if (!((p1.score >= 11 || p2.score >= 11) && Math.abs(p1.score - p2.score) >= 2)) {
      return;
    }

    this.endSet();
  }

  endSet() {
    const p1 = this.state.players[0];
    const p2 = this.state.players[1];

    // Record history
    this.state.history.push({
      p1: p1.score,
      p2: p2.score
    });

    // Award Set
    if (p1.score > p2.score) {
      p1.sets++;
    } else {
      p2.sets++;
    }

    // Check Match Winner
    if (p1.sets === this.winningSetsRequired || p2.sets === this.winningSetsRequired) {
      this.state.matchFinished = true;
    } else {
      // Prepare next set
      this.state.currentSet++;
      p1.score = 0;
      p2.score = 0;
      // Switch first server for next set
      this.state.firstServerOfSet = 1 - this.state.firstServerOfSet;
    }

    this.updateUI();
  }

  resetCurrentSet() {
    if (this.state.matchFinished) return;
    this.state.players[0].score = 0;
    this.state.players[1].score = 0;
    this.updateUI();
  }

  resetMatch() {
    if (!confirm('Naozaj chcete resetovať celý zápas?')) return;

    this.state.players[0].score = 0;
    this.state.players[1].score = 0;
    this.state.players[0].sets = 0;
    this.state.players[1].sets = 0;
    this.state.currentSet = 1;
    this.state.matchFinished = false;
    this.state.history = [];
    this.state.firstServerOfSet = 0; // Reset to default

    this.updateUI();
  }

  toggleServer() {
    if (this.state.matchFinished) return;
    this.state.firstServerOfSet = 1 - this.state.firstServerOfSet;
    this.updateUI();
  }

  saveMatch() {
    if (!this.state.matchFinished) return;

    const matchData = {
      id: Date.now(),
      date: new Date().toLocaleString('sk-SK'),
      p1: { ...this.state.players[0] },
      p2: { ...this.state.players[1] },
      history: [...this.state.history]
    };

    const archive = JSON.parse(localStorage.getItem('tt_archive')) || [];
    archive.unshift(matchData); // Add to beginning
    localStorage.setItem('tt_archive', JSON.stringify(archive));

    // Optional: Reset after save? or just disable button?
    alert('Zápas bol uložený do archívu.');
    const btn = document.getElementById('btn-save-match');
    btn.classList.add('hidden');
    btn.classList.add('hidden-by-save');
  }

  getServer() {
    // Calculate who is serving based on standard rules
    // Total points in current set
    const totalPoints = this.state.players[0].score + this.state.players[1].score;

    // Logic:
    // Regular: Change every 2 points.
    // Deuce (>= 10-10): Change every 1 point.

    let serverOffset = 0;

    if (this.state.players[0].score >= 10 && this.state.players[1].score >= 10) {
      // Deuce logic
      // Points after 20 (10+10)
      const pointsAfterDeuce = totalPoints - 20;
      serverOffset = pointsAfterDeuce; // Changes every 1 point
    } else {
      // Regular logic
      serverOffset = Math.floor(totalPoints / 2);
    }

    // Combine with first server of the set
    // total shifts = serverOffset
    // current = (start + shift) % 2
    return (this.state.firstServerOfSet + serverOffset) % 2;
  }

  updateUI() {
    const p1 = this.state.players[0];
    const p2 = this.state.players[1];

    // Scores
    document.getElementById('score-p1').textContent = p1.score;
    document.getElementById('score-p2').textContent = p2.score;
    document.getElementById('sets-p1').textContent = p1.sets;
    document.getElementById('sets-p2').textContent = p2.sets;

    // Names in history labels (if changed)
    document.getElementById('label-p1').textContent = p1.name || 'Hráč 1';
    document.getElementById('label-p2').textContent = p2.name || 'Hráč 2';

    // Server Indicator
    const currentServer = this.getServer();
    const ind1 = document.getElementById('service-p1');
    const ind2 = document.getElementById('service-p2');

    if (this.state.matchFinished) {
      ind1.classList.add('hidden');
      ind2.classList.add('hidden');
    } else {
      if (currentServer === 0) {
        ind1.classList.remove('hidden');
        ind2.classList.add('hidden');
      } else {
        ind1.classList.add('hidden');
        ind2.classList.remove('hidden');
      }
    }

    // Colors/Styles for winner
    const score1El = document.getElementById('score-p1');
    const score2El = document.getElementById('score-p2');

    score1El.style.color = '';
    score2El.style.color = '';

    if (this.state.matchFinished) {
      if (p1.sets > p2.sets) score1El.style.color = '#4ade80'; // Green for winner
      if (p2.sets > p1.sets) score2El.style.color = '#4ade80';
    }

    // Close Set Button Visibility
    const btnCloseSet = document.getElementById('btn-close-set');
    if (!this.state.matchFinished && (p1.score >= 11 || p2.score >= 11) && Math.abs(p1.score - p2.score) >= 2) {
      btnCloseSet.classList.remove('hidden');
    } else {
      btnCloseSet.classList.add('hidden');
    }

    // Save Button Visibility
    const btnSave = document.getElementById('btn-save-match');
    if (btnSave) { // Check existence
      if (this.state.matchFinished) {
        // Only show if not already saved? 
        // For simplicity, we show it, but logic in saveMatch hides it.
        // However, on updateUI we might unhide it if we don't track "saved" state in memory. 
        // Better to check if we just finished. 
        // Since updateUI is called often, let's just show it if match is finished and let the user click it.
        // The saveMatch function hides it. We need to be careful not to unhide it if it was hidden.

        // Simple check: if class hidden is present, keep it hidden? 
        // No, because if we reload page with finished state (not persisting state though), it would be hidden.
        // Since we don't persist current match state across reload, only archive, this is fine.
        // But if I call updateUI after saving (e.g. changing name), it might reappear.
        // Let's add a flag or just rely on manual hide.
        if (!btnSave.classList.contains('hidden-by-save')) {
          btnSave.classList.remove('hidden');
        }
      } else {
        btnSave.classList.add('hidden');
        btnSave.classList.remove('hidden-by-save'); // Reset flag
      }
    }

    // History Grid
    // Clear all first
    for (let i = 1; i <= 7; i++) {
      const el1 = document.getElementById(`h-p1-s${i}`);
      const el2 = document.getElementById(`h-p2-s${i}`);
      if (el1 && el2) {
        el1.textContent = '-';
        el2.textContent = '-';
        el1.style.opacity = '0.5';
        el2.style.opacity = '0.5';
        el1.style.color = '';
        el2.style.color = '';
      }
    }

    // Fill existing history
    this.state.history.forEach((set, index) => {
      const setNum = index + 1;
      const cell1 = document.getElementById(`h-p1-s${setNum}`);
      const cell2 = document.getElementById(`h-p2-s${setNum}`);

      if (cell1 && cell2) {
        cell1.textContent = set.p1;
        cell2.textContent = set.p2;

        cell1.style.opacity = '1';
        cell2.style.opacity = '1';

        // Highlight winner
        if (set.p1 > set.p2) {
          cell1.style.color = '#fbbf24';
        } else {
          cell2.style.color = '#fbbf24';
        }
      }
    });

    // Highlight current set column header if not finished
    // You might want to add a class to the header, but strictly not required by prompt
  }
}

// Logic for Archive Page
class ArchiveView {
  constructor() {
    this.archive = JSON.parse(localStorage.getItem('tt_archive')) || [];
    this.renderArchive();
    window.game = this; // To allow onclick deleteMatch
  }

  deleteMatch(id) {
    if (!confirm('Naozaj vymazať tento záznam?')) return;
    this.archive = this.archive.filter(m => m.id !== id);
    localStorage.setItem('tt_archive', JSON.stringify(this.archive));
    this.renderArchive();
  }

  renderArchive() {
    const list = document.getElementById('archive-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.archive.length === 0) {
      list.innerHTML = '<div class="empty-archive">Žiadne uložené zápasy.</div>';
      return;
    }

    this.archive.forEach(match => {
      const item = document.createElement('div');
      item.className = 'archive-item';

      // Format history string e.g. "11-9, 5-11, 12-10"
      const historyStr = match.history.map(h => `${h.p1}-${h.p2}`).join(', ');

      item.innerHTML = `
            <div class="archive-info">
                <span class="archive-date">${match.date}</span>
                <span class="archive-names">${match.p1.name} vs ${match.p2.name}</span>
                <div class="archive-result-row">
                    <span class="archive-result">${match.p1.sets} : ${match.p2.sets}</span>
                    <span class="archive-details">(${historyStr})</span>
                </div>
            </div>
            <button class="btn-delete-archive" onclick="game.deleteMatch(${match.id})">🗑️</button>
          `;

      list.appendChild(item);
    });
  }
}

// Initialization Logic
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.scoreboard')) {
    // We are on index.html
    window.game = new Game();
  } else if (document.getElementById('archive-list')) {
    // We are on archive.html
    new ArchiveView();
  }
});
