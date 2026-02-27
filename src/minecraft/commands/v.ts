import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';
import { getUrchinTags } from '../../utils/urchin';

export const vCommand: MinecraftCommand = {
    name: 'v',
    description: 'View Urchin tags/historical stats',
    aliases: ['urchin', 'blacklist', 'bl', 'view', 'tag', 'urch'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const targetIGNProper = player?.displayname || targetIgn;

        const data = await getUrchinTags(targetIGNProper);
        if (!data) {
            mcClient.send(`/msg ${sender} Could not fetch data from Urchin for ${targetIGNProper}.`);
            return;
        }

        if (!data.tags || data.tags.length === 0) {
            mcClient.send(`/msg ${sender} ${targetIGNProper} isn't tagged on urchin (this does not mean they are no cheating!)`);
            return;
        }

        const showAllInputs = ["true", "full", "long", "all", "everything", "yes"];
        const showAll = args.some(a => showAllInputs.includes(a.toLowerCase()));

        if (showAll) {
            for (const tag of data.tags) {
                const type = tag.type?.replace(/_/g, " ") || "Unknown";
                const reason = tag.reason || "";
                const fullText = `${targetIGNProper}: ${type}: ${reason}`;

                for (let i = 0; i < Math.ceil(fullText.length / 145); i++) {
                    const chunk = fullText.slice(i * 145, (i + 1) * 145);
                    mcClient.send(`/msg ${sender} ${chunk}`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        } else {
            const tag = data.tags[0];
            const type = tag.type?.replace(/_/g, " ") || "Unknown";
            const reason = tag.reason || "";
            const msg = `${targetIGNProper}: ${type}: ${reason}`.slice(0, 145);
            mcClient.send(`/msg ${sender} ${msg}`);
        }
    }
};
