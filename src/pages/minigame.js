/* Gigling Runner – Dino-Runner style mini game */

export async function renderMinigame(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 16px; width: 100%; max-width: 900px; justify-content: space-between;">
        <h1 class="pixel-text" style="font-size: 28px; color: #ffffff; margin: 0;">GIGLING RUNNER</h1>
        <div style="display: flex; align-items: center; gap: 24px;">
          <span style="font-size: 22px; color: var(--text-secondary);">SCORE: <span id="mgScore" class="text-cyan" style="font-weight: bold;">0</span></span>
          <span style="font-size: 22px; color: var(--text-secondary);">BEST: <span id="mgBest" class="text-yellow" style="font-weight: bold;">0</span></span>
        </div>
      </div>

      <!-- Canvas wrapper -->
      <div class="pixel-box" style="padding: 0; overflow: hidden; margin-bottom: 0; position: relative; width: 100%; max-width: 900px;">
        <canvas id="mgCanvas" style="display: block; width: 100%; image-rendering: pixelated;"></canvas>
        <!-- Overlays -->
        <div id="mgOverlayStart" style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(4, 7, 10, 0.85); z-index: 10;">
          <h2 class="pixel-text text-cyan" style="font-size: 36px; margin-bottom: 12px;">GIGLING RUNNER</h2>
          <p style="font-size: 22px; color: var(--text-secondary); margin-bottom: 24px; text-align: center; max-width: 400px;">Dodge the orbs! Press SPACE or TAP to jump. Double-jump to reach higher!</p>
          <button id="mgStartBtn" class="btn-giga-gold" style="font-size: 22px; padding: 8px 32px;">START</button>
        </div>
        <div id="mgOverlayDead" style="position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(4, 7, 10, 0.85); z-index: 10;">
          <h2 class="pixel-text text-pink" style="font-size: 36px; margin-bottom: 8px;">GAME OVER</h2>
          <p style="font-size: 24px; color: var(--text-secondary); margin-bottom: 6px;">Score: <span id="mgDeadScore" class="text-cyan" style="font-weight: bold;">0</span></p>
          <p style="font-size: 20px; color: var(--text-muted); margin-bottom: 20px;">Best: <span id="mgDeadBest" class="text-yellow" style="font-weight: bold;">0</span></p>
          <button id="mgRetryBtn" class="btn-giga-gold" style="font-size: 22px; padding: 8px 32px;">RETRY</button>
        </div>
      </div>

      <!-- Controls hint -->
      <div style="display: flex; gap: 24px; font-size: 20px; color: var(--text-muted);">
        <span>SPACE / TAP — Jump</span>
        <span>Double press — Double Jump</span>
      </div>
    </div>
  `;

  // ─── Setup ──────────────────────────────────────────────────────
  const canvas = document.getElementById('mgCanvas');
  const ctx = canvas.getContext('2d');

  // Internal resolution
  const W = 900;
  const H = 400;
  canvas.width = W;
  canvas.height = H;

  // DOM refs
  const scoreEl = document.getElementById('mgScore');
  const bestEl = document.getElementById('mgBest');
  const overlayStart = document.getElementById('mgOverlayStart');
  const overlayDead = document.getElementById('mgOverlayDead');
  const deadScoreEl = document.getElementById('mgDeadScore');
  const deadBestEl = document.getElementById('mgDeadBest');
  const startBtn = document.getElementById('mgStartBtn');
  const retryBtn = document.getElementById('mgRetryBtn');

  // ─── Load images ───────────────────────────────────────────────
  const loadImg = (src) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(img); // continue even if missing
    img.src = src;
  });

  const [imgGigling, imgObjective, imgBg] = await Promise.all([
    loadImg('/mini game/gigling.png'),
    loadImg('/mini game/objective.png'),
    loadImg('/mini game/background.jpg'),
  ]);

  // ─── Constants ─────────────────────────────────────────────────
  const GROUND_Y = H - 60;           // y-position of the ground line
  const PLAYER_W = 64;
  const PLAYER_H = 64;
  const PLAYER_X = 100;              // fixed horizontal position
  const OBJ_SIZE = 50;               // obstacle render size
  const GRAVITY = 0.42;
  const JUMP_FORCE = -11;
  const DOUBLE_JUMP_FORCE = -10.5;
  const INITIAL_SPEED = 3;
  const MAX_SPEED = 12;
  const SPEED_RAMP = 0.002;          // per frame
  const SPAWN_MIN = 80;              // min frames between spawns
  const SPAWN_MAX = 160;             // max frames between spawns

  // 3 height lanes for obstacles (ground, single jump height, double jump height)
  const OBJ_LANES = [
    GROUND_Y - OBJ_SIZE,                // ground level
    GROUND_Y - OBJ_SIZE - 80,           // single jump height
    GROUND_Y - OBJ_SIZE - 165,          // double jump height
  ];

  // ─── State ─────────────────────────────────────────────────────
  let running = false;
  let animId = null;
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('mgBest') || '0');
  bestEl.textContent = bestScore;

  let playerY, velY, jumpCount, speed, bgOffset;
  let obstacles, spawnTimer, spawnInterval;
  let frameCount;

  function resetState() {
    playerY = GROUND_Y - PLAYER_H;
    velY = 0;
    jumpCount = 0;
    speed = INITIAL_SPEED;
    bgOffset = 0;
    obstacles = [];
    spawnTimer = 0;
    spawnInterval = randInt(SPAWN_MIN, SPAWN_MAX);
    score = 0;
    frameCount = 0;
    scoreEl.textContent = '0';
  }

  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  // ─── Input ─────────────────────────────────────────────────────
  function doJump() {
    if (!running) return;
    if (jumpCount === 0) {
      // First jump
      velY = JUMP_FORCE;
      jumpCount = 1;
    } else if (jumpCount === 1) {
      // Double jump
      velY = DOUBLE_JUMP_FORCE;
      jumpCount = 2;
    }
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      doJump();
    }
  }

  function onTouch(e) {
    // Don't intercept button clicks
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    doJump();
  }

  document.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', onTouch, { passive: false });
  canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas && running) doJump();
  });

  // ─── Spawning ──────────────────────────────────────────────────
  function spawnObstacle() {
    const lane = randInt(0, 2);
    obstacles.push({
      x: W + 20,
      y: OBJ_LANES[lane],
      w: OBJ_SIZE,
      h: OBJ_SIZE,
      scored: false,
    });
  }

  // ─── Collision ─────────────────────────────────────────────────
  function checkCollision(obj) {
    // Shrink hitboxes a bit for fairness
    const pad = 10;
    const px = PLAYER_X + pad;
    const py = playerY + pad;
    const pw = PLAYER_W - pad * 2;
    const ph = PLAYER_H - pad * 2;
    const ox = obj.x + pad / 2;
    const oy = obj.y + pad / 2;
    const ow = obj.w - pad;
    const oh = obj.h - pad;
    return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
  }

  // ─── Game Over ─────────────────────────────────────────────────
  function die() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('mgBest', bestScore.toString());
      bestEl.textContent = bestScore;
    }
    deadScoreEl.textContent = score;
    deadBestEl.textContent = bestScore;
    overlayDead.style.display = 'flex';
  }

  // ─── Render ────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Scrolling background (tile the image)
    if (imgBg.complete && imgBg.naturalWidth) {
      const bgW = imgBg.naturalWidth * (H / imgBg.naturalHeight);
      const totalBg = Math.ceil(W / bgW) + 2;
      const startX = -(bgOffset % bgW);
      for (let i = 0; i < totalBg; i++) {
        ctx.drawImage(imgBg, startX + i * bgW, 0, bgW, H);
      }
    } else {
      ctx.fillStyle = '#04070a';
      ctx.fillRect(0, 0, W, H);
    }

    // Ground line
    ctx.strokeStyle = '#143543';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // Ground surface subtle pattern
    ctx.fillStyle = 'rgba(20, 53, 67, 0.3)';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Player
    if (imgGigling.complete && imgGigling.naturalWidth) {
      ctx.drawImage(imgGigling, PLAYER_X, playerY, PLAYER_W, PLAYER_H);
    } else {
      ctx.fillStyle = '#ff3c00';
      ctx.fillRect(PLAYER_X, playerY, PLAYER_W, PLAYER_H);
    }

    // Obstacles
    obstacles.forEach(obj => {
      if (imgObjective.complete && imgObjective.naturalWidth) {
        ctx.drawImage(imgObjective, obj.x, obj.y, obj.w, obj.h);
      } else {
        ctx.fillStyle = '#f5222d';
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      }
    });

    // Score overlay on canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.font = '20px m5x7, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${score}`, W - 16, 28);
  }

  // ─── Game Loop ─────────────────────────────────────────────────
  function gameLoop() {
    if (!running) return;

    frameCount++;

    // Speed ramp
    if (speed < MAX_SPEED) {
      speed += SPEED_RAMP;
    }

    // Background scroll
    bgOffset += speed * 0.6;

    // Player physics
    velY += GRAVITY;
    playerY += velY;
    if (playerY >= GROUND_Y - PLAYER_H) {
      playerY = GROUND_Y - PLAYER_H;
      velY = 0;
      jumpCount = 0;
    }

    // Spawn logic
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnObstacle();
      spawnTimer = 0;
      // As speed increases, decrease spawn interval window
      const minS = Math.max(30, SPAWN_MIN - Math.floor(speed * 2));
      const maxS = Math.max(60, SPAWN_MAX - Math.floor(speed * 4));
      spawnInterval = randInt(minS, maxS);
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obj = obstacles[i];
      obj.x -= speed;

      // Score when passed
      if (!obj.scored && obj.x + obj.w < PLAYER_X) {
        obj.scored = true;
        score++;
        scoreEl.textContent = score;
      }

      // Collision
      if (checkCollision(obj)) {
        die();
        draw();
        return;
      }

      // Remove off-screen
      if (obj.x + obj.w < -20) {
        obstacles.splice(i, 1);
      }
    }

    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  // ─── Start / Retry ─────────────────────────────────────────────
  function startGame() {
    resetState();
    overlayStart.style.display = 'none';
    overlayDead.style.display = 'none';
    running = true;
    animId = requestAnimationFrame(gameLoop);
  }

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

  // Also allow SPACE to start/retry when not running
  document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.key === ' ') && !running) {
      const startVisible = overlayStart.style.display !== 'none';
      const deadVisible = overlayDead.style.display !== 'none';
      if (startVisible || deadVisible) {
        e.preventDefault();
        startGame();
      }
    }
  });

  // Initial idle draw
  resetState();
  draw();

  // ─── Cleanup on navigation ────────────────────────────────────
  // The router replaces innerHTML so RAF will naturally stop,
  // but we remove the keydown listener to be safe.
  const cleanup = () => {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}
