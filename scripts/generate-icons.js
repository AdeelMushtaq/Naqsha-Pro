import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function generateBlueprintPNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  // RGBA raw bytes per scanline: 1 filter byte (0) + 4 bytes per pixel
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const bgR = 15, bgG = 23, bgB = 42; // #0f172a
  const gridR = 30, gridG = 41, gridB = 59; // #1e293b
  const wallR = 56, wallG = 189, wallB = 248; // #38bdf8 cyan
  const accentR = 245, accentG = 158, accentB = 11; // #f59e0b amber

  const padding = isMaskable ? Math.round(size * 0.15) : Math.round(size * 0.08);
  const innerW = size - padding * 2;
  const innerH = size - padding * 2;
  const wallThickness = Math.max(3, Math.round(size * 0.025));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Default background
      let r = bgR, g = gridG, b = bgB, a = 255;

      // Blueprint grid (every size / 16 px)
      const gridSize = Math.max(16, Math.round(size / 16));
      if (x % gridSize === 0 || y % gridSize === 0) {
        r = gridR; g = gridG; b = gridB;
      }

      // Rounded rect border for non-maskable or plain for maskable
      const inBox = x >= padding && x <= size - padding && y >= padding && y <= size - padding;
      
      // Outer walls
      const isWallX = (Math.abs(x - padding) <= wallThickness || Math.abs(x - (size - padding)) <= wallThickness) && (y >= padding && y <= size - padding);
      const isWallY = (Math.abs(y - padding) <= wallThickness || Math.abs(y - (size - padding)) <= wallThickness) && (x >= padding && x <= size - padding);
      
      // Center dividing wall
      const midX = Math.round(size / 2);
      const isMidWall = Math.abs(x - midX) <= wallThickness && (y >= padding && y <= size - padding);

      // Door swing arc approximation
      const arcCenterX = midX;
      const arcCenterY = Math.round(size * 0.6);
      const distToArcCenter = Math.hypot(x - arcCenterX, y - arcCenterY);
      const arcRadius = Math.round(size * 0.18);
      const isArc = Math.abs(distToArcCenter - arcRadius) <= Math.max(2, Math.round(wallThickness * 0.6)) && x >= arcCenterX && y <= arcCenterY;

      if (isArc) {
        r = accentR; g = accentG; b = accentB;
      } else if (isWallX || isWallY || isMidWall) {
        // Cut out a door space on the mid wall
        if (isMidWall && y >= Math.round(size * 0.45) && y <= Math.round(size * 0.65)) {
          // empty space for door opening
        } else {
          r = wallR; g = wallG; b = wallB;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Header chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  const idatData = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateBlueprintPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateBlueprintPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateBlueprintPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateBlueprintPNG(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generateBlueprintPNG(64, false));

console.log('Successfully generated PWA icon assets in /public');
