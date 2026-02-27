import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { mcClient } from '../../minecraft/client';
import { PermsDB } from '../../utils/database';
import { hasPermission } from '../../utils/permissions';

export const adminCommands = [
    {
        data: new SlashCommandBuilder()
            .setName('guild invite')
            .setDescription('Invites a player to the guild')
            .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true)),
        async execute(interaction: ChatInputCommandInteraction) {
            if (!hasPermission(interaction.user.id, 'invite')) {
                return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
            }
            const ign = interaction.options.getString('ign');
            mcClient.send(`/g invite ${ign}`, false);
            interaction.reply({ content: `Sent invite to ${ign}.`, ephemeral: true });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('guild kick')
            .setDescription('Kicks a player from the guild')
            .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(true)),
        async execute(interaction: ChatInputCommandInteraction) {
            if (!hasPermission(interaction.user.id, 'kick')) {
                return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
            }
            const ign = interaction.options.getString('ign');
            const reason = interaction.options.getString('reason');
            mcClient.send(`/g kick ${ign} ${reason}`, false);
            interaction.reply({ content: `Kicked ${ign} for: ${reason}.`, ephemeral: true });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('guild mute')
            .setDescription('Mutes a player in guild chat')
            .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true))
            .addStringOption(option => option.setName('time').setDescription('Duration (e.g. 1h, 1d)').setRequired(true)),
        async execute(interaction: ChatInputCommandInteraction) {
            if (!hasPermission(interaction.user.id, 'mute')) {
                return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
            }
            const ign = interaction.options.getString('ign');
            const time = interaction.options.getString('time');
            mcClient.send(`/g mute ${ign} ${time}`, false);
            interaction.reply({ content: `Muted ${ign} for ${time}.`, ephemeral: true });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('guild unmute')
            .setDescription('Unmutes a player in guild chat')
            .addStringOption(option => option.setName('ign').setDescription('Minecraft username').setRequired(true)),
        async execute(interaction: ChatInputCommandInteraction) {
            if (!hasPermission(interaction.user.id, 'mute')) {
                return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
            }
            const ign = interaction.options.getString('ign');
            mcClient.send(`/g unmute ${ign}`, false);
            interaction.reply({ content: `Unmuted ${ign}.`, ephemeral: true });
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
