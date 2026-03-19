import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer, getPlayerRank } from '../../utils/hypixel';
import { getGuild } from '../../utils/hypixel';

function getNetworkLevel(networkExp: number): number {
    return Math.floor((Math.sqrt(networkExp + 88209) - 297) / 2.5) + 1;
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
        const streak = player.rewardStreak || player.totalDailyLoginStreak || 0;
        const ranksGiven = player.ranksPurchased || player.PURCHASE_RANKS_GIVEN || 0;

        // Fetch guild name
        let guildName = 'None';
        try {
            const guild = await getGuild(ign);
            if (guild?.name) guildName = guild.name;
        } catch (_) { /* no guild */ }

        const displayRank = rank ? `${rank} ` : '';
        mcClient.send(`/msg ${sender} ${displayRank}${ign} | Lvl: ${level} | AP: ${ap} | Karma: ${karma} | Streak: ${streak} | Ranks Gifted: ${ranksGiven} | Guild: ${guildName}`);
    }
};
