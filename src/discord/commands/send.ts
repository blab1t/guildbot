import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, TextChannel, MessageFlags } from 'discord.js';
import { hasPermission } from '../../utils/permissions';
import { mcClient } from '../../minecraft/client';
import config from '../../utils/config';

export const sendCommand = {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Sends a command to Minecraft and captures the response')
        .addStringOption(option => option.setName('message').setDescription('Message or command to send').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        // Always defer as ephemeral first so the user gets a quick response
        await interaction.deferReply({ ephemeral: true });

        if (!hasPermission(interaction.user.id, 'developers')) {
            return interaction.editReply({ content: 'You do not have permission to use this command!' });
        }
        const message = interaction.options.getString('message');
        if (!message) return interaction.editReply({ content: 'Invalid argument!' });
        const user = interaction.user;

        // Start capturing log (roughly 1 second before)
        const recentMessages: string[] = [...mcClient.messageHistory.slice(-5)];
        const msgHandler = (data: any) => {
            recentMessages.push(data.raw);
        };

        mcClient.on('message', msgHandler);
        mcClient.send(message, false);

        // Wait for response (up to 3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));
        mcClient.off('message', msgHandler);

        // Render response as image
        const { generateMultiMessageImage } = await import('../../utils/canvas');
        const imageBuffer = generateMultiMessageImage(recentMessages.length > 0 ? recentMessages : ["No response captured."]);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'response.png' });

        // Always send ephemeral reply to the user who ran the command
        await interaction.editReply({ content: `Response captured:`, files: [attachment] });

        // Always post to the command channel with mention + message + image
        if (config.toggles.command_channel_enabled && config.channels.command) {
            try {
                const cmdChannel = await interaction.client.channels.fetch(config.channels.command) as TextChannel;
                if (cmdChannel) {
                    const channelAttachment = new AttachmentBuilder(imageBuffer, { name: 'response.png' });
                    await cmdChannel.send({
                        content: `<@${user.id}>: \`${message}\``,
                        files: [channelAttachment]
                    });
                }
            } catch (e) {
                console.error('[Send Command] Failed to post to command channel:', e);
            }
        }
    }
};
