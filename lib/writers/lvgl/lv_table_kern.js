'use strict';


const Kern = require('../../font/table_kern');


class LvKern extends Kern {
  constructor(font) {
    super(font);
  }

  toLVGL() {
    return `
/*-----------------
 *    KERNING
 *----------------*/


`.trim();
  }
}


module.exports = LvKern;
