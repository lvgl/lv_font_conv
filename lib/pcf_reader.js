// PCF font reader

'use strict';

const AppError = require('./app_error');

// PCF table types
// Currently ignoring:
//  - PCF_INK_METRICS (1<<4)
//    T
//  - PCF_SWIDTHS (1<<6)
//  - PCF_GLYPH_NAMES (1<<7)
const PCF_ACCELERATORS = (1 << 1);        // font metrics
const PCF_METRICS = (1 << 2);             // glyph metrics
const PCF_BITMAPS = (1 << 3);             // glyph bitmaps
const PCF_BDF_ENCODINGS = (1 << 5);       // character encoding
const PCF_BDF_ACCELERATORS = (1 << 8);    // BDF-style font metrics (prefer if present)

// Format flags
const PCF_COMPRESSED_METRICS = (1 << 8);  // metrics use bytes vs shorts
const PCF_BYTE_MASK = (1 << 2);           // big endian
const PCF_BIT_MASK = (1 << 3);            // MSB first
const PCF_GLYPH_PAD_MASK = 3;             // padding

/**
 * PCF font parser
 *
 * ref: https://fontforge.org/docs/techref/pcf-format.html
 */
class PCFReader {
  constructor(buffer) {
    if (Buffer.isBuffer(buffer)) {
      this.buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      this.buffer = buffer;
    }
    this.view = new DataView(this.buffer);
    this.pos = 0;
    this.tables = {};
  }

  readUInt32(littleEndian = true) {
    const value = this.view.getUint32(this.pos, littleEndian);
    this.pos += 4;
    return value;
  }

  readInt32(littleEndian = true) {
    const value = this.view.getInt32(this.pos, littleEndian);
    this.pos += 4;
    return value;
  }

  readUInt16(littleEndian = true) {
    const value = this.view.getUint16(this.pos, littleEndian);
    this.pos += 2;
    return value;
  }

  readInt16(littleEndian = true) {
    const value = this.view.getInt16(this.pos, littleEndian);
    this.pos += 2;
    return value;
  }

  readUInt8() {
    const value = this.view.getUint8(this.pos);
    this.pos += 1;
    return value;
  }

  seek(pos) {
    this.pos = pos;
  }

  align4() {
    this.pos = (this.pos + 3) & ~3;
  }

  parseHeader() {
    // Skip magic, since we should have already parsed this.
    this.pos = 4;
    const tableCount = this.readUInt32(true);

    for (let i = 0; i < tableCount; i++) {
      const type = this.readUInt32(true);
      const format = this.readUInt32(true);
      const size = this.readUInt32(true);
      const offset = this.readUInt32(true);

      this.tables[type] = { format, size, offset };
    }
  }

  parseFormat(formatValue) {
    return {
      glyphPad: 1 << (formatValue & PCF_GLYPH_PAD_MASK),
      isMSBFirst: !!(formatValue & PCF_BIT_MASK),
      isBigEndian: !!(formatValue & PCF_BYTE_MASK),
      isCompressed: !!(formatValue & PCF_COMPRESSED_METRICS)
    };
  }

  parseMetrics(table) {
    this.seek(table.offset);
    const formatValue = this.readUInt32(true); // Format is always little-endian
    const format = this.parseFormat(formatValue);

    let glyphCount;
    if (format.isCompressed) {
      glyphCount = this.readUInt16(!format.isBigEndian);
    } else {
      glyphCount = this.readUInt32(!format.isBigEndian);
    }

    const metrics = [];
    for (let i = 0; i < glyphCount; i++) {
      let leftSideBearing, rightSideBearing, characterWidth;
      let ascent, descent, attributes;

      if (format.isCompressed) {
        // Compressed metrics: unsigned bytes offset by 0x80
        leftSideBearing = this.readUInt8() - 0x80;
        rightSideBearing = this.readUInt8() - 0x80;
        characterWidth = this.readUInt8() - 0x80;
        ascent = this.readUInt8() - 0x80;
        descent = this.readUInt8() - 0x80;
        attributes = 0;
      } else {
        // Uncompressed metrics: signed 16-bit values
        leftSideBearing = this.readInt16(!format.isBigEndian);
        rightSideBearing = this.readInt16(!format.isBigEndian);
        characterWidth = this.readInt16(!format.isBigEndian);
        ascent = this.readInt16(!format.isBigEndian);
        descent = this.readInt16(!format.isBigEndian);
        attributes = this.readUInt16(!format.isBigEndian);
      }

      metrics.push({
        leftSideBearing,
        rightSideBearing,
        characterWidth,
        ascent,
        descent,
        attributes
      });
    }

    return metrics;
  }

  parseEncodings(table) {
    const NO_GLYPH = 0xFFFF;
    this.seek(table.offset);
    const formatValue = this.readUInt32(true);
    const format = this.parseFormat(formatValue);

    // Character encoding ranges - supports both single-byte and multi-byte
    // ref: https://fontforge.org/docs/techref/pcf-format.html#the-encoding-table
    const minCharOrByte2 = this.readUInt16(!format.isBigEndian);
    const maxCharOrByte2 = this.readUInt16(!format.isBigEndian);
    const minByte1 = this.readUInt16(!format.isBigEndian);
    const maxByte1 = this.readUInt16(!format.isBigEndian);
    const defaultChar = this.readUInt16(!format.isBigEndian);

    // character code -> glyph index lookup table
    const encodingCount = (maxCharOrByte2 - minCharOrByte2 + 1) * (maxByte1 - minByte1 + 1);
    const glyphIndices = [];

    for (let i = 0; i < encodingCount; i++) {
      const glyphIndex = this.readUInt16(!format.isBigEndian);
      glyphIndices.push(glyphIndex === NO_GLYPH ? -1 : glyphIndex);
    }

    return {
      minCharOrByte2,
      maxCharOrByte2,
      minByte1,
      maxByte1,
      defaultChar,
      glyphIndices
    };
  }

  // Parse bitmap table
  parseBitmaps(table) {
    this.seek(table.offset);
    const formatValue = this.readUInt32(true); // Format is always little-endian
    const format = this.parseFormat(formatValue);

    const glyphCount = this.readUInt32(!format.isBigEndian);

    // bitmap offsets
    const offsets = [];
    for (let i = 0; i < glyphCount; i++) {
      offsets.push(this.readUInt32(!format.isBigEndian));
    }

    // Read bitmap sizes (4 values)
    const bitmapSizes = [
      this.readUInt32(!format.isBigEndian), // no padding
      this.readUInt32(!format.isBigEndian), // pad to 2-byte boundary
      this.readUInt32(!format.isBigEndian), // pad to 4-byte boundary
      this.readUInt32(!format.isBigEndian)  // pad to 8-byte boundary
    ];

    const bitmapDataStart = this.pos;
    const bitmapSize = bitmapSizes[format.glyphPad >> 1];

    return {
      format,
      glyphCount,
      offsets,
      bitmapData: new Uint8Array(this.buffer, bitmapDataStart, bitmapSize)
    };
  }

  // Parse accelerator table
  parseAccelerators(table) {
    this.seek(table.offset);
    const formatValue = this.readUInt32(true); // Format is always little-endian
    const format = this.parseFormat(formatValue);

    // Skip flags (8 bytes)
    this.pos += 8;

    const fontAscent = this.readInt32(!format.isBigEndian);
    const fontDescent = this.readInt32(!format.isBigEndian);
    const maxOverlap = this.readInt32(!format.isBigEndian);

    return {
      fontAscent,
      fontDescent,
      maxOverlap
    };
  }

  charCodeToGlyphIndex(charCode) {
    // single byte
    if (this.encoding.minByte1 === 0 && this.encoding.maxByte1 === 0) {
      if (charCode >= this.encoding.minCharOrByte2 && charCode <= this.encoding.maxCharOrByte2) {
        const index = charCode - this.encoding.minCharOrByte2;
        return index < this.encoding.glyphIndices.length ? this.encoding.glyphIndices[index] : -1;
      }
    } else {
      // multi-byte
      const byte1 = (charCode >> 8) & 0xFF;
      const byte2 = charCode & 0xFF;

      if (byte1 >= this.encoding.minByte1 && byte1 <= this.encoding.maxByte1 &&
          byte2 >= this.encoding.minCharOrByte2 && byte2 <= this.encoding.maxCharOrByte2) {
        const row = byte1 - this.encoding.minByte1;
        const col = byte2 - this.encoding.minCharOrByte2;
        const cols = this.encoding.maxCharOrByte2 - this.encoding.minCharOrByte2 + 1;
        const index = row * cols + col;

        return index < this.encoding.glyphIndices.length ? this.encoding.glyphIndices[index] : -1;
      }
    }

    return -1;
  }

  // Extract bitmap for a specific glyph
  extractGlyphBitmap(glyphIndex) {
    if (glyphIndex < 0 || glyphIndex >= this.bitmaps.glyphCount || glyphIndex >= this.metrics.length) {
      return null;
    }

    const metric = this.metrics[glyphIndex];
    const width = metric.rightSideBearing - metric.leftSideBearing;
    const height = metric.ascent + metric.descent;

    if (width <= 0 || height <= 0) {
      return {
        width: 0,
        height: 0,
        pixels: new Uint8Array(0),
        advanceWidth: metric.characterWidth,
        bbox: {
          x: metric.leftSideBearing,
          y: -metric.descent,
          width: 0,
          height: 0
        }
      };
    }

    // Calculate bitmap parameters
    const bytesPerRow = Math.ceil(width / 8);
    const paddedBytesPerRow = Math.ceil(bytesPerRow / this.bitmaps.format.glyphPad) * this.bitmaps.format.glyphPad;

    const offset = this.bitmaps.offsets[glyphIndex];
    const pixels = []; // 2D array to match FreeType format

    // Extract bitmap data
    for (let y = 0; y < height; y++) {
      const rowOffset = offset + y * paddedBytesPerRow;
      const line = [];

      for (let x = 0; x < width; x++) {
        const byteIndex = Math.floor(x / 8);
        const bitIndex = x % 8;

        if (rowOffset + byteIndex < this.bitmaps.bitmapData.length) {
          const byte = this.bitmaps.bitmapData[rowOffset + byteIndex];

          // Handle bit order
          const bit = this.bitmaps.format.isMSBFirst
            ? (byte >> (7 - bitIndex)) & 1
            : (byte >> bitIndex) & 1;

          line.push(bit * 255); // Convert to grayscale
        } else {
          line.push(0);
        }
      }
      pixels.push(line);
    }

    return {
      width,
      height,
      pixels,
      advanceWidth: metric.characterWidth,
      bbox: {
        x: metric.leftSideBearing,
        y: -metric.descent,
        width,
        height
      }
    };
  }

  // Get font metrics
  getFontMetrics() {
    return this.accelerator || { fontAscent: 8, fontDescent: 2 };
  }

  getNativeSize() {
    const metrics = this.getFontMetrics();
    return metrics.fontAscent + Math.abs(metrics.fontDescent);
  }

  parse() {
    try {
      this.parseHeader();

      const metricsTable = this.tables[PCF_METRICS];
      const encodingTable = this.tables[PCF_BDF_ENCODINGS];
      const bitmapTable = this.tables[PCF_BITMAPS];
      const acceleratorTable = this.tables[PCF_BDF_ACCELERATORS] || this.tables[PCF_ACCELERATORS];

      if (!metricsTable || !encodingTable || !bitmapTable) {
        throw new AppError('PCF file missing required tables');
      }

      this.metrics = this.parseMetrics(metricsTable);
      this.encoding = this.parseEncodings(encodingTable);
      this.bitmaps = this.parseBitmaps(bitmapTable);
      this.accelerator = acceleratorTable ? this.parseAccelerators(acceleratorTable) : null;

      return this;
    } catch (error) {
      throw new AppError(`PCF parsing error: ${error.message}`);
    }
  }

  // High-level interface methods for font conversion
  hasGlyph(charCode) {
    const glyphIndex = this.charCodeToGlyphIndex(charCode);
    return glyphIndex >= 0;
  }

  getGlyph(charCode) {
    const glyphIndex = this.charCodeToGlyphIndex(charCode);
    if (glyphIndex < 0) return null;

    const bitmap = this.extractGlyphBitmap(glyphIndex);
    if (!bitmap) return null;

    return {
      width: bitmap.width,
      height: bitmap.height,
      left: bitmap.bbox.x,
      top: bitmap.bbox.y + bitmap.height, // Convert to baseline-relative
      advance_width: bitmap.advanceWidth,
      pixels: bitmap.pixels
    };
  }
}

module.exports = PCFReader;
