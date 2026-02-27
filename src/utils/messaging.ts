import { Client, User, MessageCollector } from 'discord.js';
import config from './config';

export function getStringSuffix(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    let length = Math.floor(Math.random() * (30 - 25 + 1)) + 25;
    let result = ' ';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function filterMessage(message: string): boolean {
    const banned = config.banned_words || [];
    const normalized = message.toLowerCase().replace(/\s/g, '');
    for (const word of banned) {
        if (normalized.includes(word.toLowerCase().replace(/\s/g, ''))) {
            return true;
        }
    }
    return false;
}

// Emoji/shortcut replacements for Discord → MC bridge
const emojiMap: [string, string][] = [
    ['<3', '❤'],
    [':star:', '✮'],
    [':yes:', '✔'],
    [':no:', '✖'],
    [':java:', '☕'],
    [':arrow:', '➜'],
    [':shrug:', '¯\\_(ツ)_/¯'],
    [':tableflip:', '(╯°□°）╯︵ ┻━┻'],
    ['o/', '( ﾟ◡ﾟ)/'],
    [':123:', '123'],
    [':totem:', '☉_☉'],
    [':typing:', '✎...'],
    [':maths:', '√(π+x)=L'],
    [':snail:', "@'-'"],
    [':thinking:', '(0.o?)'],
    [':gimme:', '༼つ◕_◕༽つ'],
    [':wizard:', "('-')⊃━☆ﾟ.*･｡ﾟ"],
    [':pvp:', '⚔'],
    [':peace:', '✌'],
    [':oof:', 'OOF'],
    ['h/', 'ヽ(^◇^*)/'],
    [':cute:', '(✿◠‿◠)'],
    [':dog:', '(ᵔᴥᵔ)'],
    [':sloth:', '(・⊝・)'],
    [':snow:', '☃'],
    [':dab:', '<o/'],
    [':dj:', 'ヽ(⌐■_■)ノ♬'],
    ['^_^', '^_^'],
    [':yey:', 'ヽ (◕◡◕) ﾉ'],
    ['^-^', '^-^'],
    [':cat:', '= ＾● ⋏ ●＾ ='],
];

export function replaceEmojis(message: string): string {
    let result = message;
    for (const [shortcut, replacement] of emojiMap) {
        // For :xxx: style shortcuts, also match backslash-escaped variants
        // e.g. \:cute:, :cute\:, \:cute\: should all still work
        if (shortcut.startsWith(':') && shortcut.endsWith(':')) {
            const inner = shortcut.slice(1, -1); // e.g. "cute"
            // Match all 4 variants: :cute:, \:cute:, :cute\:, \:cute\:
            const pattern = new RegExp(`\\\\?:${inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\\\?:`, 'g');
            result = result.replace(pattern, replacement);
        } else {
            result = result.split(shortcut).join(replacement);
        }
    }
    return result;
}

export async function sendDMAndWaitResponse(client: Client, userId: string, message: string, timeout: number = 60000): Promise<string | null> {
    try {
        const user = await client.users.fetch(userId);
        if (!user) return null;

        const dmChannel = await user.createDM();
        await dmChannel.send(message);

        const collector = dmChannel.createMessageCollector({
            filter: (m) => m.author.id === userId,
            time: timeout,
            max: 1
        });

        return new Promise((resolve) => {
            collector.on('collect', (m) => resolve(m.content));
            collector.on('end', (collected) => {
                if (collected.size === 0) resolve(null);
            });
        });
    } catch (e) {
        console.error(`Error sending DM to ${userId}:`, e);
        return null;
    }
}
