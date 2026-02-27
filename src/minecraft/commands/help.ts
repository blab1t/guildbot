import { MinecraftCommand } from './types';
import { mcClient } from '../client';

export const helpCommand: MinecraftCommand = {
    name: 'help',
    description: 'View available commands',
    run: async (sender, targetIgn, args, uuid) => {
        const helpArg = args[0]?.toLowerCase();
        if (helpArg === 'bw') {
            mcClient.send(`/msg ${sender} [HELP] !bw [ign] - View Bedwars stats. Modes: overall, 1s, 2s, 3s, 4s, 4v4.`);
        } else if (helpArg === 'sw') {
            mcClient.send(`/msg ${sender} [HELP] !sw [ign] - View SkyWars stats. Modes: overall, solo, doubles, mini.`);
        } else if (helpArg === 'duels') {
            mcClient.send(`/msg ${sender} [HELP] !duels [mode] [ign] - Modes: /help duelsmodes`);
        } else if (helpArg === 'gexp') {
            mcClient.send(`/msg ${sender} [HELP] !gexp [ign] - View weekly GEXP.`);
        } else if (helpArg === 'daily' || helpArg === 'weekly' || helpArg === 'monthly') {
            mcClient.send(`/msg ${sender} [HELP] !${helpArg} [ign] - View ${helpArg} Bedwars stats.`);
        } else if (helpArg === 'v') {
            mcClient.send(`/msg ${sender} [HELP] !v [ign] [all] - View Urchin tags. 'all' option shows all tags in full length (use at your own risk).`);
        } else if (helpArg === 'duelsmodes') {
            mcClient.send(`/msg ${sender} [HELP] Duels Modes: overall, sumo, bridge, bridge_1v1, bridge_2v2, bridge_3v3, bridge_4v4, bridge_doubles, bridge_threes, bridge_ctf, classic, classic_doubles, uhc, uhc_doubles, uhc_teams,`);
            await new Promise(r => setTimeout(r, 1000));
            mcClient.send(`/msg ${sender} [HELP] Duels Modes: op, op_doubles, combo, boxing, bow, nodebuff, megawalls, megawalls_doubles, skywars, skywars_doubles, blitz, bedwars, bowspleef, parkour, spleef, quake, bedrush.`);
        } else {
            mcClient.send(`/msg ${sender} Available: !bw, !sw, !duels, !gexp, !lgxp, !v, !daily, !weekly, !monthly. Try !help <cmd>`);
        }
    }
};
