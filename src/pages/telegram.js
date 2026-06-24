/* Telegram Bot Info Page */

export async function renderTelegram(container) {
  container.innerHTML = `
    <div class="pixel-box" style="max-width: 900px; margin: 40px auto; padding: 30px;">
      <h2 class="pixel-text text-cyan" style="font-size: 36px; text-align: center; margin-bottom: 30px; text-shadow: 0 0 10px var(--neon-cyan);">
        TELEGRAM RACE ALERTS
      </h2>

      <div class="pixel-box" style="margin-bottom: 30px; text-align: center; padding: 25px; background: rgba(0, 255, 255, 0.05); border-color: var(--neon-cyan);">
        <p style="font-size: 18px; margin-bottom: 15px;" class="pixel-text text-cyan">
          Get instant Telegram notifications every time a new race is created on the Gigaverse.
        </p>
        <a href="https://t.me/giglingracebot" target="_blank" class="btn btn-pixel" style="font-size: 18px; padding: 12px 30px; display: inline-block; text-decoration: none;">
          OPEN BOT IN TELEGRAM
        </a>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
        <!-- How it works -->
        <div class="pixel-box" style="background: rgba(255, 0, 127, 0.05); border-color: var(--neon-pink);">
          <h3 class="pixel-text text-pink" style="font-size: 22px; margin-bottom: 15px;">INSTRUCTIONS</h3>
          <ol style="margin-left: 20px; line-height: 2; font-size: 15px; font-family: monospace;">
            <li>Open the bot link above</li>
            <li>Send <code style="color: var(--neon-pink);">/start</code> to subscribe</li>
            <li>Receive race alerts automatically</li>
          </ol>
        </div>

        <!-- Commands -->
        <div class="pixel-box" style="background: rgba(0, 0, 0, 0.3);">
          <h3 class="pixel-text text-cyan" style="font-size: 22px; margin-bottom: 15px;">COMMANDS</h3>
          <div style="font-family: monospace; line-height: 2.2; font-size: 15px;">
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
