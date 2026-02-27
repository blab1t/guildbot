import Canvas from "@napi-rs/canvas";
import path from "path";

// Register Minecraft font
const fontPath = path.join(__dirname, '../../fonts/MinecraftRegular-Bmg3.ttf');
try {
    Canvas.GlobalFonts.registerFromPath(fontPath, "Minecraft");
    console.log(`[Canvas] Loaded Minecraft font from: ${fontPath}`);
} catch (e) {
    console.error(`[Canvas] Failed to load Minecraft font:`, e);
}

// Minecraft color codes to RGBA
const RGBA_COLOR: Record<string, string> = {
    '0': 'rgba(0,0,0,1)',
    '1': 'rgba(0,0,170,1)',
    '2': 'rgba(0,170,0,1)',
    '3': 'rgba(0,170,170,1)',
    '4': 'rgba(170,0,0,1)',
    '5': 'rgba(170,0,170,1)',
    '6': 'rgba(255,170,0,1)',
    '7': 'rgba(170,170,170,1)',
    '8': 'rgba(85,85,85,1)',
    '9': 'rgba(85,85,255,1)',
    'a': 'rgba(85,255,85,1)',
    'b': 'rgba(85,255,255,1)',
    'c': 'rgba(255,85,85,1)',
    'd': 'rgba(255,85,255,1)',
    'e': 'rgba(255,255,85,1)',
    'f': 'rgba(255,255,255,1)',
    'r': 'rgba(255,255,255,1)',
};

const LINE_HEIGHT = 24;
const FONT_SIZE = 20;
const CANVAS_WIDTH = 600; // Increased width slightly
const LEFT_MARGIN = 10;
const RIGHT_MARGIN = 15;
const TEXT_TOP_OFFSET = 18;
const BOTTOM_BUFFER = 10;

/**
 * Robustly wraps and measures/renders parts of a message.
 * This handles both spaces and long contiguous strings.
 */
function processText(ctx: Canvas.SKRSContext2D | null, text: string, currentX: number, currentY: number, draw: boolean, currentColor?: string): { x: number, y: number, lines: number } {
    let x = currentX;
    let y = currentY;
    let totalLines = 0;
    const maxWidth = CANVAS_WIDTH - RIGHT_MARGIN;

    // Split text into "blobs" that should stay together if possible (words)
    // but we'll process character by character for absolute safety with long strings.
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const metrics = ctx ? ctx.measureText(char) : { width: 12 }; // Fallback width
        const charWidth = metrics.width;

        if (x + charWidth > maxWidth) {
            x = LEFT_MARGIN;
            y += LINE_HEIGHT;
            totalLines++;
        }

        if (draw && ctx) {
            ctx.fillStyle = currentColor || RGBA_COLOR['r'];
            ctx.fillText(char, x, y);
        }
        x += charWidth;
    }

    return { x, y, lines: totalLines };
}

function getHeight(message: string): number {
    const canvas = Canvas.createCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    ctx.font = `${FONT_SIZE}px Minecraft`;

    const parts = message.split(/(§[0-9a-fk-or]|\n)/g);
    let x = LEFT_MARGIN;
    let y = TEXT_TOP_OFFSET;
    let lines = 1;

    for (const part of parts) {
        if (part === '\n' || part === '§n') {
            x = LEFT_MARGIN;
            y += LINE_HEIGHT;
            lines++;
            continue;
        }
        if (part.startsWith('§')) continue;

        const result = processText(ctx, part, x, y, false);
        x = result.x;
        y = result.y;
        lines += result.lines;
    }

    return y + BOTTOM_BUFFER;
}

/**
 * Generate a Minecraft-style chat image from a message with color codes.
 */
export async function renderMinecraftMessage(message: string): Promise<Buffer> {
    return generateMessageImage(message);
}

/**
 * Generate a Minecraft-style chat image from a message with color codes
 */
export function generateMessageImage(message: string): Buffer {
    const canvasHeight = getHeight(message);
    const canvas = Canvas.createCanvas(CANVAS_WIDTH, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = '#131313';
    ctx.font = `${FONT_SIZE}px Minecraft`;

    const parts = message.split(/(§[0-9a-fk-or]|\n)/g);
    let x = LEFT_MARGIN;
    let y = TEXT_TOP_OFFSET;
    let currentColor = RGBA_COLOR['r'];

    for (const part of parts) {
        if (part === '\n' || part === '§n') {
            x = LEFT_MARGIN;
            y += LINE_HEIGHT;
            continue;
        }

        if (part.startsWith('§')) {
            const code = part.charAt(1).toLowerCase();
            if (RGBA_COLOR[code]) {
                currentColor = RGBA_COLOR[code];
            }
            continue;
        }

        const result = processText(ctx, part, x, y, true, currentColor);
        x = result.x;
        y = result.y;
    }

    return canvas.toBuffer("image/png");
}

/**
 * Generate an image with multiple messages
 */
export function generateMultiMessageImage(messages: string[]): Buffer {
    const heights = messages.map(msg => getHeight(msg));
    const totalHeight = heights.reduce((a, b) => a + b, 0) + (messages.length * 5);

    const canvas = Canvas.createCanvas(CANVAS_WIDTH, Math.max(totalHeight, 10));
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, CANVAS_WIDTH, totalHeight);

    let currentYOffset = 5;

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const parts = message.split(/(§[0-9a-fk-or]|\n)/g);

        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowColor = '#131313';
        ctx.font = `${FONT_SIZE}px Minecraft`;

        let x = LEFT_MARGIN;
        let y = currentYOffset + TEXT_TOP_OFFSET;
        let currentColor = RGBA_COLOR['r'];

        for (const part of parts) {
            if (part === '\n' || part === '§n') {
                x = LEFT_MARGIN;
                y += LINE_HEIGHT;
                continue;
            }

            if (part.startsWith('§')) {
                const code = part.charAt(1).toLowerCase();
                if (RGBA_COLOR[code]) {
                    currentColor = RGBA_COLOR[code];
                }
                continue;
            }

            const result = processText(ctx, part, x, y, true, currentColor);
            x = result.x;
            y = result.y;
        }

        currentYOffset += heights[i] + 5;
    }

    return canvas.toBuffer("image/png");
}
