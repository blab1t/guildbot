import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { getGuild } from '../../utils/hypixel';
import { GEXPDB } from '../../utils/database';
import config from '../../utils/config';

export const leaderboardCommand = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Guild GEXP leaderboards.')
        .addSubcommand(sub =>
            sub.setName('weekly')
                .setDescription('Top 10 players by weekly GEXP in the guild.'))
        .addSubcommand(sub =>
            sub.setName('lifetime')
                .setDescription('Top 10 players by lifetime GEXP in the guild.')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();
        const guild = await getGuild(config.guild_name).catch(() => null);

        if (!guild) {
            await interaction.editReply('Could not fetch guild data from Hypixel. Try again later.');
            return;
        }

        const members: { ign: string; value: number }[] = [];

        if (sub === 'weekly') {
            for (const member of guild.members) {
                const weekly = Object.values(member.expHistory || {})
                    .reduce((a: number, b: any) => a + (Number(b) || 0), 0);
                members.push({ ign: member.name || member.uuid, value: weekly });
            }
            members.sort((a, b) => b.value - a.value);

            const top = members.slice(0, 10);
            const rows = top.map((m, i) =>
                `\`${String(i + 1).padStart(2, ' ')}.\` **${m.ign}** — ${m.value.toLocaleString()} GEXP`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Weekly GEXP Leaderboard — ${guild.name}`)
                .setDescription(rows || 'No data available.')
                .setColor(Colors.Gold)
                .setFooter({ text: `Total members: ${guild.members.length}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } else if (sub === 'lifetime') {
            const uuid2ign = new Map<string, string>();
            for (const member of guild.members) {
                uuid2ign.set(member.uuid.replace(/-/g, ''), member.name || member.uuid);
            }

            const allStored = GEXPDB.all() as Record<string, { lifetime: number }>;
            for (const [uuid, data] of Object.entries(allStored)) {
                const ign = uuid2ign.get(uuid);
                if (ign && data?.lifetime != null) {
                    members.push({ ign, value: data.lifetime });
                }
            }

            // Any guild member not yet tracked — show with 0
            for (const [uuid, ign] of uuid2ign.entries()) {
                if (!allStored[uuid]) {
                    members.push({ ign, value: 0 });
                }
            }

            members.sort((a, b) => b.value - a.value);
            const top = members.slice(0, 10);

            const rows = top.map((m, i) =>
                `\`${String(i + 1).padStart(2, ' ')}.\` **${m.ign}** — ${m.value.toLocaleString()} GEXP`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Lifetime GEXP Leaderboard — ${guild.name}`)
                .setDescription(rows || 'No data available.')
                .setColor(Colors.Purple)
                .setFooter({ text: `Tracked members: ${members.length} / ${guild.members.length}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
