/* Egg Hatching Simulator & Faction Dust Optimizer */
import { escapeHTML } from '../api.js';

// Progress & Quality Matrix Data
const MATRIX = {
  10: { progress: 1.00, biofuel: '1x Biofuel', comfortRates: [0.20, 0.40, 0.60, 0.80, 1.00], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  20: { progress: 1.25, biofuel: '2x Biofuel', comfortRates: [0.25, 0.50, 0.75, 1.00, 1.25], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  30: { progress: 1.50, biofuel: '3x Biofuel', comfortRates: [0.30, 0.60, 0.90, 1.20, 1.50], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  40: { progress: 1.75, biofuel: '4x Biofuel', comfortRates: [0.35, 0.70, 1.05, 1.40, 1.75], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  50: { progress: 2.00, biofuel: '5x Biofuel', comfortRates: [0.40, 0.80, 1.20, 1.60, 2.00], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  60: { progress: 2.25, biofuel: '1x Biofuel+', comfortRates: [0.45, 0.90, 1.35, 1.80, 2.25], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  70: { progress: 2.50, biofuel: '2x Biofuel+', comfortRates: [0.50, 1.00, 1.50, 2.00, 2.50], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  80: { progress: 2.75, biofuel: '3x Biofuel+', comfortRates: [0.55, 1.10, 1.65, 2.20, 2.75], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  90: { progress: 3.00, biofuel: '4x Biofuel+', comfortRates: [0.60, 1.20, 1.80, 2.40, 3.00], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
  100: { progress: 3.00, biofuel: '5x Biofuel+', comfortRates: [0.60, 1.20, 1.80, 2.40, 3.00], comfortMats: ['2x Incube', '4x Incube', '2x Incube+', '4x Incube+', '1x Incube++'] },
};

const FACTIONS = [
  { id: 1, name: 'Crusader', color: 'var(--faction-1)' },
  { id: 2, name: 'Overseer', color: 'var(--faction-2)' },
  { id: 3, name: 'Athena', color: 'var(--faction-3)' },
  { id: 4, name: 'Archon', color: 'var(--faction-4)' },
  { id: 5, name: 'Foxglove', color: 'var(--faction-5)' },
  { id: 6, name: 'Summoner', color: 'var(--faction-6)' },
  { id: 7, name: 'Chobo', color: 'var(--faction-7)' },
];

export async function renderHatching(container) {
  // Initialize state
  let currentTemp = 90;
  let currentComfort = 5;
  let dustInfluences = {}; // factionId -> count
  FACTIONS.forEach(f => { dustInfluences[f.id] = 0; });

  container.innerHTML = `
    <!-- Top Compact Header Block -->
    <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid var(--border-color); padding-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="flex-shrink: 0; width: 64px; height: 64px; border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; background-color: var(--bg-card); display: flex; justify-content: center; align-items: center;">
          <img src="/egg/egg.png" style="width: 48px; height: 48px; object-fit: contain;" alt="Gigling Egg" />
        </div>
        <div>
          <h1 class="pixel-text" style="font-size: 28px; color: #ffffff; margin: 0; line-height: 1.2;">EGG HATCHING SIMULATOR</h1>
          <p style="margin: 0; font-size: 22px; color: var(--text-secondary);">Simulate timelines and optimize Faction Dust allocation.</p>
        </div>
      </div>
      <button id="hatchInfoBtn" class="btn-giga-gold" style="font-size: 18px; padding: 4px 16px; height: 38px;">INFO</button>
    </div>

    <!-- Simulator Body Layout: Tighter columns to avoid scrolling -->
    <div class="grid-2" style="gap: 16px; align-items: start;">
      <!-- Left Column: Simulator Settings & Summary -->
      <div class="pixel-box" style="padding: 16px; margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="pixel-box-title">PROGRESS AND QUALITY SIMULATOR</div>
          
          <!-- Presets with highly legible m5x7 typography, no emoticons -->
          <div style="display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;">
            <button id="presetMax" class="btn btn-primary" style="font-size: 20px; padding: 4px 12px; font-family: var(--font-primary); font-weight: normal; text-transform: uppercase;">MAX (34d)</button>
            <button id="presetMedium" class="btn" style="font-size: 20px; padding: 4px 12px; font-family: var(--font-primary); font-weight: normal; text-transform: uppercase;">BALANCED (50d)</button>
            <button id="presetBudget" class="btn" style="font-size: 20px; padding: 4px 12px; font-family: var(--font-primary); font-weight: normal; text-transform: uppercase;">BUDGET (100d)</button>
          </div>

          <!-- Custom sliders with larger margins & labels -->
          <div class="stat-bar-container" style="margin-bottom: 12px;">
            <div class="stat-bar-header" style="font-size: 20px; display: flex; justify-content: space-between; align-items: center;">
              <span>Temperature: <span id="tempVal" style="color: #ff3c00; font-weight: bold;">90</span></span>
              <span id="biofuelLabel" style="color: var(--text-muted); font-size: 18px;">4x Biofuel+ / day</span>
            </div>
            <input type="range" id="tempSlider" min="10" max="100" step="10" value="90" style="width: 100%; accent-color: #ff3c00; cursor: pointer; margin-bottom: 2px;" />
            <div style="display: flex; justify-content: space-between; font-size: 18px; color: var(--text-muted); padding: 0 8px; font-family: var(--font-primary);">
              <span id="tempTick-10">10</span>
              <span id="tempTick-20">20</span>
              <span id="tempTick-30">30</span>
              <span id="tempTick-40">40</span>
              <span id="tempTick-50">50</span>
              <span id="tempTick-60">60</span>
              <span id="tempTick-70">70</span>
              <span id="tempTick-80">80</span>
              <span id="tempTick-90">90</span>
              <span id="tempTick-100">100</span>
            </div>
          </div>

          <div class="stat-bar-container" style="margin-bottom: 16px;">
            <div class="stat-bar-header" style="font-size: 20px; display: flex; justify-content: space-between; align-items: center;">
              <span>Comfort: <span id="comfortVal" class="text-purple" style="font-weight: bold;">5</span></span>
              <span id="incubeLabel" style="color: var(--text-muted); font-size: 18px;">1x Incube++ / day</span>
            </div>
            <input type="range" id="comfortSlider" min="1" max="5" step="1" value="5" style="width: 100%; accent-color: var(--neon-purple); cursor: pointer; margin-bottom: 2px;" />
            <div style="display: flex; justify-content: space-between; font-size: 18px; color: var(--text-muted); padding: 0 8px; font-family: var(--font-primary);">
              <span id="comfortTick-1">1</span>
              <span id="comfortTick-2">2</span>
              <span id="comfortTick-3">3</span>
              <span id="comfortTick-4">4</span>
              <span id="comfortTick-5">5</span>
            </div>
          </div>
        </div>

        <!-- Compact Summary Card -->
        <div class="card" style="background-color: var(--bg-card); border-color: var(--border-color); padding: 12px; margin-top: 10px;">
          <h3 class="pixel-text text-cyan" style="font-size: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 8px;">SIMULATION SUMMARY</h3>
          
          <div style="font-family: monospace; font-size: 16px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Daily Progress:</span>
              <span id="resProgRate" class="text-green">+3.00%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Daily Quality:</span>
              <span id="resQualRate" class="text-purple">+3.00%</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px; margin-bottom: 4px;">
              <span>Days to Hatch:</span>
              <span id="resDays" class="text-cyan" style="font-weight: bold;">34 Days</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Projected Quality:</span>
              <span id="resFinalQuality" class="text-yellow" style="font-weight: bold;">100.0%</span>
            </div>
            <div style="display: flex; justify-content: space-between; flex-direction: column; border-top: 1px dashed var(--border-color); padding-top: 4px;">
              <span style="color: var(--text-muted); font-size: 16px;">Total Materials Required:</span>
              <div style="font-size: 18px; padding-left: 8px; display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <img id="resBioImg" src="/materials/biofuel+.png" style="width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated;" alt="" />
                  <span id="resTotalBio" style="color: var(--text-primary); font-weight: bold;">136x Biofuel+</span>
                  <span style="color: var(--text-muted); font-size: 16px; display: flex; align-items: center; gap: 4px; margin-left: 4px;">
                    (
                    <img id="resBioRawImg" src="/materials/coal.png" style="width: 18px; height: 18px; object-fit: contain; image-rendering: pixelated; display: inline-block; vertical-align: middle;" alt="" />
                    <span id="resTotalBioRaw">136 Coal</span>
                    )
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <img id="resIncImg" src="/materials/incube++.png" style="width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated;" alt="" />
                  <span id="resTotalInc" style="color: var(--text-primary); font-weight: bold;">34x Incube++</span>
                  <span style="color: var(--text-muted); font-size: 16px; display: flex; align-items: center; gap: 4px; margin-left: 4px;">
                    (
                    <img id="resIncRawImg" src="/materials/stone.png" style="width: 18px; height: 18px; object-fit: contain; image-rendering: pixelated; display: inline-block; vertical-align: middle;" alt="" />
                    <span id="resTotalIncRaw">170 Stone</span>
                    )
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Faction Dust Optimizer (Split in grid to save space) -->
      <div class="pixel-box" style="padding: 16px; margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="pixel-box-title">FACTION DUST OPTIMIZER</div>
          
          <!-- Grid of Dust controls to avoid height accumulation -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
            ${FACTIONS.map(f => `
              <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-card); padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; white-space: nowrap;">
                  <img src="/factions/${f.name.toLowerCase()}.png" style="width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; image-rendering: pixelated;" alt="${f.name} Logo" />
                  <span style="font-size: 18px; text-overflow: ellipsis; overflow: hidden;">${f.name} <span id="dustCostDetail-${f.id}" style="color: var(--text-muted); font-size: 16px;">(0)</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-pixel dec-dust" data-id="${f.id}" style="padding: 0px; font-size: 18px; line-height: 1; height: 26px; width: 26px; display: flex; align-items: center; justify-content: center;">-</button>
                  <span id="dustCount-${f.id}" class="pixel-text text-cyan" style="font-size: 20px; width: 16px; text-align: center;">0</span>
                  <button class="btn btn-pixel inc-dust" data-id="${f.id}" style="padding: 0px; font-size: 18px; line-height: 1; height: 26px; width: 26px; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Fate Summary Card -->
        <div class="card" style="background-color: var(--bg-card); border-color: var(--border-color); padding: 12px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">
            <h3 class="pixel-text text-yellow" style="font-size: 18px; margin: 0;">FATE CHANCE DETAILS</h3>
            <span class="pixel-text text-cyan" style="font-size: 18px;" id="totalFateLabel">Total: 0/20</span>
          </div>

          <!-- Probability Breakdown -->
          <div style="display: flex; flex-direction: column; gap: 4px; font-family: monospace; font-size: 15px; margin-bottom: 6px;" id="probList">
            <div style="color: var(--text-muted); text-align: center; padding: 6px; font-size: 14px;">No dust added (100% Factionless).</div>
          </div>

          <!-- Cost Breakdown & Advisor Tip -->
          <div style="border-top: 1px dashed var(--border-color); padding-top: 4px; font-family: monospace; font-size: 14px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;" id="costSummaryContainer">
              <span style="color: var(--text-muted);">Total Dust Cost:</span>
              <span id="totalCostSpan" class="text-yellow" style="font-weight: bold;">0 Faction Dust</span>
            </div>
            
            <div id="advisorBox" style="background-color: rgba(0, 240, 255, 0.03); border: 1px dashed rgba(0, 240, 255, 0.15); padding: 6px 8px; border-radius: 6px; font-size: 14px; color: var(--text-secondary); line-height: 1.2;">
              💡 Add dust to optimize allocation. Mixing dusts saves resources!
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Simulator controls selection
  const tempSlider = document.getElementById('tempSlider');
  const comfortSlider = document.getElementById('comfortSlider');
  const tempValText = document.getElementById('tempVal');
  const comfortValText = document.getElementById('comfortVal');

  const biofuelLabel = document.getElementById('biofuelLabel');
  const incubeLabel = document.getElementById('incubeLabel');

  const resProgRate = document.getElementById('resProgRate');
  const resQualRate = document.getElementById('resQualRate');
  const resDays = document.getElementById('resDays');
  const resFinalQuality = document.getElementById('resFinalQuality');

  const resTotalBio = document.getElementById('resTotalBio');
  const resTotalInc = document.getElementById('resTotalInc');

  const updateSimulation = () => {
    tempValText.textContent = currentTemp;
    comfortValText.textContent = currentComfort;

    // Update active highlight style for temperature tick numbers
    for (let t = 10; t <= 100; t += 10) {
      const tick = document.getElementById(`tempTick-${t}`);
      if (tick) {
        if (t === currentTemp) {
          tick.style.color = '#ff3c00';
          tick.style.fontWeight = 'bold';
          tick.style.textShadow = '0 0 6px rgba(255, 60, 0, 0.4)';
        } else {
          tick.style.color = 'var(--text-muted)';
          tick.style.fontWeight = 'normal';
          tick.style.textShadow = 'none';
        }
      }
    }

    // Update active highlight style for comfort tick numbers
    for (let c = 1; c <= 5; c++) {
      const tick = document.getElementById(`comfortTick-${c}`);
      if (tick) {
        if (c === currentComfort) {
          tick.style.color = 'var(--neon-purple)';
          tick.style.fontWeight = 'bold';
          tick.style.textShadow = '0 0 6px rgba(146, 84, 222, 0.4)';
        } else {
          tick.style.color = 'var(--text-muted)';
          tick.style.fontWeight = 'normal';
          tick.style.textShadow = 'none';
        }
      }
    }

    // Update preset buttons active visual state
    const pMax = document.getElementById('presetMax');
    const pMedium = document.getElementById('presetMedium');
    const pBudget = document.getElementById('presetBudget');
    if (pMax && pMedium && pBudget) {
      pMax.classList.remove('btn-primary');
      pMedium.classList.remove('btn-primary');
      pBudget.classList.remove('btn-primary');

      if (currentTemp === 90 && currentComfort === 5) {
        pMax.classList.add('btn-primary');
      } else if (currentTemp === 50 && currentComfort === 3) {
        pMedium.classList.add('btn-primary');
      } else if (currentTemp === 10 && currentComfort === 1) {
        pBudget.classList.add('btn-primary');
      }
    }

    const matrixRow = MATRIX[currentTemp];
    if (matrixRow) {
      const progRate = matrixRow.progress;
      const qualRate = matrixRow.comfortRates[currentComfort - 1];
      const biofuelDaily = matrixRow.biofuel;
      const incubeDaily = matrixRow.comfortMats[currentComfort - 1];

      // Calculate days to hatch
      const days = Math.ceil(100 / progRate);

      // Calculate final quality
      const finalQual = Math.min(100, days * qualRate);

      // Materials multiplication
      const totalBiofuelUnits = days * parseInt(biofuelDaily);
      const biofuelName = biofuelDaily.split(' ').slice(1).join(' ');

      const totalIncubeUnits = days * parseInt(incubeDaily);
      const incubeName = incubeDaily.split(' ').slice(1).join(' ');

      // Update values
      biofuelLabel.textContent = `${biofuelDaily} / day`;
      incubeLabel.textContent = `${incubeDaily} / day`;

      resProgRate.textContent = `+${progRate.toFixed(2)}%`;
      resQualRate.textContent = `+${qualRate.toFixed(2)}%`;
      resDays.textContent = `${days} Days`;
      resFinalQuality.textContent = `${finalQual.toFixed(1)}%`;

      resTotalBio.textContent = `${totalBiofuelUnits}x ${biofuelName}`;
      resTotalInc.textContent = `${totalIncubeUnits}x ${incubeName}`;

      let rawBioName = '';
      let rawBioCount = totalBiofuelUnits;
      if (biofuelName.includes('+')) {
        rawBioName = 'coal';
      } else {
        rawBioName = 'wood';
      }

      let rawIncName = '';
      let rawIncCount = totalIncubeUnits;
      if (incubeName.includes('++')) {
        rawIncName = 'stone';
        rawIncCount = totalIncubeUnits * 5;
      } else if (incubeName.includes('+')) {
        rawIncName = 'fibre';
        rawIncCount = totalIncubeUnits * 2;
      } else {
        rawIncName = 'bones';
        rawIncCount = totalIncubeUnits * 2;
      }

      const bioRawNameCap = rawBioName.charAt(0).toUpperCase() + rawBioName.slice(1);
      const incRawNameCap = rawIncName.charAt(0).toUpperCase() + rawIncName.slice(1);
      document.getElementById('resTotalBioRaw').textContent = `${rawBioCount} ${bioRawNameCap}`;
      document.getElementById('resTotalIncRaw').textContent = `${rawIncCount} ${incRawNameCap}`;

      // Update image paths dynamically
      const bioImgName = biofuelName.toLowerCase().replace(' ', '');
      const incImgName = incubeName.toLowerCase().replace(' ', '');
      const bioImgEl = document.getElementById('resBioImg');
      const incImgEl = document.getElementById('resIncImg');
      if (bioImgEl) bioImgEl.src = `/materials/${bioImgName}.png`;
      if (incImgEl) incImgEl.src = `/materials/${incImgName}.png`;

      const bioRawImgEl = document.getElementById('resBioRawImg');
      const incRawImgEl = document.getElementById('resIncRawImg');
      if (bioRawImgEl) bioRawImgEl.src = `/materials/${rawBioName}.png`;
      if (incRawImgEl) incRawImgEl.src = `/materials/${rawIncName}.png`;
    }
  };

  // Preset Buttons listeners
  document.getElementById('presetMax').addEventListener('click', () => {
    currentTemp = 90;
    currentComfort = 5;
    tempSlider.value = 90;
    comfortSlider.value = 5;
    updateSimulation();
  });

  document.getElementById('presetMedium').addEventListener('click', () => {
    currentTemp = 50;
    currentComfort = 3;
    tempSlider.value = 50;
    comfortSlider.value = 3;
    updateSimulation();
  });

  document.getElementById('presetBudget').addEventListener('click', () => {
    currentTemp = 10;
    currentComfort = 1;
    tempSlider.value = 10;
    comfortSlider.value = 1;
    updateSimulation();
  });

  tempSlider.addEventListener('input', (e) => {
    currentTemp = parseInt(e.target.value);
    updateSimulation();
  });

  comfortSlider.addEventListener('input', (e) => {
    currentComfort = parseInt(e.target.value);
    updateSimulation();
  });

  // Faction Dust controls
  const totalFateLabel = document.getElementById('totalFateLabel');
  const probList = document.getElementById('probList');
  const totalCostSpan = document.getElementById('totalCostSpan');
  const advisorBox = document.getElementById('advisorBox');

  const updateFateAndCosts = () => {
    let totalInfluences = 0;
    FACTIONS.forEach(f => { totalInfluences += dustInfluences[f.id]; });

    // Update individual dust costs in real-time
    FACTIONS.forEach(f => {
      const k = dustInfluences[f.id];
      const cost = (k * (9 + k)) / 2;
      const costEl = document.getElementById(`dustCostDetail-${f.id}`);
      if (costEl) {
        costEl.textContent = `(${cost})`;
        costEl.style.color = cost > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)';
      }
    });

    totalFateLabel.textContent = `Total: ${totalInfluences}/20`;

    if (totalInfluences === 0) {
      probList.innerHTML = `
        <div style="color: var(--text-muted); text-align: center; padding: 6px; font-size: 14px; width: 100%;">No dust added (100% Factionless).</div>
      `;
      totalCostSpan.textContent = `0 Faction Dust`;
      advisorBox.innerHTML = `💡 Add dust to optimize allocation. Mixing dusts saves resources!`;
      return;
    }

    const probItems = [];

    // Add factions with points
    FACTIONS.forEach(f => {
      const k = dustInfluences[f.id];
      if (k > 0) {
        const prob = k * 4.75;
        probItems.push({ name: f.name, prob, color: f.color });
      }
    });

    // Gigus chance
    const gigusProb = totalInfluences * 0.25;
    probItems.push({ name: 'Gigus', prob: gigusProb, color: 'var(--neon-green)' });

    // Faction None chance
    const noneProb = 100 - (totalInfluences * 5);
    if (noneProb > 0) {
      probItems.push({ name: 'Factionless', prob: noneProb, color: 'var(--faction-none)' });
    }

    // Render probability list (compact lines)
    probList.innerHTML = probItems.map(p => {
      const isNone = p.name.includes('Factionless');
      const nameKey = p.name.split(' ')[0].toLowerCase();
      const logoUrl = isNone ? '' : `/factions/${nameKey}.png`;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 14px; padding: 2px 0;">
          <span style="display: flex; align-items: center; gap: 6px;">
            ${isNone ? `<span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${p.color}; flex-shrink: 0;"></span>` : `<img src="${logoUrl}" style="width: 14px; height: 14px; object-fit: contain; flex-shrink: 0; image-rendering: pixelated;" alt="" />`}
            ${p.name}
          </span>
          <span style="font-weight: bold; color: ${p.color};">${p.prob.toFixed(2)}%</span>
        </div>
      `;
    }).join('');

    // Cost calculation: K influences costs K * (9 + K) / 2
    let totalDustCount = 0;
    FACTIONS.forEach(f => {
      const k = dustInfluences[f.id];
      if (k > 0) {
        totalDustCount += (k * (9 + k)) / 2;
      }
    });

    totalCostSpan.textContent = `${totalDustCount} Faction Dust`;

    let advisorHtml = `💡 `;
    if (totalInfluences < 20) {
      advisorHtml += `Influences: ${totalInfluences}/20. Add ${20 - totalInfluences} more to guarantee a faction and eliminate the Factionless risk!`;
    } else {
      const activeFactionsCount = FACTIONS.filter(f => dustInfluences[f.id] > 0).length;
      if (activeFactionsCount === 1) {
        advisorHtml += `Guaranteed 100% faction! Costs <span class="text-pink">290 dust</span>. Splitting 10/10 saves 100 dust (only costs 190 total dust)!`;
      } else if (activeFactionsCount === 2) {
        const maxK = Math.max(...FACTIONS.map(f => dustInfluences[f.id]));
        if (maxK >= 10) {
          advisorHtml += `Guaranteed 100% faction! Splitting 5/5/5/5 would only cost <span class="text-green">140 dust</span>, saving you ${totalDustCount - 140} dust!`;
        } else {
          advisorHtml += `Optimized! Splitting influences across 2 factions is saving you dust.`;
        }
      } else {
        advisorHtml += `Excellent! Split allocation of ${totalDustCount} dust is highly optimized!`;
      }
    }
    advisorBox.innerHTML = advisorHtml;
  };

  // Bind Faction Dust buttons
  document.querySelectorAll('.inc-dust').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      let total = 0;
      FACTIONS.forEach(f => { total += dustInfluences[f.id]; });

      if (total >= 20) return;

      dustInfluences[id]++;
      document.getElementById(`dustCount-${id}`).textContent = dustInfluences[id];
      updateFateAndCosts();
    });
  });

  document.querySelectorAll('.dec-dust').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (dustInfluences[id] > 0) {
        dustInfluences[id]--;
        document.getElementById(`dustCount-${id}`).textContent = dustInfluences[id];
        updateFateAndCosts();
      }
    });
  });

  // Modal Setup for Info button
  const hatchInfoBtn = document.getElementById('hatchInfoBtn');
  const EGG_IMAGES = [
    '/egg/1.png',
    '/egg/2.png',
    '/egg/3.png'
  ];
  const MODAL_TITLES = [
    'OVERVIEW',
    'MATERIALS',
    'PROGRESS AND QUALITY'
  ];
  let currentModalIndex = 0;

  hatchInfoBtn.addEventListener('click', () => {
    currentModalIndex = 0;
    const modalEl = document.createElement('div');
    modalEl.id = 'hatchInfoModal';
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
      <div class="pixel-box" style="width: 95%; max-width: 940px; padding: 20px; text-align: center; background-color: var(--bg-panel); border-color: var(--border-color); display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
          <h2 class="pixel-text" id="modalTitle" style="color: #ffffff; margin: 0; font-size: 24px;">OVERVIEW</h2>
          <button id="modalCloseBtn" class="btn btn-pixel" style="padding: 2px 8px; font-size: 16px;">X</button>
        </div>
        
        <div style="display: flex; justify-content: center; align-items: center; height: 560px; background-color: var(--bg-color); border: 2px solid var(--border-color); border-radius: 6px; overflow: hidden; position: relative;">
          <img id="modalEggImg" src="${EGG_IMAGES[currentModalIndex]}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Egg Intel Slide" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button id="modalPrevBtn" class="btn btn-pixel" style="font-size: 18px; padding: 4px 12px;">PREV</button>
          <span id="modalCaption" class="pixel-text" style="font-size: 18px; color: var(--text-secondary);">Image 1 of 3</span>
          <button id="modalNextBtn" class="btn btn-pixel" style="font-size: 18px; padding: 4px 12px;">NEXT</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    const modalEggImg = document.getElementById('modalEggImg');
    const modalCaption = document.getElementById('modalCaption');
    const modalTitle = document.getElementById('modalTitle');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');

    const updateModalSlide = () => {
      modalEggImg.src = EGG_IMAGES[currentModalIndex];
      modalCaption.textContent = `Image ${currentModalIndex + 1} of 3`;
      modalTitle.textContent = MODAL_TITLES[currentModalIndex];
    };

    modalCloseBtn.addEventListener('click', () => {
      modalEl.remove();
    });

    modalPrevBtn.addEventListener('click', () => {
      currentModalIndex = (currentModalIndex - 1 + EGG_IMAGES.length) % EGG_IMAGES.length;
      updateModalSlide();
    });

    modalNextBtn.addEventListener('click', () => {
      currentModalIndex = (currentModalIndex + 1) % EGG_IMAGES.length;
      updateModalSlide();
    });

    // Close on clicking backdrop
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) modalEl.remove();
    });
  });

  // Run initial calculations
  updateSimulation();
  updateFateAndCosts();
}
