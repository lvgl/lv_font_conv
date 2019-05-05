'use strict';

const _ = require('lodash');
const u = require('../utils');
const debug = require('debug')('font.table.kern');


const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_COUNT = O_LABEL + 4;

const HEAD_LENGTH = O_COUNT + 4;


class Kern {
  constructor(font) {
    this.font = font;
    this.label = 'kern';
  }

  toBin() {
    if (!this.font.hasKerning()) return Buffer.alloc(0);

    const f = this.font;
    const glyphs = this.font.src.glyphs;

    // collect kerning pairs to flat list
    const kernUnsorted = _.flatten(glyphs.map(g => {
      const pairs = _.toPairs(g.kerning);

      return pairs.map(p => [ f.glyph_id[g.code], f.glyph_id[p[0]], p[1] ]);
    }));

    const kernSorted = _.sortBy(kernUnsorted, [ 0, 1 ]);

    const count = kernSorted.length;

    const kerned_glyphs = glyphs.filter(g => Object.keys(g.kerning).length).length;
    const kerning_list_max = _.max(glyphs.map(g => Object.keys(g.kerning).length));
    debug(`${kerned_glyphs} kerned glyphs of ${glyphs.length}, ${kerning_list_max} max list, ${count} total pairs`);

    let size = HEAD_LENGTH + (f.glyphIdFormat ? 4 : 2) * count + count;

    size = u.align4(size);

    const buf = Buffer.alloc(size);
    debug(`table size = ${buf.length}`);

    buf.writeUInt32LE(size, O_SIZE);
    buf.write(this.label, O_LABEL);
    buf.writeUInt32LE(count, O_COUNT);

    let offset = HEAD_LENGTH;

    // Write kerning pairs
    for (let i = 0; i < count; i++) {
      if (f.glyphIdFormat === 0) {
        buf.writeUInt8(kernSorted[i][0], offset);
        offset++;
        buf.writeUInt8(kernSorted[i][1], offset);
        offset++;
      } else {
        buf.writeUInt16LE(kernSorted[i][0], offset);
        offset += 2;
        buf.writeUInt16LE(kernSorted[i][1], offset);
        offset += 2;
      }
    }

    // Write kerning values
    for (let i = 0; i < count; i++) {
      buf.writeInt8(f.kernToFP(kernSorted[i][2]), offset++); // FP4.4
    }

    return buf;
  }
}


module.exports = Kern;
