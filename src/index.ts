import { discordClient } from './discord/client';
import { mcClient } from './minecraft/client';
import './minecraft/handler';
import { startGEXPTracker } from './utils/gexp';
import { startRoleSync } from './utils/rolesync';
import dotenv from 'dotenv';

dotenv.config();

async function start() {
    console.log('Starting Hypixel Guild Bot...');

    // Explicitly reference discordClient to ensure it's initialized
    console.log('[System] Initializing Discord...');
    if (discordClient) {
        console.log('[System] Discord client instance hooked.');
    } else {
        console.log('[System] Discord client instance failed to hook.');
    }

    // Start GEXP tracker (runs every 10 min)
    startGEXPTracker();

    // Start role sync (runs every 5 min if enabled)
    startRoleSync(discordClient.client);

    console.log('Bot is initializing. Checking connections...');
}

start().catch(err => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
});
