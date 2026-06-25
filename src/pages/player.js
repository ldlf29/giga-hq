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

  // Display initial loading screen
  container.innerHTML = `
    <style>
      @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite; margin-bottom: 24px;">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
      <h2 class="pixel-text text-cyan" style="font-size: 32px; letter-spacing: 2px; margin: 0;">LOADING DATA...</h2>
      <p style="font-family: var(--font-pixel); font-size: 24px; color: var(--text-secondary); margin-top: 12px; letter-spacing: 1px;">IT MAY TAKE A FEW SECONDS..</p>
    </div>
  `;

  try {
    // 1. Fetch Player Races, Payouts, Creator Fees, Host Eligibility, and Pets in parallel
    const [races, payouts, creator, eligibility, initialPetsDetails] = await Promise.all([
      getPlayerRaces(cleanAddress, 50),
      getPlayerPayouts(cleanAddress),
      getCreatorFees(cleanAddress),
      getHostEligibility(cleanAddress).catch(() => null),
      getPlayerPets(cleanAddress).catch(() => [])
    ]);

    let petsDetails = initialPetsDetails;

    // Fallback: If pets API failed or returned 0, extract pets from recent races
    if (petsDetails.length === 0 && races.length > 0) {
      const petIdsSet = new Set();
      races.forEach(r => {
        if (r.entries) {
          r.entries.forEach(entry => {
            if (entry.ownerAddress && entry.ownerAddress.toLowerCase() === cleanAddress.toLowerCase()) {
              petIdsSet.add(entry.petId);
            }
          });
        }
      });
      const idsArray = Array.from(petIdsSet);
      if (idsArray.length > 0) {
        petsDetails = await getPetsDetails(idsArray);
      }
    }

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

    // Fetch batch financial stats for the pet IDs in chunks of 50
    let financialStatsMap = new Map();
    if (petIds.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < petIds.length; i += CHUNK_SIZE) {
        const chunk = petIds.slice(i, i + CHUNK_SIZE);
        try {
          const res = await fetch(`https://gigaverse.io/api/racing/pets/stats?ids=${chunk.join(',')}`);
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
          console.error(`Failed to fetch financial stats for chunk ${i}`, e);
        }
      }
    }

    const netProfitWei = totalWonWei - totalSpentWei;
    const spentEth = parseFloat(totalSpentWei) / 1e18;
    const wonEth = parseFloat(totalWonWei) / 1e18;
    const netEth = parseFloat(netProfitWei) / 1e18;
    const roi = spentEth > 0 ? (netEth / spentEth) * 100 : 0;

    // 5. Render Player Summary Cards (Financial ROI & Host stats)
    let hostStatsHtml = `<p>No host accounts configured</p>`;
    if (eligibility && eligibility.hasAccount) {
      const isJuiced = eligibility.isJuiced;
      const hostLimit = eligibility.hostDailyLimit || {};
      const limitVal = isJuiced ? hostLimit.dailyLimitJuiced : hostLimit.dailyLimitUnjuiced;
      const resetsInMin = Math.ceil((hostLimit.resetInSeconds || 0) / 60);

      hostStatsHtml = `
        <div style="font-family: var(--font-primary); font-size: 18px;">
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
        <h1 class="pixel-text" style="font-size: 32px; color: #ffffff;">PLAYER HISTORY REPORT</h1>
        <p style="font-family: var(--font-primary); font-size: 18px; word-break: break-all;">Target Wallet: <span class="text-cyan">${cleanAddress}</span></p>
      </div>

      <!-- Grid Cards -->
      <div class="grid-3" style="margin-bottom: 32px;">
        <!-- ROI Card -->
        <div class="card card-glowing" style="border-color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'};">
          <h3 class="pixel-text" style="color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'}; margin-bottom: 12px; font-size: 20px;">FINANCIAL P&L</h3>
          <div style="font-family: var(--font-primary); font-size: 18px;">
            <div style="margin-bottom: 6px;">Total Entry Cost: <span style="color: var(--text-primary);">${spentEth.toFixed(5)} ETH</span></div>
            <div style="margin-bottom: 6px;">Total Payouts: <span style="color: var(--text-primary);">${wonEth.toFixed(5)} ETH</span></div>
            <div style="margin-bottom: 6px;">Net Profit: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${netEth.toFixed(5)} ETH</span></div>
            <div>Net ROI: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${roi.toFixed(1)}%</span></div>
          </div>
        </div>

        <!-- Claims & Fees -->
        <div class="card card-glowing" style="border-color: var(--neon-yellow);">
          <h3 class="pixel-text text-yellow" style="margin-bottom: 12px; font-size: 20px;">UNCLAIMED REWARDS</h3>
          <div style="font-family: var(--font-primary); font-size: 18px;">
            <div style="margin-bottom: 6px;">Pending Payouts: <span class="text-yellow">${unclaimedPayoutsFormatted} ETH</span></div>
            <div style="margin-bottom: 6px;">Unclaimed Host Fees: <span class="text-cyan">${unclaimedCreatorFees} ETH</span></div>
            <div style="margin-bottom: 6px;">Lifetime Host Fees: <span style="color: var(--text-primary);">${lifetimeCreatorFees} ETH</span></div>
            <div>Unclaimed: <span class="text-yellow">${payouts.length} races</span></div>
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
        <div class="pixel-box-title">GIGLINGS USED IN RACES (${petsDetails.length})</div>
        ${petsDetails.length === 0 ? `
          <div style="text-align: center; padding: 24px; color: var(--text-muted); font-family: var(--font-primary); font-size: 20px;">
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

      return `
                <div class="card clickable" onclick="history.pushState(null, '', '/pet/${pet.id}'); window.dispatchEvent(new Event('popstate'));" style="border-color: ${rarityColor};">
                  <div style="display: flex; gap: 12px;">
                    <div style="width: 70px; height: 70px; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                      <img src="${escapeHTML(pet.imgUrl)}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" />
                    </div>
                    <div style="flex-grow: 1;">
                      <h4 class="pixel-text" style="font-size: 24px; margin-bottom: 2px;">#${pet.id}</h4>
                      <div style="font-size: 18px; font-family: var(--font-primary); color: var(--text-secondary); margin-bottom: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <span style="color: ${rarityColor}; font-weight: bold;">${rarityName}</span>
                        <span>|</span>
                        <span style="display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
                          ${factionName !== 'None' ? `<img src="/factions/${factionName.toLowerCase()}.png" style="width: 16px; height: 16px; object-fit: contain; image-rendering: pixelated;" alt="" />` : ''}
                          ${factionName}
                        </span>
                      </div>
                      <div style="font-family: var(--font-primary); font-size: 18px;">
                        ELO: <span class="text-cyan">${eloVal}</span> | Wins: ${petWins}/${petRaces}
                      </div>
                      <div style="font-family: var(--font-primary); font-size: 18px; margin-top: 4px;">
                        P&L: <span class="${petNetEth >= 0 ? 'text-green' : 'text-pink'}">${petNetEth >= 0 ? '+' : ''}${petNetEth.toFixed(4)} ETH</span>
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
                <tr style="font-family: var(--font-pixel); font-size: 20px;">
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
                ${races.map((race, index) => {
                  const isFree = !race.entryFee || race.entryFee === "0";
                  const feeStr = isFree ? "FREE" : (parseFloat(race.entryFee) / 1e18).toFixed(4) + " ETH";
                  let poolWei = BigInt(race.pool || "0");
                  if (poolWei === 0n && !isFree) {
                    poolWei = BigInt(race.entryFee) * BigInt(race.petCount || race.fieldSize || 0);
                  }
                  const poolStr = isFree ? "-" : (parseFloat(poolWei) / 1e18).toFixed(4) + " ETH";
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
                    <tr class="clickable player-race-row" style="display: ${index < 10 ? 'table-row' : 'none'};" onclick="window.open('https://gigaverse.io/racing/race/${race.raceId}', '_blank')">
                      <td><span class="text-cyan">#${race.raceId}</span> ${race.isPrivate ? '🔒' : ''}</td>
                      <td style="font-family: var(--font-primary); font-size: 18px;">${feeStr}</td>
                      <td style="font-family: var(--font-primary); font-size: 18px;">${poolStr}</td>
                      <td style="font-family: var(--font-primary); font-size: 18px;">${race.petCount}/${race.fieldSize}</td>
                      <td style="font-family: var(--font-primary); font-size: 16px;">${isCreator ? '<span class="text-yellow">Self (Host)</span>' : escapeHTML(race.creator.slice(0, 6) + '...' + race.creator.slice(-4))}</td>
                      <td><span style="color: ${phaseColor}; font-weight: bold; font-family: var(--font-primary); font-size: 18px;">${phaseText}</span></td>
                      <td style="font-size: 16px; font-family: var(--font-primary);">${date}</td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
            ${races.length > 10 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                <button id="playerRacesPrev" class="btn btn-pixel" style="font-size: 16px; padding: 4px 12px;" disabled>PREV</button>
                <span id="playerRacesPage" class="pixel-text" style="font-size: 18px; color: var(--text-secondary);">Page 1 of ${Math.ceil(races.length / 10)}</span>
                <button id="playerRacesNext" class="btn btn-pixel" style="font-size: 16px; padding: 4px 12px;">NEXT</button>
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;

    // Setup pagination logic
    if (races.length > 10) {
      const btnPrev = document.getElementById('playerRacesPrev');
      const btnNext = document.getElementById('playerRacesNext');
      const pageLabel = document.getElementById('playerRacesPage');
      const rows = document.querySelectorAll('.player-race-row');
      let currentPage = 0;
      const totalPages = Math.ceil(races.length / 10);

      const updatePagination = () => {
        rows.forEach((row, i) => {
          row.style.display = (i >= currentPage * 10 && i < (currentPage + 1) * 10) ? 'table-row' : 'none';
        });
        pageLabel.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        btnPrev.disabled = currentPage === 0;
        btnNext.disabled = currentPage === totalPages - 1;
      };

      if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
          if (currentPage > 0) {
            currentPage--;
            updatePagination();
          }
        });
        btnNext.addEventListener('click', () => {
          if (currentPage < totalPages - 1) {
            currentPage++;
            updatePagination();
          }
        });
      }
    }

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
