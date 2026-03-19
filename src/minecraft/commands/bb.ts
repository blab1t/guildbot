import { MinecraftCommand } from './types';
import { mcClient } from '../client';
import { getPlayer } from '../../utils/hypixel';

const DIVISIONS = [
    { name: 'Ascended',     min: 500000 },
    { name: 'Divine',       min: 400000 },
    { name: 'Celestial',    min: 300000 },
    { name: 'Grandmaster',  min: 200000 },
    { name: 'Legend',       min: 100000 },
    { name: 'Master',       min: 50000 },
    { name: 'Expert',       min: 30000 },
    { name: 'Artisan',      min: 20000 },
    { name: 'Professional', min: 15000 },
    { name: 'Talented',     min: 10000 },
    { name: 'Skilled',      min: 7500 },
    { name: 'Trained',      min: 5000 },
    { name: 'Seasoned',     min: 3500 },
    { name: 'Experienced',  min: 2000 },
    { name: 'Apprentice',   min: 1000 },
    { name: 'Prospect',     min: 500 },
    { name: 'Amateur',      min: 250 },
    { name: 'Untrained',    min: 100 },
    { name: 'Rookie',       min: 0 },
];

function getDivision(score: number): string {
    for (const d of DIVISIONS) {
        if (score >= d.min) return d.name;
    }
    return 'Rookie';
}

// Mode aliases → Hypixel stat key prefix in BuildBattle data
const MODE_MAP: Record<string, { label: string, scoreKey: string, winsKey: string }> = {
    overall:      { label: 'Overall',        scoreKey: 'score',                     winsKey: 'wins' },
    sb:           { label: 'SpeedBuilders',  scoreKey: 'score_speed_builders',      winsKey: 'wins_speed_builders' },
    speedbuilders:{ label: 'SpeedBuilders',  scoreKey: 'score_speed_builders',      winsKey: 'wins_speed_builders' },
    gtb:          { label: 'GuessTheBuild',  scoreKey: 'score_guess_the_build',     winsKey: 'wins_guess_the_build' },
    guessthebuild:{ label: 'GuessTheBuild',  scoreKey: 'score_guess_the_build',     winsKey: 'wins_guess_the_build' },
    solo:         { label: 'Solo',           scoreKey: 'score_solo_normal',         winsKey: 'wins_solo_normal' },
    pro:          { label: 'Solo Pro',       scoreKey: 'score_solo_pro',            winsKey: 'wins_solo_pro' },
};

export const bbCommand: MinecraftCommand = {
    name: 'bb',
    description: 'View Build Battle stats',
    aliases: ['buildbattle', 'build'],
    run: async (sender, targetIgn, args, uuid) => {
        const player = await getPlayer(uuid!);
        const ign = player?.displayname || targetIgn;
        const bb = player?.stats?.BuildBattle;

        if (!bb) {
            mcClient.send(`/msg ${sender} No Build Battle data found for ${ign}.`);
            return;
        }

        // Determine mode from args
        const modeArg = args[0]?.toLowerCase();
        // If first arg is the IGN itself (no mode), use overall
        const mode = (modeArg && modeArg !== ign.toLowerCase() && MODE_MAP[modeArg])
            ? MODE_MAP[modeArg]
            : MODE_MAP['overall'];

        const score = bb[mode.scoreKey] || 0;
        const wins  = bb[mode.winsKey]  || 0;
        const division = getDivision(score);

        mcClient.send(`/msg ${sender} ${ign} [BB ${mode.label}]: Score: ${score.toLocaleString()} | Division: ${division} | Wins: ${wins.toLocaleString()}`);
    }
};
