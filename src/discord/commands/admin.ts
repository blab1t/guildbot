import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { mcClient } from '../../minecraft/client';
import { PermsDB } from '../../utils/database';
import { hasPermission } from '../../utils/permissions';

export const adminCommands = [
    {
        data: new SlashCommandBuilder()
            .setName('guild')
            .setDescription('Guild administration commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('invite')
                    .setDescription('Invites a player to the guild')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('kick')
                    .setDescription('Kicks a player from the guild')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
                    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('mute')
                    .setDescription('Mutes a player in guild chat')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
                    .addStringOption(option => option.setName('time').setDescription('Duration (e.g. 1h, 1d)').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('unmute')
                    .setDescription('Unmutes a player in guild chat')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('promote')
                    .setDescription('Promotes a player in the guild')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('demote')
                    .setDescription('Demotes a player in the guild')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('setrank')
                    .setDescription('Sets a player\'s rank in the guild')
                    .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
                    .addStringOption(option => option.setName('rank').setDescription('Guild rank name').setRequired(true))
            ),
        async execute(interaction: ChatInputCommandInteraction) {
            const subcommand = interaction.options.getSubcommand();
            const ign = interaction.options.getString('ign');

            if (subcommand === 'invite') {
                if (!hasPermission(interaction.user.id, 'invite')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
                }
                mcClient.send(`/g invite ${ign}`, false);
                return interaction.reply({ content: `Sent invite to ${ign}.`, ephemeral: true });
            }

            if (subcommand === 'kick') {
                if (!hasPermission(interaction.user.id, 'kick')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
                }
                const reason = interaction.options.getString('reason');
                mcClient.send(`/g kick ${ign} ${reason}`, false);
                return interaction.reply({ content: `Kicked ${ign} for: ${reason}.`, ephemeral: true });
            }

            if (subcommand === 'mute') {
                if (!hasPermission(interaction.user.id, 'mute')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
                }
                const time = interaction.options.getString('time');
                mcClient.send(`/g mute ${ign} ${time}`, false);
                return interaction.reply({ content: `Muted ${ign} for ${time}.`, ephemeral: true });
            }

            if (subcommand === 'unmute') {
                if (!hasPermission(interaction.user.id, 'mute')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', flags: 64 });
                }
                mcClient.send(`/g unmute ${ign}`, false);
                return interaction.reply({ content: `Unmuted ${ign}.`, flags: 64 });
            }

            if (subcommand === 'promote') {
                if (!hasPermission(interaction.user.id, 'kick')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', flags: 64 });
                }
                mcClient.send(`/g promote ${ign}`, false);
                return interaction.reply({ content: `Promoted ${ign}.`, flags: 64 });
            }

            if (subcommand === 'demote') {
                if (!hasPermission(interaction.user.id, 'kick')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', flags: 64 });
                }
                mcClient.send(`/g demote ${ign}`, false);
                return interaction.reply({ content: `Demoted ${ign}.`, flags: 64 });
            }

            if (subcommand === 'setrank') {
                if (!hasPermission(interaction.user.id, 'kick')) {
                    return interaction.reply({ content: 'You do not have permission to use this command!', flags: 64 });
                }
                const rank = interaction.options.getString('rank');
                mcClient.send(`/g setrank ${ign} ${rank}`, false);
                return interaction.reply({ content: `Set ${ign}'s rank to ${rank}.`, flags: 64 });
            }
        }
    }
];

export const permsCommand = {
    data: new SlashCommandBuilder()
        .setName('perms')
        .setDescription('Assigns permission groups to a user')
        .addStringOption(option => option.setName('group').setDescription('Group (invite, kick, mute)').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Discord user').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'admins')) {
            return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }
        const group = interaction.options.getString('group');
        const user = interaction.options.getUser('user');

        if (!user || !group) return interaction.reply({ content: 'Invalid arguments!', ephemeral: true });
        if (!['invite', 'kick', 'mute'].includes(group)) {
            return interaction.reply({ content: 'Invalid permission group! Use: invite, kick, mute', ephemeral: true });
        }

        let perms = PermsDB.get(group, []);
        if (!perms.includes(user.id)) {
            perms.push(user.id);
            PermsDB.set(group, perms);
            interaction.reply({ content: `Added ${user.tag} to ${group}.`, ephemeral: true });
        } else {
            interaction.reply({ content: `${user.tag} is already in ${group}.`, ephemeral: true });
        }
    }
};
