# GuildBot

A full-featured **Hypixel ↔ Discord guild bot** that bridges in-game guild chat to Discord, syncs guild ranks to Discord roles, tracks GEXP, manages verification, and runs slash commands for moderation and stats - all rendered with native Minecraft-style chat images for a seamless feel.

Built to run multiple guilds simultaneously on a single host via PM2.

---

## Screenshots


| Guild chat bridge | Stats commands |
|---|---|
| ![Guild chat bridged to Discord](docs/screenshots/bridge.png) | ![In-game stats command](docs/screenshots/stats.png) |

| Verification flow | Leaderboards |
|---|---|
| ![/verify slash command](docs/screenshots/verify.png) | ![GEXP leaderboard](docs/screenshots/leaderboard.png) |

---

## Features

### Chat Bridge
- **Two-way bridge** - Guild chat, officer chat, and system messages forwarded to Discord; verified Discord users can chat back into the guild.
- **Native Minecraft rendering** - Messages are rendered with `@napi-rs/canvas` to look exactly like the in-game chat (color codes, ranks, formatting preserved).
- **Per-channel toggles** - Independently enable/disable GC, OC, and system bridging.
- **Banned-word filter** for the Discord → MC direction.
- **Emoji translation** so Discord emojis don't break the in-game chat.

### Verification & Permissions
- `/verify` flow that links a Discord account to a Minecraft IGN.
- `/forceverify` / `/forceunverify` for staff overrides.
- `/perms` system with tiered permission groups (developers, admins, invite, kick, mute).
- Auto-cleaning verify channel with a sticky instruction embed.

### Guild Management
- `/guild invite | kick | mute | unmute` - drives the in-game bot from Discord.
- `/ban` — adds players to a persistent blacklist by UUID.
- **Auto-accept join requests** with blacklist pre-check; alerts staff with a pinged embed if a blacklisted player joins or tries to join.
- **Welcome messages** for new guild members.

### GEXP Tracking
- Tracks **lifetime cumulative GEXP** (beyond Hypixel's 7-day window) by sampling daily deltas.
- Daily / weekly / monthly leaderboards via in-game `!daily` `!weekly` `!monthly` commands.
- Paginated leaderboards through the Discord slash command.
- Persistent IGN store so leaderboard names stay consistent even when API cache misses.

### Role Sync
- Auto-syncs Hypixel guild ranks → Discord roles every 5 minutes.
- **Nickname sync** keeps Discord nicknames matching IGNs.
- **Auto-promote / demote** based on configurable requirements (weekly GEXP, lifetime GEXP, time-in-guild).
- Per-rank `promote` / `demote` flags so e.g. Veterans never get auto-demoted.

### In-Game Stat Commands
Hypixel stat lookups callable directly in guild chat:
- `!bw` - Bedwars
- `!sw` - Skywars
- `!duels` - Duels
- `!gexp` / `!lgxp` - weekly / lifetime GEXP
- `!bb` - Build Battle
- `!daily` / `!weekly` / `!monthly` - GEXP leaderboards
- `!v` - view urchin tags
- `!help`

### Resilience
- **Watchdog** checks the MC bot's connection state every 60s and force-reconnects if it stalls.
- Exponential backoff on disconnect (15s → 120s cap).
- `/reconnect` slash command for manual recovery.
- `/status` to inspect bot health from Discord.

### Multi-Guild Support
- Run 4+ bots from one codebase, each with its own `configN.yaml` and isolated `src/dataN/` directory.
- Managed by [ecosystem.config.js](ecosystem.config.js) under PM2 — `pm2 start ecosystem.config.js`.

---

## Technologies

| Layer | Stack |
|---|---|
| **Runtime** | Node.js + TypeScript |
| **Minecraft client** | [mineflayer](https://github.com/PrismarineJS/mineflayer), minecraft-protocol |
| **Discord client** | [discord.js v14](https://discord.js.org/) |
| **Rendering** | [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (native Minecraft chat images) |
| **Storage** | [lowdb](https://github.com/typicode/lowdb) (file-backed JSON) |
| **Config** | YAML (`js-yaml`) |
| **HTTP** | axios |
| **APIs** | [Hypixel API](https://api.hypixel.net/), [Urchin](https://urchin.gg/), [Lunaaaa](https://lunaaaa.net/), Mojang |
| **Process mgmt** | [PM2](https://pm2.keymetrics.io/) |

---

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- A Minecraft account for the in-game bot (Microsoft auth recommended)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- API keys: [Hypixel](https://developer.hypixel.net), Urchin, Lunaaaa, blabit (internal)

### 1. Clone & install
```bash
git clone https://github.com/blab1t/GuildBot.git
cd GuildBot
npm install
```

### 2. Configure
Copy the example config and fill in your values:
```bash
cp config.example.yaml config1.yaml
```
Edit `config1.yaml` - you'll need:
- API keys (Hypixel, Discord token, etc.)
- Bot Minecraft credentials and target guild name
- Discord channel IDs (chat bridge, system, verify, blacklist alerts)
- Discord role IDs and role-sync rules
- Permission groups (Discord user IDs per tier)

See [config.example.yaml](config.example.yaml) for fully commented fields.

### 3. Build
```bash
npm run build
```

### 4. Run

**Single bot (dev):**
```bash
npm start
```

**Production (PM2, multi-bot):**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 logs           # tail all bots
pm2 logs bot-1     # tail one
pm2 restart bot-1  # restart one
```

To add a 5th bot: copy a config to `config5.yaml`, then append a new entry to [ecosystem.config.js](ecosystem.config.js) following the same pattern.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         PM2 (ecosystem.config.js)            │
│   bot-1  ●  bot-2  ●  bot-3  ●  bot-4  (one process each)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       src/index.ts                           │
│        (entrypoint: boots Discord + MC + schedulers)         │
└─────────────────────────────────────────────────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ src/discord  │◄────►│  src/utils   │◄────►│ src/minecraft│
│              │      │              │      │              │
│ • client.ts  │      │ • config     │      │ • client.ts  │
│ • commands/  │      │ • database   │      │ • handler.ts │
│   - verify   │      │ • gexp       │      │ • commands/  │
│   - ban      │      │ • rolesync   │      │   - bw, sw,  │
│   - send     │      │ • hypixel    │      │     duels,   │
│   - perms    │      │ • urchin     │      │     gexp,    │
│   - status   │      │ • luna       │      │     daily,   │
│   - leaderb. │      │ • canvas     │      │     weekly,  │
│   - rolesync │      │ • messaging  │      │     monthly, │
│   - admin    │      │ • cache      │      │     bb, etc. │
└──────────────┘      │ • historical │      └──────────────┘
                      │ • permissions│
                      └──────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │ Per-bot data dir         │
                │ src/dataN/ (JSON files)  │
                │ • links, blacklist,      │
                │   gexp, verifications    │
                └──────────────────────────┘
```

### Module responsibilities

- **`src/minecraft/client.ts`** — Mineflayer wrapper. Manages login, watchdog, reconnect backoff, message parsing into typed events (`guildChat`, `officerChat`, `dm`, `system`, `blacklistJoined`, etc.).
- **`src/minecraft/handler.ts`** — Routes in-game `!` commands to the matching command handler.
- **`src/discord/client.ts`** — Discord.js client. Registers slash commands per-guild, wires up the two-way bridge, and renders MC messages to PNGs via canvas before posting.
- **`src/utils/config.ts`** — Loads the YAML config indicated by the `CONFIG` env var (set per-bot by PM2).
- **`src/utils/database.ts`** — lowdb stores: `LinkDB`, `BlacklistDB`, `GEXPDB`, etc. All paths derive from `DATA_DIR` so each PM2 instance gets isolated state.
- **`src/utils/gexp.ts`** — Polls Hypixel every 10 min to accumulate lifetime GEXP beyond the 7-day API window.
- **`src/utils/rolesync.ts`** — Every 5 min: pulls guild roster, syncs Discord roles + nicknames, runs auto-promote/demote against config requirements.
- **`src/utils/canvas.ts`** — Renders raw Minecraft color-coded text into a PNG buffer using a Minecraft TTF font.
- **`src/utils/hypixel.ts` / `urchin.ts` / `luna.ts`** — Thin API clients with shared player cache to minimize quota usage.

### Per-bot isolation
Each PM2 entry sets two env vars:
- `CONFIG` → which YAML file to load
- `DATA_DIR` → where JSON databases live

This means four bots can run side-by-side with totally independent verification, blacklist, and GEXP state - no shared mutation, no cross-talk.

---

## Goals

1. **Make a self-hosted alternative** to closed-source guild bots that gives guild owners full control over their data, moderation, and feature set.
2. **Look native, not bridged** - by rendering chat as Minecraft-styled images, the Discord side feels like an extension of the game rather than a tacked-on log.
3. **Stay resilient** - Hypixel disconnects, NCP false-positives, and Discord rate limits should all auto-recover without operator intervention.
4. **Scale horizontally on one host** - one config file = one new guild, no code changes required.
5. **Replace manual moderation work** - auto join-accepts (with blacklist gating), auto rank promotions, and role sync mean staff focus on humans, not paperwork.
6. **Be auditable and forkable** - clean module boundaries, typed events, no hidden state. Anyone should be able to read [src/](src/) and understand the whole system in an evening.

---

## Project Structure

```
GuildBot/
├── ecosystem.config.js      # PM2 multi-bot orchestration
├── config.example.yaml      # Documented config template
├── configN.yaml             # Per-bot configs (gitignored)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # Entrypoint
│   ├── discord/             # Discord client + slash commands
│   ├── minecraft/           # MC client + in-game commands
│   ├── utils/               # Config, DB, APIs, rendering, sync
│   └── dataN/               # Per-bot persistent state (JSON)
├── dist/                    # Compiled output (tsc)
└── fonts/                   # Minecraft TTF for canvas rendering
```

---

## License

ISC — see [package.json](package.json).
