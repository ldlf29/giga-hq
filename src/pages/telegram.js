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
          <h3 class="pixel-text text-pink" style="font-size: 24px; margin-bottom: 15px;">1. GET THE CHANNEL ID</h3>
          <p style="font-size: 16px; margin-bottom: 10px;">To broadcast notifications, you need to add your bot to a Telegram Channel or Group.</p>
          <ol style="margin-left: 20px; margin-bottom: 20px; line-height: 1.6; font-size: 15px;">
            <li>Create a Public or Private Telegram Channel.</li>
            <li>Add your Bot as an <strong>Administrator</strong>.</li>
            <li>Post any message in the channel (e.g. "test").</li>
            <li>Click the button below to fetch the Channel ID automatically.</li>
          </ol>
          
          <button id="fetchChatIdBtn" class="btn btn-pixel" style="width: 100%; margin-bottom: 15px;">
            FETCH CHANNEL ID
          </button>
          
          <div id="chatIdResult" class="pixel-box" style="padding: 10px; background: rgba(0,0,0,0.5); font-family: monospace; display: none; text-align: center;">
            <!-- Result goes here -->
          </div>
        </div>

        <!-- Right Column: Vercel Config -->
        <div>
          <h3 class="pixel-text text-pink" style="font-size: 24px; margin-bottom: 15px;">2. VERCEL CONFIGURATION</h3>
          <p style="font-size: 16px; margin-bottom: 15px;">
            Once you have the Channel ID, ensure these Environment Variables are set in your Vercel project:
          </p>
          
          <div class="pixel-box" style="margin-top: 10px; border-color: var(--neon-pink); background: rgba(255, 0, 127, 0.05); text-align: left;">
            <p style="font-size: 15px; line-height: 1.8; font-family: monospace;">
              <strong style="color: var(--neon-cyan);">TELEGRAM_BOT_TOKEN</strong><br/>
              <span style="color: #fff;">***REDACTED***</span><br/><br/>
              <strong style="color: var(--neon-cyan);">TELEGRAM_CHAT_ID</strong><br/>
              <span style="color: #fff;">(The Channel ID you fetched on the left)</span>
            </p>
          </div>
        </div>
      </div>

      <hr style="border: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;" />

      <!-- Alchemy Config Section -->
      <div>
        <h3 class="pixel-text text-cyan" style="font-size: 24px; margin-bottom: 15px;">3. ALCHEMY WEBHOOK SETUP</h3>
        <p style="font-size: 16px; margin-bottom: 15px;">
          To trigger the bot, go to your <strong>Alchemy Notify Dashboard</strong> and create a Custom Webhook with the following details:
        </p>
        
        <div class="pixel-box" style="text-align: left; background: #111;">
          <p style="font-family: monospace; color: #aaa; margin-bottom: 10px;">
            <strong>Webhook URL:</strong> <span style="color: var(--neon-cyan);">https://your-vercel-domain.com/api/alchemy</span>
          </p>
          <p style="font-family: monospace; color: #aaa; margin-bottom: 10px;">
            <strong>GraphQL Query:</strong>
          </p>
          <pre style="background: #000; padding: 15px; border-radius: 5px; color: #0f0; overflow-x: auto; font-size: 14px;">
{
  block {
    logs(filter: {addresses: ["0xF6Ed2a53F311352c869e268601AAe5B78B9a9650"]}) {
      data,
      topics,
      transaction {
        hash
      }
    }
  }
}
          </pre>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  const botToken = "***REDACTED***";
  const fetchBtn = document.getElementById('fetchChatIdBtn');
  const chatIdResult = document.getElementById('chatIdResult');

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
          <span style="font-size: 12px; color: var(--text-secondary);">Please post a message in your Channel first, then try again.</span>
        `;
        return;
      }
      
      // Get the latest message's chat ID (can be channel_post or message)
      const latestUpdate = updates[updates.length - 1];
      const messageObj = latestUpdate.channel_post || latestUpdate.message;
      
      if (messageObj && messageObj.chat) {
        const id = messageObj.chat.id;
        const title = messageObj.chat.title || messageObj.chat.username || 'Private Chat';
        chatIdResult.innerHTML = `
          <span style="color: #00ff00; font-weight: bold;">CHANNEL/CHAT ID FOUND!</span><br />
          <span style="color: #fff; font-size: 20px;">${id}</span><br />
          <span style="font-size: 12px; color: var(--text-secondary);">Name: ${title}</span>
        `;
      } else {
        chatIdResult.innerHTML = '<span style="color: var(--neon-pink);">No chat messages found in updates.</span>';
      }
    } catch (err) {
      chatIdResult.innerHTML = `<span style="color: var(--neon-pink);">ERROR: ${err.message}</span>`;
    }
  });
}
