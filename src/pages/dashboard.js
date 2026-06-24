/* Dashboard View */
import { getGlobalStats, getLeaderboard, getRecentRaces, escapeHTML } from '../api.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="stat-counter" style="margin-bottom: 32px;">
      <h1 class="pixel-text" style="font-size: 40px; color: var(--neon-cyan);">RACING INTELLIGENCE CENTER</h1>
      <p>Analyze player performance, scout pet attributes, and optimize hatching parameters.</p>
    </div>

    <!-- Global Stats Grid -->
    <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
      <h2 class="pixel-text" style="font-size: 28px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">GLOBAL PROTOCOL ANALYTICS</h2>
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
          <h2 class="pixel-text text-yellow" style="font-size: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">TOP 10 GIGLINGS (ELO)</h2>
        </div>
        <div id="leaderboardGrid">
           <div class="card skeleton-rect skeleton-loader"></div>
        </div>
      </div>
      
      <!-- Recent Races -->
      <div>
        <div class="stat-counter" style="text-align: left; margin-bottom: 16px;">
          <h2 class="pixel-text text-cyan" style="font-size: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">LATEST RACES</h2>
        </div>
        <div id="recentRacesGrid">
           <div class="card skeleton-rect skeleton-loader"></div>
        </div>
      </div>
    </div>
  `;

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
      let lbHtml = '<div class="table-container"><table class="table-retro"><tr><th>Rank</th><th>Pet ID</th><th>ELO</th><th>Races</th></tr>';
      leaders.forEach((l, index) => {
        lbHtml += `<tr class="clickable" onclick="window.location.hash='#/pet/${l.petId}'">
          <td>#${index + 1}</td>
          <td><span class="text-cyan">${l.petId}</span></td>
          <td><span class="text-yellow">${Math.round(l.elo)}</span></td>
          <td>${l.races}</td>
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
      let racesHtml = '<div class="table-container"><table class="table-retro"><tr><th>ID</th><th>Phase</th><th>Entry</th><th>Pool</th></tr>';
      races.forEach(r => {
        const entryStr = r.entryFeeWei === "0" ? "FREE" : (parseInt(r.entryFeeWei) / 1e18).toFixed(4) + " ETH";
        const poolStr = (parseInt(r.poolWei || "0") / 1e18).toFixed(4);
        const phaseColor = r.phase === 3 ? 'text-green' : (r.phase === 1 ? 'text-cyan' : 'text-muted');
        racesHtml += `<tr>
          <td>#${r.raceId}</td>
          <td class="${phaseColor}">${r.phase === 1 ? 'OPEN' : r.phase === 2 ? 'RESOLVING' : r.phase === 3 ? 'RESOLVED' : 'OTHER'}</td>
          <td>${entryStr}</td>
          <td class="text-yellow">${poolStr} ETH</td>
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
