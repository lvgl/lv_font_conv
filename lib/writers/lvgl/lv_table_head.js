'use strict';


const Head = require('../../font/table_head');


class LvHead extends Head {
  constructor(font) {
    super(font);
  }

  kern_ref() {
    const f = this.font;

    if (!f.hasKerning()) {
      return `
    .kern_scale = 0,
    .kern_dsc = NULL,
    .kern_classes = 0,`;
    }

    const format0_data = f.kern.create_format0_data();
    const format3_data = f.kern.create_format3_data();

    if (!format3_data || format0_data.length <= format3_data.length) {
      return `
    .kern_scale = ${Math.round(f.kerningScale * 16)},
    .kern_dsc = &kern_pairs,
    .kern_classes = 0`;
    }

    return `
    .kern_scale = ${Math.round(f.kerningScale * 16)},
    .kern_dsc = &kern_classes,
    .kern_classes = 1`;
  }

  toLVGL() {
    const f = this.font;

    return `
/*--------------------
 *  ALL CUSTOM DATA
 *--------------------*/

/*Store all the custom data of the font*/
static lv_font_fmt_txt_dsc_t font_dsc = {
    .glyph_bitmap = gylph_bitmap,
    .glyph_dsc = glyph_dsc,
    .cmaps = cmaps,
    .cmap_num = ${f.cmap.toBin().readUInt32LE(8)},
    .bpp = ${f.opts.bpp},
${this.kern_ref()}
};


/*-----------------
 *  PUBLIC FONT
 *----------------*/

/*Initialize a public general font descriptor*/
lv_font_t ${f.font_name} = {
    .dsc = &font_dsc,          /*The custom font data. Will be accessed by \`get_glyph_bitmap/dsc\` */
    .get_glyph_bitmap = lv_font_get_bitmap_fmt_txt,    /*Function pointer to get glyph's bitmap*/
    .get_glyph_dsc = lv_font_get_glyph_dsc_fmt_txt,    /*Function pointer to get glyph's data*/
    .line_height = ${f.src.ascent - f.src.descent},          /*The maximum line height required by the font*/
    .base_line = ${-f.src.descent},             /*Baseline measured from the bottom of the line*/
};
`.trim();
  }
}


module.exports = LvHead;
