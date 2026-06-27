// Generate a simple 256x256 PNG icon for Daybook
// PNG format with a colored square
import { writeFileSync } from 'fs';
import { Buffer } from 'buffer';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Create raw pixel data (RGBA)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      // Create a rounded rectangle effect
      const margin = 20;
      const cornerRadius = 40;
      const inner = x >= margin && x < width - margin && y >= margin && y < height - margin;
      
      let inCorner = false;
      if (inner) {
        // Check corners
        const corners = [
          [margin + cornerRadius, margin + cornerRadius],
          [width - margin - cornerRadius, margin + cornerRadius],
          [margin + cornerRadius, height - margin - cornerRadius],
          [width - margin - cornerRadius, height - margin - cornerRadius],
        ];
        
        for (const [cx, cy] of corners) {
          if (
            ((x < margin + cornerRadius && y < margin + cornerRadius) ||
             (x >= width - margin - cornerRadius && y < margin + cornerRadius) ||
             (x < margin + cornerRadius && y >= height - margin - cornerRadius) ||
             (x >= width - margin - cornerRadius && y >= height - margin - cornerRadius))
          ) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
              inCorner = true;
              break;
            }
          }
        }
      }
      
      if (inner && !inCorner) {
        // Draw a "D" letter
        const centerX = width / 2;
        const centerY = height / 2;
        const letterD = (
          // Vertical bar of D
          (x >= centerX - 60 && x <= centerX - 30 && y >= centerY - 70 && y <= centerY + 70) ||
          // Curve of D (simplified as a semi-circle)
          (
            Math.sqrt((x - (centerX - 60)) ** 2 + (y - centerY) ** 2) >= 40 &&
            Math.sqrt((x - (centerX - 60)) ** 2 + (y - centerY) ** 2) <= 70 &&
            x >= centerX - 60 &&
            (x - (centerX - 60)) >= Math.abs(y - centerY) * 0.3
          )
        );
        
        if (letterD) {
          rawData[offset] = 255;
          rawData[offset + 1] = 255;
          rawData[offset + 2] = 255;
          rawData[offset + 3] = 255;
        } else {
          rawData[offset] = r;
          rawData[offset + 1] = g;
          rawData[offset + 2] = b;
          rawData[offset + 3] = 255;
        }
      } else {
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0; // transparent
      }
    }
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeBuffer, data, crcBuffer]);
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return ~crc;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Create 256x256 icon with a blue color (#3B82F6)
const png = createPNG(256, 256, 59, 130, 246);
writeFileSync('public/icon.png', png);
console.log('Icon created: public/icon.png (256x256)');
