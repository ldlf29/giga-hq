import { decodeEventLog } from 'viem';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// keccak256("RaceCreated(uint256,address,uint256,uint256,uint256,uint256,uint256)")
const RACE_CREATED_TOPIC = '0x3140283acc902bb8af484fc157968628a25250c6f6f93ad8d07a0aeb674b3d28';

// ABI with first 2 params indexed (raceId, creator)
const RACE_CREATED_ABI = [
  {
    name: 'RaceCreated',
    type: 'event',
    inputs: [
      { type: 'uint256', name: 'raceId',        indexed: true  },
      { type: 'address', name: 'creator',       indexed: true  },
      { type: 'uint256', name: 'fieldSize',     indexed: false },
      { type: 'uint256', name: 'trackLength',   indexed: false },
      { type: 'uint256', name: 'entryFee',      indexed: false },
      { type: 'uint256', name: 'seedPool',      indexed: false },
      { type: 'uint256', name: 'creatorFeeBps', indexed: false },
    ],
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logs = req.body?.event?.data?.block?.logs || [];

    for (const log of logs) {
      // Filter: only RaceCreated events
      if (!log.topics || log.topics[0] !== RACE_CREATED_TOPIC) continue;

      let decoded;
      try {
        decoded = decodeEventLog({
          abi: RACE_CREATED_ABI,
          data: log.data,
          topics: log.topics,
          eventName: 'RaceCreated',
        });
      } catch (err) {
        console.error('Failed to decode log:', err);
        continue;
      }

      const { raceId, creator, fieldSize, trackLength, entryFee, seedPool } = decoded.args;

      const entryFeeWei  = BigInt(entryFee  || 0);
      const seedPoolWei  = BigInt(seedPool  || 0);
      const entryFeeEth  = Number(entryFeeWei) / 1e18;
      const isPaid       = entryFeeWei > 0n;

      const raceType     = isPaid ? `💰 Paid — ${entryFeeEth} ETH` : '🆓 Free';
      const seedLine     = seedPoolWei > 0n ? `\n🎁 *Seed Pool:* ${Number(seedPoolWei) / 1e18} ETH` : '';

      const message = `
🏁 *New Race Created!*
*Race ID:* \`${raceId}\`
*Type:* ${raceType}
*Field Size:* ${fieldSize} pets
*Track Length:* ${trackLength}m${seedLine}
*Creator:* \`${creator.slice(0, 6)}...${creator.slice(-4)}\`

[👉 Join here](https://gigaverse.io/racing?race=${raceId})
      `.trim();

      // Get all registered users from Redis
      const users = await redis.smembers('users');

      for (const chatId of users) {
        const filter = (await redis.get(`filter:${chatId}`)) || 'all';

        // Apply filter
        if (filter === 'paid' && !isPaid) continue;
        if (filter === 'free' &&  isPaid) continue;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
