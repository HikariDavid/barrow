# BARROW

**The dungeon remembers.**

A daily death-legacy roguelike that lives inside a Reddit post. Every day, one shared dungeon is generated for every player on the subreddit. When you die, your gravestone, your buried item, and your last words become permanent content in tomorrow's dungeon for every other player to find.

No app install. No account creation. Just tap the post and descend.

## How to Play

- **Tap a tile to move.** WASD and arrow keys also work. Find the stairs to go deeper.
- **Mind your torch.** Your torch burns down every step. When it hits zero, the darkness eats your HP. Deeper floors = better score = darker light.
- **Pay respects** at graves to recover torch light. **Take items** left by the fallen — their gold, their weapons, their trinkets.
- **Die with purpose.** When you fall, compose an epitaph from a word bank. Your grave appears in tomorrow's dungeon with your item buried underneath.

## The Hook

The dungeon resets at midnight UTC, but it never starts clean. Yesterday's dead are already there — their gravestones mark the walls, their buried loot waits beneath, their epitaphs whisper warnings or lies. Every player shares one dungeon per day. Your run is a 2–4 minute commitment. Your death outlasts you.

Return the next day to see who found your grave. Did they pay respects and give you a torch boost? Did they loot your buried treasure? Did they ignore you entirely?

## Key Features

**Daily Shared Dungeon** — Same 9×11 procedural layout, same enemy placements, same grave positions for every player on a given date. Seeded PRNG ensures identical runs across all clients.

**The Torch** — Light radius shrinks as your torch degrades. At radius 3.5 you can see across rooms. At 1.5 you're staring at walls. At 0.75 you're blind. Every 3 turns in total darkness costs 1 HP. Embers restore 25 torch. This is the core tension.

**Burial System** — On death, players compose epitaphs from a 3-column word bank (e.g. "Beware / the knight / always"). The epitaph, gold, and a random trinket are buried at the death tile. Tomorrow's players can pay respects (+5 torch for you) or loot (take the item, you get nothing). One action per player per grave.

**Legacy Graves** — 14 lore graves from fictional characters ("The Unnamed Wanderer", "A Forgotten Cartographer") seed the first day. Their epitaphs are the only hint players have when no real graves exist yet.

**Community Depth Meter** — Aggregated deaths across all players fill a bar. Three tiers (150 / 600 / 1500 deaths) unlock passive torch bonuses for everyone. The Barrow either relents or stays unmoved based on collective sacrifice.

**Streaks & Leaderboard** — Consecutive daily runs build a streak (up to 5 levels, +5 torch per level). Score = depth × 100 + gold − turn penalty. Top 25 ranked daily, with personal best tracking.

**Grave Panel & Epitaph Composer** — After death, a 3-column chip picker lets you compose your last words. Scrollable grave inventory shows your gold, torch, weapon, and 3 trinket slots. One-tap burial. No undo.

**Flair Progression** — Depth milestones unlock Reddit flair: Gravewalker (5), Bonelight Bearer (10), Deep Warden (15), Barrow Lord (20).

**Share Fall** — A "Share my fall" button posts your epitaph + depth as a comment on the daily thread, formatted as a lore-style death announcement.

## Controls

| Input | Action |
|-------|--------|
| Tap tile | Move toward tile |
| Arrow keys / WASD | Move in direction |
| Space / Tap "Wait" | Skip turn (torch still burns) |
| Tap grave | Pay respects or loot |
| Tap shrines | Choose blessing at floor 5/10/15/20/25 |

## Technical Design

**Stack:** Devvit Web (Reddit's developer platform) · Phaser 4 (2D engine) · Hono (server routing) · Redis (data) · TypeScript (strict mode)

**Architecture:** The game runs as a custom Reddit post. Two entrypoints — an inline splash screen (default) and an expanded game view (tap "Descend" to open). Server handles daily rolllover via cron, leaderboard computation, grave read/write, and anti-cheat validation. Client handles dungeon generation, FOV raycasting, torchlight overlay, turn resolution, and all UI.

**PRNG:** Hand-rolled xmur3 + mulberry32. Same seed (date string) → identical 9×11 dungeon, enemy placements, item drops, and grave positions across all clients. No `Math.random` in game logic.

**Sprites:** All 20+ sprites are programmatic 16×16 pixel art drawn to canvas. No image assets. Palette: 6 hex colors (peat, bone, amber, ember, moon, moss).

**Audio:** 6 procedural SFX (step, hit, pickup, death, respects, ember). Tap-gated for mobile autoplay compliance. Mute toggle persists in sessionStorage only.

**Redis Schema:** Hash-per-day for graves, sorted set for leaderboard, hash-per-user for streaks/stats, sorted set for pending ledger entries. All writes are idempotent (scheduler fires may duplicate).

**Anti-Cheat:** Server validates floor depth, gold bounds, turn count, duration, and impossible depth-per-turn ratios. Sanity checks reject fabricated finish requests.

## Development

```bash
npm install
npm run dev          # Playtest (requires devvit init first)
npm run type-check   # TypeScript strict build
npm run lint         # ESLint
npm run deploy       # Upload to Reddit
npm run launch       # Deploy + publish for review
```

## License

BSD-3-Clause
