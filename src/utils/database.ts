import fs from 'fs';
import path from 'path';
import config from './config';

export class Database {
    private data: any = {};
    private filePath: string;

    constructor(filename: string) {
        // Allow custom data directory from config or data_subdir env
        const baseDir = config.data_dir || process.env.DATA_DIR || 'src/data';
        this.filePath = path.resolve(baseDir, filename);
        this.load();
    }

    private load() {
        if (!fs.existsSync(path.dirname(this.filePath))) {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        }
        if (fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
            } catch (e) {
                console.error(`Error loading database ${this.filePath}:`, e);
                this.data = {};
            }
        } else {
            this.data = {};
            this.save();
        }
    }

    public save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    }

    public get(key: string, defaultValue: any = null): any {
        return this.data[key] ?? defaultValue;
    }

    public set(key: string, value: any) {
        this.data[key] = value;
        this.save();
    }

    public delete(key: string) {
        delete this.data[key];
        this.save();
    }

    public has(key: string): boolean {
        return key in this.data;
    }

    public all(): any {
        return this.data;
    }
}

// Single instances for key data
export const LinkDB = new Database('links.json');
export const StatsDB = new Database('stats.json');
export const PermsDB = new Database('perms.json');
export const GEXPDB = new Database('gexp.json');
export const BlacklistDB = new Database('blacklist.json');
