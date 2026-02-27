import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer, getGuild } from '../../utils/hypixel';
import { GEXPDB } from '../../utils/database';
import config from '../../utils/config';

export const lgxpCommand: MinecraftCommand = {
    name: 'lgxp',
    aliases: ['lifetimegxp', 'lgexp', 'lifetimegexp', 'ltgxp'],
    description: 'View lifetime GEXP',
    run: async (sender, targetIgn, args, uuid) => {
        const guild = await getGuild(config.guild_name);
        if (!guild) {
            mcClient.send(`/msg ${sender} Could not fetch guild data.`);
            return;
        }

        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;
        const bwStar = player?.achievements?.bedwars_level || 0;

        const stored = GEXPDB.get(uuid!, { lifetime: 0 });
        const lifetime = (stored as any).lifetime || 0;

        // Rank only current guild members
        const guildMemberUuids = (guild.members || []).map((m: any) => m.uuid.replace(/-/g, ''));
        const membersWithExps = Object.entries(GEXPDB.all())
            .filter(([k]) => guildMemberUuids.includes(k))
            .map(([k, v]) => ({ uuid: k, lifetime: (v as any).lifetime || 0 }));

        membersWithExps.sort((a, b) => b.lifetime - a.lifetime);
        const pos = membersWithExps.findIndex(m => m.uuid === uuid) + 1;

        let secondSentence = "";
        const ltReq = config.requirements.lifetime_gexp_req;
        const ltRank = config.requirements.lifetime_rank_name;

        if (lifetime < ltReq) {
            const diff = ltReq - lifetime;
            const percent = ((lifetime / ltReq) * 100).toFixed(2);
            secondSentence = ` They are ${diff.toLocaleString()} (${(100 - Number(percent)).toFixed(2)}%) away from the ${ltReq.toLocaleString()} ${ltRank} GEXP requirement!`;
        }

        mcClient.send(`/msg ${sender} [${bwStar.toLocaleString()}✫] ${targetIGNProper} has a total of ${lifetime.toLocaleString()} lifetime GEXP (#${pos} in the guild).${secondSentence}`);
    }
};
