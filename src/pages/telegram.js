/* Telegram Bot Configuration and Help Page */

export async function renderTelegram(container) {
  container.innerHTML = `
    <div class="pixel-box" style="max-width: 900px; margin: 40px auto; padding: 30px;">
      <h2 class="pixel-text text-cyan" style="font-size: 36px; text-align: center; margin-bottom: 30px; text-shadow: 0 0 10px var(--neon-cyan);">
        TELEGRAM ALERTS DASHBOARD
      </h2>

      <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
        <!-- Left Column: Bot Setup Steps -->
        <div style="border-right: 2px dashed rgba(255, 0, 255, 0.3); padding-right: 20px;">
          <h3 class="pixel-text text-pink" style="font-size: 24px; margin-bottom: 15px;">1. GET YOUR CHAT ID</h3>
          <p style="font-size: 16px; margin-bottom: 10px;">To target notifications, the bot needs your unique Telegram Chat ID.</p>
          <ol style="margin-left: 20px; margin-bottom: 20px; line-height: 1.6; font-size: 15px;">
            <li>Open Telegram and send a message (e.g. <code>"hello"</code>) to your bot.</li>
            <li>Click the button below to fetch the Chat ID automatically:</li>
          </ol>
          
          <button id="fetchChatIdBtn" class="btn btn-pixel" style="width: 100%; margin-bottom: 15px;">
            FETCH CHAT ID
          </button>
          
          <div id="chatIdResult" class="pixel-box" style="padding: 10px; background: rgba(0,0,0,0.5); font-family: monospace; display: none; text-align: center;">
            <!-- Result goes here -->
          </div>
        </div>

        <!-- Right Column: Webhook Setup -->
        <div>
          <h3 class="pixel-text text-pink" style="font-size: 24px; margin-bottom: 15px;">2. CONFIGURE TELEGRAM WEBHOOK</h3>
          <p style="font-size: 16px; margin-bottom: 10px;">To process commands (like <code>/paid</code>, <code>/free</code>), register your Vercel deployment URL with Telegram.</p>
          
          <div style="margin-bottom: 15px;">
            <label class="pixel-text" style="font-size: 14px; display: block; margin-bottom: 5px;">Your Vercel App URL:</label>
            <input type="text" id="vercelUrlInput" class="input-field input-pixel" style="width: 100%;" placeholder="https://your-vercel-app.vercel.app" />
          </div>

          <button id="setWebhookBtn" class="btn btn-pixel" style="width: 100%; border-color: var(--neon-cyan); color: var(--neon-cyan);">
            SET WEBHOOK
          </button>

          <div id="webhookResult" class="pixel-box" style="padding: 10px; margin-top: 15px; background: rgba(0,0,0,0.5); font-family: monospace; display: none; text-align: center;">
            <!-- Webhook result -->
          </div>
        </div>
      </div>

      <hr style="border: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;" />

      <!-- Bot Commands Reference Section -->
      <div>
        <h3 class="pixel-text text-cyan" style="font-size: 24px; margin-bottom: 15px;">SUPPORTED BOT COMMANDS</h3>
        <p style="font-size: 16px; margin-bottom: 15px;">You can type these commands in your private chat with the bot to configure your filters:</p>
        
        <table class="pixel-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid var(--neon-pink);">
              <th style="padding: 10px; font-weight: bold; color: var(--neon-pink);">Command</th>
              <th style="padding: 10px; font-weight: bold; color: var(--neon-pink);">Function</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <td style="padding: 10px; font-family: monospace; font-weight: bold; color: var(--neon-cyan);">/all</td>
              <td style="padding: 10px;">Alerts on all races (both free and paid).</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <td style="padding: 10px; font-family: monospace; font-weight: bold; color: var(--neon-cyan);">/paid</td>
              <td style="padding: 10px;">Alerts only on paid races (entry fee > 0 ETH).</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <td style="padding: 10px; font-family: monospace; font-weight: bold; color: var(--neon-cyan);">/free</td>
              <td style="padding: 10px;">Alerts only on free races (entry fee = 0 ETH).</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <td style="padding: 10px; font-family: monospace; font-weight: bold; color: var(--neon-cyan);">/status</td>
              <td style="padding: 10px;">Shows your active alert configuration.</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-family: monospace; font-weight: bold; color: var(--neon-cyan);">/help</td>
              <td style="padding: 10px;">Shows description and usage manual.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pixel-box" style="margin-top: 30px; border-color: var(--neon-pink); background: rgba(255, 0, 127, 0.05);">
        <h4 class="pixel-text text-pink" style="font-size: 18px; margin-bottom: 10px;">⚠️ VERCEL ENVIRONMENT VARIABLES CHECKS</h4>
        <p style="font-size: 14px; line-height: 1.6;">
          Ensure these environment variables are set in your Vercel project settings:
          <br />• <code>TELEGRAM_BOT_TOKEN</code> = <code>***REDACTED***</code>
          <br />• <code>TELEGRAM_CHAT_ID</code> = (The Chat ID obtained on the left)
          <br />• <code>UPSTASH_REDIS_REST_URL</code> = (From Upstash Console, for storing filters)
          <br />• <code>UPSTASH_REDIS_REST_TOKEN</code> = (From Upstash Console, for storing filters)
        </p>
      </div>
    </div>
  `;

  // Attach event handlers
  const botToken = "***REDACTED***";
  const fetchBtn = document.getElementById('fetchChatIdBtn');
  const chatIdResult = document.getElementById('chatIdResult');
  const vercelUrlInput = document.getElementById('vercelUrlInput');
  const setWebhookBtn = document.getElementById('setWebhookBtn');
  const webhookResult = document.getElementById('webhookResult');

  // Autofill current origin to helper input
  vercelUrlInput.value = window.location.origin;

  fetchBtn.addEventListener('click', async () => {
    chatIdResult.style.display = 'block';
    chatIdResult.className = 'pixel-box';
    chatIdResult.innerHTML = '<span style="color: var(--neon-cyan);">FETCHING UPDATES...</span>';
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Failed to fetch updates');
      }
      
      const updates = data.result || [];
      if (updates.length === 0) {
        chatIdResult.innerHTML = `
          <span style="color: var(--neon-pink);">NO UPDATES FOUND</span><br />
          <span style="font-size: 12px; color: var(--text-secondary);">Please send a message to your bot on Telegram first, then try again.</span>
        `;
        return;
      }
      
      // Get the latest message's chat ID
      const latestMessage = updates[updates.length - 1].message;
      if (latestMessage && latestMessage.chat) {
        const id = latestMessage.chat.id;
        const name = latestMessage.from.first_name || '';
        chatIdResult.innerHTML = `
          <span style="color: #00ff00; font-weight: bold;">CHAT ID FOUND!</span><br />
          <span style="color: #fff; font-size: 20px;">${id}</span><br />
          <span style="font-size: 12px; color: var(--text-secondary);">User: ${name}</span>
        `;
      } else {
        chatIdResult.innerHTML = '<span style="color: var(--neon-pink);">No chat messages found in updates.</span>';
      }
    } catch (err) {
      chatIdResult.innerHTML = `<span style="color: var(--neon-pink);">ERROR: ${err.message}</span>`;
    }
  });

  setWebhookBtn.addEventListener('click', async () => {
    webhookResult.style.display = 'block';
    webhookResult.innerHTML = '<span style="color: var(--neon-cyan);">SETTING WEBHOOK...</span>';
    
    let url = vercelUrlInput.value.trim();
    if (!url) {
      webhookResult.innerHTML = '<span style="color: var(--neon-pink);">ERROR: URL cannot be empty.</span>';
      return;
    }
    
    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const webhookUrl = `${url}/api/telegram`;
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await response.json();
      
      if (data.ok) {
        webhookResult.innerHTML = `
          <span style="color: #00ff00; font-weight: bold;">SUCCESS!</span><br />
          <span style="font-size: 13px; color: #fff;">Webhook is active at:</span><br />
          <span style="font-size: 12px; color: var(--neon-cyan); word-break: break-all;">${webhookUrl}</span>
        `;
      } else {
        webhookResult.innerHTML = `<span style="color: var(--neon-pink);">FAILED: ${data.description}</span>`;
      }
    } catch (err) {
      webhookResult.innerHTML = `<span style="color: var(--neon-pink);">ERROR: ${err.message}</span>`;
    }
  });
}
