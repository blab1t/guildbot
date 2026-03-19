import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { hasPermission } from '../../utils/permissions';
import { BlacklistDB } from '../../utils/database';
import { getUUID } from '../../utils/hypixel';

export const banCommand = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Guild blacklist management')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a player to the guild blacklist')
            .addStringOption(o => o.setName('ign').setDescription('Minecraft username').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for ban').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a player from the guild blacklist')
            .addStringOption(o => o.setName('ign').setDescription('Minecraft username').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all blacklisted players')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!hasPermission(interaction.user.id, 'kick')) {
            return interaction.reply({ content: '⛔ You do not have permission to manage the blacklist.', flags: 64 });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const ign = interaction.options.getString('ign', true);
            const reason = interaction.options.getString('reason', true);

            await interaction.deferReply({ flags: 64 });

            const uuid = await getUUID(ign);
            if (!uuid) {
                return interaction.editReply(`❌ Player \`${ign}\` not found.`);
            }

            BlacklistDB.set(uuid, {
                ign,
                uuid,
                reason,
                bannedBy: interaction.user.tag,
                bannedAt: new Date().toISOString(),
            });

            return interaction.editReply(`✅ **${ign}** has been added to the blacklist. Reason: *${reason}*`);
        }

        if (sub === 'remove') {
            const ign = interaction.options.getString('ign', true);
            await interaction.deferReply({ flags: 64 });

            const uuid = await getUUID(ign);
            if (!uuid || !BlacklistDB.has(uuid)) {
                return interaction.editReply(`❌ \`${ign}\` is not on the blacklist.`);
            }

            BlacklistDB.delete(uuid);
            return interaction.editReply(`✅ **${ign}** has been removed from the blacklist.`);
        }

        if (sub === 'list') {
            const all = BlacklistDB.all();
            const entries = Object.values(all) as any[];

            if (entries.length === 0) {
                return interaction.reply({ content: '📋 The blacklist is empty.', flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setTitle('🚫 Guild Blacklist')
                .setColor(Colors.Red)
                .setDescription(
                    entries.map((e, i) =>
                        `**${i + 1}. ${e.ign}**\nReason: ${e.reason}\nBanned by: ${e.bannedBy}\n<t:${Math.floor(new Date(e.bannedAt).getTime() / 1000)}:R>`
                    ).join('\n\n')
                )
                .setFooter({ text: `${entries.length} player(s) blacklisted` });

            return interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
};
