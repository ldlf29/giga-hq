# Gigling Racing Builder Guide

# 🧩 Pet Racing Hackathon Builder’s Guide

Build on Gigaverse’s onchain pet racing protocol deployed on Abstract.

---

## 1. Quick Start

| Item | Reference |
| --- | --- |
| Contract source | contracts-zk/src/gigaverse/petRacing/PetRacingSystem.sol |
| Interface | contracts-zk/src/gigaverse/petRacing/IPetRacingSystem.sol |
| Shared types / events / errors | contracts-zk/src/gigaverse/petRacing/RaceTypes.sol |
| Abstract mainnet (chainId 2741) | https://gigaverse.io/api/contracts |
| REST base | https://gigaverse.io/api/racing/… |
| Discord | #pet-racing-builders |
| Docs | https://docs.gigaverse.io/gigling-racing/gigling-racing-overview |

---

## 2. Architecture

Onchain (PetRacingSystem) only stores: roster, escrow, final ranking, per-pet payouts, fee accounting. Items, scoring, lap-by-lap simulation, ticks, factions, and weather are all offchain — the resolver (a wallet holding RACE_RESOLVER_ROLE) is the source of truth for ranking and finish times.

```yaml
createRace (host) ──► joinRace × N (players)  ──► (auto on full) RESOLVING ──► resolveRace (resolver) ──► claimReward  (each winnner)
```

---

| Value | Phase | Meaning |
| --- | --- | --- |
| 0 | IDLE | Not created |
| 1 | OPEN | Accepting joins |
| 2 | RESOLVING | Field full, waiting for resolver |
| 3 | RESOLVED | Final ranking submitted, payouts claimable |
| 4 | CANCELLED | Refunds claimable |

OPEN → RESOLVING is automatic when the field fills. RESOLVING → RESOLVED requires resolveRace. OPEN races can be expired permissionlessly after openExpirySecs; stuck RESOLVING races require rescueRace (MANAGER_ROLE). Multiple races run concurrently — there is no global queue.

---

## 4. Key Data Structures

```solidity
struct Race {
    RacePhase phase;
    uint256 raceStart;     // timestamp the race entered OPEN
    uint256 raceFinish;    // timestamp it left OPEN (filled, cancelled, or expired)
    uint256 entryFee;      // wei per joiner (excludes protocol-fee surcharge)
    uint256 pool;          // current escrowed prize pool
    uint256 fieldSize;     // pets needed to fill
    uint256 petCount;      // pets joined so far
    uint256 trackLength;   // meters (multiple of 100); 0 = pick offchain
    address creator;
    bool    isPrivate;     // true if a joinHook is configured
}

struct PayoutPreview {
    uint256 currentEntries; uint256 fieldSize;
    uint256 currentGrossPool;   uint256 currentNetPrizePool;
    uint256 projectedGrossPool; uint256 projectedNetPrizePool;
    uint256 currentProtocolFee;   uint256 currentJackpotCut;   uint256 currentCreatorFee;
    uint256 projectedProtocolFee; uint256 projectedJackpotCut; uint256 projectedCreatorFee;
    uint256[] currentPayouts;     // wei per finishing rank, at current entries
    uint256[] projectedPayouts;   // wei per finishing rank, projected to full field
}
```

Per-pet payout (getPetPayout(raceId, petId)):

```
amount         = raceAmount + jackpotAmount   // total claimable in wei
claimed        = bool
raceAmount     = wei from payout distribution OR refund (CANCELLED)
jackpotAmount  = wei from a jackpot win (only the 1st-place pet, if it rolled)
```

---

## 5. Smart Contract API

### 5.1 Host — createRace

```solidity
function createRace(
    uint256 fieldSize,                  // ≥ 2, ≤ getRaceLimits().maxPetsPerRace
    uint256 trackLength,                // meters; must be multiple of 100, or 0
    uint256 entryFeeWei,
    uint256 creatorFeeBps,              // within getCreatorFeeBounds()
    uint256[] calldata payoutDistribution, // bps per rank, sums to 10_000
    address joinHook,                   // address(0) = public; else IJoinHook
    uint256[] calldata extraParamIds,   // allowlisted via addAllowedCreateParamId
    uint256[] calldata extraParamVals
) external payable returns (uint256 raceId);
```

Hosting requires (1) a Noob account NFT, (2) no other live (OPEN/RESOLVING) race by the same address, and (3) headroom under the per-cycle-day host limit (juiced hosts get a higher cap). Any msg.value is seeded into the prize pool and refundable via claimRaceFunding if the race cancels.

extraParamIds is an opaque key/value bag the offchain resolver reads — current allowlist (see RegisterRaceParams.s.sol):

| paramId | name | values |
| --- | --- | --- |
| 100 | items | 0=none, 1=dung, 2=butterflies, 3=all |
| 200 | weather | 0=hot, 1=cold, 2=rainy, 3=snowing |
| 300 | faction | 0=none, 1=crusader, 2=overseer, 3=athena, 4=archon, 5=foxglove, 6=summoner, 7=chobo, 8=gigus |

### 5.2 Player

```solidity
function joinRace(uint256 raceId, uint256 petId, bytes calldata hookData) external payable;
function leaveRace(uint256 raceId, uint256 petId) external;             // OPEN only, after leaveCooldownSecs
function fundRace(uint256 raceId) external payable;                     // OPEN or RESOLVING
function expireRace(uint256 raceId) external;                           // permissionless sweep of stale OPEN
```

msg.value for joinRace must equal `getRaceJoinFee(raceId, msg.sender)` — that’s entryFee + protocolFeeSurcharge at the caller’s current juiced rate. The pet must be owned by msg.sender, hatched (IGigaPetTraits.isHatched), not locked, off cooldown, under its career/daily limits, and not already in this race. hookData is opaque bytes forwarded to the race’s IJoinHook (empty for public races).

### 5.3 Resolver (RACE_RESOLVER_ROLE, offchain service)

```solidity
function resolveRace(
    uint256 raceId,
    uint256 randomSeed,
    uint256[] calldata finalRanking,    // petIds in finishing order; [0] = 1st
    uint256[] calldata msFinishTimes,   // parallel array, non-decreasing
    uint256[] calldata extraParamIds,   // metadata bag emitted on RaceResolved
    uint256[] calldata extraParamVals
) external;
```

The resolver is fully trusted: it dictates the ranking and supplies the random seed for the 1st-place jackpot roll.

### 5.4 Claim

```solidity
function claimReward(uint256 raceId, uint256 petId) external;   // winnings (RESOLVED) or refund (CANCELLED)
function claimCreatorFees() external;                           // host pulls accrued creator fees
function claimRaceFunding(uint256 raceId) external;             // creator seed + fundRace contributions, CANCELLED only
```

claimReward is gated on the original entrant address (stored in the entry doc), not current NFT ownership — selling a pet does not transfer winnings.

### 5.5 Views (selected)

```
getRace(raceId)                                  // full Race struct
getRacePhase(raceId) / getRacePets(raceId) / getRacePool(raceId)
getRacePayoutDistribution(raceId)                // bps per rank
getRaceFinalRanking(raceId) / getRaceFinishTimes(raceId)
getRaceJoinFee(raceId, account)                  // entryFee + per-account surcharge
previewPayouts(raceId)                           // PayoutPreview (current vs projected)
getPetPayout(raceId, petId)                      // amount, claimed, raceAmount, jackpotAmount
getPetOwnerInRace(raceId, petId) / getPetJoinedAt(raceId, petId)
isPetLocked(petId) / getPetCooldownEnd(petId) / getPetRacesRun(petId)
canPetRace(petId, owner)                         // bool — combines lock + cooldown + limits
getRaceLimits() / getRaceTimingConfig() / getJackpotConfig()
getProtocolFeeConfig() / getCreatorFeeBounds() / getProtocolWallet()
getRaceExpiryStatus(raceId)                      // (isExpired, expiresAt, phase)
getAllowedCreateParamIds() / isParamIdAllowed(paramId) / getParamIdName(paramId)
getAccruedCreatorFees(creator) / getLifetimeAccruedCreatorFees(creator)
getJackpotBalance() / getTotalUnclaimedObligations() / getTotalLiabilities()
```

---

## 6. Fees & Jackpot

All in basis points (BPS_DENOM = 10_000). Snapshotted on the race at creation, so mid-flight config changes don’t apply retroactively.

| Cut | Source | Rate | Notes |
| --- | --- | --- | --- |
| Protocol fee | **Surcharge on top** of entry fee | feeBps (or juicedFeeBps if juiced) | Doesn’t reduce prize pool |
| Jackpot cut | Out of entry fee total | jackpotBps | Adds to shared Gigapot |
| Creator fee | Out of entry fee total | creatorFeeBps | Pull-claimed via claimCreatorFees |
| Remainder | Out of entry fee total | balance | Split across ranks per payoutDistribution |

Jackpot win chance is maxChanceBps * min(entryFee, targetEntryFee) / targetEntryFee, rolled once for 1st place. Juiced winners use maxChanceBpsJuiced. A winning roll pays winnableBps * eligibleJackpot / BPS_DENOM, where eligibleJackpot is the snapshot of getJackpotBalance() taken before this race’s jackpotCut was added — a race never wins back its own contribution. Free races (entryFee = 0) never roll.

---

## 7. Events (subscribe via Abstract RPC)

Defined in RaceTypes.sol. The ones builders most often watch:

```
RaceCreated(raceId, creator, fieldSize, trackLength, entryFee, seedPool, creatorFeeBps)
RaceConfigured(raceId, payoutDistribution, joinHook, extraParamIds, extraParamVals)
PetJoined(raceId, petId, owner)
PetLeft(raceId, petId, owner)
RaceFunded(raceId, funder, amount)
PhaseAdvanced(raceId, newPhase)
RaceResolved(raceId, finalRanking, msFinishTimes, extraParamIds, extraParamVals)
RewardClaimed(raceId, petId, claimer, amount)
JackpotWon(raceId, petId, winner, amount, placement)
JackpotAccrued(raceId, amount) / JackpotFunded(funder, amount)
RaceCancelled(raceId, cancelledBy) / RaceExpired(raceId, expiredFromPhase, expiresAt)
PetRaceRecorded(petId, raceId, racesRun)  // pet's lifetime race count
```

The list of races a pet has run is not stored onchain — reconstruct it offchain from PetRaceRecorded logs.

---

## 8. REST API

Base: https://gigaverse.io/api/racing. JSON in/out. Endpoints marked auth require a Gigaverse JWT (header `Authorization: Bearer <jwt>`); the rest are public.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /races?limit=50 | Recent races with phase, entry fee, pool, source |
| GET | /race/{raceId} | Full race state: entries, per-pet payouts, your unclaimed balance |
| GET | /race-state?raceId=… | Dev/diagnostic: same shape but read directly from chain |
| GET | /race/{raceId}/items *(auth)* | Caller’s items eligible for this race |
| POST | /race/{raceId}/use-item *(auth)* | Submit an item: { petId, itemId, amount } — scheduled at next tick |
| POST | /race/{raceId}/tick | Idempotently advance the offchain simulation (Pusher worker or poll) |
| GET / POST | /race/{raceId}/chat *(auth)* | Per-race chat |
| GET | /pets?ids=1,2,3 *(auth optional)* | Player’s pets, or fetch by IDs |
| GET | /pets/stats?ids=1,2,3 | Batch racing stats (cached ~60s) |
| GET | /pets/{petId}/stats | 15-race history + ELO |
| GET | /races/{address}?limit=50 | Race history for a player |
| GET | /payouts/{address} | Unclaimed payouts across the player’s pets |
| GET | /creator-fees/{address} | Lifetime + unclaimed creator fees |
| GET | /host-eligibility/{address} | Account gate, daily caps, fee/jackpot config — everything createRace needs |
| GET | /leaderboard/elo?limit=&offset=&factions=&rarities=&genders= | ELO leaderboard |
| GET | /items *(auth)* | Allowed items + player balance |
| GET | /stats | Global aggregate stats |
| POST | /attestation *(auth)* | EIP-712 attestation for ELO-gated races: { raceId, petId } |
| GET | /scheduled | Upcoming one-time scheduled races |
| POST | /lobby/sync | Bulk lobby snapshot (races, my races, payouts, claims, pending joins) |
| POST | /lobby/chat *(auth)* | Global lobby chat |
| POST | /lobby/notify | Trigger a manual race-update broadcast |

---

## 9. Realtime (GigaSocket / Pusher)

Pusher-compatible. Public channels can be subscribed to anonymously; presence/private channels go through POST /api/gigasocket/pusher/auth.

| Channel | Events | Payload |
| --- | --- | --- |
| race-{raceId} (public) | tick-advanced, race-broadcast, item-submitted, chat-message | Tick deltas, full broadcasts, item submissions, chat |
| racing.lobby (public) | race-updated, lobby-snapshot, lobby-heartbeat | Race-level deltas, periodic snapshots, heartbeats |
| global.chat.racing (public) | racing.chat.message | Global lobby chat |

Constants live in _nextjs-gigaverse/lib/racing/realtime.ts (RACING_RACE_EVENT_NAMES, RACING_LOBBY_EVENT_NAMES, RACING_GLOBAL_CHAT_EVENT_NAMES, plus payload types).

---

## 10. Join Hooks (private / gated races)

Pass a non-zero joinHook to createRace to gate entry. The contract calls IJoinHook.canJoin(raceId, petId, joiner, hookData) during joinRace; returning false reverts with JoinNotAllowed. Three reference hooks ship with the protocol:

| Hook | Purpose | Where (abstract mainnet) |
| --- | --- | --- |
| AllowlistJoinHook | Static address allowlist | 0xfD06DE84B99Ee66A0C6915b483E5eb519cf60A08 |
| AttestedJoinHook | EIP-712 signed attestation (e.g. ELO band) | 0x1627aC6e33357ec3d6181561f6630A6182D3e6C8 |
| MinRacesRunJoinHook | Minimum pet career races | 0x3e13F20E2A1fB0C96Bf646313e203a1D8b5D4cFD |

Source: contracts-zk/src/gigaverse/petRacing/hooks/. Anyone can deploy a custom hook — interface is the single canJoin view in IJoinHook.sol.

---

## 11. End-to-End: TypeScript (viem)

```tsx
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { abstract } from "viem/chains";

const PET_RACING = "0x16e0B3D6394CE7597D34b73f5E5Fb165fD74394E"; // abstract mainnet
const ABI = [/* PetRacingSystem ABI — see contracts-zk/out/PetRacingSystem.sol/PetRacingSystem.json */];

const pub = createPublicClient({ chain: abstract, transport: http() });

// 1. Host a race (host pays optional seed via msg.value)
const raceId = await wallet.writeContract({
    address: PET_RACING, abi: ABI, functionName: "createRace",
    args: [
        8n,                  // fieldSize
        1000n,               // trackLength (meters, multiple of 100)
        parseEther("0.01"),  // entryFeeWei
        500n,                // creatorFeeBps (5%)
        [5000n, 3000n, 2000n], // payout split: 50/30/20 to top 3
        "0x0000000000000000000000000000000000000000", // joinHook (public)
        [100n, 300n],        // extraParamIds: items, faction
        [3n,   1n],          // values: all items, crusader-only theme
    ],
    value: parseEther("0.1"), // optional seed
});

// 2. Player joins — read the exact join fee first
const joinFee = await pub.readContract({
    address: PET_RACING, abi: ABI, functionName: "getRaceJoinFee",
    args: [raceId, playerAddress],
});
await wallet.writeContract({
    address: PET_RACING, abi: ABI, functionName: "joinRace",
    args: [raceId, petId, "0x"],
    value: joinFee,
});

// 3. After RaceResolved, original entrant pulls payout
const { amount, claimed } = await pub.readContract({
    address: PET_RACING, abi: ABI, functionName: "getPetPayout",
    args: [raceId, petId],
});
if (amount > 0n && !claimed) {
    await wallet.writeContract({
        address: PET_RACING, abi: ABI, functionName: "claimReward",
        args: [raceId, petId],
    });
}
```

---

## 12. Best Practices

1. Always size joins with `getRaceJoinFee(raceId, account)` — the protocol-fee surcharge depends on the caller’s juiced status; passing entryFee alone reverts WrongEntryFee.
2. Watch events, don’t poll — PhaseAdvanced, RaceResolved, RewardClaimed, PetJoined, JackpotWon cover almost every state change. Use Pusher for sub-second UI updates within a single race.
3. Pre-flight with `canPetRace(petId, owner)` — combines lock, cooldown, career limit, and the juiced/unjuiced daily limit in one call, avoiding wasted gas.
4. Use `previewPayouts(raceId)` to show users their projected take at current entries vs full field — handles all fee math for you.
5. `claimReward` is gated on the original entrant, not current pet ownership. Build your UI off getPetOwnerInRace, not the NFT owner.
6. Cancellations refund per-pet via `claimReward` AND per-funder via `claimRaceFunding` — they’re two separate pulls.
7. Reconnect GigaSocket with exponential backoff and resync from GET /race/{raceId} on reconnect — Pusher delivery is best-effort.
8. Validate config bounds before `createRace` with GET /api/racing/host-eligibility/{address} — saves a revert round-trip.

---

## 13. Testing & Debugging

- **Testnet first**: Abstract testnet (abs-testnet, chainId 11124) mirrors mainnet config. Faucet via Abstract docs.
- **Diagnostic read**: GET /api/racing/race-state?raceId=N reads directly from the contract (bypasses any indexer lag).
- **Revert decoding**: see _nextjs-gigaverse/lib/racing/parseRevert.ts — maps RaceFull, WrongEntryFee, PetLocked, JoinNotAllowed, etc. to UI strings.
- **Indexer**: race history and leaderboards are served from MongoDB (indexer-abstract); allow ~1 block of lag after a state change.
- **Free races**: set entryFeeWei = 0 and payoutDistribution = [] (or any sum-to-10000 array — payouts will simply be 0). The jackpot never rolls.

---

## 14. Get Help

- **Discord**
- **Docs**: https://docs.gigaverse.io/gigling-racing/gigling-racing-overview
- **Contract source**: read the contract — PetRacingSystem.sol, IPetRacingSystem.sol, RaceTypes.sol. Comments are extensive and authoritative.