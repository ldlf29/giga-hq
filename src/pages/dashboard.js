/* Dashboard View */
import { getGlobalStats, getLeaderboard, getRecentRaces, escapeHTML } from '../api.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="stat-counter" style="margin-bottom: 32px; display: flex; flex-direction: column; align-items: center; text-align: center;">
      <h1 class="pixel-text" style="font-size: 40px; color: #ffffff; margin-bottom: 10px;">GIGLING RACING ANALYTICS</h1>
      <p style="margin-bottom: 24px; font-family: monospace; font-size: 16px; color: var(--text-secondary);">Search for a player wallet or pet ID to view detailed racing statistics.</p>
      <div style="display: flex; gap: 10px;">
         <input type="text" id="dashboardSearch" class="input-field input-pixel" style="height: 48px; padding: 4px 16px; font-size: 20px; width: 350px;" placeholder="Search player/pet..." />
         <button id="dashboardSearchBtn" class="btn btn-pixel" style="padding: 4px 24px; font-size: 20px; height: 48px;">SEARCH</button>
      </div>
    </div>

    <!-- Global Stats Grid -->
    <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
      <h2 class="pixel-text" style="font-size: 28px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">GLOBAL STATS</h2>
    </div>
    
    <div id="globalStatsGrid" class="grid-4" style="margin-bottom: 40px;">
      <div class="card skeleton-rect skeleton-loader"></div>
      <div class="card skeleton-rect skeleton-loader"></div>
      <div class="card skeleton-rect skeleton-loader"></div>
      <div class="card skeleton-rect skeleton-loader"></div>
    </div>

    <div class="grid-2">
      <!-- ELO Leaderboard -->
      <div>
        <div class="stat-counter" style="text-align: left; margin-bottom: 16px;">
          <h2 class="pixel-text text-yellow" style="font-size: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">TOP GIGLINGS</h2>
        </div>
        <div id="leaderboardGrid">
           <div class="card skeleton-rect skeleton-loader"></div>
        </div>
      </div>
      
      <!-- Recent Races -->
      <div>
        <div class="stat-counter" style="text-align: left; margin-bottom: 16px;">
          <h2 class="pixel-text text-cyan" style="font-size: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">RECENT RACES</h2>
        </div>
        <div id="recentRacesGrid">
           <div class="card skeleton-rect skeleton-loader"></div>
        </div>
      </div>
    </div>
  `;

  // Setup Search Bar
  const searchInput = document.getElementById('dashboardSearch');
  const searchBtn = document.getElementById('dashboardSearchBtn');

  const executeSearch = () => {
    const query = searchInput.value.trim();
    if (!query) return;

    if (/^0x[0-9a-fA-F]{40}$/.test(query)) {
      searchInput.value = '';
      history.pushState(null, '', `/player/${query}`);
      window.dispatchEvent(new Event('popstate'));
    } else if (/^\d+$/.test(query)) {
      searchInput.value = '';
      history.pushState(null, '', `/pet/${query}`);
      window.dispatchEvent(new Event('popstate'));
    } else {
      searchInput.style.borderColor = 'var(--neon-pink)';
      setTimeout(() => { searchInput.style.borderColor = 'var(--border-color)'; }, 1500);
    }
  };

  searchBtn.addEventListener('click', executeSearch);
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(); });

  // Load Global Stats
  try {
    const stats = await getGlobalStats();
    if (stats) {
      const formattedVolume = (parseFloat(stats.totalEntryFeeVolumeWei) / 1e18).toFixed(4);
      const formattedFees = (parseFloat(stats.totalProtocolFeesWei) / 1e18).toFixed(4);

      document.getElementById('globalStatsGrid').innerHTML = `
        <div class="card card-glowing">
          <div class="stat-counter">
            <div class="stat-val text-cyan">${stats.totalRacesCreated.toLocaleString()}</div>
            <div class="stat-label">Total Races</div>
          </div>
        </div>
        <div class="card card-glowing" style="border-color: var(--neon-purple);">
          <div class="stat-counter">
            <div class="stat-val text-purple">${stats.uniqueRacers.toLocaleString()}</div>
            <div class="stat-label">Active Racers</div>
          </div>
        </div>
        <div class="card card-glowing" style="border-color: var(--neon-yellow);">
          <div class="stat-counter">
            <div class="stat-val text-yellow">${formattedVolume} ETH</div>
            <div class="stat-label">Volume</div>
          </div>
        </div>
        <div class="card card-glowing" style="border-color: var(--neon-green);">
          <div class="stat-counter">
            <div class="stat-val text-green">${formattedFees} ETH</div>
            <div class="stat-label">Fees</div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('globalStatsGrid').innerHTML = '<div class="pixel-box"><p class="text-pink">Failed to load global stats.</p></div>';
  }

  // Load Leaderboard
  try {
    const leaders = await getLeaderboard(10);
    if (leaders && leaders.length > 0) {
      let lbHtml = '<div class="table-container"><table class="table-retro"><tr><th class="pixel-text">Rank</th><th class="pixel-text">Pet ID</th><th class="pixel-text">ELO</th><th class="pixel-text">Races</th></tr>';
      leaders.forEach((l, index) => {
        lbHtml += `<tr class="clickable" onclick="history.pushState(null, '', '/pet/${l.petId}'); window.dispatchEvent(new Event('popstate'));">
          <td>#${index + 1}</td>
          <td><span class="text-cyan">${l.petId}</span></td>
          <td><span class="text-yellow">${Math.round(l.elo)}</span></td>
          <td>${l.racesRun || 0}</td>
        </tr>`;
      });
      lbHtml += '</table></div>';
      document.getElementById('leaderboardGrid').innerHTML = lbHtml;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('leaderboardGrid').innerHTML = '<div class="pixel-box"><p class="text-pink">Failed to load leaderboard.</p></div>';
  }

  // Load Recent Races
  try {
    const races = await getRecentRaces(10);
    if (races && races.length > 0) {
      let racesHtml = '<div class="table-container"><table class="table-retro"><tr><th class="pixel-text">ID</th><th class="pixel-text">Phase</th><th class="pixel-text">Entry</th><th class="pixel-text">Pool</th></tr>';
      races.forEach(r => {
        const isFree = !r.entryFee || r.entryFee === "0";
        const entryStr = isFree ? "FREE" : (parseInt(r.entryFee) / 1e18).toFixed(4) + " ETH";
        const poolStr = isFree ? "-" : (parseInt(r.pool || "0") / 1e18).toFixed(4) + " ETH";
        const phaseColor = r.phase === 3 ? 'text-green' : (r.phase === 1 ? 'text-cyan' : 'text-muted');
        const raceUrl = (r.phase === 2 || r.phase === 3) ? `https://gigaverse.io/racing/race/${r.raceId}` : `https://gigaverse.io/racing?race=${r.raceId}`;
        racesHtml += `<tr>
          <td><a href="${raceUrl}" target="_blank" style="color: inherit; text-decoration: underline;">#${r.raceId}</a></td>
          <td class="${phaseColor}">${r.phase === 1 ? 'OPEN' : r.phase === 2 ? 'RESOLVING' : r.phase === 3 ? 'RESOLVED' : 'OTHER'}</td>
          <td>${entryStr}</td>
          <td class="${isFree ? 'text-muted' : 'text-yellow'}">${poolStr}</td>
        </tr>`;
      });
      racesHtml += '</table></div>';
      document.getElementById('recentRacesGrid').innerHTML = racesHtml;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('recentRacesGrid').innerHTML = '<div class="pixel-box"><p class="text-pink">Failed to load races.</p></div>';
  }
}
