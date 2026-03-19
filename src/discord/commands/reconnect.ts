import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { mcClient } from '../../minecraft/client';
import { hasPermission } from '../../utils/permissions';

export const reconnectCommand = {
    data: new SlashCommandBuilder()
        .setName('reconnect')
        .setDescription('Force the Minecraft bot to reconnect to Hypixel'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'developers')) {
            return interaction.reply({ content: '⛔ You do not have permission to use this command.', flags: 64 });
        }

        mcClient.forceReconnect();
        return interaction.reply({ content: '🔄 Reconnect triggered. The bot will reconnect shortly.', flags: 64 });
    }
};
