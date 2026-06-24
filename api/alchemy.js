import { createHmac, timingSafeEqual } from 'crypto';
import { decodeAbiParameters } from 'viem';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Disable Vercel's automatic body parsing so we can read the raw body for HMAC verification
export const config = {
  api: { bodyParser: false },
};

/** Reads the raw request body as a Buffer */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Verifies the x-alchemy-signature header against the raw body */
function verifyAlchemySignature(rawBody, signature, signingKey) {
  const hmac = createHmac('sha256', signingKey);
  hmac.update(rawBody); // rawBody is already a Buffer
  const digest = hmac.digest('hex');
  // timingSafeEqual requires equal-length buffers
  const digestBuf = Buffer.from(digest);
  const sigBuf    = Buffer.from(signature);
  if (digestBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(digestBuf, sigBuf);
}

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

  // --- Signature verification ---
  const signingKey = process.env.ALCHEMY_WEBHOOK_SECRET;
  if (!signingKey) {
    console.error('ALCHEMY_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-alchemy-signature'];

  if (!signature || !verifyAlchemySignature(rawBody, signature, signingKey)) {
    console.warn('Invalid Alchemy signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse JSON manually since bodyParser is disabled
  let body;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  try {
    const logs = body?.event?.data?.block?.logs || [];
    console.log(`[ALCHEMY] Received webhook. Logs count: ${logs.length}`);
    console.log(`[ALCHEMY] Full body keys:`, JSON.stringify(Object.keys(body || {})));
    console.log(`[ALCHEMY] event keys:`, JSON.stringify(Object.keys(body?.event || {})));
    console.log(`[ALCHEMY] event.data keys:`, JSON.stringify(Object.keys(body?.event?.data || {})));

    if (logs.length === 0) {
      console.log('[ALCHEMY] No logs in this block, returning 200');
      return res.status(200).json({ ok: true, message: 'no logs' });
    }

    for (const log of logs) {
      console.log(`[ALCHEMY] Log topic[0]: ${log.topics?.[0]}`);
      console.log(`[ALCHEMY] Expected topic: ${RACE_CREATED_TOPIC}`);
      console.log(`[ALCHEMY] Match: ${log.topics?.[0] === RACE_CREATED_TOPIC}`);

      // Filter: only RaceCreated events
      if (!log.topics || log.topics[0] !== RACE_CREATED_TOPIC) continue;

      let raceId, creator, fieldSize, trackLength, entryFee, seedPool;
      try {
        // topics[1] = raceId, topics[2] = creator
        raceId = BigInt(log.topics[1] || 0);
        creator = '0x' + (log.topics[2] || '').slice(-40); // Convert padded bytes32 to address

        // Decode data manually since it's 128 bytes (4 uint256s) instead of the expected 5
        const decodedData = decodeAbiParameters(
          [
            { type: 'uint256', name: 'fieldSize' },
            { type: 'uint256', name: 'trackLength' },
            { type: 'uint256', name: 'entryFee' },
            { type: 'uint256', name: 'creatorFeeBps' }, // assuming seedPool was omitted in data
          ],
          log.data
        );
        
        fieldSize = decodedData[0];
        trackLength = decodedData[1];
        entryFee = decodedData[2];
        seedPool = 0n; // default to 0 since it's missing from data
        
        console.log(`[ALCHEMY] Decoded manually. raceId: ${raceId}, creator: ${creator}, fieldSize: ${fieldSize}, trackLength: ${trackLength}, entryFee: ${entryFee}`);
      } catch (err) {
        console.error('[ALCHEMY] Failed to decode log manually:', err);
        continue;
      }

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
      console.log(`[ALCHEMY] Users from Redis: ${JSON.stringify(users)} (count: ${users.length})`);

      for (const chatId of users) {
        const filter = (await redis.get(`filter:${chatId}`)) || 'all';
        const status = (await redis.get(`status:${chatId}`)) || 'active';
        console.log(`[ALCHEMY] User ${chatId} filter: ${filter}, status: ${status}, isPaid: ${isPaid}`);

        if (status === 'paused') continue;

        // Apply filter
        if (filter === 'paid' && !isPaid) continue;
        if (filter === 'free' &&  isPaid) continue;

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        });
        const tgData = await tgRes.json();
        console.log(`[ALCHEMY] Telegram response for ${chatId}:`, JSON.stringify(tgData));
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[ALCHEMY] Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
