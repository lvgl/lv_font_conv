'use strict';


const u = require('../utils');
const debug = require('debug')('font.table.head');

const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_VERSION = O_LABEL + 4;
const O_TABLES = O_VERSION + 4;
const O_FONT_SIZE = O_TABLES + 2;
const O_ASCENT = O_FONT_SIZE + 2;
const O_DESCENT = O_ASCENT + 2;
const O_MIN_Y = O_DESCENT + 2;
const O_MAX_Y = O_MIN_Y + 2;
const O_DEF_ADVANCE_WIDTH = O_MAX_Y + 2;
const O_INDEX_TO_LOC_FORMAT = O_DEF_ADVANCE_WIDTH + 2;
const O_GLYPH_ID_FORMAT = O_INDEX_TO_LOC_FORMAT + 1;
const O_KERN_FORMAT = O_GLYPH_ID_FORMAT + 1;
const O_ADVANCE_WIDTH_FORMAT = O_KERN_FORMAT + 1;
const O_BITS_PER_PIXEL = O_ADVANCE_WIDTH_FORMAT + 1;
const O_XY_BITS = O_BITS_PER_PIXEL + 1;
const O_WH_BITS = O_XY_BITS + 1;
const O_ADVANCE_WIDTH_BITS = O_WH_BITS + 1;
const O_COMPRESSION_ID = O_ADVANCE_WIDTH_BITS + 1;
const HEAD_LENGTH = u.align4(O_COMPRESSION_ID + 1);


class Head {
  constructor(font) {
    this.font = font;
    this.label = 'head';
    this.version = 1;
  }

  toBin() {
    const buf = Buffer.alloc(HEAD_LENGTH);
    debug(`table size = ${buf.length}`);

    buf.writeUInt32LE(HEAD_LENGTH, O_SIZE);
    buf.write(this.label, O_LABEL);
    buf.writeUInt32LE(this.version, O_VERSION);

    const f = this.font;

    const tables_count = f.hasKerning() ? 4 : 3;

    buf.writeUInt16LE(tables_count, O_TABLES);

    buf.writeUInt16LE(f.size, O_FONT_SIZE);
    buf.writeUInt16LE(f.ascent, O_ASCENT);
    buf.writeInt16LE(f.descent, O_DESCENT);

    buf.writeInt16LE(f.minY, O_MIN_Y);
    buf.writeInt16LE(f.maxY, O_MAX_Y);

    if (f.monospaced) {
      buf.writeUInt16LE(f.widthToInt(f.src.glyphs[0].advanceWidth), O_DEF_ADVANCE_WIDTH);
    } else {
      buf.writeUInt16LE(0, O_DEF_ADVANCE_WIDTH);
    }

    buf.writeUInt8(f.indexToLocFormat, O_INDEX_TO_LOC_FORMAT);
    buf.writeUInt8(f.glyphIdFofmat, O_GLYPH_ID_FORMAT);
    buf.writeUInt8(f.kerningFormat, O_KERN_FORMAT);
    buf.writeUInt8(f.advanceWidthFormat, O_ADVANCE_WIDTH_FORMAT);

    buf.writeUInt8(f.opts.bpp, O_BITS_PER_PIXEL);
    buf.writeUInt8(f.xy_bits, O_XY_BITS);
    buf.writeUInt8(f.wh_bits, O_WH_BITS);

    if (f.monospaced) buf.writeUInt8(0, O_ADVANCE_WIDTH_BITS);
    else buf.writeUInt8(f.advanceWidthBits, O_ADVANCE_WIDTH_BITS);

    buf.writeUInt8(f.glyf.getCompressionCode(), O_COMPRESSION_ID);

    return buf;
  }
}


module.exports = Head;
