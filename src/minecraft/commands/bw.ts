import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer, getBedwarsLevel } from '../../utils/hypixel';

// Mode mapping → Hypixel stat prefixes
const MODE_PREFIXES: Record<string, string> = {
    overall: "",
    all: "",
    solo: "eight_one_",
    solos: "eight_one_",
    "1s": "eight_one_",
    doubles: "eight_two_",
    double: "eight_two_",
    "2s": "eight_two_",
    threes: "four_three_",
    three: "four_three_",
    "3s": "four_three_",
    fours: "four_four_",
    four: "four_four_",
    "4s": "four_four_",
    "4v4": "two_four_",
    fourvfour: "two_four_",
};

// Safe ratio calculation — prevents Infinity/NaN
function safeRatio(numerator: number, denominator: number): string {
    if (denominator === 0) return numerator.toLocaleString();
    return (numerator / (denominator || 1)).toFixed(2);
}

export const bwCommand: MinecraftCommand = {
    name: 'bw',
    description: 'View Bedwars stats',
    aliases: ['bedwars', 'bws'],
    run: async (sender, targetIgn, args, uuid) => {
        let mode = "overall";

        // Find the mode in arguments
        // It could be the first arg (!bw solo) or second arg (!bw player solo)
        for (const arg of args) {
            const lowArg = arg?.toLowerCase();
            if (MODE_PREFIXES[lowArg]) {
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
        const bw = player.stats?.Bedwars || {};
        const prefix = MODE_PREFIXES[mode];

        const bwStar = player.achievements?.bedwars_level || 0;

        const finals = bw[`${prefix}final_kills_bedwars`] || 0;
        const finalDeaths = bw[`${prefix}final_deaths_bedwars`] || 0;
        const fkdr = safeRatio(finals, finalDeaths);

        const wins = bw[`${prefix}wins_bedwars`] || 0;
        const losses = bw[`${prefix}losses_bedwars`] || 0;
        const wlr = safeRatio(wins, losses);

        const kills = bw[`${prefix}kills_bedwars`] || 0;
        const deaths = bw[`${prefix}deaths_bedwars`] || 0;
        const kdr = safeRatio(kills, deaths);

        const bedsBroken = bw[`${prefix}beds_broken_bedwars`] || 0;
        const bedsLost = bw[`${prefix}beds_lost_bedwars`] || 0;
        const bblr = safeRatio(bedsBroken, bedsLost);

        const modeDisplay = mode === "overall" ? "" : ` [${mode.toUpperCase()}]`;
        const resp = `/msg ${sender} [${bwStar.toLocaleString()}✫] ${targetIGNProper}${modeDisplay}: Finals: ${finals.toLocaleString()} * FD: ${finalDeaths.toLocaleString()} * FKDR: ${fkdr} * Wins: ${wins.toLocaleString()} * Losses: ${losses.toLocaleString()} * WLR: ${wlr} * KDR: ${kdr} * BBLR: ${bblr}`;
        mcClient.send(resp);
    }
};
