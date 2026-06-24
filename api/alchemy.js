import { decodeEventLog } from 'viem';
import { Redis } from '@upstash/redis';

// RaceCreated event signature hash we calculated
const RACE_CREATED_TOPIC = '0x3140283acc902bb8af484fc157968628a25250c6f6f93ad8d07a0aeb674b3d28';

// ABIs to handle both indexed and non-indexed scenarios dynamically
const abiWithIndexed = [
  {
    name: 'RaceCreated',
    type: 'event',
    inputs: [
      { type: 'uint256', name: 'raceId', indexed: true },
      { type: 'address', name: 'creator', indexed: true },
      { type: 'uint256', name: 'fieldSize', indexed: false },
      { type: 'uint256', name: 'trackLength', indexed: false },
      { type: 'uint256', name: 'entryFee', indexed: false },
      { type: 'uint256', name: 'seedPool', indexed: false },
      { type: 'uint256', name: 'creatorFeeBps', indexed: false }
    ]
  }
];

const abiWithoutIndexed = [
  {
    name: 'RaceCreated',
    type: 'event',
    inputs: [
      { type: 'uint256', name: 'raceId', indexed: false },
      { type: 'address', name: 'creator', indexed: false },
      { type: 'uint256', name: 'fieldSize', indexed: false },
      { type: 'uint256', name: 'trackLength', indexed: false },
      { type: 'uint256', name: 'entryFee', indexed: false },
      { type: 'uint256', name: 'seedPool', indexed: false },
      { type: 'uint256', name: 'creatorFeeBps', indexed: false }
    ]
  }
];

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
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !defaultChatId) {
    console.error('Missing environment variables: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Missing backend configuration' });
  }

  try {
    // Alchemy custom webhook GraphQL payload wraps the block info
    const logs = body?.event?.data?.block?.logs || [];
    console.log(`Received ${logs.length} logs from Alchemy Webhook`);

    for (const log of logs) {
      if (!log.topics || log.topics[0] !== RACE_CREATED_TOPIC) {
        continue; // Not a RaceCreated event
      }

      // Decode dynamically based on topic length
      const abi = log.topics.length === 3 ? abiWithIndexed : abiWithoutIndexed;
      let decoded;
      try {
        decoded = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics,
          eventName: 'RaceCreated'
        });
      } catch (err) {
        console.error('Decoding error:', err);
        continue;
      }

      if (!decoded || !decoded.args) continue;

      const { raceId, creator, fieldSize, trackLength, entryFee, seedPool } = decoded.args;
      const entryFeeWei = BigInt(entryFee || 0);
      const entryFeeEth = Number(entryFeeWei) / 1e18;
      const isPaid = entryFeeWei > 0n;

      // Get user preference from Redis (fallback to 'all' if Redis is down/missing)
      let filterPref = 'all';
      if (redis) {
        try {
          const storedPref = await redis.get(`filter:${defaultChatId}`);
          if (storedPref) {
            filterPref = storedPref;
          }
        } catch (e) {
          console.error('Redis read error:', e);
        }
      }

      // Apply filter logic
      if (filterPref === 'paid' && !isPaid) {
        console.log(`Skipping free race ${raceId} due to filter: paid`);
        continue;
      }
      if (filterPref === 'free' && isPaid) {
        console.log(`Skipping paid race ${raceId} due to filter: free`);
        continue;
      }

      // Format Message in English
      const raceTypeEmoji = isPaid ? '💰' : '🏁';
      const raceTypeText = isPaid ? `Paid Race (${entryFeeEth} ETH)` : 'Free Race';
      const seedText = seedPool && BigInt(seedPool) > 0n ? `\n🎁 *Seed Pool:* ${Number(seedPool) / 1e18} ETH` : '';
      
      const messageText = `
${raceTypeEmoji} *New Race Created!*
*ID:* ${raceId}
*Type:* ${raceTypeText}
*Field Size:* ${fieldSize} pets
*Track Length:* ${trackLength} meters${seedText}
*Creator:* \`${creator.slice(0, 6)}...${creator.slice(-4)}\`

🔗 [Join Race here](https://gigaverse.io/racing?race=${raceId})
      `.trim();

      // Send to Telegram
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: defaultChatId,
          text: messageText,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      const tgResult = await tgResponse.json();
      if (!tgResult.ok) {
        console.error('Failed to send Telegram message:', tgResult);
      } else {
        console.log(`Notification sent for race ${raceId}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
