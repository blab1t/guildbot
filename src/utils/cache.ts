export class DataCache<T> {
    private cache = new Map<string, { data: T, expiry: number }>();
    private defaultTtl: number;

    constructor(defaultTtlSeconds: number = 1200) { // Default 20 mins
        this.defaultTtl = defaultTtlSeconds * 1000;
    }

    public set(key: string, data: T, ttlSeconds?: number): void {
        const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    public get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    public getOldest(key: string): T | null {
        const item = this.cache.get(key);
        return item ? item.data : null;
    }

    public has(key: string): boolean {
        const item = this.cache.get(key);
        return !!item && Date.now() <= item.expiry;
    }

    public clear(): void {
        this.cache.clear();
    }
}

export const playerCache = new DataCache<any>(1200);
export const guildCache = new DataCache<any>(600); // 10 mins for guilds
