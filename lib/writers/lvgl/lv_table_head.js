'use strict';


const Head = require('../../font/table_head');


class LvHead extends Head {
  constructor(font) {
    super(font);
  }

  toLVGL() {
    return `
/*--------------------
 *  ALL CUSTOM DATA
 *--------------------*/


/*-----------------
 *  PUBLIC FONT
 *----------------*/


`.trim();
  }
}


module.exports = LvHead;
