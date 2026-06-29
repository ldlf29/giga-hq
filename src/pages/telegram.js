/* Telegram Bot Info Page */

export async function renderTelegram(container) {
  container.innerHTML = `
    <style>
      .telegram-wrapper {
        max-width: 900px; 
        margin: 40px auto; 
        padding: 30px;
      }
      @media (max-width: 768px) {
        .telegram-wrapper {
          margin: 16px auto;
          padding: 16px;
        }
      }
    </style>
    <div class="pixel-box telegram-wrapper">
      <h2 class="pixel-text" style="font-size: clamp(28px, 6vw, 36px); text-align: center; margin-bottom: 30px; color: #ffffff;">
        GIGLING NEW RACES ALERTS
      </h2>

      <div class="pixel-box" style="margin-bottom: 30px; text-align: center; padding: clamp(16px, 4vw, 25px); background: rgba(0, 255, 255, 0.05); border-color: var(--neon-cyan);">
        <p style="font-size: clamp(16px, 3.5vw, 18px); margin-bottom: 15px;" class="pixel-text text-cyan">
          Get instant Telegram notifications every time a new race is created in Gigling Racing.
        </p>
        <a href="https://t.me/giglingracebot" target="_blank" class="btn btn-pixel" style="font-size: clamp(16px, 3.5vw, 18px); padding: 12px 24px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          OPEN BOT IN TELEGRAM
        </a>
      </div>

      <div class="grid-2" style="gap: 30px;">
        <!-- How it works -->
        <div class="pixel-box" style="background: rgba(255, 0, 127, 0.05); border-color: var(--neon-pink); padding: clamp(16px, 4vw, 24px);">
          <h3 class="pixel-text text-pink" style="font-size: clamp(20px, 4.5vw, 22px); margin-bottom: 15px;">INSTRUCTIONS</h3>
          <ol style="margin-left: 20px; line-height: 2; font-size: clamp(14px, 3.5vw, 15px); font-family: monospace;">
            <li>Open the bot link above</li>
            <li>Send <code style="color: var(--neon-pink);">/start</code> to subscribe</li>
            <li>Receive race alerts automatically</li>
          </ol>
        </div>

        <!-- Commands -->
        <div class="pixel-box" style="background: rgba(0, 0, 0, 0.3); padding: clamp(16px, 4vw, 24px);">
          <h3 class="pixel-text text-cyan" style="font-size: clamp(20px, 4.5vw, 22px); margin-bottom: 15px;">COMMANDS</h3>
          <div style="font-family: monospace; line-height: 2.2; font-size: clamp(14px, 3.5vw, 15px);">
            <code style="color: var(--neon-cyan);">/start</code> — Subscribe to alerts<br/>
            <code style="color: var(--neon-cyan);">/all</code> — Receive all races<br/>
            <code style="color: var(--neon-cyan);">/paid</code> — Only paid races<br/>
            <code style="color: var(--neon-cyan);">/free</code> — Only free races<br/>
            <code style="color: var(--neon-cyan);">/pause</code> — Pause notifications<br/>
            <code style="color: var(--neon-cyan);">/resume</code> — Resume notifications<br/>
            <code style="color: var(--neon-cyan);">/status</code> — Check your filter and status
          </div>
        </div>
      </div>
    </div>
  `;
}
