'use strict';


const build_subtables = require('../../font/cmap_build_subtables');
const Cmap = require('../../font/table_cmap');


class LvCmap extends Cmap {
  constructor(font) {
    super(font);

    this.lv_compiled = false;
    this.lv_subtables = [];
  }

  lv_format2enum(name) {
    switch (name) {
      case 'format0_tiny': return 'LV_FONT_FMT_TXT_CMAP_FORMAT0_TINY';
      case 'format0': return 'LV_FONT_FMT_TXT_CMAP_FORMAT0_FULL';
      case 'sparse_tiny': return 'LV_FONT_FMT_TXT_CMAP_SPARSE_TINY';
      case 'sparse': return 'LV_FONT_FMT_TXT_CMAP_SPARSE_FULL';
      default: throw new Error('Unknown subtable format');
    }
  }

  lv_create_format0_data(min_code, max_code, start_glyph_id) {
    let data = [];

    for (let i = min_code; i <= max_code; i++) {
      const g = this.glyphByCode(i);

      if (!g) {
        data.push(0);
        continue;
      }

      const id_delta = this.font.glyph_id[g.code] - start_glyph_id;

      if (id_delta < 0 || id_delta > 255) throw new Error('Glyph ID delta out of Format 0 range');

      data.push(id_delta);
    }

    return data;
  }

  lv_create_sparse_data(codepoints, start_glyph_id) {
    let codepoints_list = [];
    let ids_list = [];

    for (let code of codepoints) {
      let g = this.glyphByCode(code);
      let id = this.font.glyph_id[g.code];

      let code_delta = code - codepoints[0];
      let id_delta   = id - start_glyph_id;

      if (code_delta < 0 || code_delta > 65535) throw new Error('Codepoint delta out of range');
      if (id_delta < 0 || id_delta > 65535) throw new Error('Glyph ID delta out of range');

      codepoints_list.push(code_delta);
      ids_list.push(id_delta);
    }

    return {
      codes: codepoints_list,
      ids: ids_list
    };
  }

  lv_compile() {
    if (this.lv_compiled) return;
    this.lv_compiled = true;

    const f = this.font;

    let subtables_plan = build_subtables(f.src.glyphs.map(g => g.code));
    let idx = 0;

    for (let [ format, codepoints ] of subtables_plan) {
      let g = this.glyphByCode(codepoints[0]);
      let start_glyph_id = f.glyph_id[g.code];
      let min_code = codepoints[0];
      let max_code = codepoints[codepoints.length - 1];

      let has_charcodes = false;
      let has_ids = false;
      let defs = '';

      if (format === 'format0_tiny') {
        // use default empty values
      } else if (format === 'format0') {
        has_ids = true;
        let d = this.lv_create_format0_data(min_code, max_code, start_glyph_id);

        defs = `static uint8_t glyph_id_ofs_list_${idx} = {${d.join(', ')}}`;

      } else if (format === 'sparse_tiny') {
        has_charcodes = true;
        let d = this.lv_create_sparse_data(codepoints, start_glyph_id);

        defs = `static uint16_t unicode_list_${idx} = {${d.codes.join(', ')}};`;

      } else { // assume format === 'sparse'
        has_charcodes = true;
        has_ids = true;
        let d = this.lv_create_sparse_data(codepoints, start_glyph_id);

        defs = `
static uint16_t unicode_list_${idx} = {${d.codes.map(h => `0x${h.toString(16)}`).join(', ')}};
static uint16_t glyph_id_ofs_list_${idx} = {${d.ids.map(h => `0x${h.toString(16)}`).join(', ')}};
`.trim();
      }

      const u_list = has_charcodes ? `unicode_list_${idx}` : 'NULL';
      const id_list = has_ids ? `glyph_id_ofs_list_${idx}` : 'NULL';

      const head = `    {
        .range_start = ${min_code}, .range_length = ${max_code - min_code + 1}, .type = ${this.lv_format2enum(format)},
        .glyph_id_start = ${start_glyph_id}, .unicode_list = ${u_list}, .glyph_id_ofs_list = ${id_list}
    }`;

      this.lv_subtables.push({
        defs,
        head
      });

      idx++;
    }
  }

  toLVGL() {
    this.lv_compile();

    return `
/*---------------------
 *  CHARACTER MAPPING
 *--------------------*/

${this.lv_subtables.map(d => d.defs).filter(Boolean).join('\n\n')}


/*Collect the unicode lists and glyph_id offsets*/
static const lv_font_fmt_txt_cmap_t cmaps[] =
{
${this.lv_subtables.map(d => d.head).join(',\n')}
}
 `.trim();
  }
}


module.exports = LvCmap;
