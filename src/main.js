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
  <header class="giga-header" style="position: relative;">
    <div class="giga-header-left">
      <img src="/giga-hq-logo.png" alt="GIGAHQ Logo" class="logo-img" />
    </div>
    <nav class="top-nav">
      <a href="/" class="nav-item route-link" id="nav-dashboard">ANALYTICS</a>
      <a href="/hatching" class="nav-item route-link" id="nav-hatching">EGG HATCHERY</a>
      <a href="/telegram" class="nav-item route-link" id="nav-telegram">TELEGRAM BOT</a>
      <a href="/minigame" class="nav-item route-link" id="nav-minigame">MINI GAME</a>
      <a href="/customskin" class="nav-item route-link" id="nav-customskin">CUSTOM SKIN</a>
    </nav>
    <div class="giga-header-right" style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; font-family: var(--font-pixel);">
      <div style="font-size: 18px;">
        <span style="color: #6c809a;">built by </span>
        <a href="https://x.com/luksqron" target="_blank" style="color: var(--neon-yellow); text-decoration: none; text-shadow: 0 0 5px rgba(255, 208, 0, 0.5);">LUKS</a>
      </div>
      <div style="color: #6c809a; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        official gigaverse links: 
        <a href="https://x.com/playgigaverse" target="_blank" style="color: #fff; text-decoration: none; display: flex; align-items: center;" title="X">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://discord.gg/glhfers" target="_blank" style="color: #fff; text-decoration: none; display: flex; align-items: center;" title="Discord">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
        </a>
      </div>
    </div>
  </header>
  <main class="main-content">
    <div class="view-container" id="viewContainer">
      <!-- Dynamic Views Render Here -->
    </div>
  </main>
`;

const viewContainer = document.querySelector('#viewContainer');


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

// History API Router
async function router() {
  const path = window.location.pathname || '/';
  
  // Clean up container before render
  viewContainer.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 80%; width: 100%;">
      <div class="pixel-text text-cyan" style="font-size: 32px;">LOADING INTEL DATA...</div>
    </div>
  `;

  // Route matches
  if (path === '/') {
    highlightNav('nav-dashboard');
    await renderDashboard(viewContainer);
  } 
  else if (path.startsWith('/player/')) {
    const address = path.replace('/player/', '');
    highlightNav('');
    await renderPlayer(viewContainer, address);
  } 
  else if (path.startsWith('/pet/')) {
    const petId = path.replace('/pet/', '');
    highlightNav('');
    await renderPet(viewContainer, petId);
  }
  else if (path === '/hatching') {
    highlightNav('nav-hatching');
    await renderHatching(viewContainer);
  }
  else if (path === '/telegram') {
    highlightNav('nav-telegram');
    await renderTelegram(viewContainer);
  }
  else if (path === '/minigame') {
    highlightNav('nav-minigame');
    await renderMinigame(viewContainer);
  }
  else if (path === '/customskin') {
    highlightNav('nav-customskin');
    await renderCustomSkin(viewContainer);
  }
  else {
    // 404 Route
    viewContainer.innerHTML = `
      <div class="pixel-box" style="text-align: center; border-color: var(--neon-pink); max-width: 600px; margin: 50px auto;">
        <h2 class="pixel-text text-pink">404 - SITE INTEL OFFLINE</h2>
        <p>The routing parameters you searched do not map to any known database.</p>
        <a href="/" class="btn btn-pixel route-link">RETURN TO DASHBOARD</a>
      </div>
    `;
  }
}

// Intercept link clicks for SPA routing
document.body.addEventListener('click', e => {
  if (e.target.matches('a.route-link') || e.target.closest('a.route-link')) {
    e.preventDefault();
    const href = (e.target.closest('a.route-link') || e.target).getAttribute('href');
    if (href) {
      history.pushState(null, '', href);
      router();
    }
  }
});

// Router Event Listeners
window.addEventListener('popstate', router);
window.addEventListener('load', router);
