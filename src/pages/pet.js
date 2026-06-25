/* Pet Scout View */
import { 
  escapeHTML,
  sanitizePetId,
  getPetsDetails,
  getPetHistory
} from '../api.js';

export async function renderPet(container, petId) {
  const cleanId = sanitizePetId(petId);
  if (cleanId === null) {
    container.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink);">
        <h2 class="pixel-text text-pink">ERROR: INVALID PET TOKEN ID</h2>
        <p>The pet token ID "${escapeHTML(petId)}" is not a valid positive integer.</p>
        <a href="#/" class="btn btn-pixel">RETURN TO DASHBOARD</a>
      </div>
    `;
    return;
  }

  // Display skeletons
  container.innerHTML = `
    <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
      <h1 class="pixel-text" style="font-size: 32px; color: #ffffff;">SCOUTING REPORT: GIGLING #${cleanId}</h1>
    </div>
    
    <div class="grid-2" style="margin-bottom: 32px; align-items: start;">
      <div class="card skeleton-rect skeleton-loader" style="height: 400px; max-width: 320px; margin: 0 auto;"></div>
      <div>
        <div class="card skeleton-rect skeleton-loader" style="height: 180px; margin-bottom: 24px;"></div>
        <div class="card skeleton-rect skeleton-loader" style="height: 200px;"></div>
      </div>
    </div>
  `;

  try {
    // Fetch pet details and pet racing history in parallel
    const [pets, history] = await Promise.all([
      getPetsDetails(cleanId),
      getPetHistory(cleanId).catch(() => null)
    ]);

    const pet = pets && pets.length > 0 ? pets[0] : null;

    if (!pet) {
      container.innerHTML = `
        <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink);">
          <h2 class="pixel-text text-pink">ERROR: GIGLING NOT FOUND</h2>
          <p>We could not find a registered Gigling with Token ID #${cleanId}. Make sure the ID is correct and the pet is hatched onchain.</p>
          <a href="#/" class="btn btn-pixel">RETURN TO DASHBOARD</a>
        </div>
      `;
      return;
    }

    const racePub = pet.racePublic || {};
    const elo = racePub.elo || 1000;
    const racesRun = racePub.racesRun || 0;
    const maxRaces = racePub.maxRaces || 60;
    
    const rarityName = pet.rarityName || 'Unknown';
    const rarityColor = pet.rarityColor || '#ffffff';
    const factionName = pet.factionName || 'None';
    const factionColor = pet.factionColor || '#59718d';

    // Rarity rating class for glowing
    let cardGlowClass = 'gigling-card-glow-uncommon';
    switch(pet.rarity) {
      case 2: cardGlowClass = 'gigling-card-glow-rare'; break;
      case 3: cardGlowClass = 'gigling-card-glow-epic'; break;
      case 4: cardGlowClass = 'gigling-card-glow-legendary'; break;
      case 5: cardGlowClass = 'gigling-card-glow-relic'; break;
      case 6: cardGlowClass = 'gigling-card-glow-giga'; break;
    }

    // Process Financial stats
    let financialHtml = `<p>No racing stats recorded yet.</p>`;
    let winsCount = 0;
    let podiumsCount = 0;
    let totalRaces = 0;
    let netEth = 0;
    let recentRaces = [];

    if (history) {
      winsCount = history.wins || 0;
      podiumsCount = history.podiums || 0;
      totalRaces = history.totalRaces || 0;
      
      const spentEth = parseFloat(history.weiSpent || 0) / 1e18;
      const wonEth = parseFloat(history.weiWon || 0) / 1e18;
      netEth = parseFloat(history.weiNet || 0) / 1e18;
      const roi = spentEth > 0 ? (netEth / spentEth) * 100 : 0;
      recentRaces = history.recent || [];

      financialHtml = `
        <div style="font-family: var(--font-primary); font-size: 22px; line-height: 1.4;">
          <div style="margin-bottom: 6px;">Total Spent: <span style="color: var(--text-primary);">${spentEth.toFixed(5)} ETH</span></div>
          <div style="margin-bottom: 6px;">Total Won: <span style="color: var(--text-primary);">${wonEth.toFixed(5)} ETH</span></div>
          <div style="margin-bottom: 6px;">Net Profit: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${netEth.toFixed(5)} ETH</span></div>
          <div>Net ROI: <span class="${netEth >= 0 ? 'text-green' : 'text-pink'}" style="font-weight: bold;">${netEth >= 0 ? '+' : ''}${roi.toFixed(1)}%</span></div>
        </div>
      `;
    }

    // Render HTML structure
    container.innerHTML = `
      <div class="stat-counter" style="text-align: left; margin-bottom: 24px;">
        <h1 class="pixel-text" style="font-size: 32px; color: #ffffff;">SCOUTING REPORT: GIGLING #${cleanId}</h1>
        <p style="font-family: var(--font-primary); font-size: 22px;">Owner: <a href="javascript:void(0)" onclick="history.pushState(null, '', '/player/${pet.ownerAddress}'); window.dispatchEvent(new Event('popstate'));" class="text-cyan" style="text-decoration: none;">${escapeHTML(pet.ownerAddress)}</a></p>
      </div>
      
      <div class="grid-2" style="margin-bottom: 32px; align-items: start;">
        <!-- Left Side: Collectible Digital Card -->
        <div class="gigling-card-container">
          <a href="https://opensea.io/item/abstract/0xd320831c876190c7ef79376ffcc889756f038e04/${pet.id}" target="_blank" style="text-decoration: none; color: inherit; display: block; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div class="gigling-card ${cardGlowClass}">
              <div class="gigling-card-header">
              <span class="gigling-card-title">#${pet.id}</span>
              <span class="gigling-card-gender" style="color: ${pet.gender === 'Male' ? '#3298ff' : '#ff5cb4'};">${pet.gender === 'Male' ? '♂' : '♀'}</span>
            </div>
            
            <div class="gigling-card-image-box">
              <img src="${escapeHTML(pet.imgUrl)}" class="gigling-card-image" />
              <div class="gigling-card-badge" style="background-color: ${factionColor}; display: flex; align-items: center; gap: 4px; padding: 2px 8px;">
                ${factionName !== 'None' ? `<img src="/factions/${factionName.toLowerCase()}.png" style="width: 14px; height: 14px; object-fit: contain; image-rendering: pixelated;" alt="" />` : ''}
                <span>${factionName}</span>
              </div>
            </div>
            
            <div class="gigling-card-info">
              <div>
                <div class="gigling-card-stat-label">RARITY</div>
                <div class="gigling-card-stat-val" style="color: ${rarityColor};">${rarityName}</div>
              </div>
              <div style="text-align: right;">
                <div class="gigling-card-stat-label">ELO RATING</div>
                <div class="gigling-card-stat-val text-cyan">${elo}</div>
              </div>
            </div>
            
            <div style="border-top: 1px solid var(--border-color); padding-top: 12px; font-family: var(--font-primary); font-size: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Career Races:</span>
                <span>${racesRun} / ${maxRaces}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Win Ratio:</span>
                <span class="text-green">${totalRaces > 0 ? ((winsCount/totalRaces)*100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
          </a>
        </div>

        <!-- Right Side: Analytics, Stats, Performance Trend -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Financial ROI Card -->
          <div class="grid-2">
            <div class="card card-glowing" style="border-color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'};">
              <h3 class="pixel-text" style="font-size: 20px; color: ${netEth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'}; margin-bottom: 12px;">FINANCIAL ANALYSIS</h3>
              ${financialHtml}
            </div>
            
            <div class="card card-glowing" style="border-color: var(--neon-cyan);">
              <h3 class="pixel-text text-cyan" style="font-size: 20px; margin-bottom: 12px;">RACE SUMMARY</h3>
              <div style="font-family: var(--font-primary); font-size: 22px; line-height: 1.4;">
                <div style="margin-bottom: 6px;">Total Races: <span style="color: var(--text-primary);">${totalRaces}</span></div>
                <div style="margin-bottom: 6px;">1st Places (Wins): <span class="text-green" style="font-weight: bold;">${winsCount}</span></div>
                <div style="margin-bottom: 6px;">Podiums (1st-3rd): <span class="text-cyan">${podiumsCount}</span></div>
              </div>
            </div>
          </div>

          <!-- Pet Attributes (Stat bars with reveals) -->
          <div class="pixel-box">
            <div class="pixel-box-title">REVEALED ATTRIBUTE SPECTRUM</div>
            
            ${renderStatBar('Start', racePub.startRange, racePub.revealsPerStat?.start || 0)}
            ${renderStatBar('Speed', racePub.speedRange, racePub.revealsPerStat?.speed || 0)}
            ${renderStatBar('Stamina', racePub.staminaRange, racePub.revealsPerStat?.stamina || 0)}
            ${renderStatBar('Finish', racePub.finishRange, racePub.revealsPerStat?.finish || 0)}

            <div style="font-size: 17px; color: var(--text-muted); margin-top: 12px; text-align: center; font-style: italic; font-family: var(--font-primary);">
              Note: Stats are fully revealed (Min = Max) after 12 career races.
            </div>
          </div>

          <!-- Traits Section -->
          ${racePub.traits && racePub.traits.length > 0 ? `
            <div class="pixel-box">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="pixel-box-title" style="margin-bottom: 0;">GIGLING CHARACTER TRAITS</div>
                <button id="traitsInfoBtn" class="btn-giga-gold" style="font-size: 16px; padding: 4px 12px; height: 32px;">INFO</button>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${racePub.traits.map(t => `
                  <div class="badge" style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 12px;">
                    <span style="font-family: var(--font-primary); font-size: 20px; color: var(--text-primary); margin-right: 6px;">${escapeHTML(t.name)}</span>
                    <span class="text-yellow" style="font-family: var(--font-primary); font-size: 16px; font-weight: bold;">Tier ${t.tier}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Custom Line Canvas Graph for Finishing Ranks -->
          ${recentRaces.length > 0 ? `
            <div class="pixel-box">
              <div class="pixel-box-title">FINISHING PLACEMENT TREND (LAST 15 RACES)</div>
              <div style="width: 100%; height: 160px; position: relative;">
                <canvas id="rankCanvas" style="width: 100%; height: 100%;"></canvas>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Recent Races history table -->
      <div class="pixel-box">
        <div class="pixel-box-title">HISTORICAL RUNDOWN</div>
        <div class="table-container">
          ${recentRaces.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              No historical races recorded on this pet yet.
            </div>
          ` : `
            <table class="table-retro">
              <thead>
                <tr>
                  <th>Race ID</th>
                  <th>Placement Rank</th>
                  <th>Payout Claimed</th>
                  <th>Fee Paid</th>
                  <th>Winnings / Refund</th>
                  <th>Date Settled</th>
                </tr>
              </thead>
              <tbody>
                ${recentRaces.map(r => {
                  const entryEth = parseFloat(r.weiEntry || 0) / 1e18;
                  const payoutEth = parseFloat(r.weiPayout || 0) / 1e18;
                  const pDiffEth = payoutEth - entryEth;
                  
                  const isWin = r.rank === 0;
                  const isPodium = r.rank <= 2;
                  
                  let rankLabel = `${r.rank + 1}th`;
                  if (r.rank === 0) rankLabel = '🏆 1st';
                  else if (r.rank === 1) rankLabel = '🥈 2nd';
                  else if (r.rank === 2) rankLabel = '🥉 3rd';
                  
                  const date = new Date(r.settledAt * 1000).toLocaleString();

                  return `
                    <tr class="clickable" onclick="window.open('https://gigaverse.io/racing/race/${r.raceId}', '_blank');">
                      <td><span class="text-cyan">#${r.raceId}</span></td>
                      <td style="font-weight: bold; color: ${isWin ? 'var(--neon-yellow)' : (isPodium ? 'var(--neon-cyan)' : 'var(--text-secondary)')};">${rankLabel}</td>
                      <td style="font-family: var(--font-primary); font-size: 20px;">${payoutEth.toFixed(5)} ETH</td>
                      <td style="font-family: var(--font-primary); font-size: 20px;">${entryEth.toFixed(5)} ETH</td>
                      <td class="${pDiffEth >= 0 ? 'text-green' : 'text-pink'}" style="font-family: var(--font-primary); font-size: 20px;">
                        ${pDiffEth >= 0 ? '+' : ''}${pDiffEth.toFixed(5)} ETH
                      </td>
                      <td style="font-family: var(--font-primary); font-size: 20px;">${date}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;

    // Render Canvas chart if canvas exists
    const canvas = document.getElementById('rankCanvas');
    if (canvas) {
      drawCanvasChart(canvas, recentRaces);
    }

    // Modal Setup for Traits Info button
    const traitsInfoBtn = document.getElementById('traitsInfoBtn');
    if (traitsInfoBtn) {
      const PET_IMAGES = [
        '/pet/1.PNG',
        '/pet/2.PNG'
      ];
      let currentModalIndex = 0;

      traitsInfoBtn.addEventListener('click', () => {
        currentModalIndex = 0;
        const modalEl = document.createElement('div');
        modalEl.id = 'traitsInfoModal';
        modalEl.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        `;

        modalEl.innerHTML = `
          <div class="pixel-box" style="width: 95%; max-width: 1175px; padding: 24px; text-align: center; background-color: var(--bg-panel); border-color: var(--border-color); display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 12px;">
              <h2 class="pixel-text" id="modalTitle" style="color: #ffffff; margin: 0; font-size: 30px;">CHARACTER TRAITS INFO</h2>
              <button id="modalCloseBtn" class="btn btn-pixel" style="padding: 4px 12px; font-size: 20px;">X</button>
            </div>
            
            <div style="display: flex; justify-content: center; align-items: center;">
              <img id="modalPetImg" src="${PET_IMAGES[currentModalIndex]}" style="max-width: 100%; height: auto; border: 2px solid var(--border-color); border-radius: 6px;" alt="Pet Traits Info" />
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button id="modalPrevBtn" class="btn btn-pixel" style="font-size: 20px; padding: 6px 16px;">PREV</button>
              <span id="modalCaption" class="pixel-text" style="font-size: 22px; color: var(--text-secondary);">Image 1 of ${PET_IMAGES.length}</span>
              <button id="modalNextBtn" class="btn btn-pixel" style="font-size: 20px; padding: 6px 16px;">NEXT</button>
            </div>
          </div>
        `;

        document.body.appendChild(modalEl);

        const modalPetImg = document.getElementById('modalPetImg');
        const modalCaption = document.getElementById('modalCaption');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalPrevBtn = document.getElementById('modalPrevBtn');
        const modalNextBtn = document.getElementById('modalNextBtn');

        const updateModalSlide = () => {
          modalPetImg.src = PET_IMAGES[currentModalIndex];
          modalCaption.textContent = `Image ${currentModalIndex + 1} of ${PET_IMAGES.length}`;
        };

        modalCloseBtn.addEventListener('click', () => {
          modalEl.remove();
        });

        modalPrevBtn.addEventListener('click', () => {
          currentModalIndex = (currentModalIndex - 1 + PET_IMAGES.length) % PET_IMAGES.length;
          updateModalSlide();
        });

        modalNextBtn.addEventListener('click', () => {
          currentModalIndex = (currentModalIndex + 1) % PET_IMAGES.length;
          updateModalSlide();
        });

        // Close on clicking backdrop
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) modalEl.remove();
        });
      });
    }


  } catch (error) {
    container.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink);">
        <h2 class="pixel-text text-pink">ERROR SCOUTING PET</h2>
        <p>API Call failed: ${escapeHTML(error.message)}</p>
        <button onclick="location.reload()" class="btn btn-pixel">RETRY CONNECTION</button>
      </div>
    `;
  }
}

/**
 * Render a customized stat progress bar with reveals indicators and possible range
 */
function renderStatBar(name, rangeObj, reveals) {
  const min = rangeObj ? rangeObj.min || 0 : 0;
  const max = rangeObj ? rangeObj.max || 0 : 100;
  const isFullyRevealed = min === max;
  
  // Percentages for width calculations
  const minPercent = min;
  const maxPercent = max;
  const rangeWidth = max - min;
  
  let labelText = `${min}`;
  if (!isFullyRevealed) {
    labelText = `${min} - ${max} (Scouting...)`;
  }

  return `
    <div class="stat-bar-container">
      <div class="stat-bar-header" style="align-items: center; margin-bottom: 6px;">
        <span style="font-family: var(--font-primary); font-size: 24px; font-weight: bold; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">${name}</span>
        <span style="font-family: var(--font-primary); font-size: 20px; color: var(--text-secondary);">${labelText} <span class="text-muted" style="font-size: 15px;">(${reveals}/12 reveals)</span></span>
      </div>
      <div class="stat-bar-outer">
        ${isFullyRevealed ? `
          <div class="stat-bar-inner" style="width: ${minPercent}%;"></div>
        ` : `
          <!-- Shaded range bar representing possible outcome values -->
          <div class="stat-bar-inner" style="width: ${minPercent}%;"></div>
          <div class="stat-bar-range" style="left: ${minPercent}%; width: ${rangeWidth}%;"></div>
        `}
      </div>
    </div>
  `;
}

/**
 * Draw a clean performance trend canvas chart
 */
function drawCanvasChart(canvas, recentRaces) {
  const ctx = canvas.getContext('2d');
  
  // Resize canvas according to container
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  const width = rect.width;
  const height = rect.height;
  
  // Settings
  const padding = 25;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // We plot ranks (0 to 7, where 0 is 1st place and 7 is 8th place)
  // Let's reverse the Y-axis so 1st place is at the top of the chart!
  const maxRank = 7; 
  
  // Data: we take chronological order (reverse of recent which is descending settledAt)
  const data = [...recentRaces].reverse();
  const count = data.length;
  
  if (count === 0) return;
  
  // Drawing Background grid lines
  ctx.strokeStyle = '#162335';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines representing ranks 1st, 3rd, 5th, 8th
  const gridRanks = [0, 2, 4, 7];
  gridRanks.forEach(r => {
    const y = padding + (r / maxRank) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    // Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#59718d';
    ctx.fillText(`${r + 1}`, 10, y + 3);
  });
  
  // Map points
  const points = [];
  const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth;
  
  for (let i = 0; i < count; i++) {
    const r = data[i].rank;
    const x = padding + i * stepX;
    const y = padding + (r / maxRank) * chartHeight;
    points.push({ x, y, rank: r + 1 });
  }
  
  // Draw line
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  
  // Draw filled area gradient
  ctx.shadowBlur = 0; // reset shadow
  const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding);
  ctx.lineTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding);
  ctx.closePath();
  ctx.fill();
  
  // Draw points
  points.forEach((p, idx) => {
    ctx.beginPath();
    ctx.fillStyle = p.rank === 1 ? '#ffe600' : '#00f0ff';
    ctx.arc(p.x, p.y, p.rank === 1 ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#05080c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}
