'use strict';

const Font = require('../../font/font');
const Head = require('./lv_table_head');
const Cmap = require('./lv_table_cmap');
const Glyf = require('./lv_table_glyf');
const Kern = require('./lv_table_kern');

class LvFont extends Font {
  constructor(fontData, options) {
    super(fontData, options);
  }

  init_tables() {
    this.head = new Head(this);
    this.glyf = new Glyf(this);
    this.cmap = new Cmap(this);
    this.kern = new Kern(this);
  }

  toLVGL() {
    return `#include "lvgl/lvgl.h"

/*******************************************************************************
 * Size: ${this.src.size} px
 * Bpp: ${this.opts.bpp}
 * Opts: ${process.argv.slice(2).join(' ')}
 ******************************************************************************/

${this.glyf.toLVGL()}
${this.cmap.toLVGL()}
${this.kern.toLVGL()}
${this.head.toLVGL()}
`;
  }
}


module.exports = LvFont;
