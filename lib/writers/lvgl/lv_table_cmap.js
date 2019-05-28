'use strict';


const Cmap = require('../../font/table_cmap');


class LvCmap extends Cmap {
  constructor(font) {
    super(font);
  }

  toLVGL() {
    return `
/*---------------------
 *  CHARACTER MAPPING
 *--------------------*/
`.trim();
  }
}


module.exports = LvCmap;
