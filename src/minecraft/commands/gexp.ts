import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer, getGuild } from '../../utils/hypixel';
import config from '../../utils/config';

export const gexpCommand: MinecraftCommand = {
    name: 'gexp',
    aliases: ['weeklygxp', 'weeklygexp', 'wgxp', 'weeklygexp', 'wgexp', 'gxp'],
    description: 'View weekly GEXP',
    run: async (sender, targetIgn, args, uuid) => {
        const guild = await getGuild(config.guild_name);
        if (!guild) {
            mcClient.send(`/msg ${sender} Could not fetch guild data.`);
            return;
        }
        const member = guild.members?.find((m: any) => m.uuid.replace(/-/g, '') === uuid);
        if (!member) {
            mcClient.send(`/msg ${sender} Player not in guild.`);
            return;
        }
        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;

        const weekly = Object.values(member.expHistory as { [key: string]: number }).reduce((a, b) => a + b, 0);
        const membersWithExps = guild.members.map((m: any) => {
            const exp = m.expHistory ? Object.values(m.expHistory as { [key: string]: number }).reduce((a, b) => a + b, 0) : 0;
            return { uuid: m.uuid.replace(/-/g, ''), exp };
        });
        membersWithExps.sort((av: any, bv: any) => bv.exp - av.exp);
        const pos = membersWithExps.findIndex((m: any) => m.uuid === uuid) + 1;

        let secondSentence = "";
        const weeklyReq = config.requirements.weekly_gexp;
        const rankReq = config.requirements.rank_gexp;
        const rankName = config.requirements.weekly_rank_name;

        if (weekly < weeklyReq) {
            const diff = weeklyReq - weekly;
            const percent = ((weekly / weeklyReq) * 100).toFixed(1);
            secondSentence = ` They are ${diff.toLocaleString()} (${percent}%) away from the ${weeklyReq.toLocaleString()} WEEKLY GEXP requirement!`;
        } else if (weekly < rankReq) {
            const diff = rankReq - weekly;
            const percent = ((weekly / rankReq) * 100).toFixed(1);
            secondSentence = ` They are ${diff.toLocaleString()} (${percent}%) away from the ${rankReq.toLocaleString()} ${rankName} GEXP requirement!`;
        }

        mcClient.send(`/msg ${sender} ${targetIGNProper} has ${weekly.toLocaleString()} weekly GEXP (#${pos} in the guild).${secondSentence}`);
    }
};
