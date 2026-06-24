/* API Client for Gigaverse REST Endpoints */

const BASE_URL = 'https://gigaverse.io/api/racing';
const CONTRACTS_URL = 'https://gigaverse.io/api/contracts';

// In-memory cache for API requests (cleared on page reload)
const apiCache = new Map();

/**
 * Delay execution for ms milliseconds
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Escapes special characters to prevent XSS
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

/**
 * Sanitizes and validates a Hex address
 */
export function sanitizeAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const clean = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Sanitizes and validates a Pet ID (integer)
 */
export function sanitizePetId(id) {
  if (id === undefined || id === null) return null;
  const numStr = String(id).trim();
  if (/^\d+$/.test(numStr)) {
    return parseInt(numStr, 10);
  }
  return null;
}

/**
 * Generic fetch method with cache, debounce protection, and 429 retry backoff
 */
async function fetchWithRetry(url, options = {}, cacheDurationMs = 60000) {
  // Check Cache
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  if (cacheDurationMs > 0 && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < cacheDurationMs) {
      return cached.data;
    }
  }

  let retries = 3;
  let backoff = 1000; // start with 1 second delay

  while (retries >= 0) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        if (retries === 0) {
          throw new Error('Rate limit exceeded (429). Please try again later.');
        }
        console.warn(`Rate limited (429). Retrying in ${backoff}ms...`);
        await delay(backoff);
        retries--;
        backoff *= 2; // exponential backoff
        continue;
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store in cache
      if (cacheDurationMs > 0) {
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      if (retries === 0) {
        throw error;
      }
      console.error(`Fetch error: ${error.message}. Retrying in ${backoff}ms...`);
      await delay(backoff);
      retries--;
      backoff *= 2;
    }
  }
}

/**
 * Get global stats for Gigling Racing
 */
export async function getGlobalStats() {
  const res = await fetchWithRetry(`${BASE_URL}/stats`, {}, 120000); // 2 min cache
  return res.success ? res.data : null;
}

/**
 * Get recent historical races for a player address
 */
export async function getPlayerRaces(address, limit = 50) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) throw new Error('Invalid address');
  
  const res = await fetchWithRetry(`${BASE_URL}/races/${cleanAddress}?limit=${limit}`, {}, 30000); // 30s cache
  return res.success ? res.races : [];
}

/**
 * Get global recent historical races
 */
export async function getRecentRaces(limit = 10) {
  const res = await fetchWithRetry(`${BASE_URL}/races?limit=${limit}`, {}, 15000); // 15s cache
  return res.success ? res.races : [];
}

/**
 * Get detailed 15-race stats and ELO for a single pet
 */
export async function getPetHistory(petId) {
  const cleanId = sanitizePetId(petId);
  if (cleanId === null) throw new Error('Invalid pet ID');
  
  const res = await fetchWithRetry(`${BASE_URL}/pets/${cleanId}/stats`, {}, 30000); // 30s cache
  return res.success ? res.stats : null;
}

/**
 * Get current attributes, gender, rarity, and owner details of pets by batch
 */
export async function getPetsDetails(petIds) {
  const ids = Array.isArray(petIds) ? petIds : [petIds];
  const cleanIds = ids.map(sanitizePetId).filter(id => id !== null);
  if (cleanIds.length === 0) return [];
  
  // Chunk IDs to avoid overly long URLs (keep max 10 ids per query)
  const chunkSize = 10;
  let allPets = [];
  
  for (let i = 0; i < cleanIds.length; i += chunkSize) {
    const chunk = cleanIds.slice(i, i + chunkSize);
    const res = await fetchWithRetry(`${BASE_URL}/pets?ids=${chunk.join(',')}`, {}, 30000); // 30s cache
    if (res.success && res.pets) {
      allPets = allPets.concat(res.pets);
    }
  }
  
  return allPets;
}

/**
 * Get pets owned by an address
 */
export async function getPlayerPets(address) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) throw new Error('Invalid address');
  
  const res = await fetchWithRetry(`${BASE_URL}/pets?address=${cleanAddress}`, {}, 30000); // 30s cache
  return res.success ? res.pets : [];
}

/**
 * Get unclaimed payouts for an address
 */
export async function getPlayerPayouts(address) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) throw new Error('Invalid address');
  
  const res = await fetchWithRetry(`${BASE_URL}/payouts/${cleanAddress}`, {}, 20000); // 20s cache
  return res.success ? res.payouts : [];
}

/**
 * Get creator fees for an address
 */
export async function getCreatorFees(address) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) throw new Error('Invalid address');
  
  const res = await fetchWithRetry(`${BASE_URL}/creator-fees/${cleanAddress}`, {}, 30000); // 30s cache
  return res.success ? res : null;
}

/**
 * Get host eligibility config for an address
 */
export async function getHostEligibility(address) {
  const cleanAddress = sanitizeAddress(address);
  if (!cleanAddress) throw new Error('Invalid address');
  
  const res = await fetchWithRetry(`${BASE_URL}/host-eligibility/${cleanAddress}`, {}, 30000); // 30s cache
  return res.success ? res : null;
}

/**
 * Get ELO leaderboard entries
 */
export async function getLeaderboard(limit = 50, offset = 0, factions = '', rarities = '', genders = '') {
  let url = `${BASE_URL}/leaderboard/elo?limit=${limit}&offset=${offset}`;
  if (factions) url += `&factions=${factions}`;
  if (rarities) url += `&rarities=${rarities}`;
  if (genders) url += `&genders=${genders}`;
  
  const res = await fetchWithRetry(url, {}, 60000); // 1 min cache
  return res.success ? res.entries : [];
}

/**
 * Get full details of a specific race (payouts, participants, weather)
 */
export async function getRaceDetails(raceId) {
  const cleanId = sanitizePetId(raceId);
  if (cleanId === null) throw new Error('Invalid race ID');
  
  const res = await fetchWithRetry(`${BASE_URL}/race/${cleanId}`, {}, 60000); // 1 min cache
  return res.success ? res : null;
}

/**
 * Get contracts list from Gigaverse
 */
export async function getContracts() {
  return await fetchWithRetry(CONTRACTS_URL, {}, 600000); // 10 min cache
}
