// Read fonts

'use strict';


const fontkit  = require('fontkit');
const opentype = require('opentype.js');
const AppError = require('./app_error');
const Ranger   = require('./ranger');
const utils    = require('./utils');


module.exports = function collect_font_data(args, createCanvas) {
  // read fonts
  let fonts = {};
  let fonts_opentype = {};

  for (let { source_path, source_bin } of args.font) {
    // don't load font again if it's specified multiple times in args
    if (fonts[source_path]) continue;

    try {
      fonts[source_path] = source_bin ? fontkit.create(source_bin) : fontkit.openSync(source_path);
      fonts_opentype[source_path] = source_bin ? opentype.parse(source_bin) : opentype.loadSync(source_path);
    } catch (err) {
      throw new AppError(`Cannot load font "${source_path}": ${err.message}`);
    }
  }

  // merge all ranges
  let ranger = new Ranger();

  for (let { source_path, ranges } of args.font) {
    let font = fonts[source_path];

    for (let item of ranges) {
      /* eslint-disable max-depth */
      if (item.range) {
        let chars = ranger.add_range(source_path, ...item.range);
        let is_empty = true;

        for (let code of chars) {
          if (font.hasGlyphForCodePoint(code)) {
            is_empty = false;
            break;
          }
        }

        if (is_empty) {
          let a = '0x' + item.range[0].toString(16);
          let b = '0x' + item.range[1].toString(16);
          throw new AppError(`Font "${source_path}" doesn't have any characters included in range ${a}-${b}`);
        }
      }

      if (item.symbols) {
        let chars = ranger.add_symbols(source_path, item.symbols);
        let is_empty = true;

        for (let code of chars) {
          if (font.hasGlyphForCodePoint(code)) {
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
    let font     = fonts[src_font];

    if (!font.hasGlyphForCodePoint(src_code)) continue;

    // add 1 more pixel on each side for antialiasing
    let width_before  = Math.ceil(-font.bbox.minX * args.size / font.unitsPerEm) + 1;
    let width_after   = Math.ceil(font.bbox.maxX * args.size / font.unitsPerEm) + 1;
    let height_before = Math.ceil(-font.bbox.minY * args.size / font.unitsPerEm) + 1;
    let height_after  = Math.ceil(font.bbox.maxY * args.size / font.unitsPerEm) + 1;

    let canvas = createCanvas(width_before + width_after, height_before + height_after);

    let ctx    = canvas.getContext('2d');
    let width  = canvas.width;
    let height = canvas.height;

    ctx.save();

    ctx.beginPath();

    ctx.clearRect(0, 0, width, height);

    ctx.translate(width_before, height_before);
    ctx.scale(args.size / font.unitsPerEm, args.size / font.unitsPerEm);

    let glyph = font.glyphForCodePoint(src_code);
    glyph.path.toFunction()(ctx);
    ctx.fill();

    ctx.restore();

    let image_data = ctx.getImageData(0, 0, width, height).data;
    let pixels = [];

    // extract pixels array
    for (let pos = 3, y = 0; y < height; y++) {
      let line = [];

      for (let x = 0; x < width; x++, pos += 4) {
        let alpha = image_data[pos];

        line.push(alpha);
      }

      pixels.push(line);
    }

    let glyph_bbox = {
      x: -width_before,
      y: -height_before,
      width,
      height
    };

    // read kerning values
    let kerning = {};
    let font_opentype = fonts_opentype[src_font];
    let opentype_glyph1 = font_opentype.charToGlyph(String.fromCodePoint(src_code));

    for (let dst_code2 of all_dst_charcodes) {
      // can't merge kerning values from 2 different fonts
      if (mapping[dst_code2].font !== src_font) continue;

      let src_code2 = mapping[dst_code2].code;
      let opentype_glyph2 = font_opentype.charToGlyph(String.fromCodePoint(src_code2));
      let krn_value = font_opentype.getKerningValue(opentype_glyph1, opentype_glyph2);

      if (krn_value) kerning[dst_code2] = krn_value * args.size / font.unitsPerEm;
    }

    glyphs.push({
      code: dst_code,
      advanceWidth: glyph.advanceWidth * args.size / font.unitsPerEm,
      bbox: glyph_bbox,
      kerning,
      pixels
    });
  }

  let first_font = fonts[args.font[0].source_path];

  glyphs = glyphs.map(utils.autocrop);

  return {
    ascent: Math.round(first_font.ascent * args.size / first_font.unitsPerEm),
    descent: Math.round(first_font.descent * args.size / first_font.unitsPerEm),
    size: args.size,
    bboxMax: utils.get_max_bbox(glyphs),
    glyphs
  };
};
