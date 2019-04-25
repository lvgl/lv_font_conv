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

    // collect kerning pairs to flat list
    const kernUnsorted = _.flatten(this.font.src.glyphs.map(g => {
      const pairs = _.toPairs(g.kerning);

      return pairs.map(p => [ this.font.glyph_id[g.code], this.font.glyph_id[p[0]], p[1] ]);
    }));

    const kernSorted = _.sortBy(kernUnsorted, [ 0, 1 ]);

    const count = kernSorted.length;
    debug(`${count} kerning pairs used`);

    let size = HEAD_LENGTH +
      (this.font.glyphIdFofmat ? 4 : 2) * count +
      (this.font.kerningFormat ? 2 : 1) * count;

    size = u.align4(size);

    const buf = Buffer.alloc(size);
    debug(`table size = ${buf.length}`);

    buf.writeUInt32LE(size, O_SIZE);
    buf.write(this.label, O_LABEL);
    buf.writeUInt32LE(count, O_COUNT);

    let offset = HEAD_LENGTH;

    // Write kerning pairs
    for (let i = 0; i < count; i++) {
      if (this.font.glyphIdFofmat === 0) {
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
      if (this.font.kerningFormat === 0) {
        buf.writeInt8(Math.round(kernSorted[i][2] * 16), offset); // FP4.4
        offset++;
      } else {
        buf.writeInt16LE(Math.round(kernSorted[i][2] * 16), offset); // FP12.4
        offset += 2;
      }
    }

    return buf;
  }
}


module.exports = Kern;
