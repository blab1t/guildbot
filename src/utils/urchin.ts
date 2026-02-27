import axios from 'axios';
import config from './config';
const URCHIN_KEY = config.urchin_key;

export async function getUrchinTags(ign: string) {
    try {
        const response = await axios.get(`https://urchin.ws/player/${ign}?key=${URCHIN_KEY}`);
        return response.data;
    } catch (e) {
        return null;
    }
}

export async function getUrchinHistorical(ign: string) {
    try {
        const response = await axios.get(`https://urchin.ws/historical/${ign}?key=${URCHIN_KEY}`);
        return response.data;
    } catch (e) {
        return null;
    }
}

export function splitTags(tag: string, length: number = 175): string[] {
    const results: string[] = [];
    for (let i = 0; i < tag.length; i += length) {
        results.push(tag.substring(i, i + length));
    }
    return results;
}
