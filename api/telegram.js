import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const message = req.body?.message;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text === '/start') {
    // Register user with default filter "all"
    await redis.sadd('users', chatId);
    const existing = await redis.get(`filter:${chatId}`);
    if (!existing) {
      await redis.set(`filter:${chatId}`, 'all');
    }
    await send(chatId, `🏁 *Welcome to Gigling Race Alerts!*\n\nYou will now receive notifications for new races.\n\nCommands:\n/all — Receive all races\n/paid — Only paid races\n/free — Only free races\n/status — Check your current filter`);
  }
  else if (text === '/all') {
    await redis.set(`filter:${chatId}`, 'all');
    await send(chatId, '✅ Filter updated: you will receive *all* races.');
  }
  else if (text === '/paid') {
    await redis.set(`filter:${chatId}`, 'paid');
    await send(chatId, '✅ Filter updated: you will receive only *paid* races.');
  }
  else if (text === '/free') {
    await redis.set(`filter:${chatId}`, 'free');
    await send(chatId, '✅ Filter updated: you will receive only *free* races.');
  }
  else if (text === '/status') {
    const filter = await redis.get(`filter:${chatId}`) || 'all';
    await send(chatId, `📊 Your current filter: *${filter}*`);
  }

  return res.status(200).json({ ok: true });
}

async function send(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}
