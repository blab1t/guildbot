import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';
import { getUrchinHistorical } from '../../utils/urchin';

export const monthlyCommand: MinecraftCommand = {
    name: 'monthly',
    description: 'View monthly Bedwars stats',
    aliases: ['month', 'mb', 'monthlybw', 'mbw', 'mthly', 'monthlybws', 'mbws'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;

        const data = await getUrchinHistorical(targetIGNProper);
        if (!data || !data.monthly || !data.monthly.data_available) {
            mcClient.send(`/msg ${sender} No monthly data available for ${targetIGNProper}.`);
            return;
        }

        const s = data.monthly;
        const resp = `/msg ${sender} [${player.achievements?.bedwars_level.toLocaleString()}✫] ${targetIGNProper} [MONTHLY]: +${data.monthly.stars_gained.toFixed(2).toLocaleString()}✫ * Finals: ${data.monthly.final_kills.toLocaleString()} * FD: ${data.monthly.final_deaths.toLocaleString()} * FKDR: ${data.monthly.fkdr.toFixed(2).toLocaleString()} * Wins: ${data.monthly.wins.toLocaleString()} * Losses: ${data.monthly.losses.toLocaleString()} * WLR: ${data.monthly.wlr.toFixed(2).toLocaleString()} * KDR: ${data.monthly.kdr.toFixed(2).toLocaleString()} * BBLR: ${data.monthly.bblr.toFixed(2).toLocaleString()}`;
        mcClient.send(resp);
    }
};
