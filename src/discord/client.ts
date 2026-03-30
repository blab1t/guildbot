console.log('[DEBUG] Loading discord/client.ts...');
import { Client, GatewayIntentBits, Partials, TextChannel, AttachmentBuilder, ChatInputCommandInteraction, REST, Routes, EmbedBuilder, Colors } from 'discord.js';
import config from '../utils/config';
import { mcClient } from '../minecraft/client';
import { renderMinecraftMessage } from '../utils/canvas';
import { filterMessage, replaceEmojis } from '../utils/messaging';
import { LinkDB } from '../utils/database';
import { verifyCommand, forceVerifyCommand, forceUnverifyCommand } from './commands/verify';
import { sendCommand } from './commands/send';
import { adminCommands, permsCommand } from './commands/admin';
import { roleSyncCommand } from './commands/rolesync';
import { banCommand } from './commands/ban';
import { reconnectCommand } from './commands/reconnect';
import { statusCommand } from './commands/status';

const commands = [
    verifyCommand,
    forceVerifyCommand,
    forceUnverifyCommand,
    sendCommand,
    permsCommand,
    roleSyncCommand,
    banCommand,
    reconnectCommand,
    statusCommand,
    ...adminCommands
];

export class DiscordClient {
    public client: Client;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ],
            partials: [Partials.Channel]
        });

        this.init();
    }

    private init() {
        console.log('[Discord] Initializing client...');
        this.client.once('clientReady', async () => {
            console.log(`[Discord] Logged in as ${this.client.user?.tag}`);
            await this.registerCommands();
            this.setupBridge();
            this.setupVerifyChannel();
            console.log('[Discord] Initialization complete and bridge setup.');
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = commands.find(c => c.data.name === interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction as ChatInputCommandInteraction);
            } catch (error) {
                console.error(`[Interaction Error] Command: ${interaction.commandName}`, error);

                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ content: 'There was an error while executing this command!' });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                } catch (e) {
                    // Silently ignore if interaction is completely gone
                }
            }
        });

        this.client.login(config.discord_token).catch(err => {
            console.error(`[Discord] Login Failed:`, err);
        });
    }

    private async registerCommands() {
        try {
            const rest = new REST({ version: '10' }).setToken(config.discord_token);
            const body = commands.map(c => c.data.toJSON());

            console.log(`[Discord] Started refreshing ${body.length} application (/) commands.`);

            // Get all guilds where the bot is and register there (for faster updates)
            const guilds = await this.client.guilds.fetch();
            for (const [id, guild] of guilds) {
                await rest.put(
                    Routes.applicationGuildCommands(this.client.user!.id, id),
                    { body }
                );
            }

            console.log(`[Discord] Successfully reloaded application (/) commands.`);
        } catch (error) {
            console.error('[Discord] Error registering commands:', error);
        }
    }

    private async setupBridge() {
        // MC -> Discord (respects per-channel toggles)
        mcClient.on('guildChat', async (data) => {
            if (config.toggles.gc_channel_enabled) {
                this.sendToDiscord(config.channels.normal, data.raw);
            }
        });
        mcClient.on('officerChat', async (data) => {
            if (config.toggles.officer_channel_enabled) {
                this.sendToDiscord(config.channels.officer, data.raw);
            }
        });
        mcClient.on('dm', async (data) => {
            if (config.toggles.system_channel_enabled) {
                this.sendToDiscord(config.channels.system, data.raw);
            }
        });
        mcClient.on('system', async (data) => {
            if (config.toggles.system_channel_enabled && config.toggles.officer_all_messages) {
                this.sendToDiscord(config.channels.system, data.raw);
            }
        });

        // Guild member join/leave/kick events → forward with dividers to guild chat channel
        const DIVIDER_RAW = '§b-----------------------------------------------';
        mcClient.on('message', async (data: any) => {
            const msg: string = data.message || '';
            const raw: string = data.raw || '';

            // Join: "[RANK] PlayerName joined the guild!"
            const isJoin = msg.includes('joined the guild!') && !msg.startsWith('Guild >');
            // Leave: "[RANK] PlayerName left the guild!"
            const isLeave = msg.includes('left the guild!') && !msg.startsWith('Guild >');
            // Kicked from guild
            const isKick = msg.includes('was kicked from the Guild') && !msg.startsWith('Guild >');

            if ((isJoin || isLeave || isKick) && config.toggles.gc_channel_enabled) {
                await this.sendToDiscord(config.channels.normal, DIVIDER_RAW);
                await this.sendToDiscord(config.channels.normal, raw);
                await this.sendToDiscord(config.channels.normal, DIVIDER_RAW);
            }

            // Duplicate message warning
            if (msg.includes('You cannot say the same message twice!')) {
                if (config.toggles.gc_channel_enabled) {
                    this.sendToDiscord(config.channels.normal, raw);
                }
            }
        });

        // Blacklist alerts
        mcClient.on('blacklistJoined', async (data: any) => {
            const alertChannelId = config.channels?.blacklist_alert;
            const staffRoleId = config.roles?.staff_role;
            if (!alertChannelId) return;

            try {
                const channel = await this.client.channels.fetch(alertChannelId) as TextChannel;
                const { EmbedBuilder, Colors } = await import('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Blacklisted Player Joined the Guild!')
                    .setColor(Colors.Red)
                    .addFields(
                        { name: 'Player', value: data.playerName, inline: true },
                        { name: 'Reason', value: data.entry.reason, inline: true },
                        { name: 'Banned by', value: data.entry.bannedBy, inline: true },
                        { name: 'Banned at', value: `<t:${Math.floor(new Date(data.entry.bannedAt).getTime() / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();

                const content = staffRoleId ? `<@&${staffRoleId}>` : undefined;
                await channel.send({ content, embeds: [embed] });
            } catch (e) {
                console.error('[Blacklist] Failed to send alert:', e);
            }
        });

        mcClient.on('blacklistJoinRequest', async (data: any) => {
            const alertChannelId = config.channels?.blacklist_alert;
            const staffRoleId = config.roles?.staff_role;
            if (!alertChannelId) return;

            try {
                const channel = await this.client.channels.fetch(alertChannelId) as TextChannel;
                const { EmbedBuilder, Colors } = await import('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('🚫 Blacklisted Player Tried to Join!')
                    .setDescription('Auto-accept was **blocked**.')
                    .setColor(Colors.Orange)
                    .addFields(
                        { name: 'Player', value: data.playerName, inline: true },
                        { name: 'Reason', value: data.entry.reason, inline: true },
                        { name: 'Banned by', value: data.entry.bannedBy, inline: true }
                    )
                    .setTimestamp();

                const content = staffRoleId ? `<@&${staffRoleId}>` : undefined;
                await channel.send({ content, embeds: [embed] });
            } catch (e) {
                console.error('[Blacklist] Failed to send alert:', e);
            }
        });

        // Discord -> MC
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const isNormal = message.channelId === config.channels.normal;
            const isOfficer = message.channelId === config.channels.officer;

            if (isNormal || isOfficer) {
                // Check if user is verified
                const uuid = LinkDB.get(message.author.id);
                if (!uuid) {
                    const msg = await message.reply("You must be verified to send messages here! Use /verify.");
                    setTimeout(() => msg.delete().catch(() => { }), 5000);
                    message.delete().catch(() => { });
                    return;
                }

                if (filterMessage(message.content)) {
                    message.delete().catch(() => { });
                    return;
                }

                // Verify channel auto-cleanup
                if (config.channels.verify && message.channelId === config.channels.verify) {
                    message.delete().catch(() => { });
                    return;
                }

                // Fetch rank and IGN — apply emoji replacements
                let displayMsg = replaceEmojis(message.content);
                try {
                    const { getPlayer, getPlayerRank } = await import('../utils/hypixel');
                    const player = await getPlayer(uuid);

                    // Check for mute
                    if (player?.mutedTill && player.mutedTill > Date.now()) {
                        const date = new Date(player.mutedTill).toLocaleString();
                        const msg = await message.reply(`You are muted in-game until ${date}! You cannot send messages to the bridge.`);
                        setTimeout(() => msg.delete().catch(() => { }), 5000);
                        message.delete().catch(() => { });
                        return;
                    }

                    const rank = player ? getPlayerRank(player) : '';
                    // Use player displayname if found, otherwise use the stored value
                    // (which could be an IGN from forceverify) as fallback
                    const ign = player ? player.displayname : uuid;
                    const prefix = rank ? `${rank} ` : '';

                    const cmd = isNormal ? '/gc' : '/oc';
                    const prefixFinal = `${prefix}${ign}: `;

                    // Split message into 175-character chunks
                    const chunks: string[] = [];
                    for (let i = 0; i < displayMsg.length; i += 175) {
                        chunks.push(displayMsg.substring(i, i + 175));
                    }

                    for (const chunk of chunks) {
                        mcClient.send(`${cmd} ${prefixFinal}${chunk}`, false);
                        // Add a small delay between chunks to prevent spam trigger issues if many chunks
                        if (chunks.length > 1) await new Promise(r => setTimeout(r, 600));
                    }
                } catch (e) {
                    const cmd = isNormal ? '/gc' : '/oc';
                    // Fall back to stored value from verification (could be IGN)
                    const prefixFinal = `${uuid}: `;

                    const chunks: string[] = [];
                    for (let i = 0; i < displayMsg.length; i += 175) {
                        chunks.push(displayMsg.substring(i, i + 175));
                    }

                    for (const chunk of chunks) {
                        mcClient.send(`${cmd} ${prefixFinal}${chunk}`, false);
                        if (chunks.length > 1) await new Promise(r => setTimeout(r, 600));
                    }
                }

                message.delete().catch(() => { });
            }

            // Delete ALL messages in verify channel regardless of who sent it
            if (config.channels.verify && message.channelId === config.channels.verify && !message.author.bot) {
                message.delete().catch(() => { });
            }
        });

        // Ping new Discord members in verify channel
        this.client.on('guildMemberAdd', async (member) => {
            const verifyChannelId = config.channels?.verify;
            if (!verifyChannelId) return;

            try {
                const channel = await this.client.channels.fetch(verifyChannelId) as TextChannel;
                if (!channel) return;

                // Fetch /verify command ID for a clickable link
                const guildCmds = await member.guild.commands.fetch();
                const verifyCmd = guildCmds.find(c => c.name === 'verify');
                const verifyMention = verifyCmd ? `</verify:${verifyCmd.id}>` : '`/verify`';

                const msg = await channel.send(`${member} Welcome! Please run ${verifyMention} to link your Minecraft account and get your guild roles.`);
                // Auto-delete after 30 seconds
                setTimeout(() => msg.delete().catch(() => {}), 30000);
            } catch (e) {
                console.error('[VerifyChannel] Failed to ping new member:', e);
            }
        });
    }

    private async setupVerifyChannel() {
        if (!config.channels.verify) return;

        try {
            const channel = await this.client.channels.fetch(config.channels.verify) as TextChannel;
            if (!channel) return;

            // Optional: Clean up existing messages (limited)
            // await channel.bulkDelete(100).catch(() => {});

            // Fetch global commands to find /verify ID
            const guildCommands = await channel.guild.commands.fetch();
            const verifyCmd = guildCommands.find(c => c.name === 'verify');
            const verifyToken = verifyCmd ? `</verify:${verifyCmd.id}>` : '`/verify`';

            const embed = new EmbedBuilder()
                .setTitle('Account Verification')
                .setDescription(`# To verify and link your account to the guild bot and get your guild roles, run the command ${verifyToken}!`)
                .setColor(Colors.Blue)
                .setFooter({ text: 'Hypixel Guild Bot Verification' });

            // Check if instructions already sent (avoid spam on restart)
            const msgs = await channel.messages.fetch({ limit: 10 });
            const existing = msgs.find(m => m.author.id === this.client.user?.id && m.embeds.length > 0);

            if (!existing) {
                await channel.send({ embeds: [embed] });
            }
        } catch (e) {
            console.error('[VerifyChannel] Setup failed:', e);
        }
    }

    private async sendToDiscord(channelId: string, rawMessage: string) {
        try {
            const channel = await this.client.channels.fetch(channelId) as TextChannel;
            if (!channel) return;

            const imageBuffer = await renderMinecraftMessage(rawMessage);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'message.png' });

            await channel.send({ files: [attachment] });
        } catch (e) {
            console.error(`Error sending message to Discord channel ${channelId}:`, e);
        }
    }
}

export const discordClient = new DiscordClient();
