import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getUUID } from '../../utils/hypixel';
import { getLunaHistorical } from '../../utils/luna';

export const dailyCommand: MinecraftCommand = {
    name: 'daily',
    description: 'View daily Bedwars stats',
    aliases: ['day', 'db', 'dailybw', 'dbw', 'dbws', 'dly', 'dailybws'],
    run: async (sender, targetIgn, args, uuid) => {
        const data = await getLunaHistorical(uuid!);
        if (!data || !data.daily) {
            mcClient.send(`/msg ${sender} No daily data available for ${targetIgn}.`);
            return;
        }

        const d = data.daily;
        const stars = d.current_stars.toFixed(0);
        const resp = `/msg ${sender} [${stars}✫] ${d.display_name} [DAILY]: +${d.stars_gained.toFixed(2)}✫ * Finals: ${d.final_kills} * FD: ${d.final_deaths} * FKDR: ${d.fkdr.toFixed(2)} * Wins: ${d.wins} * Losses: ${d.losses} * WLR: ${d.wlr.toFixed(2)} * KDR: ${d.kdr.toFixed(2)} * BBLR: ${d.bblr.toFixed(2)}`;
        mcClient.send(resp);
    }
};
