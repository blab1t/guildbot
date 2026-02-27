import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';
import { getUrchinHistorical } from '../../utils/urchin';

export const weeklyCommand: MinecraftCommand = {
    name: 'weekly',
    description: 'View weekly Bedwars stats',
    aliases: ['week', 'wb', 'weeklybw', 'wbw', 'wkly', 'wbws', 'weeklybws'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;

        const data = await getUrchinHistorical(targetIGNProper);
        if (!data || !data.weekly || !data.weekly.data_available) {
            mcClient.send(`/msg ${sender} No weekly data available for ${targetIGNProper}.`);
            return;
        }

        const s = data.weekly;
        const resp = `/msg ${sender} [${player.achievements?.bedwars_level.toLocaleString()}✫] ${targetIGNProper} [WEEKLY]: +${data.weekly.stars_gained.toFixed(2).toLocaleString()}✫ * Finals: ${data.weekly.final_kills.toLocaleString()} * FD: ${data.weekly.final_deaths.toLocaleString()} * FKDR: ${data.weekly.fkdr.toFixed(2).toLocaleString()} * Wins: ${data.weekly.wins.toLocaleString()} * Losses: ${data.weekly.losses.toLocaleString()} * WLR: ${data.weekly.wlr.toFixed(2).toLocaleString()} * KDR: ${data.weekly.kdr.toFixed(2).toLocaleString()} * BBLR: ${data.weekly.bblr.toFixed(2).toLocaleString()}`;
        mcClient.send(resp);
    }
};
