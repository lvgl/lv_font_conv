// Read fonts

'use strict';


const ft_render = require('./freetype');
const AppError  = require('./app_error');
const Ranger    = require('./ranger');
const { FontAdapter } = require('./font_adapter');


module.exports = async function collect_font_data(args) {
  await ft_render.init();

  // Duplicate font options as k/v for quick access
  let fonts_options = {};
  args.font.forEach(f => { fonts_options[f.source_path] = f; });

  // read fonts
  let font_adapters = {};

  for (let { source_path, source_bin } of args.font) {
    // don't load font again if it's specified multiple times in args
    if (font_adapters[source_path]) continue;

    try {
      // Create unified font adapter
      font_adapters[source_path] = FontAdapter.create(source_path, source_bin, args);
    } catch (err) {
      throw new AppError(`Cannot load font "${source_path}": ${err.message}`);
    }
  }

  // merge all ranges
  let ranger = new Ranger();

  for (let { source_path, ranges } of args.font) {
    let fontAdapter = font_adapters[source_path];

    for (let item of ranges) {
      /* eslint-disable max-depth */
      if (item.range) {
        for (let i = 0; i < item.range.length; i += 3) {
          let range = item.range.slice(i, i + 3);
          let chars = ranger.add_range(source_path, ...range);
          let is_empty = true;

          for (let code of chars) {
            if (fontAdapter.hasGlyph(code)) {
              is_empty = false;
              break;
            }
          }

          if (is_empty) {
            let a = '0x' + range[0].toString(16);
            let b = '0x' + range[1].toString(16);
            throw new AppError(`Font "${source_path}" doesn't have any characters included in range ${a}-${b}`);
          }
        }
      }

      if (item.symbols) {
        let chars = ranger.add_symbols(source_path, item.symbols);
        let is_empty = true;

        for (let code of chars) {
          if (fontAdapter.hasGlyph(code)) {
            is_empty = false;
            break;
          }
        }

        if (is_empty) {
          throw new AppError(`Font "${source_path}" doesn't have any characters included in "${item.symbols}"`);
        }
      }
    }
  }

  let mapping = ranger.get();
  let glyphs = [];
  let all_dst_charcodes = Object.keys(mapping).sort((a, b) => a - b).map(Number);

  for (let dst_code of all_dst_charcodes) {
    let src_code = mapping[dst_code].code;
    let src_font = mapping[dst_code].font;

    let fontAdapter = font_adapters[src_font];
    if (!fontAdapter.hasGlyph(src_code)) continue;

    let glyph_result = fontAdapter.renderGlyph(src_code, {
      autohint_off: fonts_options[src_font].autohint_off,
      autohint_strong: fonts_options[src_font].autohint_strong,
      lcd: args.lcd,
      lcd_v: args.lcd_v,
      mono: !args.lcd && !args.lcd_v && args.bpp === 1,
      use_color_info: args.use_color_info
    });

    if (!glyph_result) continue;

    glyphs.push({
      code: dst_code,
      advanceWidth: glyph_result.advance_x,
      bbox: {
        x: glyph_result.x,
        y: glyph_result.y - glyph_result.height,
        width: glyph_result.width,
        height: glyph_result.height
      },
      kerning: {},
      freetype: glyph_result.freetype,
      pixels: glyph_result.pixels
    });
  }

  if (!args.no_kerning) {
    let existing_dst_charcodes = glyphs.map(g => g.code);

    for (let { code, kerning } of glyphs) {
      let src_code = mapping[code].code;
      let src_font = mapping[code].font;
      let fontAdapter = font_adapters[src_font];

      for (let dst_code2 of existing_dst_charcodes) {
        // can't merge kerning values from 2 different fonts
        if (mapping[dst_code2].font !== src_font) continue;

        let src_code2 = mapping[dst_code2].code;
        let krn_value = fontAdapter.getKerningValue(src_code, src_code2);

        if (krn_value) kerning[dst_code2] = krn_value;
      }
    }
  }

  let first_font_path = args.font[0].source_path;
  let first_font_adapter = font_adapters[first_font_path];

  // Get font metrics through unified interface
  let fontMetrics = first_font_adapter.getFontMetrics();
  let underlineMetrics = first_font_adapter.getUnderlineMetrics();

  // Clean up font adapter resources
  for (let adapter of Object.values(font_adapters)) {
    adapter.destroy();
  }
  ft_render.destroy();

  return {
    ascent:      Math.max(...glyphs.map(g => g.bbox.y + g.bbox.height)),
    descent:     Math.min(...glyphs.map(g => g.bbox.y)),
    typoAscent:  fontMetrics.typoAscent,
    typoDescent: fontMetrics.typoDescent,
    typoLineGap: fontMetrics.typoLineGap,
    size:        args.size,
    glyphs,
    underlinePosition:  underlineMetrics.position,
    underlineThickness: underlineMetrics.thickness
  };
};
