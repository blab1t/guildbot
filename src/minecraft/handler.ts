import { mcClient } from './client';
import { getUUID } from '../utils/hypixel';
import { commands } from './commands';
import config from '../utils/config';

// --- Guild Chat commands ---
mcClient.on('guildChat', async (data) => {
    const message = data.message;
    console.log(`[HANDLER DEBUG] Processing Guild Chat: ${message}`);
    const colonIndex = message.indexOf(':');
    if (colonIndex === -1) return;

    const content = message.substring(colonIndex + 1).trim();
    if (!content.startsWith('!')) return;

    const args = content.split(' ');
    const commandName = args[0].substring(1).toLowerCase();

    // extract sender
    const meta = message.substring(message.indexOf('>') + 1, colonIndex).trim();
    const metaParts = meta.split(' ');
    const sender = metaParts.find((p: string) => !p.startsWith('[')) || metaParts[0];

    handleCommand(commandName, args.slice(1), sender, 'guild');
});

// --- Officer Chat commands ---
mcClient.on('officerChat', async (data) => {
    const message = data.message;
    console.log(`[HANDLER DEBUG] Processing Officer Chat: ${message}`);
    const colonIndex = message.indexOf(':');
    if (colonIndex === -1) return;

    const content = message.substring(colonIndex + 1).trim();
    if (!content.startsWith('!')) return;

    const args = content.split(' ');
    const commandName = args[0].substring(1).toLowerCase();

    // extract sender: "Officer > [RANK] Name [GuildRank]: message"
    const meta = message.substring(message.indexOf('>') + 1, colonIndex).trim();
    const metaParts = meta.split(' ');
    const sender = metaParts.find((p: string) => !p.startsWith('[')) || metaParts[0];

    handleCommand(commandName, args.slice(1), sender, 'officer');
});

// --- DM commands ---
mcClient.on('dm', async (data) => {
    const message = data.message;
    console.log(`[HANDLER DEBUG] Processing DM: ${message}`);

    // Format: "From [RANK] PlayerName: message"
    const fromMatch = message.match(/From\s+(?:\[.+?\]\s+)?(\w+):\s*(.*)/);
    if (!fromMatch) return;

    const sender = fromMatch[1];
    const content = fromMatch[2].trim();

    if (!content.startsWith('!')) return;

    const args = content.split(' ');
    const commandName = args[0].substring(1).toLowerCase();

    handleCommand(commandName, args.slice(1), sender, 'dm');
});

type ReplyMode = 'guild' | 'officer' | 'dm';

async function handleCommand(cmdName: string, args: string[], sender: string, mode: ReplyMode) {
    console.log(`[HANDLER DEBUG] Command: !${cmdName}, Args: [${args.join(', ')}], Sender: ${sender}, Mode: ${mode}`);

    // Helper to send reply in the right channel
    const reply = (msg: string) => {
        switch (mode) {
            case 'guild':
                mcClient.send(`/msg ${sender} ${msg}`);
                break;
            case 'officer':
                mcClient.send(`/msg ${sender} ${msg}`);
                break;
            case 'dm':
                mcClient.send(`/msg ${sender} ${msg}`);
                break;
        }
    };

    try {
        let actualCmd = commands.find(c => c.name === cmdName || c.aliases?.includes(cmdName));

        if (!actualCmd) return;

        // The help command doesn't need a UUID lookup
        if (actualCmd.name === 'help') {
            await actualCmd.run(sender, "", args);
            return;
        }

        let targetIgn = args[0] || sender;
        const duelsModes = ['overall', 'all', 'sumo', 'combo', 'uhc', 'bridge', 'classic', 'op', 'boxing', 'bow', 'nodebuff', 'megawalls', 'skywars', 'bedwars', 'blitz', 'bowspleef', 'parkour', 'spleef', 'quake', 'bedrush'];
        const bwModes = ['overall', 'all', 'solo', 'solos', '1s', 'doubles', 'double', '2s', 'threes', 'three', '3s', 'fours', 'four', '4s', '4v4', 'fourvfour'];
        const skywarsModes = ['overall', 'all', 'solo', 'solos', '1s', 'doubles', 'double', '2s', 'mini', 'minis'];

        // Specialized target logic for duels
        if ((actualCmd.name === 'duels' || actualCmd.name === 'historical') && duelsModes.includes(args[0]?.toLowerCase())) {
            targetIgn = args[1] || sender;
        }
        // Specialized target logic for bedwars
        if (actualCmd.name === 'bw' && bwModes.includes(args[0]?.toLowerCase())) {
            targetIgn = sender;
        }

        if (actualCmd.name === 'sw' && skywarsModes.includes(args[0]?.toLowerCase())) {
            targetIgn = sender;
        }

        const uuid = await getUUID(targetIgn);
        if (!uuid) {
            reply('Player not found.');
            return;
        }

        await actualCmd.run(sender, targetIgn, args, uuid);

    } catch (e: any) {
        if (e.response?.status === 429) {
            reply('Hypixel API rate limit reached! Please try again in a few seconds.');
        }
        console.error(`[HANDLER ERROR] Error in !${cmdName}:`, e);
    }
}
