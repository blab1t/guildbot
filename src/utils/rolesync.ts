import config from './config';
import { getGuild, getPlayer } from './hypixel';
import { LinkDB } from './database';
import { Client, GuildMember } from 'discord.js';
import { mcClient } from '../minecraft/client';

/**
 * Syncs guild ranks to Discord roles.
 * Runs every 5 minutes when enabled.
 */
export async function syncRoles(discordClient: Client) {
    if (!config.role_sync?.enabled) return;

    try {
        const guild = await getGuild(config.guild_name);
        if (!guild) {
            console.error('[RoleSync] Could not fetch guild data.');
            return;
        }

        const memberRoleId = config.role_sync.guild_member_role;
        const verifiedRoleId = config.role_sync.verified_role;
        const rankMappings: {
            guild_rank: string;
            discord_role: string,
            promote?: boolean,
            demote?: boolean,
            requirements?: {
                weekly_gexp?: number,
                lifetime_gexp?: number,
                time_in_guild?: string,
                hypixel_rank?: string
            }
        }[] = config.role_sync.ranks || [];
        const allRankRoleIds = rankMappings.map(r => r.discord_role).filter(Boolean);

        // Build a map of MC UUID -> guild rank info
        const guildMembers = new Map<string, { rank: string, weeklyExp: number, totalExp: number, joined: number, ign: string }>();
        for (const member of guild.members) {
            const uuid = member.uuid.replace(/-/g, '');
            // Calculate weekly GEXP
            const weeklyExp = Object.values(member.expHistory || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
            guildMembers.set(uuid, {
                rank: member.rank,
                weeklyExp,
                totalExp: member.exp || 0,
                joined: member.joined || Date.now(),
                ign: member.name || uuid
            });
        }

        // Get all verified Discord users from LinkDB
        const allLinks = LinkDB.all();

        // Process only the configured Discord guild
        const targetGuildId = config.role_sync.discord_guild_id;
        if (!targetGuildId) {
            console.error('[RoleSync] No discord_guild_id configured. Skipping.');
            return;
        }

        let discordGuild;
        try {
            discordGuild = await discordClient.guilds.fetch(targetGuildId);
        } catch {
            console.error('[RoleSync] Could not fetch Discord guild with configured ID.');
            return;
        }

        let synced = 0;
        let skipped = 0;

        for (const [discordId, storedValue] of Object.entries(allLinks)) {
            // storedValue could be a UUID or an IGN (from forceverify)
            const uuid = storedValue as string;

            let discordMember: GuildMember | undefined;
            try {
                // Fetch individually instead of bulk to avoid timeout
                discordMember = await discordGuild.members.fetch(discordId);
            } catch {
                // User not in this Discord guild, skip
                skipped++;
                continue;
            }

            const guildInfo = guildMembers.get(uuid);

            if (guildInfo) {
                // Player IS in the Hypixel guild
                const guildRank = guildInfo.rank;

                // 1. Add verified role
                if (verifiedRoleId && !discordMember.roles.cache.has(verifiedRoleId)) {
                    try {
                        await discordMember.roles.add(verifiedRoleId);
                    } catch (e: any) {
                        console.error(`[RoleSync] Failed to add verified role to ${discordMember.user.tag}: ${e.message}`);
                    }
                }

                // 2. Add guild member role (strictly enforce)
                if (memberRoleId) {
                    const hasMemberRole = discordMember.roles.cache.has(memberRoleId);
                    if (!hasMemberRole) {
                        try {
                            await discordMember.roles.add(memberRoleId);
                            console.log(`[RoleSync] Added missing member role to ${discordMember.user.tag}`);
                        } catch (e: any) {
                            console.error(`[RoleSync] Failed to add member role to ${discordMember.user.tag}: ${e.message}`);
                        }
                    }
                }

                // 3. Find the correct rank role
                const correctMapping = rankMappings.find(
                    r => r.guild_rank.toLowerCase() === guildRank.toLowerCase()
                );
                const correctRoleId = correctMapping?.discord_role;

                // Handle rank roles (always remove others even if current rank is unmapped)
                for (const roleId of allRankRoleIds) {
                    if (!roleId) continue;
                    if (roleId === correctRoleId) {
                        if (!discordMember.roles.cache.has(roleId)) {
                            try {
                                await discordMember.roles.add(roleId);
                                console.log(`[RoleSync] Added rank role for ${discordMember.user.tag} (${guildRank})`);
                            } catch (e: any) {
                                console.error(`[RoleSync] Failed to add role ${roleId}: ${e.message}`);
                            }
                        }
                    } else {
                        if (discordMember.roles.cache.has(roleId)) {
                            try {
                                await discordMember.roles.remove(roleId);
                                console.log(`[RoleSync] Removed old rank role from ${discordMember.user.tag}`);
                            } catch (e: any) {
                                console.error(`[RoleSync] Failed to remove role ${roleId}: ${e.message}`);
                            }
                        }
                    }
                }

                // 4. Auto Promotion / Demotion Logic
                try {
                    const player = await getPlayer(uuid);
                    await handleAutoRank(guildInfo, rankMappings, player);

                    // 5. Nickname sync — set Discord nickname to MC IGN
                    if (config.role_sync.nickname_sync) {
                        const ign = player?.displayname;
                        if (ign && discordMember.nickname !== ign && discordMember.id !== discordGuild.ownerId) {
                            await discordMember.setNickname(ign);
                            console.log(`[RoleSync] Set nickname for ${discordMember.user.tag} → ${ign}`);
                        }
                    }
                } catch (e: any) {
                    if (!e.message?.includes('Missing Permissions')) {
                        console.error(`[RoleSync] Failed player-specific sync for ${discordMember.user.tag}: ${e.message}`);
                    }
                }

                synced++;
            } else {
                // Player is NOT in the Hypixel guild — check if they should still have the verified role
                const isVerifiedInDB = LinkDB.get(discordId);

                if (verifiedRoleId && isVerifiedInDB && !discordMember.roles.cache.has(verifiedRoleId)) {
                    try {
                        await discordMember.roles.add(verifiedRoleId);
                    } catch (e: any) { }
                } else if (verifiedRoleId && !isVerifiedInDB && discordMember.roles.cache.has(verifiedRoleId)) {
                    try {
                        await discordMember.roles.remove(verifiedRoleId);
                    } catch (e: any) { }
                }

                if (memberRoleId && discordMember.roles.cache.has(memberRoleId)) {
                    try {
                        await discordMember.roles.remove(memberRoleId);
                        console.log(`[RoleSync] Removed member role from ${discordMember.user.tag} (left guild)`);
                    } catch (e: any) {
                        console.error(`[RoleSync] Failed to remove member role: ${e.message}`);
                    }
                }

                for (const roleId of allRankRoleIds) {
                    if (!roleId) continue;
                    if (discordMember.roles.cache.has(roleId)) {
                        try {
                            await discordMember.roles.remove(roleId);
                        } catch (e: any) {
                            console.error(`[RoleSync] Failed to remove rank role: ${e.message}`);
                        }
                    }
                }
                synced++;
            }
        }

        console.log(`[RoleSync] Sync completed. Synced: ${synced}, Skipped: ${skipped}`);
        return { synced, skipped };
    } catch (e: any) {
        console.error(`[RoleSync] Error: ${e.message || e}`);
        throw e;
    }
}

export function startRoleSync(discordClient: Client) {
    if (!config.role_sync?.enabled) {
        console.log('[RoleSync] Disabled in config.');
        return;
    }

    console.log('[RoleSync] Starting role sync (every 5 minutes)...');
    // Initial sync after 30 seconds (give time for Discord client to fully load)
    setTimeout(() => syncRoles(discordClient), 30000);
    // Then every 5 minutes
    setInterval(() => syncRoles(discordClient), 5 * 60 * 1000);
}

async function handleAutoRank(guildInfo: { rank: string, weeklyExp: number, totalExp: number, joined: number, ign: string }, rankMappings: any[], hypixelPlayer: any) {
    if (!hypixelPlayer?.displayname) return; // Can't resolve IGN, skip
    const playerIGN = hypixelPlayer.displayname;
    const currentRank = guildInfo.rank;
    const { getPlayerRank } = await import('./hypixel');
    const hRank = getPlayerRank(hypixelPlayer); // e.g. [MVP+]

    const meetsRequirements = (reqs: any) => {
        if (!reqs) return true;

        // Weekly GEXP
        if (reqs.weekly_gexp !== undefined && guildInfo.weeklyExp < reqs.weekly_gexp) return false;

        // Lifetime GEXP
        if (reqs.lifetime_gexp !== undefined && guildInfo.totalExp < reqs.lifetime_gexp) return false;

        // Time in Guild
        if (reqs.time_in_guild) {
            const timeMs = parseTime(reqs.time_in_guild);
            const joinedAt = guildInfo.joined;
            if (Date.now() - joinedAt < timeMs) return false;
        }

        // Hypixel Rank
        if (reqs.hypixel_rank) {
            // Very simple contains check for rank name
            if (!hRank.toLowerCase().includes(reqs.hypixel_rank.toLowerCase())) return false;
        }

        return true;
    };

    // Auto-Promotion
    // Find highest rank they qualify for
    let targetRankName: string | null = null;
    for (const mapping of rankMappings) {
        if (mapping.promote && meetsRequirements(mapping.requirements)) {
            targetRankName = mapping.guild_rank;
        }
    }

    if (targetRankName && targetRankName.toLowerCase() !== currentRank.toLowerCase()) {
        console.log(`[AutoRank] Promoting ${playerIGN} to ${targetRankName}`);
        mcClient.send(`/g setrank ${playerIGN} ${targetRankName}`, false);
        return; // Only one change per sync
    }

    // Auto-Demotion
    // If they don't meet requirements for their current rank and demote is true
    const currentMapping = rankMappings.find(r => r.guild_rank.toLowerCase() === currentRank.toLowerCase());
    if (currentMapping && currentMapping.demote && !meetsRequirements(currentMapping.requirements)) {
        // Find the next lowest rank they DO qualify for
        let demoteTo: string | null = null;
        for (let i = rankMappings.indexOf(currentMapping) - 1; i >= 0; i--) {
            if (meetsRequirements(rankMappings[i].requirements)) {
                demoteTo = rankMappings[i].guild_rank;
                break;
            }
        }

        if (demoteTo) {
            console.log(`[AutoRank] Demoting ${playerIGN} to ${demoteTo}`);
            mcClient.send(`/g setrank ${playerIGN} ${demoteTo}`, false);
        }
    }
}

function parseTime(str: string): number {
    const num = parseInt(str.slice(0, -1));
    const unit = str.slice(-1).toLowerCase();
    const multipliers: { [key: string]: number } = {
        'w': 7 * 24 * 60 * 60 * 1000,
        'm': 30 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    return num * (multipliers[unit] || 0);
}
