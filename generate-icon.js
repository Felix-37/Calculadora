// Generate a minimal 256x256 PNG icon without external dependencies
// Creates a solid gradient-like icon using raw PNG encoding
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WIDTH = 256;
const HEIGHT = 256;

function createPNG(width, height) {
    // Create raw RGBA pixel data
    const rawData = Buffer.alloc(height * (1 + width * 4)); // filter byte + RGBA per pixel per row

    for (let y = 0; y < height; y++) {
        const rowOffset = y * (1 + width * 4);
        rawData[rowOffset] = 0; // No filter

        for (let x = 0; x < width; x++) {
            const pixelOffset = rowOffset + 1 + x * 4;

            // Calculate distance from center
            const cx = width / 2, cy = height / 2;
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt(cx * cx + cy * cy);
            const t = dist / maxDist;

            // Check if within rounded rectangle
            const margin = 20;
            const radius = 48;
            const inRect = isInRoundedRect(x, y, margin, margin, width - 2 * margin, height - 2 * margin, radius);

            if (!inRect) {
                // Transparent
                rawData[pixelOffset] = 0;
                rawData[pixelOffset + 1] = 0;
                rawData[pixelOffset + 2] = 0;
                rawData[pixelOffset + 3] = 0;
                continue;
            }

            // Gradient: pink -> purple -> blue
            const gradT = (x + y) / (width + height);
            let r, g, b;

            if (gradT < 0.5) {
                const lt = gradT * 2;
                r = lerp(255, 196, lt);
                g = lerp(107, 77, lt);
                b = lerp(157, 255, lt);
            } else {
                const lt = (gradT - 0.5) * 2;
                r = lerp(196, 110, lt);
                g = lerp(77, 58, lt);
                b = lerp(255, 255, lt);
            }

            // Calculator body in center
            const calcX = 56, calcY = 40, calcW = 144, calcH = 176;
            const inCalc = isInRoundedRect(x, y, calcX, calcY, calcW, calcH, 20);

            if (inCalc) {
                // Darker overlay
                r = Math.floor(r * 0.2);
                g = Math.floor(g * 0.15);
                b = Math.floor(b * 0.25);
            }

            // Display area
            const dispX = 68, dispY = 52, dispW = 120, dispH = 44;
            const inDisp = isInRoundedRect(x, y, dispX, dispY, dispW, dispH, 10);

            if (inDisp) {
                r = Math.min(255, r + 15);
                g = Math.min(255, g + 15);
                b = Math.min(255, b + 15);
            }

            // Button rows
            const buttons = [
                // Row 1: function buttons + operator
                { x: 68, y: 106, w: 26, h: 26, cr: 160, cg: 60, cb: 200 },
                { x: 99, y: 106, w: 26, h: 26, cr: 160, cg: 60, cb: 200 },
                { x: 130, y: 106, w: 26, h: 26, cr: 160, cg: 60, cb: 200 },
                { x: 162, y: 106, w: 26, h: 26, cr: 220, cg: 80, cb: 130 },
                // Row 2: number buttons + operator
                { x: 68, y: 138, w: 26, h: 26, cr: 80, cg: 80, cb: 100 },
                { x: 99, y: 138, w: 26, h: 26, cr: 80, cg: 80, cb: 100 },
                { x: 130, y: 138, w: 26, h: 26, cr: 80, cg: 80, cb: 100 },
                { x: 162, y: 138, w: 26, h: 26, cr: 220, cg: 80, cb: 130 },
                // Row 3: zero + decimal + equals
                { x: 68, y: 170, w: 58, h: 26, cr: 80, cg: 80, cb: 100 },
                { x: 130, y: 170, w: 26, h: 26, cr: 80, cg: 80, cb: 100 },
                { x: 162, y: 170, w: 26, h: 26, cr: 220, cg: 80, cb: 220 },
            ];

            for (const btn of buttons) {
                if (isInRoundedRect(x, y, btn.x, btn.y, btn.w, btn.h, 8)) {
                    r = btn.cr;
                    g = btn.cg;
                    b = btn.cb;
                    break;
                }
            }

            rawData[pixelOffset] = Math.floor(r);
            rawData[pixelOffset + 1] = Math.floor(g);
            rawData[pixelOffset + 2] = Math.floor(b);
            rawData[pixelOffset + 3] = 255;
        }
    }

    // Compress
    const compressed = zlib.deflateSync(rawData);

    // Build PNG
    const png = [];

    // Signature
    png.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    png.push(createChunk('IHDR', ihdr));

    // IDAT
    png.push(createChunk('IDAT', compressed));

    // IEND
    png.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(png);
}

function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData) >>> 0, 0);

    return Buffer.concat([len, typeBuffer, data, crc]);
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xEDB88320;
            } else {
                crc >>>= 1;
            }
        }
    }
    return crc ^ 0xFFFFFFFF;
}

function isInRoundedRect(px, py, rx, ry, rw, rh, radius) {
    if (px < rx || px >= rx + rw || py < ry || py >= ry + rh) return false;

    // Check corners
    const corners = [
        { cx: rx + radius, cy: ry + radius },           // top-left
        { cx: rx + rw - radius, cy: ry + radius },      // top-right
        { cx: rx + radius, cy: ry + rh - radius },      // bottom-left
        { cx: rx + rw - radius, cy: ry + rh - radius }, // bottom-right
    ];

    for (const corner of corners) {
        const inCornerX = (px < rx + radius && corner.cx === rx + radius) || (px >= rx + rw - radius && corner.cx === rx + rw - radius);
        const inCornerY = (py < ry + radius && corner.cy === ry + radius) || (py >= ry + rh - radius && corner.cy === ry + rh - radius);

        if (inCornerX && inCornerY) {
            const dx = px - corner.cx;
            const dy = py - corner.cy;
            if (dx * dx + dy * dy > radius * radius) return false;
        }
    }

    return true;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

const pngBuffer = createPNG(WIDTH, HEIGHT);
const outputPath = path.join(__dirname, 'assets', 'icon.png');
fs.writeFileSync(outputPath, pngBuffer);
console.log(`Icon created at ${outputPath} (${pngBuffer.length} bytes)`);
