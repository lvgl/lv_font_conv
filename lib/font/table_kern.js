'use strict';

const _ = require('lodash');
const u = require('../utils');
const debug = require('debug')('font.table.kern');


const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_FORMAT = O_LABEL + 4;

const HEAD_LENGTH = u.align4(O_FORMAT + 1);


class Kern {
  constructor(font) {
    this.font = font;
    this.label = 'kern';
  }

  collect_format0_data() {
    const f = this.font;
    const glyphs = _.sortBy(this.font.src.glyphs, g => f.glyph_id[g.code]);
    const kernSorted = [];

    for (let g of glyphs) {
      if (_.isEmpty(g.kerning)) continue;

      const glyph_id = f.glyph_id[g.code];
      const paired = _.sortBy(Object.keys(g.kerning), code => f.glyph_id[code]);

      for (let code of paired) {
        const glyph_id2 = f.glyph_id[code];
        kernSorted.push([ glyph_id, glyph_id2, g.kerning[code] ]);
      }
    }

    return kernSorted;
  }

  create_format0_data() {
    const f = this.font;
    const glyphs = this.font.src.glyphs;
    const kernSorted = this.collect_format0_data();

    const count = kernSorted.length;

    const kerned_glyphs = glyphs.filter(g => Object.keys(g.kerning).length).length;
    const kerning_list_max = _.max(glyphs.map(g => Object.keys(g.kerning).length));
    debug(`${kerned_glyphs} kerned glyphs of ${glyphs.length}, ${kerning_list_max} max list, ${count} total pairs`);

    const subheader = Buffer.alloc(4);

    subheader.writeUInt32LE(count, 0);

    const pairs_buf = Buffer.alloc((f.glyphIdFormat ? 4 : 2) * count);

    // Write kerning pairs
    for (let i = 0; i < count; i++) {
      if (f.glyphIdFormat === 0) {
        pairs_buf.writeUInt8(kernSorted[i][0], 2 * i);
        pairs_buf.writeUInt8(kernSorted[i][1], 2 * i + 1);
      } else {
        pairs_buf.writeUInt16LE(kernSorted[i][0], 4 * i);
        pairs_buf.writeUInt16LE(kernSorted[i][1], 4 * i + 2);
      }
    }

    const values_buf = Buffer.alloc(count);

    // Write kerning values
    for (let i = 0; i < count; i++) {
      values_buf.writeInt8(f.kernToFP(kernSorted[i][2]), i); // FP4.4
    }

    let buf = Buffer.concat([
      subheader,
      pairs_buf,
      values_buf
    ]);

    let buf_aligned = u.balign4(buf);

    debug(`table format0 size = ${buf_aligned.length}`);
    return buf_aligned;
  }

  collect_format3_data() {
    const f = this.font;
    const glyphs = _.sortBy(this.font.src.glyphs, g => f.glyph_id[g.code]);

    // extract kerning pairs for each character;
    // left kernings are kerning values based on left char (already there),
    // right kernings are kerning values based on right char (extracted from left)
    const left_kernings = {};
    const right_kernings = {};

    for (let g of glyphs) {
      if (_.isEmpty(g.kerning)) continue;

      const paired = Object.keys(g.kerning);

      left_kernings[g.code] = g.kerning;

      for (let code of paired) {
        right_kernings[code] = right_kernings[code] || {};
        right_kernings[code][g.code] = g.kerning[code];
      }
    }

    // input:
    //  - kernings, char => { hash: String, [char1]: Number, [char2]: Number, ... }
    //
    // returns:
    //  - array of [ char1, char2, ... ]
    //
    function build_classes(kernings) {
      const classes = [];

      for (let code of Object.keys(kernings)) {
        // for each kerning table calculate unique value representing it;
        // keys needs to be sorted for this (but we're using numeric keys, so
        // sorting happens automatically and can't be changed)
        const hash = JSON.stringify(kernings[code]);

        classes[hash] = classes[hash] || [];
        classes[hash].push(Number(code));
      }

      return Object.values(classes);
    }

    const left_classes = build_classes(left_kernings);
    debug(`unique left classes: ${left_classes.length}`);

    const right_classes = build_classes(right_kernings);
    debug(`unique right classes: ${right_classes.length}`);

    if (left_classes.length >= 255 || right_classes.length >= 255) {
      debug('too many classes for format3 subtable');
      return null;
    }

    return { left_classes, right_classes, left_kernings };
  }

  create_format3_data() {
    const f = this.font;
    const { left_classes, right_classes, left_kernings } = this.collect_format3_data();

    const subheader = Buffer.alloc(4);
    subheader.writeUInt16LE(f.last_id);
    subheader.writeUInt8(left_classes.length, 2);
    subheader.writeUInt8(right_classes.length, 3);

    function create_mapping_buf(classes) {
      let buf = Buffer.alloc(f.last_id);

      classes.forEach((members, idx) => {
        for (let code of members) {
          buf.writeUInt8(idx + 1, f.glyph_id[code]);
        }
      });

      return buf;
    }

    const left_mapping_buf = create_mapping_buf(left_classes);
    const right_mapping_buf = create_mapping_buf(right_classes);

    const table_buf = Buffer.alloc(left_classes.length * right_classes.length);
    let offset = 0;
    for (let left_class of left_classes) {
      for (let right_class of right_classes) {
        let code1 = left_class[0];
        let code2 = right_class[0];
        table_buf.writeInt8(f.kernToFP(left_kernings[code1][code2] || 0), offset++); // FP4.4
      }
    }

    let buf = Buffer.concat([
      subheader,
      left_mapping_buf,
      right_mapping_buf,
      table_buf
    ]);

    let buf_aligned = u.balign4(buf);

    debug(`table format3 size = ${buf_aligned.length}`);
    return buf_aligned;
  }

  toBin() {
    if (!this.font.hasKerning()) return Buffer.alloc(0);

    const format0_data = this.create_format0_data();
    const format3_data = this.create_format3_data();

    let header, data;

    header = Buffer.alloc(HEAD_LENGTH);

    if (!format3_data || format0_data.length <= format3_data.length) {
      data = format0_data;
      header.writeUInt32LE(header.length + data.length, O_SIZE);
      header.write(this.label, O_LABEL);
      header.writeUInt8(0, O_FORMAT);
    } else {
      data = format3_data;
      header.writeUInt32LE(header.length + data.length, O_SIZE);
      header.write(this.label, O_LABEL);
      header.writeUInt8(3, O_FORMAT);
    }

    return Buffer.concat([ header, data ]);
  }
}


module.exports = Kern;
