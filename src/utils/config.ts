import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Get config path from environment or default to config.yaml
const CONFIG_PATH = process.env.CONFIG || 'config.yaml';
const resolvedPath = path.resolve(CONFIG_PATH);

let config: any;

try {
    if (fs.existsSync(resolvedPath)) {
        config = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
        console.log(`[Config] Loaded configuration from: ${resolvedPath}`);
    } else {
        console.error(`[Config] Configuration file NOT FOUND at: ${resolvedPath}`);
        // Provide a default structure to prevent immediate crashes
        config = {
            toggles: {},
            requirements: {},
            permissions: {},
            channels: {},
            aliases: {}
        };
    }
} catch (e) {
    console.error(`[Config] Error reading configuration:`, e);
    process.exit(1);
}

export default config;
