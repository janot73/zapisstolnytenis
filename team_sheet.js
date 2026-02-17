class TeamSheet {
    constructor() {
        this.variant = '4rounds';
        this.doublesCount = 2;
        this.matches = [];
        this.players = {
            home: { A: '', B: '', C: '', D: '' },
            guest: { X: '', Y: '', Z: '', U: '' }
        };
        // Per-match substitution map: matchNumber -> { home: boolean, guest: boolean }
        // We will also store the sub names in the DOM primarily, or here?
        // Let's rely on DOM state + saveState capturing inputs.
        this.matchSubstitutions = {};

        // Definition of the rotation
        this.rotation4 = [
            // Round 1 (0-3)
            { home: 'A', guest: 'X', round: 1 },
            { home: 'B', guest: 'Y', round: 1 },
            { home: 'C', guest: 'Z', round: 1 },
            { home: 'D', guest: 'U', round: 1 },
            // Round 2 (4-7)
            { home: 'B', guest: 'X', round: 2 },
            { home: 'C', guest: 'Y', round: 2 },
            { home: 'D', guest: 'Z', round: 2 },
            { home: 'A', guest: 'U', round: 2 },
            // Round 3 (8-11)
            { home: 'C', guest: 'X', round: 3 },
            { home: 'D', guest: 'Y', round: 3 },
            { home: 'A', guest: 'Z', round: 3 },
            { home: 'B', guest: 'U', round: 3 },
            // Round 4 (12-15)
            { home: 'D', guest: 'X', round: 4 },
            { home: 'A', guest: 'Y', round: 4 },
            { home: 'B', guest: 'Z', round: 4 },
            { home: 'C', guest: 'U', round: 4 },
        ];

        this.init();
    }

    init() {
        // Load date
        document.getElementById('match-date').valueAsDate = new Date();

        // Try to load state
        if (localStorage.getItem('tt_team_current_sheet')) {
            this.loadState();
        } else {
            this.updateVariant();
        }
    }

    // Auto-Save / Persistence
    saveState() {
        // We need to capture everything needed to restore.
        // 1. Config
        // 2. Players
        // 3. Substitutions
        // 4. Scores (Match inputs)
        // 5. Meta (Venue, Date, Team Names)

        const state = {
            variant: this.variant,
            doublesCount: this.doublesCount,
            venue: document.getElementById('match-venue').value,
            date: document.getElementById('match-date').value,
            teamHome: document.getElementById('team-name-home').value,
            teamGuest: document.getElementById('team-name-guest').value,
            players: this.players,
            // Substitutions
            substitutions: null, // deprecated
            matchSubstitutions: this.matchSubstitutions,
            matchInputs: [], // Array of arrays of scores
            doublesData: [], // Array of {row: i, home: '', guest: ''}
            singlesSubData: [], // Store sub inputs per match
        };

        const rows = document.getElementById('matches-body').querySelectorAll('tr');
        rows.forEach((row, index) => {
            // Doubles Inputs
            const homeInput = row.cells[1].querySelector('input.player-select');
            const guestInput = row.cells[2].querySelector('input.player-select');

            if (homeInput || guestInput) {
                const hVal = homeInput ? homeInput.value : '';
                const gVal = guestInput ? guestInput.value : '';
                console.log(`Saving Doubles Row ${index}: Home="${hVal}", Guest="${gVal}"`);
                state.doublesData.push({
                    index: index,
                    home: hVal,
                    guest: gVal
                });
            }

            // Singles Sub Inputs (if any)
            const homeSubInp = row.querySelector('.home-sub-input');
            const guestSubInp = row.querySelector('.guest-sub-input');

            if (homeSubInp || guestSubInp) {
                state.singlesSubData.push({
                    index: index,
                    home: homeSubInp ? homeSubInp.value : '',
                    guest: guestSubInp ? guestSubInp.value : ''
                });
            }

            // Scores
            const scoreInputs = row.querySelectorAll('.input-score-sm');
            const rowScores = [];
            scoreInputs.forEach(inp => rowScores.push(inp.value));
            state.matchInputs.push(rowScores);
        });

        localStorage.setItem('tt_team_current_sheet', JSON.stringify(state));
    }

    loadState() {
        try {
            const raw = localStorage.getItem('tt_team_current_sheet');
            if (!raw) return;
            const state = JSON.parse(raw);

            // Restore Config
            document.getElementById('match-variant').value = state.variant;
            document.getElementById('doubles-count').value = state.doublesCount;
            this.variant = state.variant;
            this.doublesCount = parseInt(state.doublesCount);

            // Restore Meta
            if (state.venue) document.getElementById('match-venue').value = state.venue;
            if (state.date) document.getElementById('match-date').value = state.date;
            if (state.teamHome) document.getElementById('team-name-home').value = state.teamHome;
            if (state.teamGuest) document.getElementById('team-name-guest').value = state.teamGuest;

            // Restore Players Object
            // DB Migration: if old state, map SubHome/SubGuest to subA..subD ? No, just init empty.
            this.players = state.players || {
                home: { A: '', B: '', C: '', D: '', subA: '', subB: '', subC: '', subD: '' },
                guest: { X: '', Y: '', Z: '', U: '', subX: '', subY: '', subZ: '', subU: '' }
            };

            // Restore Players UI Inputs
            ['A', 'B', 'C', 'D', 'subA', 'subB', 'subC', 'subD'].forEach(p => {
                const el = document.getElementById(`player-${p}`);
                if (el) el.value = this.players.home[p] || '';
            });
            ['X', 'Y', 'Z', 'U', 'subX', 'subY', 'subZ', 'subU'].forEach(p => {
                const el = document.getElementById(`player-${p}`);
                if (el) el.value = this.players.guest[p] || '';
            });

            // Restore Substitutions
            this.matchSubstitutions = state.matchSubstitutions || {};

            // Regenerate Table
            this.generateTable();

            // Apply Sub Visibility based on loaded state
            const rows = document.getElementById('matches-body').querySelectorAll('tr');
            rows.forEach(row => {
                const matchNum = parseInt(row.cells[0].textContent);
                if (this.matchSubstitutions[matchNum]) {
                    if (this.matchSubstitutions[matchNum].home) this.applySubVis(matchNum, 'home', true);
                    if (this.matchSubstitutions[matchNum].guest) this.applySubVis(matchNum, 'guest', true);
                }
            });

            // Restore Scores & Names

            // Restore Doubles Names
            if (state.doublesData) {
                state.doublesData.forEach(d => {
                    if (rows[d.index]) {
                        const row = rows[d.index];
                        const homeInp = row.cells[1].querySelector('input.player-select');
                        const guestInp = row.cells[2].querySelector('input.player-select');
                        if (homeInp) homeInp.value = d.home;
                        if (guestInp) guestInp.value = d.guest;
                    }
                });
            }

            // Restore Singles Sub Names
            if (state.singlesSubData) {
                state.singlesSubData.forEach(d => {
                    if (rows[d.index]) {
                        const homeInp = rows[d.index].querySelector('.home-sub-input');
                        const guestInp = rows[d.index].querySelector('.guest-sub-input');
                        if (homeInp) homeInp.value = d.home;
                        if (guestInp) guestInp.value = d.guest;
                    }
                });
            }

            if (state.matchInputs && state.matchInputs.length === rows.length) {
                rows.forEach((row, i) => {
                    const savedInputs = state.matchInputs[i];
                    const inputEls = row.querySelectorAll('.input-score-sm');
                    inputEls.forEach((inp, j) => {
                        if (savedInputs[j]) inp.value = savedInputs[j];
                    });

                    // Trigger calculation
                    this.calculateRow(parseInt(row.cells[0].textContent));
                });
            }

            // Restore Substitution Checkboxes state
            // We need to re-apply checkboxes based on this.substitutions?
            // Actually, toggleSub logic relies on UI checkbox change.
            // But here we set state directly. We need to insure UI reflects it.
            // In generateTable, we don't naturally set checked based on state. 
            // We should fix generateTable to respect `this.substitutions` or re-apply here.

            // Let's re-apply UI state for checkoxes
            rows.forEach(row => {
                const round = parseInt(row.dataset.round);
                // Check home sub
                const homeSpan = row.querySelector(`.player-label-span[data-side="home"]`);
                if (homeSpan) {
                    const pKey = homeSpan.dataset.player;
                    if (this.substitutions.home[pKey] && round >= 2) { // Logic needs to match where sub is allowed
                        // Find verification checkbox
                        const cb = row.querySelector(`input[type="checkbox"][onchange*="'home'"]`);
                        if (cb) cb.checked = true;
                        homeSpan.dataset.subbed = "true";
                        homeSpan.classList.add('subbed');
                    }
                }
                // Check guest sub
                const guestSpan = row.querySelector(`.player-label-span[data-side="guest"]`);
                if (guestSpan) {
                    const pKey = guestSpan.dataset.player;
                    if (this.substitutions.guest[pKey] && round >= 2) {
                        const cb = row.querySelector(`input[type="checkbox"][onchange*="'guest'"]`);
                        if (cb) cb.checked = true;
                        guestSpan.dataset.subbed = "true";
                        guestSpan.classList.add('subbed');
                    }
                }
            });

            this.refreshPlayerLabels();

        } catch (e) {
            console.error('Error loading state', e);
            this.updateVariant();
        }
    }

    resetSheet() {
        if (!confirm('Naozaj vymazať celý zápis?')) return;

        localStorage.removeItem('tt_team_current_sheet');

        // Reset inputs
        document.querySelectorAll('input').forEach(i => {
            if (i.id === 'match-variant' || i.id === 'doubles-count') return; // Keep config
            if (i.type === 'checkbox') i.checked = false;
            else i.value = '';
        });

        // Clear substitutions state
        this.matchSubstitutions = {};

        // Regenerate table to reset substitution UIs
        this.generateTable();

        // Explicitly clear stats DOM
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        // Clear Running Stats
        setTxt('stat-matches-home', '0'); setTxt('stat-matches-guest', '0');
        setTxt('score-home', '0'); setTxt('score-guest', '0');
        setTxt('stat-sets-home', '0'); setTxt('stat-sets-guest', '0');
        setTxt('stat-balls-home', '0'); setTxt('stat-balls-guest', '0');
        setTxt('stats-matches-ratio', '0:0');
        setTxt('stats-sets-ratio', '0:0');
        setTxt('stats-balls-ratio', '0:0');

        // Clear Player Stats
        ['A', 'B', 'C', 'D'].forEach(p => setTxt(`stats-player-${p}`, '0/0'));
        ['X', 'Y', 'Z', 'U'].forEach(p => setTxt(`stats-player-${p}`, '0/0'));

        // Clear Substitute Stats
        const subHome = document.getElementById('substitutes-home');
        if (subHome) subHome.innerHTML = '';
        const subGuest = document.getElementById('substitutes-guest');
        if (subGuest) subGuest.innerHTML = '';

        this.updateNames();
        // this.saveState(); // updateNames calls saveState
    }

    updateNames() {
        // Update data
        ['A', 'B', 'C', 'D'].forEach(p => {
            const el = document.getElementById(`player-${p}`);
            if (el) this.players.home[p] = el.value;
        });
        ['X', 'Y', 'Z', 'U'].forEach(p => {
            const el = document.getElementById(`player-${p}`);
            if (el) this.players.guest[p] = el.value;
        });

        // Update UI labels (Original names)
        this.refreshPlayerLabels();
        this.saveState();
    }

    refreshPlayerLabels() {
        // Simply update the placeholder text in the spans
        // Matches have .home-label-span and .guest-label-span

        document.querySelectorAll('.home-label-span').forEach(span => {
            const p = span.dataset.player;
            span.textContent = this.players.home[p] || p;
        });
        document.querySelectorAll('.guest-label-span').forEach(span => {
            const p = span.dataset.player;
            span.textContent = this.players.guest[p] || p;
        });
    }

    toggleMatchSub(matchNum, side) {
        console.log(`toggleMatchSub called: match=${matchNum}, side=${side}`);
        if (!this.matchSubstitutions[matchNum]) this.matchSubstitutions[matchNum] = { home: false, guest: false };

        const currentState = this.matchSubstitutions[matchNum][side];
        const newState = !currentState;
        this.matchSubstitutions[matchNum][side] = newState;

        console.log(`New state for match ${matchNum} ${side}: ${newState}`);
        this.applySubVis(matchNum, side, newState);

        // CASCADE LOGIC: Find player key and apply to future matches
        const currentRow = document.getElementById(`match-row-${matchNum}`);
        if (currentRow) {
            const labelSpan = currentRow.querySelector(`.${side}-label-span`);
            if (labelSpan) {
                const playerKey = labelSpan.dataset.player; // e.g., 'A' or 'X'
                console.log(`Cascading substitution for player ${playerKey} from match ${matchNum} (New State: ${newState})`);

                // Iterate all subsequent rows
                const allRows = document.querySelectorAll('tr[id^="match-row-"]');
                allRows.forEach(row => {
                    const rowNum = parseInt(row.querySelector('td').textContent);
                    if (rowNum > matchNum) {
                        // Check Home Side
                        const hSpan = row.querySelector('.home-label-span');
                        if (hSpan && hSpan.dataset.player === playerKey) {
                            if (!this.matchSubstitutions[rowNum]) this.matchSubstitutions[rowNum] = { home: false, guest: false };
                            this.matchSubstitutions[rowNum]['home'] = newState;
                            this.applySubVis(rowNum, 'home', newState);
                        }
                        // Check Guest Side
                        const gSpan = row.querySelector('.guest-label-span');
                        if (gSpan && gSpan.dataset.player === playerKey) {
                            if (!this.matchSubstitutions[rowNum]) this.matchSubstitutions[rowNum] = { home: false, guest: false };
                            this.matchSubstitutions[rowNum]['guest'] = newState;
                            this.applySubVis(rowNum, 'guest', newState);
                        }
                    }
                });
            }
        }

        // Recalculate stats because active player might have changed (affecting who gets the win/loss)
        this.updateStats();
    }

    updateSubName(matchNum, side) {
        const row = document.getElementById(`match-row-${matchNum}`);
        if (!row) return;

        const subInput = row.querySelector(`.${side}-sub-input`);
        const labelSpan = row.querySelector(`.${side}-label-span`);

        if (subInput && labelSpan) {
            const val = subInput.value;
            const playerKey = labelSpan.dataset.player; // 'A', 'B'...

            // Propagate to future matches
            const allRows = document.querySelectorAll('tr[id^="match-row-"]');
            allRows.forEach(r => {
                const rNum = parseInt(r.querySelector('td').textContent);
                if (rNum > matchNum) {
                    // Check if this row has the same player on the same side (or even swapped? No, rotation logic keeps sides usually, but let's check playerKey)
                    // Actually, rotation logic: A vs X. A is always Home in this sheet? 
                    // Wait, createRow sets data-player.

                    // Check Home
                    const hSpan = r.querySelector('.home-label-span');
                    if (hSpan && hSpan.dataset.player === playerKey) {
                        const hInput = r.querySelector('.home-sub-input');
                        if (hInput) hInput.value = val;
                    }

                    // Check Guest
                    const gSpan = r.querySelector('.guest-label-span');
                    if (gSpan && gSpan.dataset.player === playerKey) {
                        const gInput = r.querySelector('.guest-sub-input');
                        if (gInput) gInput.value = val;
                    }
                }
            });
        }

        this.saveState();
    }

    applySubVis(matchNum, side, isSubbed) {
        const row = document.getElementById(`match-row-${matchNum}`);
        if (!row) {
            console.error(`Row match-row-${matchNum} not found`);
            return;
        }

        const labelSpan = row.querySelector(`.${side}-label-span`);
        const subInput = row.querySelector(`.${side}-sub-input`);

        // Also update checkbox state if not triggered by event
        const checkbox = row.querySelector(`.sub-checkbox-${side}`);
        if (checkbox) checkbox.checked = isSubbed;

        if (isSubbed) {
            if (labelSpan) labelSpan.style.display = 'none';
            if (subInput) subInput.style.display = 'block';
        } else {
            if (labelSpan) labelSpan.style.display = 'block';
            if (subInput) subInput.style.display = 'none';
        }
    }

    updateVariant() {
        this.variant = document.getElementById('match-variant').value;
        this.doublesCount = parseInt(document.getElementById('doubles-count').value);
        this.generateTable();
        this.saveState();
    }

    generateTable() {
        const tbody = document.getElementById('matches-body');
        tbody.innerHTML = '';
        this.matches = [];

        let matchCounter = 1;

        // 1. Doubles
        for (let i = 0; i < this.doublesCount; i++) {
            this.createRow(tbody, matchCounter++, 'doubles', null, null, 0);
        }

        // 2. Singles
        let rounds = this.variant === '4rounds' ? 4 : 3;
        const matchesToPlay = this.rotation4.slice(0, rounds * 4);

        matchesToPlay.forEach(m => {
            this.createRow(tbody, matchCounter++, 'singles', null, m, m.round);
        });

        this.refreshPlayerLabels(); // Set initial texts
    }

    createRow(tbody, number, type, labelOverride, players, round) {
        const tr = document.createElement('tr');
        tr.dataset.round = round;

        let homeLabel = '';
        let guestLabel = '';

        if (type === 'doubles') {
            homeLabel = `<input type="text" class="player-select" placeholder="Hráči (Domáci)" oninput="window.sheet.saveState()">`;
            guestLabel = `<input type="text" class="player-select" placeholder="Hráči (Hostia)" oninput="window.sheet.saveState()">`;
        } else {
            // Singles
            // Home
            const canSubHome = round >= 2;
            let subCheckHome = '';
            let subInputHome = '';

            if (canSubHome) {
                // Checkbox calls toggleMatchSub with matchNumber
                // Use onclick to ensure it fires immediately on interaction
                subCheckHome = `<input type="checkbox" title="Striedanie" onclick="window.sheet.toggleMatchSub(${number}, 'home')" class="sub-checkbox-home">`;
                subInputHome = `<input type="text" class="sub-name-input input-text home-sub-input" style="display:none; width:100px; font-size:0.8rem;" placeholder="Náhradník" oninput="window.sheet.updateSubName(${number}, 'home')">`;
            }

            homeLabel = `
                <div style="display:flex; align-items:center; gap:5px; justify-content: flex-start; padding-left: 1cm;">
                    ${subCheckHome}
                    <span class="player-label-span home-label-span" data-player="${players.home}">${players.home}</span>
                    ${subInputHome}
                </div>
            `;

            // Guest
            const canSubGuest = round >= 2;
            let subCheckGuest = '';
            let subInputGuest = '';

            if (canSubGuest) {
                subCheckGuest = `<input type="checkbox" title="Striedanie" onclick="window.sheet.toggleMatchSub(${number}, 'guest')" class="sub-checkbox-guest">`;
                subInputGuest = `<input type="text" class="sub-name-input input-text guest-sub-input" style="display:none; width:100px; font-size:0.8rem;" placeholder="Náhradník" oninput="window.sheet.updateSubName(${number}, 'guest')">`;
            }

            guestLabel = `
                <div style="display:flex; align-items:center; gap:5px; justify-content: flex-start; padding-left: 1cm;">
                    ${subCheckGuest}
                    <span class="player-label-span guest-label-span" data-player="${players.guest}">${players.guest}</span>
                    ${subInputGuest}
                </div>
            `;
        }

        // 5 Set Inputs
        let setInputs = '';
        for (let i = 1; i <= 5; i++) {
            setInputs += `<td style="padding: 2px;"><input type="text" class="input-score-sm" data-set="${i}" onchange="sheet.calculateRow(${number})"></td>`;
        }

        tr.id = `match-row-${number}`;
        tr.innerHTML = `
            <td>${number}</td>
            <td>${homeLabel}</td>
            <td>${guestLabel}</td>
            ${setInputs}
            <td id="sets-result-${number}" style="font-weight:bold; text-align:center;"></td>
            <td id="running-score-${number}" style="font-weight:bold; color: var(--secondary-text);">-</td>
        `;

        tbody.appendChild(tr);
    }

    calculateRow(rowNum) {
        const row = document.getElementById(`match-row-${rowNum}`);
        if (!row) return;

        let hSets = 0;
        let gSets = 0;
        let hasInput = false;

        // Iterate input-score-sm
        row.querySelectorAll('.input-score-sm').forEach(input => {
            let val = input.value.trim();
            if (val) {
                let hp, gp;

                // Shorthand logic: check if it's just a number (possibly with + or -)
                // Regex to match "7", "+7", "-6"
                if (/^[\-\+]?\d+$/.test(val)) {
                    const num = parseInt(val);
                    const loserPoints = Math.abs(num);
                    let winnerPoints = 11;
                    if (loserPoints >= 10) {
                        winnerPoints = loserPoints + 2;
                    }

                    if (num >= 0) {
                        // Positive: Home wins
                        hp = winnerPoints;
                        gp = loserPoints;
                    } else {
                        // Negative: Guest wins
                        hp = loserPoints;
                        gp = winnerPoints;
                    }

                    // Update the input to show full score
                    input.value = `${hp}:${gp}`;
                    hSets += (hp > gp) ? 1 : 0;
                    gSets += (gp > hp) ? 1 : 0;

                    hasInput = true;
                } else {
                    // Standard parsing "11:9", "11-9", "11 9"
                    const parts = val.split(/[:\-\s]+/);
                    if (parts.length === 2) {
                        hp = parseInt(parts[0]);
                        gp = parseInt(parts[1]);
                        if (!isNaN(hp) && !isNaN(gp)) {
                            if (hp > gp) hSets++;
                            if (gp > hp) gSets++;
                            hasInput = true;
                        }
                    }
                }
            }
        });

        // Update Sets Column
        const setsResult = document.getElementById(`sets-result-${rowNum}`);

        if (!hasInput) {
            setsResult.textContent = '';
            setsResult.style.color = '';
        } else {
            setsResult.textContent = `${hSets}:${gSets}`;
            // Highlight winner
            setsResult.style.color = '';
            // Assuming Best of 5 standard for team matches (3 sets to win).
            if (hSets >= 3 || gSets >= 3) {
                if (hSets > gSets) setsResult.style.color = '#4ade80';
                else setsResult.style.color = '#f87171';
            }
        }

        this.updateRunningScore();
    }

    updateRunningScore() {
        let hTotal = 0;
        let gTotal = 0;

        const rows = document.getElementById('matches-body').querySelectorAll('tr');
        rows.forEach(row => {
            const setsCell = row.querySelector(`td[id^="sets-result-"]`);
            const runCell = row.querySelector(`td[id^="running-score-"]`);

            const txt = setsCell.textContent; // "3:1"
            if (!txt) {
                runCell.textContent = '-';
                return;
            }

            const parts = txt.split(':');
            if (parts.length !== 2) return;

            const h = parseInt(parts[0]);
            const g = parseInt(parts[1]);

            // Strict counting:
            if (h >= 3) hTotal++;
            else if (g >= 3) gTotal++;

            // Update running cell
            if (hTotal === 0 && gTotal === 0) runCell.textContent = '-';
            else runCell.textContent = `${hTotal}:${gTotal}`;
        });

        document.getElementById('score-home').textContent = hTotal;
        document.getElementById('score-guest').textContent = gTotal;

        // Update stats table
        this.updateStats();
        this.saveState();
    }

    updateStats() {
        let hMatches = 0, gMatches = 0;
        let hSets = 0, gSets = 0;
        let hBalls = 0, gBalls = 0;

        const rows = document.getElementById('matches-body').querySelectorAll('tr');
        rows.forEach(row => {
            // Check sets result for match win
            const setsResult = row.querySelector(`td[id^="sets-result-"]`);
            if (setsResult && setsResult.textContent) {
                const parts = setsResult.textContent.split(':');
                if (parts.length === 2) {
                    const hm = parseInt(parts[0]);
                    const gm = parseInt(parts[1]);
                    if (!isNaN(hm) && !isNaN(gm)) {
                        // Match win
                        if (hm >= 3) hMatches++;
                        else if (gm >= 3) gMatches++;

                        // Sets sum
                        hSets += hm;
                        gSets += gm;
                    }
                }
            }

            // Check individual balls from inputs
            row.querySelectorAll('.input-score-sm').forEach(input => {
                const val = input.value.trim();
                if (val) {
                    const parts = val.split(':');
                    if (parts.length === 2) {
                        const hp = parseInt(parts[0]);
                        const gp = parseInt(parts[1]);
                        if (!isNaN(hp) && !isNaN(gp)) {
                            hBalls += hp;
                            gBalls += gp;
                        }
                    }
                }
            });
        });

        // Update DOM
        // Update DOM
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        // Note: HTML uses 'stat-' prefix for the top table, but 'stats-' might be used elsewhere or in future.
        // The error was looking for 'stats-matches-ratio' which might not exist.
        // We will try both 'stat-' and 'stats-' prefixes just in case, or standarize to 'stat-' as seen in HTML.

        // Matches
        setTxt('stat-matches-home', hMatches);
        setTxt('stat-matches-guest', gMatches);
        // Also update total score big display
        setTxt('score-home', hMatches);
        setTxt('score-guest', gMatches);

        // Sets
        setTxt('stat-sets-home', hSets);
        setTxt('stat-sets-guest', gSets);

        // Balls
        setTxt('stat-balls-home', hBalls);
        setTxt('stat-balls-guest', gBalls);

        // Ratios (if they exist in UI)
        setTxt('stats-matches-ratio', `${hMatches}:${gMatches}`);
        setTxt('stats-sets-ratio', `${hSets}:${gSets}`);
        setTxt('stats-balls-ratio', `${hBalls}:${gBalls}`); // Fixed from direct assignment

        this.updatePlayerStats();
    }

    updatePlayerStats() {
        const stats = {
            home: { A: { w: 0, l: 0 }, B: { w: 0, l: 0 }, C: { w: 0, l: 0 }, D: { w: 0, l: 0 } },
            guest: { X: { w: 0, l: 0 }, Y: { w: 0, l: 0 }, Z: { w: 0, l: 0 }, U: { w: 0, l: 0 } }
        };
        const subsStats = { home: {}, guest: {} }; // name -> { replaced: Set, w: 0, l: 0 }

        const rows = document.getElementById('matches-body').querySelectorAll('tr');
        rows.forEach((row, index) => {
            // Skip doubles (first N rows)
            if (index < this.doublesCount) return;

            // Check if match is finished (setsResult has content)
            const resultCell = row.querySelector(`td[id^="sets-result-"]`);
            if (!resultCell || !resultCell.textContent.trim()) return;

            // Determine winner
            const resultText = resultCell.textContent.trim();
            const parts = resultText.split(':').map(Number);
            const hSets = parts[0];
            const gSets = parts[1];

            let matchWinner = null; // 'home' or 'guest'
            if (hSets > gSets) matchWinner = 'home';
            else if (gSets > hSets) matchWinner = 'guest';
            else return; // Draw or unfinished

            const matchNum = parseInt(row.querySelector('td:first-child').textContent);

            // Helper to process player/sub
            const processSide = (side, code, span) => {
                const isSubbed = this.matchSubstitutions[matchNum] && this.matchSubstitutions[matchNum][side];

                if (!isSubbed) {
                    // Regular player
                    if (stats[side][code]) {
                        if (matchWinner === side) stats[side][code].w++;
                        else stats[side][code].l++;
                    }
                } else {
                    // Substitute
                    const subInput = row.querySelector(`.${side}-sub-input`);
                    const subName = subInput ? subInput.value.trim() : '';

                    if (subName) {
                        if (!subsStats[side][subName]) {
                            subsStats[side][subName] = { replaced: new Set(), w: 0, l: 0 };
                        }
                        subsStats[side][subName].replaced.add(code);

                        if (matchWinner === side) subsStats[side][subName].w++;
                        else subsStats[side][subName].l++;
                    }
                }
            };

            // Home
            const hSpan = row.querySelector('.home-label-span');
            if (hSpan) processSide('home', hSpan.dataset.player, hSpan);

            // Guest
            const gSpan = row.querySelector('.guest-label-span');
            if (gSpan) processSide('guest', gSpan.dataset.player, gSpan);
        });

        // Update UI - Regular Players
        ['A', 'B', 'C', 'D'].forEach(p => {
            const el = document.getElementById(`stats-player-${p}`);
            if (el) el.textContent = `${stats.home[p].w}/${stats.home[p].l}`;
        });
        ['X', 'Y', 'Z', 'U'].forEach(p => {
            const el = document.getElementById(`stats-player-${p}`);
            if (el) el.textContent = `${stats.guest[p].w}/${stats.guest[p].l}`;
        });

        // Update UI - Substitutes
        const renderSubs = (side, containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            Object.keys(subsStats[side]).forEach(name => {
                const data = subsStats[side][name];
                const replacedStr = Array.from(data.replaced).join(', ');
                const div = document.createElement('div');
                div.className = 'player-row';
                div.style.fontSize = '0.9rem';
                div.innerHTML = `
                    <span style="flex:1;">${name} <small style="opacity:0.7">(striedal ${replacedStr})</small></span>
                    <span style="font-weight:bold;">${data.w}/${data.l}</span>
                `;
                container.appendChild(div);
            });
        };

        renderSubs('home', 'substitutes-home');
        renderSubs('guest', 'substitutes-guest');
    }

    saveMatch() {
        // Validation
        const homeName = document.getElementById('team-name-home').value.trim() || 'Domáci';
        const guestName = document.getElementById('team-name-guest').value.trim() || 'Hostia';
        const date = document.getElementById('match-date').value;

        // Check if there is any score
        const totalHome = document.getElementById('score-home').textContent;
        const totalGuest = document.getElementById('score-guest').textContent;

        if (totalHome === '0' && totalGuest === '0') {
            if (!confirm('Skóre je 0:0. Naozaj chcete uložiť tento zápas?')) return;
        }

        // Serialize Matches
        // We need to store exact inputs to reconstruct the sheet.
        // Or store the derived results?
        // Better to store state that allows reconstruction or simple display.
        // For Archive, we mostly want Read-Only Display.

        const matchData = [];
        const rows = document.getElementById('matches-body').querySelectorAll('tr');
        rows.forEach(row => {
            // Check for input inputs (Doubles)
            let hPlayer = row.cells[1].innerText.trim();
            let gPlayer = row.cells[2].innerText.trim();

            const hInput = row.cells[1].querySelector('input.player-select');
            if (hInput) hPlayer = hInput.value.trim();

            // Check for Singles Sub Input (visible)
            const hSubInput = row.querySelector('.home-sub-input');
            if (hSubInput && hSubInput.style.display !== 'none') {
                // Checkbox is checked? Or just rely on display.
                hPlayer = `${hSubInput.value.trim()} (${row.querySelector('.home-label-span').dataset.player})`;
            }

            const gInput = row.cells[2].querySelector('input.player-select');
            if (gInput) gPlayer = gInput.value.trim();

            const gSubInput = row.querySelector('.guest-sub-input');
            if (gSubInput && gSubInput.style.display !== 'none') {
                gPlayer = `${gSubInput.value.trim()} (${row.querySelector('.guest-label-span').dataset.player})`;
            }

            const rowData = {
                number: row.cells[0].textContent,
                homePlayer: hPlayer,
                guestPlayer: gPlayer,
                sets: [] // Array of strings "11:9"
            };

            row.querySelectorAll('.input-score-sm').forEach(input => {
                rowData.sets.push(input.value);
            });

            rowData.setsResult = row.querySelector(`td[id^="sets-result-"]`).textContent;
            rowData.runningScore = row.querySelector(`td[id^="running-score-"]`).textContent;

            matchData.push(rowData);
        });

        const archiveItem = {
            id: Date.now(),
            date: date,
            venue: document.getElementById('match-venue').value,
            homeTeam: homeName,
            guestTeam: guestName,
            finalScore: `${totalHome}:${totalGuest}`,
            variant: this.variant,
            doublesCount: this.doublesCount,
            players: JSON.parse(JSON.stringify(this.players)), // deep copy
            matches: matchData,
            statistics: {
                matches: document.getElementById('stats-matches-ratio').textContent,
                sets: document.getElementById('stats-sets-ratio').textContent,
                balls: document.getElementById('stats-balls-ratio').textContent,
                details: {
                    matchesHome: document.getElementById('stats-matches-home').textContent,
                    matchesGuest: document.getElementById('stats-matches-guest').textContent,
                    setsHome: document.getElementById('stats-sets-home').textContent,
                    setsGuest: document.getElementById('stats-sets-guest').textContent,
                    ballsHome: document.getElementById('stats-balls-home').textContent,
                    ballsGuest: document.getElementById('stats-balls-guest').textContent
                }
            }
        };

        // Save to LocalStorage
        const archive = JSON.parse(localStorage.getItem('tt_team_archive') || '[]');
        archive.push(archiveItem);
        localStorage.setItem('tt_team_archive', JSON.stringify(archive));

        alert('Zápas bol úspešne uložený do archívu.');
        // Optional: Redirect to archive or reset?
        // window.location.href = 'team_archive.html';
    }
}

const sheet = new TeamSheet();
window.sheet = sheet;
