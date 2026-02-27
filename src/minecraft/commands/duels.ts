import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';

// Division Thresholds (x1 for individual modes)
const NORMAL_DIVISIONS = [
    { name: "Ascended", wins: 100000 },
    { name: "Divine", wins: 50000 },
    { name: "Celestial", wins: 25000 },
    { name: "Godlike", wins: 10000 },
    { name: "Grandmaster", wins: 5000 },
    { name: "Legend", wins: 2000 },
    { name: "Master", wins: 1000 },
    { name: "Diamond", wins: 500 },
    { name: "Gold", wins: 250 },
    { name: "Iron", wins: 100 },
    { name: "Rookie", wins: 50 },
];

// Division Thresholds (x2 for OVERALL)
const OVERALL_DIVISIONS = [
    { name: "Ascended", wins: 200000 },
    { name: "Divine", wins: 100000 },
    { name: "Celestial", wins: 50000 },
    { name: "Godlike", wins: 20000 },
    { name: "Grandmaster", wins: 10000 },
    { name: "Legend", wins: 4000 },
    { name: "Master", wins: 2000 },
    { name: "Diamond", wins: 1000 },
    { name: "Gold", wins: 500 },
    { name: "Iron", wins: 200 },
    { name: "Rookie", wins: 100 },
];

function getDivisionTitle(wins: number, mode: string): string {
    const divisions = mode === "overall" ? OVERALL_DIVISIONS : NORMAL_DIVISIONS;
    for (const div of divisions) {
        if (wins >= div.wins) return div.name;
    }
    return "Unranked";
}

// Hypixel API field mapping
const MODE_MAPPING: Record<string, { wins: string; losses: string; kills: string; deaths: string; display: string }> = {
    overall: { wins: "wins", losses: "losses", kills: "kills", deaths: "deaths", display: "Overall" },
    sumo: { wins: "sumo_duel_wins", losses: "sumo_duel_losses", kills: "sumo_duel_kills", deaths: "sumo_duel_deaths", display: "Sumo" },
    combo: { wins: "combo_duel_wins", losses: "combo_duel_losses", kills: "combo_duel_kills", deaths: "combo_duel_deaths", display: "Combo" },
    uhc: { wins: "uhc_duel_wins", losses: "uhc_duel_losses", kills: "uhc_duel_kills", deaths: "uhc_duel_deaths", display: "UHC" },
    uhc_doubles: { wins: "uhc_doubles_wins", losses: "uhc_doubles_losses", kills: "uhc_doubles_kills", deaths: "uhc_doubles_deaths", display: "UHC Doubles" },
    uhc_teams: { wins: "uhc_four_wins", losses: "uhc_four_losses", kills: "uhc_four_kills", deaths: "uhc_four_deaths", display: "UHC Teams" },
    // uhc_deathmatch: { wins: "uhc_deathmatch_duel_wins", losses: "uhc_deathmatch_duel_losses", kills: "uhc_deathmatch_duel_kills", deaths: "uhc_deathmatch_duel_deaths", display: "UHC Deathmatch" },
    bridge: { wins: "bridge_duel_wins", losses: "bridge_duel_losses", kills: "bridge_kills", deaths: "bridge_deaths", display: "Bridge" },
    bridge_1v1: { wins: "bridge_duel_wins", losses: "bridge_duel_losses", kills: "bridge_duel_bridge_kills", deaths: "bridge_duel_bridge_deaths", display: "Bridge 1v1" },
    bridge_2v2: { wins: "bridge_doubles_wins", losses: "bridge_doubles_losses", kills: "bridge_doubles_bridge_kills", deaths: "bridge_doubles_bridge_deaths", display: "Bridge 2v2" },
    bridge_3v3: { wins: "bridge_threes_wins", losses: "bridge_threes_losses", kills: "bridge_threes_bridge_kills", deaths: "bridge_threes_bridge_deaths", display: "Bridge 3v3" },
    bridge_4v4: { wins: "bridge_four_wins", losses: "bridge_four_losses", kills: "bridge_four_bridge_kills", deaths: "bridge_four_bridge_deaths", display: "Bridge 4v4" },
    bridge_doubles: { wins: "bridge_2v2v2v2_wins", losses: "bridge_2v2v2v2_losses", kills: "bridge_2v2v2v2_bridge_kills", deaths: "bridge_2v2v2v2_bridge_deaths", display: "Bridge Doubles" },
    bridge_threes: { wins: "bridge_3v3v3v3_wins", losses: "bridge_3v3v3v3_losses", kills: "bridge_3v3v3v3_bridge_kills", deaths: "bridge_3v3v3v3_bridge_deaths", display: "BridgeTriples" },
    bridge_ctf: { wins: "wins_capturetheflag", losses: "losses_capturetheflag", kills: "kills_capturetheflag", deaths: "deaths_capturetheflag", display: "BridgeCTF" },
    classic: { wins: "classic_duel_wins", losses: "classic_duel_losses", kills: "classic_duel_kills", deaths: "classic_duel_deaths", display: "Classic" },
    classic_doubles: { wins: "classic_doubles_wins", losses: "classic_doubles_losses", kills: "classic_doubles_kills", deaths: "classic_doubles_deaths", display: "ClassicDoubles" },
    op: { wins: "op_duel_wins", losses: "op_duel_losses", kills: "op_duel_kills", deaths: "op_duel_deaths", display: "OP" },
    op_doubles: { wins: "op_doubles_wins", losses: "op_doubles_losses", kills: "op_doubles_kills", deaths: "op_doubles_deaths", display: "OPDoubles" },
    boxing: { wins: "boxing_duel_wins", losses: "boxing_duel_losses", kills: "", deaths: "", display: "Boxing" },
    bow: { wins: "bow_duel_wins", losses: "bow_duel_losses", kills: "bow_duel_kills", deaths: "bow_duel_deaths", display: "Bow" },
    nodebuff: { wins: "potion_duel_wins", losses: "potion_duel_losses", kills: "potion_duel_kills", deaths: "potion_duel_deaths", display: "NoDebuff" },
    megawalls: { wins: "mw_duel_wins", losses: "mw_duel_losses", kills: "mw_duel_kills", deaths: "mw_duel_deaths", display: "MegaWalls" },
    megawalls_doubles: { wins: "mw_doubles_wins", losses: "mw_doubles_losses", kills: "mw_doubles_kills", deaths: "mw_doubles_deaths", display: "MegaWalls Doubles" },
    skywars: { wins: "sw_duel_wins", losses: "sw_duel_losses", kills: "sw_duel_kills", deaths: "sw_duel_deaths", display: "SkyWars" },
    // skywars_solo: { wins: "sw_solo_wins", losses: "sw_solo_losses", kills: "sw_solo_kills", deaths: "sw_solo_deaths", display: "SkyWars Solo" },
    skywars_doubles: { wins: "sw_doubles_wins", losses: "sw_doubles_losses", kills: "sw_doubles_kills", deaths: "sw_doubles_deaths", display: "SkyWars Doubles" },
    bedrush: { wins: "bedwars_two_one_duels_wins", losses: "bedwars_two_one_duels_losses", kills: "bedwars_two_one_duels_kills", deaths: "bedwars_two_one_duels_deaths", display: "Bedwars" },
    blitz: { wins: "blitz_duel_wins", losses: "blitz_duel_losses", kills: "blitz_duel_kills", deaths: "blitz_duel_deaths", display: "Blitz" },
    bowspleef: { wins: "bowspleef_duel_wins", losses: "bowspleef_duel_losses", kills: "bowspleef_duel_kills", deaths: "bowspleef_duel_deaths", display: "BowSpleef" },
    parkour: { wins: "parkour_eight_wins", losses: "parkour_eight_losses", kills: "", deaths: "", display: "Parkour" },
    spleef: { wins: "spleef_duel_wins", losses: "spleef_duel_losses", kills: "spleef_duel_kills", deaths: "spleef_duel_deaths", display: "Spleef" },
    quake: { wins: "quake_duel_wins", losses: "quake_duel_losses", kills: "quake_duel_kills", deaths: "quake_duel_deaths", display: "Quake" },
    bedwars: { wins: "bedwars_two_one_duels_rush_wins", losses: "bedwars_two_one_duels_rush_losses", kills: "bedwars_two_one_duels_rush_kills", deaths: "bedwars_two_one_duels_rush_deaths", display: "Bedrush" },
};

export const duelsCommand: MinecraftCommand = {
    name: 'duels',
    description: 'View Duels stats',
    aliases: ['duel'],
    run: async (sender, targetIgn, args, uuid) => {
        let mode = "overall";

        // Find the mode in arguments
        for (const arg of args) {
            const lowArg = arg?.toLowerCase();
            if (MODE_MAPPING[lowArg]) {
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
        const duels = player.stats?.Duels || {};

        const mapping = MODE_MAPPING[mode];
        const wins = duels[mapping.wins] || 0;
        const losses = duels[mapping.losses] || 0;
        const kills = duels[mapping.kills] || 0;
        const deaths = duels[mapping.deaths] || 0;

        const wlr = losses > 0 ? (wins / losses).toFixed(2) : (wins > 0 ? wins : "0.00");
        const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : (kills > 0 ? kills : "0.00");

        const duelsTitle = getDivisionTitle(wins, mode);
        const modeDisplay = mode === "overall" ? "" : ` [${mapping.display}]`;

        const resp = `/msg ${sender} [${duelsTitle}] ${targetIGNProper}${modeDisplay}: Wins: ${wins.toLocaleString()} * Losses: ${losses.toLocaleString()} * WLR: ${wlr} * Kills: ${kills.toLocaleString()} * Deaths: ${deaths.toLocaleString()} * KDR: ${kdr}`;
        mcClient.send(resp);
    }
};
