export interface MinecraftCommand {
    name: string;
    description: string;
    aliases?: string[];
    cooldown?: number;
    run: (sender: string, targetIgn: string, args: string[], uuid?: string) => Promise<void>;
}
