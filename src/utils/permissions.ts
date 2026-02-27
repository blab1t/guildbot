import config from './config';
import { PermsDB } from './database';

export function hasPermission(userId: string, group: string): boolean {
    const configDevs = config.permissions?.developers || [];
    const configAdmins = config.permissions?.admins || [];

    // 1. Developers have absolute access
    if (configDevs.includes(userId)) return true;

    // 2. Admins have access to everything except explicit developer groups
    if (group !== 'developers' && configAdmins.includes(userId)) return true;

    // 3. Check database for lower tiers (inviters, kickers, etc.)
    // Note: high tiers (developers, admins) are EXCLUSIVELY config-based now.
    if (group !== 'developers' && group !== 'admins') {
        const dbPerms = PermsDB.get(group, []);
        if (dbPerms.includes(userId)) return true;
    }

    return false;
}
