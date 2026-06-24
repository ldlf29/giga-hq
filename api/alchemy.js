import { decodeEventLog } from 'viem';

// RaceCreated event signature hash
const RACE_CREATED_TOPIC = '0x3140283acc902bb8af484fc157968628a25250c6f6f93ad8d07a0aeb674b3d28';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { body } = req;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID; // The Channel or Group ID

  if (!botToken || !chatId) {
    console.error('Missing environment variables: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Missing backend configuration' });
  }

  try {
    const logs = body?.event?.data?.block?.logs || [];
    console.log(`Received ${logs.length} logs from Alchemy`);

    for (const log of logs) {
      if (!log.topics || log.topics[0] !== RACE_CREATED_TOPIC) {
        continue;
      }

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

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
