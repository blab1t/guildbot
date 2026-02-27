import { MinecraftCommand } from './types';
import { bwCommand } from './bw';
import { swCommand } from './sw';
import { duelsCommand } from './duels';
import { gexpCommand } from './gexp';
import { lgxpCommand } from './lgxp';
import { vCommand } from './v';
import { helpCommand } from './help';
import { dailyCommand } from './daily';
import { weeklyCommand } from './weekly';
import { monthlyCommand } from './monthly';

export const commands: MinecraftCommand[] = [
    bwCommand,
    swCommand,
    duelsCommand,
    gexpCommand,
    lgxpCommand,
    vCommand,
    dailyCommand,
    weeklyCommand,
    monthlyCommand,
    helpCommand
];
