import { GEXPDB } from './database';
import { getGuild } from './hypixel';
import { playerCache } from './cache';
import config from './config';

export async function trackLifetimeGEXP() {
    try {
        const guild = await getGuild(config.guild_name);
        if (!guild) return;

        const members = guild.members;
        for (const member of members) {
            const uuid = member.uuid.replace(/-/g, '');
            const history = (member.expHistory || {}) as { [key: string]: number };

            // Try to resolve IGN from cache (populated by role sync, no extra API call)
            const cachedPlayer = playerCache.getOldest(uuid);
            const ign: string | undefined = cachedPlayer?.displayname;

            // Get today's exp (last entry in the history object usually)
            const dates = Object.keys(history).sort();
            const todayKey = dates[dates.length - 1]; // most recent date
            const todayExp = history[todayKey] || 0;

            let stored = GEXPDB.get(uuid, { lifetime: 0, lastToday: 0, lastDate: '', ign: '' });

            // If we have no data at all, initialize lifetime with the current 7-day total
            // This gives the user immediate results rather than starting from 0.
            if (!stored.lastDate) {
                const weeklyTotal = Object.values(history).reduce((a: number, b: number) => a + b, 0);
                stored.lifetime = weeklyTotal;
                stored.lastToday = todayExp;
                stored.lastDate = todayKey;
            } else {
                // Determine delta
                if (todayKey !== stored.lastDate) {
                    stored.lifetime += todayExp;
                } else {
                    const delta = Math.max(0, todayExp - stored.lastToday);
                    stored.lifetime += delta;
                }
                stored.lastToday = todayExp;
                stored.lastDate = todayKey;
            }

            GEXPDB.set(uuid, {
                lifetime: stored.lifetime,
                lastToday: stored.lastToday,
                lastDate: stored.lastDate,
                lastUpdate: Date.now(),
                ign: ign || stored.ign || uuid // Keep best available name
            });
        }
        console.log(`Updated lifetime GEXP for ${members.length} members.`);
    } catch (e: any) {
        console.error('Error tracking GEXP:', e.message || e);
    }
}

export function startGEXPTracker() {
    setInterval(trackLifetimeGEXP, 10 * 60 * 1000); // 10 minutes
    trackLifetimeGEXP(); // Initial run
}
