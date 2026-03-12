import axios from 'axios';
import config from './config';
import { getBedwarsLevel } from './hypixel';

const LUNA_KEY = config.lunaaaa_key;

interface BedwarsStats {
    beds_broken: number;
    beds_lost: number;
    deaths: number;
    final_deaths: number;
    final_kills: number;
    kills: number;
    losses: number;
    wins: number;
    games_played?: number;
}

interface LunaSnapshot {
    bedwars: {
        overall: BedwarsStats;
        modes: Record<string, BedwarsStats>;
    };
    bedwars_level: number;
    display_name: string;
    rank: string;
    timestamp: number;
    timestamp_formatted: string;
}

export interface HistoricalDiff {
    display_name: string;
    rank: string;
    current_stars: number;
    stars_gained: number;
    final_kills: number;
    final_deaths: number;
    fkdr: number;
    wins: number;
    losses: number;
    wlr: number;
    kills: number;
    deaths: number;
    kdr: number;
    beds_broken: number;
    beds_lost: number;
    bblr: number;
    games_played: number;
    data_available: boolean;
}

/**
 * Fetch all snapshots for a player from the Luna API
 */
async function getLunaSnapshots(uuid: string): Promise<LunaSnapshot[] | null> {
    if (!LUNA_KEY) return null;
    try {
        // Format UUID with dashes: 73f00528-b2ea-4b93-a38f-96e7240460b3
        const trimmed = uuid.replace(/-/g, '');
        const formatted = `${trimmed.slice(0,8)}-${trimmed.slice(8,12)}-${trimmed.slice(12,16)}-${trimmed.slice(16,20)}-${trimmed.slice(20)}`;
        const response = await axios.get(`https://lunaaaa.net/api/v2/history/${formatted}?key=${LUNA_KEY}`, { timeout: 8000 });
        return response.data?.snapshots || null;
    } catch (e: any) {
        console.error(`[Luna] Failed to fetch history for ${uuid}: ${e.message}`);
        return null;
    }
}

/**
 * Compute the diff between the newest snapshot and a reference snapshot
 */
function computeDiff(newest: LunaSnapshot, oldest: LunaSnapshot): HistoricalDiff {
    const now = newest.bedwars.overall;
    const then = oldest.bedwars.overall;

    const finalKills = now.final_kills - then.final_kills;
    const finalDeaths = now.final_deaths - then.final_deaths;
    const wins = now.wins - then.wins;
    const losses = now.losses - then.losses;
    const kills = now.kills - then.kills;
    const deaths = now.deaths - then.deaths;
    const bedsBroken = now.beds_broken - then.beds_broken;
    const bedsLost = now.beds_lost - then.beds_lost;
    const gamesPlayed = (now.games_played || 0) - (then.games_played || 0);

    const starsNow = getBedwarsLevel(newest.bedwars_level);
    const starsThen = getBedwarsLevel(oldest.bedwars_level);

    return {
        display_name: newest.display_name,
        rank: newest.rank,
        current_stars: starsNow,
        stars_gained: starsNow - starsThen,
        final_kills: finalKills,
        final_deaths: finalDeaths,
        fkdr: finalDeaths > 0 ? finalKills / finalDeaths : finalKills,
        wins,
        losses,
        wlr: losses > 0 ? wins / losses : wins,
        kills,
        deaths,
        kdr: deaths > 0 ? kills / deaths : kills,
        beds_broken: bedsBroken,
        beds_lost: bedsLost,
        bblr: bedsLost > 0 ? bedsBroken / bedsLost : bedsBroken,
        games_played: gamesPlayed,
        data_available: true,
    };
}

/**
 * Find the snapshot closest to a given time ago from now.
 * Snapshots are assumed to be sorted newest-first.
 */
function findSnapshotAtAge(snapshots: LunaSnapshot[], ageMs: number): LunaSnapshot | null {
    const targetTime = (Date.now() / 1000) - (ageMs / 1000);
    let closest: LunaSnapshot | null = null;
    let closestDist = Infinity;

    for (const snap of snapshots) {
        const dist = Math.abs(snap.timestamp - targetTime);
        if (dist < closestDist) {
            closestDist = dist;
            closest = snap;
        }
    }

    // Only return if the closest snapshot is within 25% of the target age (grace window)
    // e.g. for daily (24h), allow up to 30h old snapshot
    const graceMs = ageMs * 0.25;
    if (closest && closestDist < graceMs / 1000) {
        return closest;
    }

    // Fallback: return the oldest snapshot we have
    return snapshots[snapshots.length - 1] || null;
}

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;

/**
 * Get historical BedWars stats for a player.
 * Returns daily, weekly, and monthly diffs.
 */
export async function getLunaHistorical(uuid: string): Promise<{
    daily: HistoricalDiff | null;
    weekly: HistoricalDiff | null;
    monthly: HistoricalDiff | null;
} | null> {
    const snapshots = await getLunaSnapshots(uuid);
    if (!snapshots || snapshots.length < 2) return null;

    const newest = snapshots[0];

    const dailyRef = findSnapshotAtAge(snapshots, ONE_DAY);
    const weeklyRef = findSnapshotAtAge(snapshots, ONE_WEEK);
    const monthlyRef = findSnapshotAtAge(snapshots, ONE_MONTH);

    return {
        daily: dailyRef && dailyRef !== newest ? computeDiff(newest, dailyRef) : null,
        weekly: weeklyRef && weeklyRef !== newest ? computeDiff(newest, weeklyRef) : null,
        monthly: monthlyRef && monthlyRef !== newest ? computeDiff(newest, monthlyRef) : null,
    };
}
