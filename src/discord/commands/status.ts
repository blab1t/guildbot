import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { mcClient } from '../../minecraft/client';
import config from '../../utils/config';

export const statusCommand = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check the connection status of the Minecraft guild bot.'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        let isConnected = false;
        let username = 'Unknown';
        
        try {
            // Check if bot exists, client exists, and state is 'play'
            const client = (mcClient.bot as any)?._client;
            if (mcClient.bot && client && client.state === 'play') {
                isConnected = true;
                username = mcClient.bot.username || config.bot_username || 'Unknown';
            }
        } catch (e) {
            // Ignore errors
        }

        const embed = new EmbedBuilder()
            .setTitle('Minecraft Bot Status')
            .setDescription(isConnected ? '🟢 **ONLINE** and connected to Hypixel.' : '🔴 **OFFLINE** or currently reconnecting.')
            .addFields(
                { name: 'Account', value: username, inline: true }
            )
            .setColor(isConnected ? Colors.Green : Colors.Red)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
