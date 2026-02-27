export interface DuelStats {
    wins?: number;
    losses?: number;
    kills?: number;
    deaths?: number;
}

export function formatStatDiff(current: number, historical: number): string {
    const diff = current - historical;
    if (diff === 0) return "0";
    return diff > 0 ? `+${diff}` : `${diff}`;
}

export function getDuelsDiff(current: any, historical: any, mode: string = 'all'): string {
    let currWins = 0, currLosses = 0, currKills = 0, currDeaths = 0;
    let histWins = 0, histLosses = 0, histKills = 0, histDeaths = 0;

    if (mode === 'all') {
        currWins = current.wins || 0;
        currLosses = current.losses || 0;
        currKills = current.kills || 0;
        currDeaths = current.deaths || 0;
        histWins = historical.wins || 0;
        histLosses = historical.losses || 0;
        histKills = historical.kills || 0;
        histDeaths = historical.deaths || 0;
    } else {
        const prefix = mode === 'bridge' ? 'bridge_duel_' : mode + '_duel_';
        currWins = current[prefix + 'wins'] || 0;
        currLosses = current[prefix + 'losses'] || 0;
        currKills = current[prefix + 'kills'] || 0;
        currDeaths = current[prefix + 'deaths'] || 0;
        histWins = historical[prefix + 'wins'] || 0;
        histLosses = historical[prefix + 'losses'] || 0;
        histKills = historical[prefix + 'kills'] || 0;
        histDeaths = historical[prefix + 'deaths'] || 0;
    }

    const wins = formatStatDiff(currWins, histWins);
    const losses = formatStatDiff(currLosses, histLosses);
    const kills = formatStatDiff(currKills, histKills);
    const deaths = formatStatDiff(currDeaths, histDeaths);

    return `W: ${wins} * L: ${losses} * K: ${kills} * D: ${deaths}`;
}
