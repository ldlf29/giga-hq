/* Custom Skin Studio View */
import { escapeHTML, sanitizePetId, getPetsDetails } from '../api.js';

function removeImageBackground(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const bgA = data[3];
        if (bgA > 0) {
          const tolerance = 15;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (
              Math.abs(r - bgR) <= tolerance &&
              Math.abs(g - bgG) <= tolerance &&
              Math.abs(b - bgB) <= tolerance
            ) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
        resolve(canvas.toDataURL());
      } catch (e) {
        console.warn("Failed to remove background via canvas:", e);
        resolve(imgUrl);
      }
    };
    img.onerror = () => resolve(imgUrl);
    img.src = imgUrl;
  });
}

export async function renderCustomSkin(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 2px solid var(--border-color); padding-bottom: 12px; gap: 16px; flex-wrap: wrap;">
        <div style="flex: 1 1 300px;">
          <h1 class="pixel-text" style="font-size: 32px; color: var(--text-primary); margin: 0;">CUSTOM SKIN STUDIO</h1>
          <p style="margin: 0; font-size: 20px; color: var(--text-secondary);">Customize your Gigling with accessories and mounts.</p>
        </div>
        <div class="search-container" style="flex: 1 1 300px; display: flex; gap: 12px; align-items: center; margin: 0; max-width: 100%;">
          <input type="text" id="skinGiglingId" class="input-field input-pixel" placeholder="Enter Gigling ID (e.g. 123)..." style="margin: 0; flex: 1; min-width: 0;" />
          <button id="skinLoadBtn" class="btn-giga-gold" style="height: 48px; padding: 0 24px; font-size: 22px; margin: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">LOAD</button>
        </div>
      </div>

      <div id="skinEditorContainer" class="grid-2" style="display: none; align-items: start; width: 100%;">
        <!-- Left: Canvas/Preview -->
        <div class="pixel-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 16px; width: 100%;">
          <div class="pixel-box-title" style="align-self: flex-start; margin-bottom: 24px;">PREVIEW</div>
          <div id="skinPreviewArea" style="position: relative; width: 100%; max-width: 300px; aspect-ratio: 1; height: auto; background-color: #050911; border: 2px solid var(--border-color); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <img id="skinBgImage" src="/skin maker/mount/background1.png" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; position: absolute; z-index: 0; display: none; pointer-events: none;" />
            <img id="skinBaseImage" src="" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; position: absolute; z-index: 1;" />
            <img id="skinMountImage" src="" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; position: absolute; z-index: 2; display: none;" />
            <img id="skinGlassesImage" src="/skin maker/mount/sunglasses.png" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; position: absolute; z-index: 3; display: none; pointer-events: none;" />
          </div>
          <button id="skinSaveBtn" class="btn-giga-gold" style="width: 100%; font-size: 22px; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/></svg>
            SAVE SKIN
          </button>
        </div>

        <!-- Right: Options -->
        <div class="pixel-box" style="padding: 16px; width: 100%;">
          <div class="pixel-box-title">ACCESSORIES</div>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card" style="padding: 16px; background-color: var(--bg-card);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 8px;">
                <span style="font-family: var(--font-pixel); font-size: 24px; color: var(--text-primary);">GLASSES</span>
                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                  <input type="checkbox" id="toggleGlasses" style="opacity: 0; width: 0; height: 0;">
                  <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-color); border: 2px solid var(--border-color); border-radius: 12px; transition: .4s;">
                    <span class="slider-knob" style="position: absolute; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: var(--text-secondary); border-radius: 50%; transition: .4s;"></span>
                  </span>
                </label>
              </div>
              <p style="margin: 0; font-size: 18px; color: var(--text-muted);">Equip stylish sunglasses.</p>
            </div>
            <div class="card" style="padding: 16px; background-color: var(--bg-card);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 8px;">
                <span style="font-family: var(--font-pixel); font-size: 24px; color: var(--neon-purple);">MOUNTS</span>
                <button id="clearMountBtn" class="btn btn-pixel" style="padding: 4px 8px; font-size: 16px; border-color: var(--neon-pink); color: var(--neon-pink);">CLEAR</button>
              </div>
              <p style="margin: 0 0 12px 0; font-size: 18px; color: var(--text-muted);">Saddle up your Gigling with a custom mount.</p>
              <div id="mountSelector" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                <!-- Dynamically populated -->
              </div>
            </div>

            <div class="card" style="padding: 16px; background-color: var(--bg-card);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 8px;">
                <span style="font-family: var(--font-pixel); font-size: 24px; color: var(--text-primary);">BACKGROUND</span>
                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px; flex-shrink: 0;">
                  <input type="checkbox" id="toggleBg" style="opacity: 0; width: 0; height: 0;">
                  <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-color); border: 2px solid var(--border-color); border-radius: 12px; transition: .4s;">
                    <span class="slider-knob" style="position: absolute; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: var(--text-secondary); border-radius: 50%; transition: .4s;"></span>
                  </span>
                </label>
              </div>
              <p style="margin: 0; font-size: 18px; color: var(--text-muted);">Enhance your background.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="skinLoading" style="display: none; text-align: center; padding: 40px;">
        <div class="pixel-text text-cyan" style="font-size: 24px;">LOADING GIGLING DATA...</div>
      </div>
      
      <div id="skinError" style="display: none; text-align: center; padding: 20px; border: 2px solid var(--neon-pink); background-color: rgba(245, 34, 45, 0.1); border-radius: 8px; margin-top: 20px;">
        <h3 class="pixel-text text-pink" style="margin-bottom: 8px;">ERROR</h3>
        <p id="skinErrorText" style="margin: 0;"></p>
      </div>
    </div>
  `;

  // Inline styles for the toggle switches
  const style = document.createElement('style');
  style.innerHTML = `
    .switch input:checked + .slider {
      background-color: var(--neon-cyan);
      border-color: var(--neon-cyan);
    }
    .switch input:checked + .slider .slider-knob {
      transform: translateX(26px);
      background-color: #fff;
    }
  `;
  container.appendChild(style);

  const inputId = document.getElementById('skinGiglingId');
  const loadBtn = document.getElementById('skinLoadBtn');
  const editorContainer = document.getElementById('skinEditorContainer');
  const loadingDiv = document.getElementById('skinLoading');
  const errorDiv = document.getElementById('skinError');
  const errorText = document.getElementById('skinErrorText');

  const baseImg = document.getElementById('skinBaseImage');
  const mountImg = document.getElementById('skinMountImage');
  const glassesImg = document.getElementById('skinGlassesImage');
  const bgImg = document.getElementById('skinBgImage');

  let originalImgUrl = '';
  let transparentImgUrl = '';

  const toggleBg = document.getElementById('toggleBg');
  const toggleGlasses = document.getElementById('toggleGlasses');
  const mountSelector = document.getElementById('mountSelector');
  const clearMountBtn = document.getElementById('clearMountBtn');

  // Populate mounts
  const mounts = ['archon', 'athena', 'chobo', 'crusader', 'foxglove', 'gigus', 'overseer', 'summoner'];
  mounts.forEach(m => {
    const btn = document.createElement('div');
    btn.style.cssText = `border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; cursor: pointer; background-color: #050911; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;`;
    btn.innerHTML = `<img src="/skin maker/mount/${m}.png" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; transform: scale(2.2);" />`;
    btn.addEventListener('click', () => {
      mountImg.src = `/skin maker/mount/${m}.png`;
      mountImg.style.display = 'block';
      Array.from(mountSelector.children).forEach(c => c.style.borderColor = 'var(--border-color)');
      btn.style.borderColor = 'var(--neon-purple)';
    });
    mountSelector.appendChild(btn);
  });

  clearMountBtn.addEventListener('click', () => {
    mountImg.style.display = 'none';
    Array.from(mountSelector.children).forEach(c => c.style.borderColor = 'var(--border-color)');
  });

  async function loadGigling() {
    const val = inputId.value.trim();
    const cleanId = sanitizePetId(val);

    errorDiv.style.display = 'none';
    editorContainer.style.display = 'none';

    if (cleanId === null) {
      errorText.textContent = "Please enter a valid numeric Gigling ID.";
      errorDiv.style.display = 'block';
      return;
    }

    loadingDiv.style.display = 'block';

    try {
      const pets = await getPetsDetails(cleanId);
      const pet = pets && pets.length > 0 ? pets[0] : null;

      loadingDiv.style.display = 'none';

      if (!pet) {
        errorText.textContent = `Could not find Gigling #${cleanId}.`;
        errorDiv.style.display = 'block';
        return;
      }

      if (!pet.hatched) {
        errorText.textContent = `Gigling #${cleanId} is still an EGG. You can only customize hatched Giglings.`;
        errorDiv.style.display = 'block';
        return;
      }

      originalImgUrl = pet.imgUrl;
      transparentImgUrl = await removeImageBackground(pet.imgUrl);

      baseImg.src = originalImgUrl;
      editorContainer.style.display = 'grid'; // Show the editor

      // Reset toggles
      toggleBg.checked = false;
      toggleGlasses.checked = false;
      mountImg.style.display = 'none';
      glassesImg.style.display = 'none';
      bgImg.style.display = 'none';
      baseImg.style.mixBlendMode = 'normal';
      Array.from(mountSelector.children).forEach(c => c.style.borderColor = 'var(--border-color)');

    } catch (err) {
      loadingDiv.style.display = 'none';
      errorText.textContent = "Failed to load Gigling data. Please try again.";
      errorDiv.style.display = 'block';
    }
  }

  loadBtn.addEventListener('click', loadGigling);
  inputId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadGigling();
  });

  toggleGlasses.addEventListener('change', (e) => {
    glassesImg.style.display = e.target.checked ? 'block' : 'none';
  });

  toggleBg.addEventListener('change', (e) => {
    if (e.target.checked) {
      bgImg.style.display = 'block';
      baseImg.src = transparentImgUrl;
      if (transparentImgUrl === originalImgUrl) {
        baseImg.style.mixBlendMode = 'screen';
      } else {
        baseImg.style.mixBlendMode = 'normal';
      }
    } else {
      bgImg.style.display = 'none';
      baseImg.src = originalImgUrl;
      baseImg.style.mixBlendMode = 'normal';
    }
  });

  const saveBtn = document.getElementById('skinSaveBtn');
  saveBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    const width = baseImg.naturalWidth || 300;
    const height = baseImg.naturalHeight || 300;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // 1. Draw custom background if enabled
    if (toggleBg.checked && bgImg.style.display !== 'none') {
      try {
        const bgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
        const canvasRatio = width / height;
        let drawW, drawH, drawX, drawY;
        if (bgRatio > canvasRatio) {
          drawH = height;
          drawW = height * bgRatio;
          drawX = (width - drawW) / 2;
          drawY = 0;
        } else {
          drawW = width;
          drawH = width / bgRatio;
          drawX = 0;
          drawY = (height - drawH) / 2;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
      } catch (e) {
        console.error("Failed to draw background image onto canvas:", e);
      }
    } else {
      ctx.fillStyle = '#050911';
      ctx.fillRect(0, 0, width, height);
    }
    
    // 2. Draw base Gigling image
    try {
      ctx.drawImage(baseImg, 0, 0, width, height);
    } catch (e) {
      console.error("Failed to draw base image onto canvas:", e);
    }
    
    // 3. Draw mount if visible
    if (mountImg.style.display !== 'none' && mountImg.src) {
      try {
        ctx.drawImage(mountImg, 0, 0, width, height);
      } catch (e) {
        console.error("Failed to draw mount image onto canvas:", e);
      }
    }
    
    // 4. Draw glasses if visible
    if (glassesImg.style.display !== 'none' && glassesImg.src) {
      try {
        ctx.drawImage(glassesImg, 0, 0, width, height);
      } catch (e) {
        console.error("Failed to draw glasses image onto canvas:", e);
      }
    }
    
    try {
      const link = document.createElement('a');
      const petId = inputId.value.trim() || 'gigling';
      link.download = `gigling-${petId}-custom.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert("Error saving image. This might be due to security (CORS) restrictions on the loaded pet image.");
      console.error(err);
    }
  });
}
