'use strict';


const Glyf = require('../../font/table_glyf');


class LvGlyf extends Glyf {
  constructor(font) {
    super(font);
  }

  toLVGL() {
    return `
/*-----------------
 *    BITMAPS
 *----------------*/


/*---------------------
 *  GLYPH DESCRIPTION
 *--------------------*/


`.trim();
  }
}


module.exports = LvGlyf;
