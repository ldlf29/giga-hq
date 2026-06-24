/* Player Analytics View */
import { 
  getPlayerRaces, 
  getPetsDetails, 
  getPlayerPayouts, 
  getCreatorFees, 
  getHostEligibility, 
  getPlayerPets,
  escapeHTML,
  sanitizeAddress
} from '../api.js';

export async function renderPlayer(container, address) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) {
    container.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink);">
        <h2 class="pixel-text text-pink">ERROR: INVALID WALLET ADDRESS</h2>
        <p>The address "${escapeHTML(address)}" is not a valid 40-character Ethereum Hex address.</p>
        <a href="#/" class="btn btn-pixel">RETURN TO DASHBOARD</a>
      </div>
    `;
    return;
  }

  // Display initial loading skeletons
  container.innerHTML = `
    <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
      <h1 class="pixel-text" style="font-size: 32px; color: var(--neon-cyan);">PLAYER INTELLIGENCE REPORT</h1>
      <p style="font-family: monospace; font-size: 14px; word-break: break-all;">Target Wallet: <span class="text-cyan">${cleanAddress}</span></p>
    </div>
    
    <div class="grid-3" style="margin-bottom: 32px;">
      <div class="card skeleton-rect skeleton-loader"></div>
      <div class="card skeleton-rect skeleton-loader"></div>
      <div class="card skeleton-rect skeleton-loader"></div>
    </div>
    
    <div class="pixel-box">
      <div class="pixel-box-title">PORTFOLIO OF DISCOVERED PETS</div>
      <div class="grid-3" id="playerPetsGrid">
        <div class="card skeleton-rect skeleton-loader"></div>
        <div class="card skeleton-rect skeleton-loader"></div>
        <div class="card skeleton-rect skeleton-loader"></div>
      </div>
    </div>

    <div class="pixel-box">
      <div class="pixel-box-title">RECENT RACING ACTIVITY LOG</div>
      <div id="playerRacesTable" class="table-container">
        <div class="skeleton-text skeleton-loader" style="height: 30px;"></div>
        <div class="skeleton-text skeleton-loader" style="height: 30px; width: 80%;"></div>
        <div class="skeleton-text skeleton-loader" style="height: 30px; width: 90%;"></div>
      </div>
    </div>
  `;

  try {
    // 1. Fetch Player Races, Payouts, Creator Fees, Host Eligibility, and Pets in parallel
    const [races, payouts, creator, eligibility, petsDetails] = await Promise.all([
      getPlayerRaces(cleanAddress, 50),
      getPlayerPayouts(cleanAddress),
      getCreatorFees(cleanAddress),
      getHostEligibility(cleanAddress).catch(() => null),
      getPlayerPets(cleanAddress).catch(() => [])
    ]);

    const petIds = petsDetails.map(p => p.id);

    // 4. Calculate P&L / financial stats across their pets
    let totalSpentWei = 0n;
    let totalWonWei = 0n;
    let totalRacesCount = 0;
    let totalWins = 0;
    let totalPodiums = 0;

    petsDetails.forEach(pet => {
      // stats are returned in the batch query as well or we can check the stats from the list
      const statsObj = pet.racePublic || {};
      totalRacesCount += statsObj.racesRun || 0;
      
      // Let's fetch individual pet stats or sum them up if available.
      // Wait, since we didn't fetch individual pet stats for all pets in parallel to save rate limits, 
      // we can estimate from their race logs, OR we can fetch batch stats if we want.
      // Wait, does the API getPetsDetails return stats? Yes, in `racePublic` it has `racesRun`.
      // What about wins/losses? Let's check: `/api/racing/pets/stats?ids=...` returns financial stats.
      // Let's do a fetch for the financial stats of these pets!
    });

    // Fetch batch financial stats for the pet IDs
    let financialStatsMap = new Map();
    if (petIds.length > 0) {
      try {
        const res = await fetch(`https://gigaverse.io/api/racing/pets/stats?ids=${petIds.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            data.stats.forEach(s => {
              financialStatsMap.set(s.petId, s);
              totalSpentWei += BigInt(s.weiSpent || 0);
              totalWonWei += BigInt(s.weiWon || 0);
              totalWins += s.wins || 0;
              totalPodiums += s.podiums || 0;
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch financial stats', e);
      }
    }

    const netProfitWei = totalWonWei - totalSpentWei;
    const spentEth = parseFloat(totalSpentWei) / 1e18;
    const wonEth = parseFloat(totalWonWei) / 1e18;
    const netEth = parseFloat(netProfitWei) / 1e18;
    const roi = spentEth > 0 ? (netEth / spentEth) * 100 : 0;

    // 5. Render Player Summary Cards (Financial ROI & Host stats)
    let hostStatsHtml = `<p>No host accounts configured</p>`;
    if (eligibility) {
      const isJuiced = eligibility.isJuiced;
      const hostLimit = eligibility.hostDailyLimit || {};
      const limitVal = isJuiced ? hostLimit.dailyLimitJuiced : hostLimit.dailyLimitUnjuiced;
      const resetsInMin = Math.ceil((hostLimit.resetInSeconds || 0) / 60);
      
      hostStatsHtml = `
        <div style="font-family: monospace; font-size: 14px;">
          <div style="margin-bottom: 8px;">Status: <span class="${isJuiced ? 'text-yellow' : 'text-cyan'}" style="font-weight: bold;">${isJuiced ? '⚡ JUICED HOST' : 'STANDARD HOST'}</span></div>
          <div style="margin-bottom: 8px;">Created Today: <span class="text-cyan">${hostLimit.racesToday || 0}</span> / ${limitVal}</div>
          <div style="margin-bottom: 8px;">Remaining: <span class="text-green">${hostLimit.racesRemaining || 0}</span></div>
          <div>Reset in: <span class="text-yellow">${resetsInMin} min</span></div>
        </div>
      `;
    }

    const unclaimedPayoutsEth = payouts.reduce((acc, p) => acc + BigInt(p.amount || 0), 0n);
    const unclaimedPayoutsFormatted = (parseFloat(unclaimedPayoutsEth) / 1e18).toFixed(5);

    const unclaimedCreatorFees = creator ? (parseFloat(creator.unclaimedWei) / 1e18).toFixed(5) : '0.00000';
    const lifetimeCreatorFees = creator ? (parseFloat(creator.lifetimeAccruedWei) / 1e18).toFixed(5) : '0.00000';

    container.innerHTML = `
      <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
        <h1 class="pixel-text" style="font-size: 32px; color: var(--neon-cyan);">PLAYER INTELLIGENCE REPORT</h1>
        <p style="font-family: monospace; font-size: 14px; word-break: break-all;">Target Wallet: <span class="text-cyan">${cleanAddress}</span></p>
      </div>

      <!-- Grid Cards -->
      <div class="grid-3" style="margin-bottom: 32px;">
        <!-- ROI Card -->
        <div class="card card-glowing" style="border-color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'};">
          <h3 class="pixel-text" style="color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'}; margin-bottom: 12px; font-size: 20px;">FINANCIAL P&L</h3>
          <div style="font-family: monospace; font-size: 14px;">
            <div style="margin-bottom: 6px;">Total Entry Cost: <span style="color: var(--text-primary);">${spentEth.toFixed(5)} ETH</span></div>
            <div style="margin-bottom: 6px;">Total Payouts: <span style="color: var(--text-primary);">${wonEth.toFixed(5)} ETH</span></div>
            <div style="margin-bottom: 6px;">Net Profit: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${netEth.toFixed(5)} ETH</span></div>
            <div>Net ROI: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${roi.toFixed(1)}%</span></div>
          </div>
        </div>

        <!-- Claims & Fees -->
        <div class="card card-glowing" style="border-color: var(--neon-yellow);">
          <h3 class="pixel-text text-yellow" style="margin-bottom: 12px; font-size: 20px;">UNCLAIMED REWARDS</h3>
          <div style="font-family: monospace; font-size: 14px;">
            <div style="margin-bottom: 6px;">Pending Payouts: <span class="text-yellow">${unclaimedPayoutsFormatted} ETH</span></div>
            <div style="margin-bottom: 6px;">Unclaimed Host Fees: <span class="text-cyan">${unclaimedCreatorFees} ETH</span></div>
            <div style="margin-bottom: 6px;">Lifetime Host Fees: <span style="color: var(--text-primary);">${lifetimeCreatorFees} ETH</span></div>
            <div>Unclaimed claims: <span class="text-yellow">${payouts.length} races</span></div>
          </div>
        </div>

        <!-- Host Card -->
        <div class="card card-glowing" style="border-color: var(--neon-cyan);">
          <h3 class="pixel-text text-cyan" style="margin-bottom: 12px; font-size: 20px;">HOST CONFIGURATION</h3>
          ${hostStatsHtml}
        </div>
      </div>

      <!-- Discovered Pets Grid -->
      <div class="pixel-box">
        <div class="pixel-box-title">PORTFOLIO OF DISCOVERED PETS (${petsDetails.length})</div>
        ${petsDetails.length === 0 ? `
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            No owned pets discovered in this player's recent race history.
          </div>
        ` : `
          <div class="grid-3" id="playerPetsGrid">
            ${petsDetails.map(pet => {
              const stats = financialStatsMap.get(pet.id) || {};
              const petWins = stats.wins || 0;
              const petRaces = stats.totalRaces || 0;
              const petNetWei = BigInt(stats.weiNet || 0);
              const petNetEth = parseFloat(petNetWei) / 1e18;
              const eloVal = pet.racePublic ? pet.racePublic.elo || 1000 : 1000;
              
              const rarityColor = pet.rarityColor || '#ffffff';
              const rarityName = pet.rarityName || 'Unknown';
              const factionName = pet.factionName || 'None';
              
              const isLocked = pet.locked;
              const isCooldown = pet.cooldownEnd > Math.floor(Date.now() / 1000);

              let statusText = '<span class="text-green">Ready</span>';
              if (isLocked) statusText = '<span class="text-pink">Locked</span>';
              else if (isCooldown) statusText = '<span class="text-yellow">Cooldown</span>';

              return `
                <div class="card clickable" onclick="window.location.hash='#/pet/${pet.id}'" style="border-color: ${rarityColor};">
                  <div style="display: flex; gap: 12px;">
                    <div style="width: 70px; height: 70px; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                      <img src="${escapeHTML(pet.imgUrl)}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" />
                    </div>
                    <div style="flex-grow: 1;">
                      <h4 class="pixel-text" style="font-size: 22px; margin-bottom: 2px;">#${pet.id}</h4>
                      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <span style="color: ${rarityColor}; font-weight: bold;">${rarityName}</span>
                        <span>|</span>
                        <span style="display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
                          ${factionName !== 'None' ? `<img src="/factions/${factionName.toLowerCase()}.png" style="width: 12px; height: 12px; object-fit: contain; image-rendering: pixelated;" alt="" />` : ''}
                          ${factionName}
                        </span>
                      </div>
                      <div style="font-family: monospace; font-size: 13px;">
                        ELO: <span class="text-cyan">${eloVal}</span> | Wins: ${petWins}/${petRaces}
                      </div>
                      <div style="font-family: monospace; font-size: 13px; margin-top: 4px;">
                        P&L: <span class="${petNetEth >= 0 ? 'text-green' : 'text-pink'}">${petNetEth >= 0 ? '+' : ''}${petNetEth.toFixed(4)} ETH</span>
                      </div>
                      <div style="font-size: 11px; margin-top: 4px;">
                        Status: ${statusText}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Recent Racing Activity -->
      <div class="pixel-box">
        <div class="pixel-box-title">RECENT RACING ACTIVITY LOG</div>
        <div id="playerRacesTable" class="table-container">
          ${races.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              No recent races found for this wallet address.
            </div>
          ` : `
            <table class="table-retro">
              <thead>
                <tr>
                  <th>Race ID</th>
                  <th>Fee</th>
                  <th>Pool</th>
                  <th>Field</th>
                  <th>Creator</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${races.map(race => {
                  const feeEth = (parseFloat(race.entryFee) / 1e18).toFixed(4);
                  const poolEth = (parseFloat(race.pool) / 1e18).toFixed(4);
                  const isCreator = race.creator.toLowerCase() === cleanAddress.toLowerCase();
                  
                  let phaseText = '';
                  let phaseColor = 'var(--text-secondary)';
                  switch (race.phase) {
                    case 1: phaseText = 'OPEN'; phaseColor = 'var(--neon-cyan)'; break;
                    case 2: phaseText = 'RESOLVING'; phaseColor = 'var(--neon-yellow)'; break;
                    case 3: phaseText = 'RESOLVED'; phaseColor = 'var(--neon-green)'; break;
                    case 4: phaseText = 'CANCELLED'; phaseColor = 'var(--neon-pink)'; break;
                  }

                  const date = new Date(race.createdAt * 1000).toLocaleString();

                  return `
                    <tr class="clickable" onclick="window.location.hash='#/race/${race.raceId}'">
                      <td><span class="text-cyan">#${race.raceId}</span> ${race.isPrivate ? '🔒' : ''}</td>
                      <td style="font-family: monospace;">${feeEth} ETH</td>
                      <td style="font-family: monospace;">${poolEth} ETH</td>
                      <td>${race.petCount}/${race.fieldSize}</td>
                      <td style="font-family: monospace; font-size: 12px;">${isCreator ? '<span class="text-yellow">Self (Host)</span>' : escapeHTML(race.creator.slice(0,6) + '...' + race.creator.slice(-4))}</td>
                      <td><span style="color: ${phaseColor}; font-weight: bold; font-family: monospace;">${phaseText}</span></td>
                      <td style="font-size: 12px;">${date}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;

  } catch (error) {
    container.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink);">
        <h2 class="pixel-text text-pink">ERROR LOADING DATA</h2>
        <p>API Call failed: ${escapeHTML(error.message)}</p>
        <button onclick="location.reload()" class="btn btn-pixel">RETRY CONNECTION</button>
      </div>
    `;
  }
}
