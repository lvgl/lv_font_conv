'use strict';


const path = require('path');

const Font = require('../../font/font');
const Head = require('./lv_table_head');
const Cmap = require('./lv_table_cmap');
const Glyf = require('./lv_table_glyf');
const Kern = require('./lv_table_kern');
const AppError = require('../../app_error');


class LvFont extends Font {
  constructor(fontData, options) {
    super(fontData, options);

    const ext = path.extname(options.output);
    this.font_name = path.basename(options.output, ext);

    if (options.bpp === 3 & options.no_compress) {
      throw new AppError('LittlevGL supports "--bpp 3" with compression only');
    }
  }

  init_tables() {
    this.head = new Head(this);
    this.glyf = new Glyf(this);
    this.cmap = new Cmap(this);
    this.kern = new Kern(this);
  }


  toLVGL() {
    let guard_name =  this.font_name.toUpperCase();
    return `#include "lvgl/lvgl.h"

/*******************************************************************************
 * Size: ${this.src.size} px
 * Bpp: ${this.opts.bpp}
 * Opts: ${process.argv.slice(2).join(' ')}
 ******************************************************************************/

#ifndef ${guard_name}
#define ${guard_name} 1
#endif

#if ${guard_name}

${this.glyf.toLVGL()}

${this.cmap.toLVGL()}

${this.kern.toLVGL()}

${this.head.toLVGL()}

#endif /*#if ${guard_name}*/

`;
  }
}


module.exports = LvFont;
