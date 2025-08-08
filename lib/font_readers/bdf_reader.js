'use strict';

const AppError = require('../app_error');
const BitmapFontReader = require('./bitmap_font_reader');

/**
 * BDF font reader and parser
 *
 * ref: https://adobe-type-tools.github.io/font-tech-notes/pdfs/5005.BDF_Spec.pdf
 */
class BDFReader extends BitmapFontReader {
  constructor(sourcePath, sourceBuffer, args) {
    super(sourcePath, sourceBuffer, args, null);

    this.lines = sourceBuffer.toString('utf-8').split(/\r?\n/);
    this.fontInfo = {};
    this.properties = {};
    this.glyphs = new Map();
    this.encoding = new Map();

    this.parse();
    this.reader = this;
  }

  static isBDFFont(buffer) {
    const text = buffer.toString('utf-8', 0, Math.min(100, buffer.length));
    return text.startsWith('STARTFONT');
  }

  parse() {
    try {
      let i = 0;

      // Header
      while (i < this.lines.length) {
        const line = this.lines[i].trim();
        const command = line.split(' ')[0];

        switch (command) {
          case 'STARTFONT':
            this.fontInfo.version = line.split(' ')[1];
            break;

          case 'FONT':
            this.fontInfo.name = line.substring(5);
            break;

          case 'SIZE': {
            const parts = line.split(' ');
            this.fontInfo.pointSize = parseInt(parts[1], 10);
            this.fontInfo.xResolution = parseInt(parts[2], 10);
            this.fontInfo.yResolution = parseInt(parts[3], 10);
            break;
          }

          case 'FONTBOUNDINGBOX': {
            const parts = line.split(' ');
            this.fontInfo.boundingBox = {
              width: parseInt(parts[1], 10),
              height: parseInt(parts[2], 10),
              xOffset: parseInt(parts[3], 10),
              yOffset: parseInt(parts[4], 10)
            };
            break;
          }

          case 'STARTPROPERTIES':
            i = this.parseProperties(i + 1);
            continue;

          case 'CHARS':
            this.fontInfo.charCount = parseInt(line.split(' ')[1], 10);
            i = this.parseChars(i + 1);
            return this;
        }
        i++;
      }

      return this;
    } catch (error) {
      throw new AppError(`BDF parsing error: ${error.message}`);
    }
  }

  // BDF can have an arbitrary number of properties between STARTPROPERTIES and ENDPROPERTIES.
  // Each one is a "word" followed by an integer or quoted string using two double-quotes to escape a quote.
  // The definition of "word" is ambiguous, so we'll take it to be \w+.
  // This is a simple parser for an outmoded format, but it tries to do the right thing where it can.
  parseProperties(startIndex) {
    let i = startIndex;
    while (i < this.lines.length) {
      const line = this.lines[i].trim();

      if (line === 'ENDPROPERTIES') {
        break;
      }

      const match = line.match(/^(\w+)\s+(.+)$/);
      if (!match) {
        throw new AppError(`Invalid BDF property: ${line}`);
      }

      const [ , key, value ] = match;

      // Check if it's a quoted string
      if (value.startsWith('"')) {
        if (!(value.endsWith('"'))) {
          throw new AppError(`Unterminated BDF string property: ${line}`);
        }
        this.properties[key] = value.slice(1, -1).replace(/""/g, '"');
      } else {
        const intValue = parseInt(value, 10);
        if (isNaN(intValue)){
          throw new AppError(`Invalid BDF property: ${line} (expecting integer)`);
        }
        this.properties[key] = intValue;
      }
      i++;
    }
    // return the number of properties to jump forward in the parse loop.
    return i;
  }

  parseChars(startIndex) {
    let i = startIndex;

    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      const command = line.split(' ')[0];

      switch (command) {
        case 'STARTCHAR':
          i = this.parseGlyph(i);
          break;

        case 'ENDFONT':
          return i;
      }
      i++;
    }
    return i;
  }

  parseGlyph(startIndex) {
    let i = startIndex;
    const glyph = {};
    // STARTCHAR <glyph name>
    glyph.name = this.lines[i].substring(10);
    i++;

    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      const glyphProp = line.split(' ')[0];

      switch (glyphProp) {
        case 'ENCODING':
          glyph.encoding = parseInt(line.split(' ')[1], 10);
          this.encoding.set(glyph.encoding, glyph.name);
          break;

        case 'SWIDTH': {
          const parts = line.split(' ');
          glyph.swidth = { x: parseInt(parts[1], 10), y: parseInt(parts[2], 10) };
          break;
        }

        case 'DWIDTH': {
          const parts = line.split(' ');
          glyph.dwidth = { x: parseInt(parts[1], 10), y: parseInt(parts[2], 10) };
          break;
        }

        case 'BBX': {
          const parts = line.split(' ');
          glyph.bbx = {
            width: parseInt(parts[1], 10),
            height: parseInt(parts[2], 10),
            xOffset: parseInt(parts[3], 10),
            yOffset: parseInt(parts[4], 10)
          };
          break;
        }

        case 'BITMAP':
          i = this.parseBitmap(i + 1, glyph);
          this.glyphs.set(glyph.name, glyph);
          return i;
      }
      i++;
    }

    return i;
  }

  parseBitmap(startIndex, glyph) {
    let i = startIndex;
    const hexData = [];

    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      if (line === 'ENDCHAR') {
        break;
      }
      hexData.push(line);
      i++;
    }

    glyph.bitmap = this.hexToBitmap(hexData, glyph.bbx);
    return i;
  }

  hexToBitmap(hexData, bbx) {
    const pixels = [];
    const width = bbx.width;
    const height = bbx.height;

    for (let y = 0; y < height; y++) {
      const row = [];
      const hexLine = hexData[y] || '00';
      // account for odd widths
      const bytesNeeded = Math.ceil(width / 8);

      // hex string -> bytes
      const bytes = [];
      for (let b = 0; b < bytesNeeded; b++) {
        const hex = hexLine.substring(b * 2, (b + 1) * 2) || '00';
        bytes.push(parseInt(hex, 16) || 0);
      }

      // bytes -> bitmap
      for (let x = 0; x < width; x++) {
        const byteIndex = Math.floor(x / 8);
        const bitIndex = 7 - (x % 8); // MSB first
        const bit = (bytes[byteIndex] >> bitIndex) & 1;
        row.push(bit * 255); // grayscale
      }

      pixels.push(row);
    }

    return pixels;
  }

  hasGlyph(charCode) {
    const glyphName = this.encoding.get(charCode);
    return glyphName && this.glyphs.has(glyphName);
  }

  getGlyph(charCode) {
    const glyphName = this.encoding.get(charCode);
    if (!glyphName || !this.glyphs.has(glyphName)) return null;

    const glyph = this.glyphs.get(glyphName);

    return {
      width: glyph.bbx.width,
      height: glyph.bbx.height,
      left: glyph.bbx.xOffset,
      top: glyph.bbx.yOffset + glyph.bbx.height, // baseline-relative
      advance_width: glyph.dwidth.x,
      pixels: glyph.bitmap
    };
  }

  getFontMetrics() {
    // BDF supports a "METRICSET" property to define writing direction, but LVGL
    // takes care of that with user-preferences.
    // TODO: Ignore?
    if (this.properties.METRICSSET && this.properties.METRICSSET !== 0) {
      throw new AppError(
        `BDF METRICSSET ${this.properties.METRICSSET} not supported. Only horizontal metrics supported.`
      );
    }

    // The only properties we care about are FONT_ASCENT and FONT_DESCENT.
    const fontAscent = parseInt(this.properties.FONT_ASCENT || this.fontInfo.boundingBox.height * 0.8, 10);
    const fontDescent = parseInt(this.properties.FONT_DESCENT || this.fontInfo.boundingBox.height * 0.2, 10);

    return {
      fontAscent,
      fontDescent
    };
  }

  getNativeSize() {
    return this.fontInfo.boundingBox.height;
  }
}

module.exports = BDFReader;
