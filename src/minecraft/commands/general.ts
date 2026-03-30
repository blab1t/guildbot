import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer, getPlayerRank, getGuildByPlayer } from '../../utils/hypixel';

const BASE = 10_000;
const GROWTH = 2_500;
const REVERSE_PQ_PREFIX = -(BASE - 0.5 * GROWTH) / GROWTH;
const REVERSE_CONST = REVERSE_PQ_PREFIX * REVERSE_PQ_PREFIX;
const GROWTH_DIVIDES_2 = 2 / GROWTH;

function getNetworkLevel(exp: number): number {
    return exp < 0 ? 1 : Math.floor(1 + REVERSE_PQ_PREFIX + Math.sqrt(REVERSE_CONST + GROWTH_DIVIDES_2 * exp));
}

export const generalCommand: MinecraftCommand = {
    name: 'general',
    description: 'View general Hypixel stats for a player',
    aliases: ['overall', 'hypixel', 'hpxl', 'hyp', 'net', 'network'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const ign = player?.displayname || targetIgn;

        if (!player) {
            mcClient.send(`/msg ${sender} Player ${targetIgn} not found.`);
            return;
        }

        const rank = getPlayerRank(player);
        const level = getNetworkLevel(player.networkExp || 0);
        const ap = (player.achievementPoints || 0).toLocaleString();
        const karma = (player.karma || 0).toLocaleString();
        const streak = player.rewardScore || player.rewardStreak || player.totalDailyLoginStreak || 0;
        const ranksGiven = player.giftingMeta?.ranksGiven || player.ranksPurchased || player.PURCHASE_RANKS_GIVEN || 0;

        // Fetch guild name by UUID
        let guildName = 'None';
        try {
            const guild = await getGuildByPlayer(uuid!);
            if (guild?.name) guildName = guild.name;
        } catch (_) { /* no guild */ }

        const displayRank = rank ? `${rank} ` : '';
        mcClient.send(`/msg ${sender} ${displayRank}${ign} | Lvl: ${level} | AP: ${ap} | Karma: ${karma} | Streak: ${streak} | Ranks Gifted: ${ranksGiven} | Guild: ${guildName}`);
    }
};
