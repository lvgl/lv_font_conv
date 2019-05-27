'use strict';


const _ = require('lodash');
const build_subtables = require('./cmap_build_subtables');
const u = require('../utils');
const debug = require('debug')('font.table.cmap');


const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_COUNT = O_LABEL + 4;

const HEAD_LENGTH = O_COUNT + 4;

const SUB_FORMAT_0 = 0;
const SUB_FORMAT_0_TINY = 2;
const SUB_FORMAT_SPARSE = 1;
const SUB_FORMAT_SPARSE_TINY = 3;


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

    let subtables_plan = build_subtables(f.src.glyphs.map(g => g.code));

    const count_format0 = subtables_plan.filter(s => s[0] === 'format0').length;
    const count_sparse = subtables_plan.length - count_format0;
    debug(`${subtables_plan.length} subtable(s): ${count_format0} "format 0", ${count_sparse} "sparse"`);

    for (let [ format, codepoints ] of subtables_plan) {
      let g = this.glyphByCode(codepoints[0]);
      let start_glyph_id = f.glyph_id[g.code];
      let min_code = codepoints[0];
      let max_code = codepoints[codepoints.length - 1];

      if (format === 'format0_tiny') {
        this.sub_heads.push(this.createSubHeader(
          min_code,
          max_code - min_code + 1,
          start_glyph_id,
          max_code - min_code + 1,
          SUB_FORMAT_0_TINY
        ));
      } else if (format === 'format0') {
        this.sub_heads.push(this.createSubHeader(
          min_code,
          max_code - min_code + 1,
          start_glyph_id,
          max_code - min_code + 1,
          SUB_FORMAT_0
        ));
        this.sub_data.push(this.create_format0_data(min_code, max_code, start_glyph_id));
      } else if (format === 'sparse_tiny') {
        this.sub_heads.push(this.createSubHeader(
          min_code,
          max_code - min_code + 1,
          start_glyph_id,
          codepoints.length,
          SUB_FORMAT_SPARSE_TINY
        ));
        this.sub_data.push(this.create_sparse_tiny_data(codepoints, start_glyph_id));
      } else { // assume format === 'sparse'
        this.sub_heads.push(this.createSubHeader(
          min_code,
          max_code - min_code + 1,
          start_glyph_id,
          codepoints.length,
          SUB_FORMAT_SPARSE
        ));
        this.sub_data.push(this.create_sparse_data(codepoints, start_glyph_id));
      }
    }

    this.subHeaderUpdateAllOffsets();
  }

  createSubHeader(rangeStart, rangeLen, glyphIdOffset, total, type) {
    const buf = Buffer.alloc(16);

    // buf.writeUInt32LE(offset, 0); offset unknown at this moment
    buf.writeUInt32LE(rangeStart, 4);
    buf.writeUInt16LE(rangeLen, 8);
    buf.writeUInt16LE(glyphIdOffset, 10);
    buf.writeUInt16LE(total, 12);
    buf.writeUInt8(type, 14);

    return buf;
  }

  subHeaderUpdateOffset(header, val) {
    header.writeUInt32LE(val, 0);
  }

  subHeaderUpdateAllOffsets() {
    for (let i = 0; i < this.sub_heads.length; i++) {
      const offset = HEAD_LENGTH +
        _.sum(this.sub_heads.map(h => h.length)) +
        _.sum(this.sub_data.slice(0, i).map(d => d.length));

      this.subHeaderUpdateOffset(this.sub_heads[i], offset);
    }
  }

  glyphByCode(code) {
    for (let g of this.font.src.glyphs) {
      if (g.code === code) return g;
    }

    return null;
  }

  create_format0_data(min_code, max_code, start_glyph_id) {
    let data = [];

    for (let i = min_code; i <= max_code; i++) {
      const g = this.glyphByCode(i);

      if (!g) {
        data.push(0);
        continue;
      }

      const id_delta = this.font.glyph_id[g.code] - start_glyph_id;

      if (id_delta < 0 || id_delta > 255) throw new Error('Glyph ID delta out of Format 0 range');

      data.push(id_delta);
    }

    const buf = Buffer.alloc(u.align4(data.length));

    for (let i = 0; i < data.length; i++) {
      buf.writeUInt8(data[i], i);
    }

    return buf;
  }

  /*
  create_format6_data(min_code, max_code, start_glyph_id) {
    let data = [];

    for (let i = min_code; i <= max_code; i++) {
      const g = this.glyphByCode(i);

      if (!g) {
        data.push(0);
        continue;
      }

      const id_delta = this.font.glyph_id[g.code] - start_glyph_id;

      if (id_delta < 0 || id_delta > 65535) throw new Error('Glyph ID delta out of Format 1 range');

      data.push(id_delta);
    }

    const buf = Buffer.alloc(u.align4(data.length * 2));

    for (let i = 0; i < data.length; i++) {
      buf.writeUInt16LE(data[i], i * 2);
    }

    return buf;
  }
  */

  create_sparse_data(codepoints, start_glyph_id) {
    let codepoints_list = [];
    let ids_list = [];

    for (let code of codepoints) {
      let g = this.glyphByCode(code);
      let id = this.font.glyph_id[g.code];

      let code_delta = code - codepoints[0];
      let id_delta   = id - start_glyph_id;

      if (code_delta < 0 || code_delta > 65535) throw new Error('Codepoint delta out of range');
      if (id_delta < 0 || id_delta > 65535) throw new Error('Glyph ID delta out of range');

      codepoints_list.push(code_delta);
      ids_list.push(id_delta);
    }

    const buf_cp = Buffer.alloc(codepoints_list.length * 2);

    for (let i = 0; i < codepoints_list.length; i++) {
      buf_cp.writeUInt16LE(codepoints_list[i], i * 2);
    }

    const buf_id = Buffer.alloc(ids_list.length * 2);

    for (let i = 0; i < ids_list.length; i++) {
      buf_id.writeUInt16LE(ids_list[i], i * 2);
    }

    return u.balign4(Buffer.concat([ buf_cp, buf_id ]));
  }

  create_sparse_tiny_data(codepoints) {
    let codepoints_list = [];

    for (let code of codepoints) {
      let code_delta = code - codepoints[0];

      if (code_delta < 0 || code_delta > 65535) throw new Error('Codepoint delta out of range');

      codepoints_list.push(code_delta);
    }

    const buf_cp = Buffer.alloc(codepoints_list.length * 2);

    for (let i = 0; i < codepoints_list.length; i++) {
      buf_cp.writeUInt16LE(codepoints_list[i], i * 2);
    }

    return u.balign4(buf_cp);
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
