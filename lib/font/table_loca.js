'use strict';


const u = require('../utils');
const debug = require('debug')('font.table.loca');


const O_SIZE = 0;
const O_LABEL = O_SIZE + 4;
const O_COUNT = O_LABEL + 4;

const HEAD_LENGTH = O_COUNT + 4;


class Loca {
  constructor(font) {
    this.font = font;
    this.label = 'loca';
  }

  toBin() {
    const f = this.font;
    const size = u.align4(HEAD_LENGTH + f.last_id * (f.indexToLocFormat ? 4 : 2));

    const buf = Buffer.alloc(size);
    debug(`table size = ${buf.length}`);

    buf.writeUInt32LE(size, O_SIZE);
    buf.write(this.label, O_LABEL);
    buf.writeUInt32LE(f.last_id, O_COUNT);

    let offset = HEAD_LENGTH;

    for (let i = 0; i < f.last_id; i++) {
      if (f.indexToLocFormat === 0) {
        buf.writeUInt16LE(this.font.glyf.getOffset(i), offset);
        offset += 2;
      } else {
        buf.writeUInt32LE(this.font.glyf.getOffset(i), offset);
        offset += 4;
      }
    }

    return buf;
  }
}


module.exports = Loca;
