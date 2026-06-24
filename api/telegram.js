import { Redis } from '@upstash/redis';

// Initialize Redis if environment variables are set
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { body } = req;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const authorizedChatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !authorizedChatId) {
    console.error('Missing configuration: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Missing configuration' });
  }

  const message = body?.message;
  if (!message || !message.text) {
    return res.status(200).json({ success: true }); // Ignore non-text updates
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Security check: Only allow the configured admin/user to interact with the bot
  if (chatId !== String(authorizedChatId)) {
    console.log(`Unauthorized message attempt from Chat ID: ${chatId}`);
    await sendTelegramMessage(botToken, chatId, '⚠️ Unauthorized. You are not the owner of this bot.');
    return res.status(200).json({ success: true });
  }

  try {
    if (text === '/start' || text === '/help') {
      const helpMsg = `
Welcome to *Gigaverse Race Alerts*! 🏁

Manage your alerts with the following commands:
• /all - Alert me on *all* races (Default)
• /paid - Alert me only on *paid* races (entry fee > 0)
• /free - Alert me only on *free* races
• /status - Show my current alert settings
      `.trim();
      await sendTelegramMessage(botToken, chatId, helpMsg);
    } 
    else if (text === '/all' || text === '/paid' || text === '/free') {
      const option = text.slice(1); // 'all', 'paid', or 'free'
      
      if (!redis) {
        await sendTelegramMessage(botToken, chatId, '⚠️ Upstash Redis is not configured in Vercel environment variables yet. Operating in default mode (*all*).');
      } else {
        await redis.set(`filter:${chatId}`, option);
        await sendTelegramMessage(botToken, chatId, `✅ Settings updated! You will now receive alerts for *${option}* races.`);
      }
    } 
    else if (text === '/status') {
      let currentFilter = 'all (default)';
      if (redis) {
        const stored = await redis.get(`filter:${chatId}`);
        if (stored) {
          currentFilter = stored;
        }
      }
      await sendTelegramMessage(botToken, chatId, `📊 Current filter status: *${currentFilter}*`);
    } 
    else {
      await sendTelegramMessage(botToken, chatId, '❓ Unknown command. Type /help to see available filters.');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in telegram handler:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function sendTelegramMessage(botToken, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Failed to send response back to telegram:', err);
  }
}
