import mineflayer from 'mineflayer';
import { getStringSuffix } from '../utils/messaging';
import EventEmitter from 'events';
import config from '../utils/config';

export class MinecraftClient extends EventEmitter {
    public bot!: mineflayer.Bot;
    private options: mineflayer.BotOptions;
    public messageHistory: string[] = [];
    private historyLimit: number = 20;

    constructor() {
        super();
        this.options = {
            host: 'hypixel.net',
            port: 25565,
            username: config.bot_username,
            auth: config.auth_type,
            version: '1.8.9'
        };

        // Only add password if it's provided and we're NOT using microsoft auth
        if (config.auth_type !== 'microsoft' && config.bot_password && config.bot_password !== 'password' && config.bot_password !== '') {
            this.options.password = config.bot_password;
        }

        this.initBot();
    }

    private isReconnecting: boolean = false;
    private reconnectDelay: number = 15000; // starts at 15s

    private initBot() {
        console.log(`[Minecraft] Connecting to ${this.options.host}...`);
        this.bot = mineflayer.createBot(this.options);

        this.bot.on('login', () => {
            console.log(`[Minecraft] Logged in as ${this.bot.username}`);
            this.isReconnecting = false;
            this.reconnectDelay = 15000; // Reset backoff on successful login
        });

        this.bot.once('spawn', () => {
            console.log(`[Minecraft] Spawned! Sending /limbo...`);
            // Wait a small bit before sending limbo to ensure we're ready
            setTimeout(() => {
                this.send('/limbo', false);
            }, 3000);
        });

        this.bot.on('message', (jsonMsg) => {
            const ansi = jsonMsg.toAnsi();
            const message = jsonMsg.toString();
            const raw = jsonMsg.toMotd();

            console.log(ansi);

            this.messageHistory.push(raw);
            if (this.messageHistory.length > this.historyLimit) this.messageHistory.shift();

            this.emit('message', { message, raw, json: jsonMsg });
            this.parseMessage(message, raw);
        });

        this.bot.on('kicked', (reason) => {
            console.warn(`[Minecraft] Kicked: ${reason}`);
            this.reconnect();
        });

        this.bot.on('error', (err) => {
            console.error(`[Minecraft] Error:`, err);
            this.reconnect();
        });

        this.bot.on('end', (reason) => {
            console.warn(`[Minecraft] Connection ended: ${reason}`);
            this.reconnect();
        });
    }

    private reconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        console.log(`[Minecraft] Attempting to reconnect in ${this.reconnectDelay / 1000} seconds...`);

        // Cleanup current bot listeners
        if (this.bot) {
            this.bot.removeAllListeners();
            try { this.bot.end(); } catch (e) { }
        }

        const delay = this.reconnectDelay;
        // Increase delay for next failure (exponential backoff, max 120s)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 120000);

        setTimeout(() => {
            this.initBot();
        }, delay);
    }

    public send(message: string, useSuffix: boolean = true) {
        try {
            // Stricter check: must be logged in, have a client, and the client must be in 'play' state
            const client = (this.bot as any)?._client;
            if (this.bot && client && client.state === 'play' && typeof this.bot.chat === 'function') {
                const finalMsg = useSuffix ? message + getStringSuffix() : message;
                console.log(`\x1b[33m[MC OUTGOING] ${finalMsg}\x1b[0m`);
                this.bot.chat(finalMsg);
            } else {
                console.warn(`[Minecraft] Skipping send: Bot is not ready or chat unavailable. (Msg: ${message.slice(0, 20)}...)`);
            }
        } catch (e: any) {
            console.error(`[Minecraft] Failed to send message: ${e.message}`);
        }
    }

    private parseMessage(message: string, raw: string) {
        // Guild Chat
        if (message.startsWith('Guild >')) {
            this.emit('guildChat', { message, raw });
        }
        // Officer Chat
        else if (message.startsWith('Officer >')) {
            this.emit('officerChat', { message, raw });
        }
        // DMs
        else if (message.includes('From ') && (message.includes(':') || message.includes('>'))) {
            this.emit('dm', { message, raw });
        }
        // Guild Join Request: "[RANK] PlayerName has requested to join the Guild!"
        else if (message.includes('has requested to join the Guild!')) {
            this.emit('system', { message, raw });

            // Auto-accept if enabled
            if (config.toggles?.auto_accept_join) {
                // Extract player name: pattern is "Click here to accept or type /guild accept <name>!"
                // Or we can get it from the message line itself
                const joinMatch = message.match(/(?:\[.+?\]\s+)?(\w+) has requested to join the Guild!/);
                if (joinMatch && joinMatch[1]) {
                    const playerName = joinMatch[1];
                    console.log(`[Minecraft] Auto-accepting guild join request from ${playerName}`);
                    setTimeout(() => {
                        this.send(`/g accept ${playerName}`, false);
                    }, 1500);
                }
            }
        }
        // Guild Member Joined: "[RANK] PlayerName joined the guild!"
        else if (message.includes('joined the guild!')) {
            this.emit('system', { message, raw });

            // Auto welcome message if enabled
            if (config.toggles?.welcome_message_enabled && config.welcome_message) {
                const joinedMatch = message.match(/(?:\[.+?\]\s+)?(\w+) joined the guild!/);
                if (joinedMatch && joinedMatch[1]) {
                    const playerName = joinedMatch[1];
                    const welcomeMsg = config.welcome_message.replace(/\{player\}/g, playerName);
                    console.log(`[Minecraft] Sending welcome message to ${playerName}`);
                    setTimeout(() => {
                        this.send(`/gc ${welcomeMsg}`, false);
                    }, 2000);
                }
            }
        }
        // System / Other
        else {
            this.emit('system', { message, raw });
        }
    }
}

export const mcClient = new MinecraftClient();
