import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, User } from 'discord.js';
import { getUUID, getPlayer } from '../../utils/hypixel';
import { LinkDB } from '../../utils/database';
import { hasPermission } from '../../utils/permissions';
import config from '../../utils/config';

export const verifyCommand = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Links your Discord account to your Minecraft account')
        .addStringOption(option => option.setName('ign').setDescription('Your Minecraft username').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const ign = interaction.options.getString('ign');
        if (!ign) return interaction.reply({ content: 'Invalid argument!', ephemeral: true });
        const uuid = await getUUID(ign);
        if (!uuid) return interaction.reply({ content: 'Invalid username!', ephemeral: true });

        const player = await getPlayer(uuid);
        const discordTag = player?.socialMedia?.links?.DISCORD;

        if (discordTag !== interaction.user.tag && discordTag !== interaction.user.username) {
            return interaction.reply({ content: `Your Minecraft account is not linked to your Discord! Current linked: ${discordTag || 'None'}. Please link it in the Hypixel lobby.`, ephemeral: true });
        }

        LinkDB.set(interaction.user.id, uuid);

        // Add verified role if configured
        const verifiedRole = config.role_sync?.verified_role;
        if (verifiedRole) {
            const member = interaction.member as any;
            if (member && !member.roles.cache.has(verifiedRole)) {
                member.roles.add(verifiedRole).catch((e: any) => console.error(`[Verify] Failed to add role: ${e.message}`));
            }
        }

        interaction.reply({ content: `Successfully verified as ${ign}!`, ephemeral: true });
    }
};

export const forceVerifyCommand = {
    data: new SlashCommandBuilder()
        .setName('forceverify')
        .setDescription('Force verfies a user (Dev only)')
        .addUserOption(option => option.setName('user').setDescription('Discord user').setRequired(true))
        .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'developers')) {
            return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }
        const user = interaction.options.getUser('user') as User;
        const ign = interaction.options.getString('ign');
        if (!user || !ign) return interaction.reply({ content: 'Invalid arguments!', ephemeral: true });
        const uuid = await getUUID(ign);

        if (!uuid) {
            const confirm = new ButtonBuilder().setCustomId('confirm_anyway').setLabel('Verify anyway').setStyle(ButtonStyle.Danger);
            const cancel = new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, cancel);

            const response = await interaction.reply({
                content: `Warning: ${ign} is an invalid username! Do it anyway?`,
                components: [row],
                ephemeral: true
            });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
            collector.on('collect', i => {
                if (i.customId === 'confirm_anyway') {
                    LinkDB.set(user.id, ign); // Store IGN if UUID not found

                    const verifiedRole = config.role_sync?.verified_role;
                    if (verifiedRole) {
                        i.guild?.members.fetch(user.id).then(member => {
                            if (!member.roles.cache.has(verifiedRole)) {
                                member.roles.add(verifiedRole).catch((e: any) => console.error(`[Verify] Failed to add role: ${e.message}`));
                            }
                        }).catch(() => { });
                    }

                    i.update({ content: `Force verified ${user.tag} as ${ign} (Manual Override).`, components: [] });
                } else {
                    i.update({ content: 'Cancelled.', components: [] });
                }
            });
            return;
        }

        LinkDB.set(user.id, uuid);

        const verifiedRole = config.role_sync?.verified_role;
        if (verifiedRole) {
            interaction.guild?.members.fetch(user.id).then(member => {
                if (!member.roles.cache.has(verifiedRole)) {
                    member.roles.add(verifiedRole).catch((e: any) => console.error(`[Verify] Failed to add role: ${e.message}`));
                }
            }).catch(() => { });
        }

        interaction.reply({ content: `Force verified ${user.tag} as ${ign}.`, ephemeral: true });
    }
};

export const forceUnverifyCommand = {
    data: new SlashCommandBuilder()
        .setName('forceunverify')
        .setDescription('Removes a user\'s verification (Dev/Admin only)')
        .addUserOption(option => option.setName('user').setDescription('Discord user').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'admins')) {
            return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        if (!user) return interaction.reply({ content: 'Invalid user!', ephemeral: true });

        if (!LinkDB.get(user.id)) {
            return interaction.reply({ content: 'This user is not verified!', ephemeral: true });
        }

        LinkDB.delete(user.id);

        // Remove roles
        const guildId = config.role_sync?.discord_guild_id;
        if (guildId) {
            const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (member) {
                    const rolesToRemove = [];
                    if (config.role_sync.verified_role) rolesToRemove.push(config.role_sync.verified_role);
                    if (config.role_sync.guild_member_role) rolesToRemove.push(config.role_sync.guild_member_role);
                    if (config.role_sync.ranks) {
                        for (const r of config.role_sync.ranks) {
                            if (r.discord_role) rolesToRemove.push(r.discord_role);
                        }
                    }

                    if (rolesToRemove.length > 0) {
                        await member.roles.remove(rolesToRemove).catch(e => console.error(`[Unverify] Failed to remove roles: ${e.message}`));
                    }
                }
            }
        }

        interaction.reply({ content: `Successfully unverified ${user.tag}.`, ephemeral: true });
    }
};
