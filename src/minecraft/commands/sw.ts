import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';

const MODE_SUFFIXES: Record<string, string> = {
    overall: "",
    all: "",
    solo: "_solo",
    solos: "_solo",
    "1s": "_solo",
    doubles: "_team",
    double: "_team",
    "2s": "_team",
    mini: "_mini",
    minis: "_mini",
    // "3s": "four_three_",
    // mega: "four_four_",
    // megas: "four_four_",
    // "4s": "four_four_",
    // ranked: "_ranked",
    // fourvfour: "two_four_",
};

function safeRatio(numerator: number, denominator: number): string {
    if (denominator === 0) return numerator.toLocaleString();
    return (numerator / (denominator || 1)).toFixed(2);
}

export const swCommand: MinecraftCommand = {
    name: 'sw',
    description: 'View SkyWars stats',
    aliases: ['skywars', 'sws'],
    run: async (sender, targetIgn, args, uuid) => {
        let mode = "overall";

        for (const arg of args) {
            const lowArg = arg?.toLowerCase();
            if (MODE_SUFFIXES[lowArg]) {
                mode = lowArg;
                break;
            }
        }

        const player = await getPlayer(uuid!);
        if (!player) {
            mcClient.send(`/msg ${sender} Could not find Hypixel data for ${targetIgn}.`);
            return;
        }
        const targetIGNProper = player.displayname || targetIgn;
        const stats = player.stats?.SkyWars || {};
        const suffix = MODE_SUFFIXES[mode];

        const level = player.achievements?.skywars_you_re_a_star || 0;

        const wins = stats[`wins${suffix}`] || 0;
        const losses = stats[`losses${suffix}`] || 1;
        const wlr = safeRatio(wins, losses);

        const kills = stats[`kills${suffix}`] || 0;
        const deaths = stats[`deaths${suffix}`] || 1;
        const kdr = safeRatio(kills, deaths);

        const heads = stats[`heads${suffix}`] || 0;
        const assists = stats[`assists${suffix}`] || 0;

        const modeDisplay = mode === "overall" ? "" : ` [${mode.toUpperCase()}]`;
        const resp = `/msg ${sender} [${level}✯] ${targetIGNProper}${modeDisplay}: Wins: ${wins} * Losses: ${losses} * WLR: ${wlr} * Kills: ${kills} * Deaths: ${deaths} * KDR: ${kdr} * Heads: ${heads} * Assists: ${assists}`;
        mcClient.send(resp);
    }
};
