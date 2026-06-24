/* Main Application Router & Entrypoint */
import './style.css';
import { renderDashboard } from './pages/dashboard.js';
import { renderPlayer } from './pages/player.js';
import { renderPet } from './pages/pet.js';
import { renderHatching } from './pages/hatching.js';
import { renderMinigame } from './pages/minigame.js';
import { renderCustomSkin } from './pages/customskin.js';
import { renderTelegram } from './pages/telegram.js';

// Setup Layout skeleton
const app = document.querySelector('#app');
app.innerHTML = `
  <header class="giga-header">
    <div class="giga-header-left">
      <img src="/giga-hq-logo.png" alt="GIGAHQ Logo" class="logo-img" />
      <nav class="top-nav">
        <a href="#/" class="nav-item" id="nav-dashboard">ANALYTICS</a>
        <a href="#/hatching" class="nav-item" id="nav-hatching">EGG HATCHERY</a>
        <a href="#/telegram" class="nav-item" id="nav-telegram">TELEGRAM BOT</a>
        <a href="#/minigame" class="nav-item" id="nav-minigame">MINI GAME</a>
        <a href="#/customskin" class="nav-item" id="nav-customskin">CUSTOM SKIN</a>
      </nav>
    </div>
    <div class="giga-header-right">
       <input type="text" id="headerSearch" class="input-field input-pixel" style="height: 40px; padding: 4px 16px; font-size: 20px; width: 220px;" placeholder="Search player/pet..." />
       <button id="headerSearchBtn" class="btn btn-pixel" style="padding: 4px 16px; font-size: 20px; height: 40px;">GO</button>
    </div>
  </header>
  <main class="main-content">
    <div class="view-container" id="viewContainer">
      <!-- Dynamic Views Render Here -->
    </div>
  </main>
`;

const viewContainer = document.querySelector('#viewContainer');


// Header search logic
const headerSearchInput = document.getElementById('headerSearch');
const headerSearchBtn = document.getElementById('headerSearchBtn');

const executeHeaderSearch = () => {
  const query = headerSearchInput.value.trim();
  if (!query) return;

  if (/^0x[0-9a-fA-F]{40}$/.test(query)) {
    headerSearchInput.value = '';
    window.location.hash = `#/player/${query}`;
  } else if (/^\d+$/.test(query)) {
    headerSearchInput.value = '';
    window.location.hash = `#/pet/${query}`;
  } else {
    // Show quick visual shake or warning color
    headerSearchInput.style.borderColor = 'var(--neon-pink)';
    setTimeout(() => {
      headerSearchInput.style.borderColor = 'var(--border-color)';
    }, 1500);
  }
};

headerSearchBtn.addEventListener('click', executeHeaderSearch);
headerSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeHeaderSearch(); });

// Active nav link highlight
function highlightNav(activeId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.getElementById(activeId);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

// Simple Hash Router
async function router() {
  const hash = window.location.hash || '#/';
  
  // Clean up container before render
  viewContainer.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 80%; width: 100%;">
      <div class="pixel-text text-cyan" style="font-size: 32px;">LOADING INTEL DATA...</div>
    </div>
  `;

  // Route matches
  if (hash === '#/' || hash === '') {
    highlightNav('nav-dashboard');
    await renderDashboard(viewContainer);
  } 
  else if (hash.startsWith('#/player/')) {
    const address = hash.replace('#/player/', '');
    highlightNav('');
    await renderPlayer(viewContainer, address);
  } 
  else if (hash.startsWith('#/pet/')) {
    const petId = hash.replace('#/pet/', '');
    highlightNav('');
    await renderPet(viewContainer, petId);
  }
  else if (hash === '#/hatching') {
    highlightNav('nav-hatching');
    await renderHatching(viewContainer);
  }
  else if (hash === '#/telegram') {
    highlightNav('nav-telegram');
    await renderTelegram(viewContainer);
  }
  else if (hash === '#/minigame') {
    highlightNav('nav-minigame');
    await renderMinigame(viewContainer);
  }
  else if (hash === '#/customskin') {
    highlightNav('nav-customskin');
    await renderCustomSkin(viewContainer);
  }
  else {
    // 404 Route
    viewContainer.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink); max-width: 600px; margin: 50px auto;">
        <h2 class="pixel-text text-pink">404 - SITE INTEL OFFLINE</h2>
        <p>The routing parameters you searched do not map to any known database.</p>
        <a href="#/" class="btn btn-pixel">RETURN TO DASHBOARD</a>
      </div>
    `;
  }
}

// Router Event Listeners
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
