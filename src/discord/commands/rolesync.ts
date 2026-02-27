import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { hasPermission } from '../../utils/permissions';
import { syncRoles } from '../../utils/rolesync';

export const roleSyncCommand = {
    data: new SlashCommandBuilder()
        .setName('rolesync')
        .setDescription('Manually sync guild ranks to Discord roles (Dev only)'),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'developers')) {
            return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const result = await syncRoles(interaction.client);
            if (result) {
                await interaction.editReply({ content: `✅ Role sync completed! Synced: ${result.synced}, Skipped: ${result.skipped}` });
            } else {
                await interaction.editReply({ content: '⚠️ Role sync is disabled in config or no data available.' });
            }
        } catch (e: any) {
            await interaction.editReply({ content: `❌ Role sync failed: ${e.message}` });
        }
    }
};
