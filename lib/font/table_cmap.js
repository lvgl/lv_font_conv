'use strict';


const _ = require('lodash');
const u = require('../utils');
const debug = require('debug')('font.table.cmap');


const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_COUNT = O_LABEL + 4;

const HEAD_LENGTH = O_COUNT + 4;

const SUB_FORMAT_0 = 0;
//const SUB_FORMAT_6 = 1;
//const SUB_FORMAT_SPATIAL = 2;


class Cmap {
  constructor(font) {
    this.font = font;
    this.label = 'cmap';

    this.sub_heads = [];
    this.sub_data = [];
  }

  compile() {
    this.compiled = true;

    const f = this.font;

    // TODO
    if (f.src.glyphs[f.src.glyphs.length - 1].code > 255) {
      throw new Error('Codes > 255 not supported yet');
    }

    // Create single Format 0 subtable
    const min = _.min(f.src.glyphs.map(g => g.code));
    const max = _.max(f.src.glyphs.map(g => g.code)) + 1;
    const total = max - min + 1;

    this.sub_heads.push(this.createSubHeader(min, max, total, SUB_FORMAT_0));
    this.sub_data.push(this.create_format0_data(min, max));

    this.subHeaderUpdateAllOffsets();
  }

  createSubHeader(first, last, total, type) {
    const buf = Buffer.alloc(16);

    buf.writeUInt32LE(first, 0);
    buf.writeUInt32LE(last, 4);
    // buf.writeUInt32LE(offset, 8); offset unknown at this moment
    buf.writeUInt16LE(total, 12);
    buf.writeUInt8(type, 14);

    return buf;
  }

  subHeaderUpdateOffset(header, val) {
    header.writeUInt32LE(val, 8);
  }

  subHeaderUpdateAllOffsets() {
    for (let i = 0; i < this.sub_heads.length; i++) {
      const offset = HEAD_LENGTH +
        _.sum(this.sub_heads.map(h => h.length)) +
        _.sum(this.sub_data.slice(0, i));

      this.subHeaderUpdateOffset(this.sub_heads[i], offset);
    }
  }

  glyphByCode(code) {
    for (let g of this.font.src.glyphs) {
      if (g.code === code) return g;
    }

    return null;
  }

  create_format0_data(min, max) {
    let data = [];

    for (let i = min; i <= max; i++) {
      const g = this.glyphByCode(i);

      if (!g) {
        data.push(0);
        continue;
      }

      const id = this.font.glyph_id[g.code];

      if (id > 255) throw new Error('ID out of Format 0 range');

      data.push(id);
    }

    const buf = Buffer.alloc(u.align4(data.length));

    for (let i = 0; i < data.length; i++) {
      buf.writeUInt8(data[i], i);
    }

    return buf;
  }

  create_format6_data(min, max) {
    let data = [];

    for (let i = min; i <= max; i++) {
      const g = this.glyphByCode(i);

      if (!g) {
        data.push(0);
        continue;
      }

      const id = this.font.glyph_id[g.code];

      if (id > 65535) throw new Error('ID out of Format 1 range');

      data.push(id);
    }

    const buf = Buffer.alloc(u.align4(data.length * 2));

    for (let i = 0; i < data.length; i++) {
      buf.writeUInt16LE(data[i], i * 2);
    }

    return buf;
  }

  toBin() {
    if (!this.compiled) this.compile();

    const buf = Buffer.concat([
      Buffer.alloc(HEAD_LENGTH),
      Buffer.concat(this.sub_heads),
      Buffer.concat(this.sub_data)
    ]);
    debug(`table size = ${buf.length}`);

    buf.writeUInt32LE(buf.length, O_SIZE);
    buf.write(this.label, O_LABEL);
    buf.writeUInt32LE(this.sub_heads.length, O_COUNT);

    return buf;
  }
}


module.exports = Cmap;
