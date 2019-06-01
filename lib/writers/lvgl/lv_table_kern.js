'use strict';


const u = require('../../utils');
const Kern = require('../../font/table_kern');


class LvKern extends Kern {
  constructor(font) {
    super(font);
  }

  to_lv_format0() {
    const f = this.font;
    let kern_pairs = this.collect_format0_data();

    return `
/*-----------------
 *    KERNING
 *----------------*/


/*Pair left and right glyphs for kerning*/
static const ${f.glyphIdFormat ? 'uint16_t' : 'uint8_t'} kern_pair_glyph_ids[] =
{
${kern_pairs.map(pair => `    ${pair[0]}, ${pair[1]}`).join(',\n')}
};

/* Kerning between the respective left and right glyphs
 * 4.4 format which needs to scaled with \`kern_scale\`*/
static int8_t kern_pair_values[] =
{
${u.long_dump(kern_pairs.map(pair => f.kernToFP(pair[2])))}
};

/*Collect the kern pair's data in one place*/
static lv_font_fmt_txt_kern_pair_t kern_pairs =
{
    .glyph_ids = kern_pair_glyph_ids,
    .values = kern_pair_values,
    .pair_cnt = ${kern_pairs.length},
    .glyph_ids_size = ${f.glyphIdFormat}
};


`.trim();
  }

  to_lv_format3() {
    const f = this.font;
    const {
      left_classes,
      right_classes,
      left_mapping,
      right_mapping,
      values
    } = this.collect_format3_data();

    return `
/*-----------------
 *    KERNING
 *----------------*/


/*Map glyph_ids to kern left classes*/
static uint8_t kern_left_class_mapping[] =
{
${u.long_dump(left_mapping)}
};

/*Map glyph_ids to kern right classes*/
static uint8_t kern_right_class_mapping[] =
{
${u.long_dump(right_mapping)}
};

/*Kern values between classes*/
static uint8_t kern_class_values[] =
{
${u.long_dump(values.map(v => f.kernToFP(v)))}
};


/*Collect the kern class' data in one place*/
static lv_font_fmt_txt_kern_classes_t kern_classes =
{
    .class_pair_values   = kern_class_values,
    .left_class_mapping  = kern_left_class_mapping,
    .right_class_mapping = kern_right_class_mapping,
    .left_class_cnt      = ${left_classes},
    .right_class_cnt     = ${right_classes},
};


`.trim();
  }

  toLVGL() {
    if (!this.font.hasKerning()) return '';

    const format0_data = this.create_format0_data();
    const format3_data = this.create_format3_data();

    if (!format3_data || format0_data.length <= format3_data.length) {
      return this.to_lv_format0();
    }

    return this.to_lv_format3();
  }
}


module.exports = LvKern;
