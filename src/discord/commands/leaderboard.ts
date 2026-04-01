import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { getGuild, getPlayer } from '../../utils/hypixel';
import { GEXPDB, getPlayerName } from '../../utils/database';
import { playerCache } from '../../utils/cache';
import config from '../../utils/config';

const PAGE_SIZE = 10;

function buildEmbed(
    title: string,
    color: number,
    members: { ign: string; value: number }[],
    page: number,
    totalMembers: number,
    sub: string
): EmbedBuilder {
    const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const pageItems = members.slice(start, start + PAGE_SIZE);

    const rows = pageItems.map((m, i) => {
        const rank = start + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${String(rank).padStart(2, ' ')}.\``;
        return `${medal} **${m.ign}** — ${m.value.toLocaleString()} GEXP`;
    }).join('\n');

    const footerText = sub === 'lifetime'
        ? `Tracked: ${members.length} / ${totalMembers} members  •  Page ${page + 1} / ${totalPages}`
        : `Total members: ${totalMembers}  •  Page ${page + 1} / ${totalPages}`;

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(rows || 'No data available.')
        .setColor(color)
        .setFooter({ text: footerText })
        .setTimestamp();
}

function buildButtons(page: number, totalPages: number, sub: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`lb_prev_${sub}_${page}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`lb_next_${sub}_${page}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

export const leaderboardCommand = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Guild GEXP leaderboards.')
        .addSubcommand(sub =>
            sub.setName('weekly')
                .setDescription('Players ranked by weekly GEXP.'))
        .addSubcommand(sub =>
            sub.setName('lifetime')
                .setDescription('Players ranked by lifetime GEXP.')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();
        const guild = await getGuild(config.guild_name).catch(() => null);

        if (!guild) {
            await interaction.editReply('Could not fetch guild data from Hypixel. Try again later.');
            return;
        }

        // Resolve all guild member IGNs — use cache/DB first, fetch from API for unknowns
        const ignMap = new Map<string, string>();
        const toFetch: string[] = [];

        for (const member of guild.members) {
            const uuid = member.uuid.replace(/-/g, '');
            const known = playerCache.getOldest(uuid)?.displayname || getPlayerName(uuid);
            if (known) {
                ignMap.set(uuid, known);
            } else {
                toFetch.push(uuid);
            }
        }

        // Fetch unknowns in small batches to avoid rate limits
        const BATCH_SIZE = 5;
        for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
            const batch = toFetch.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (uuid) => {
                try {
                    const player = await getPlayer(uuid);
                    if (player?.displayname) ignMap.set(uuid, player.displayname);
                    else ignMap.set(uuid, uuid);
                } catch {
                    ignMap.set(uuid, uuid);
                }
            }));
            if (i + BATCH_SIZE < toFetch.length) {
                await new Promise(r => setTimeout(r, 300)); // small delay between batches
            }
        }

        const members: { ign: string; value: number }[] = [];

        if (sub === 'weekly') {
            for (const member of guild.members) {
                const uuid = member.uuid.replace(/-/g, '');
                const ign = ignMap.get(uuid) || uuid;
                const weekly = Object.values(member.expHistory || {})
                    .reduce((a: number, b: any) => a + (Number(b) || 0), 0);
                members.push({ ign, value: weekly });
            }
        } else {
            // lifetime
            const allStored = GEXPDB.all() as Record<string, { lifetime: number; ign?: string }>;
            const guildUuids = new Set(guild.members.map((m: any) => m.uuid.replace(/-/g, '')));

            for (const [uuid, data] of Object.entries(allStored)) {
                if (!guildUuids.has(uuid)) continue;
                if (data?.lifetime == null) continue;
                const ign = ignMap.get(uuid) || data.ign || uuid;
                members.push({ ign, value: data.lifetime });
            }
            // Fill in guild members not yet tracked
            for (const member of guild.members) {
                const uuid = member.uuid.replace(/-/g, '');
                if (!allStored[uuid]) {
                    members.push({ ign: ignMap.get(uuid) || uuid, value: 0 });
                }
            }
        }

        members.sort((a, b) => b.value - a.value);

        const title = sub === 'weekly'
            ? `🏆 Weekly GEXP Leaderboard — ${guild.name}`
            : `🏆 Lifetime GEXP Leaderboard — ${guild.name}`;
        const color = sub === 'weekly' ? Colors.Gold : Colors.Purple;
        const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));

        let page = 0;
        const embed = buildEmbed(title, color, members, page, guild.members.length, sub);
        const row = buildButtons(page, totalPages, sub);

        const reply = await interaction.editReply({
            embeds: [embed],
            components: totalPages > 1 ? [row] : []
        });

        if (totalPages <= 1) return;

        // Collect button clicks for 3 minutes
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 3 * 60 * 1000
        });

        collector.on('collect', async (btn) => {
            const [, action, btnSub, pageStr] = btn.customId.split('_');
            if (btnSub !== sub) return; // Ignore buttons from other lb types

            if (action === 'next') page = Math.min(page + 1, totalPages - 1);
            else if (action === 'prev') page = Math.max(page - 1, 0);

            const newEmbed = buildEmbed(title, color, members, page, guild.members.length, sub);
            const newRow = buildButtons(page, totalPages, sub);

            await btn.update({ embeds: [newEmbed], components: [newRow] });
        });

        collector.on('end', async () => {
            // Disable buttons when collector expires
            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('lb_prev_done').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('lb_next_done').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};
