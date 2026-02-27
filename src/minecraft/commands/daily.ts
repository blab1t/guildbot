import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';
import { getUrchinHistorical } from '../../utils/urchin';

export const dailyCommand: MinecraftCommand = {
    name: 'daily',
    description: 'View daily Bedwars stats',
    aliases: ['day', 'db', 'dailybw', 'dbw', 'dbws', 'dly', 'dailybws'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;

        const data = await getUrchinHistorical(targetIGNProper);
        if (!data || !data.daily || !data.daily.data_available) {
            mcClient.send(`/msg ${sender} No daily data available for ${targetIGNProper}.`);
            return;
        }

        const s = data.daily;
        const resp = `/msg ${sender} [${player.achievements?.bedwars_level.toLocaleString()}✫] ${targetIGNProper} [DAILY]: +${data.daily.stars_gained.toFixed(2).toLocaleString()}✫ * Finals: ${data.daily.final_kills.toLocaleString()} * FD: ${data.daily.final_deaths.toLocaleString()} * FKDR: ${data.daily.fkdr.toFixed(2).toLocaleString()} * Wins: ${data.daily.wins.toLocaleString()} * Losses: ${data.daily.losses.toLocaleString()} * WLR: ${data.daily.wlr.toFixed(2).toLocaleString()} * KDR: ${data.daily.kdr.toFixed(2).toLocaleString()} * BBLR: ${data.daily.bblr.toFixed(2).toLocaleString()}`;
        mcClient.send(resp);
    }
};
