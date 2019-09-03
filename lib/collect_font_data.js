// Read fonts

'use strict';


const opentype = require('opentype.js');
const AppError = require('./app_error');
const Ranger   = require('./ranger');


module.exports = async function collect_font_data(args, createCanvas) {
  // read fonts
  let fonts = {};

  for (let { source_path, source_bin } of args.font) {
    // don't load font again if it's specified multiple times in args
    if (fonts[source_path]) continue;

    try {
      fonts[source_path] = source_bin ? opentype.parse(source_bin) : opentype.loadSync(source_path);
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
        for (let i = 0; i < item.range.length; i += 3) {
          let range = item.range.slice(i, i + 3);
          let chars = ranger.add_range(source_path, ...range);
          let is_empty = true;

          for (let code of chars) {
            let glyph = font.charToGlyph(String.fromCodePoint(code));
            if (glyph && glyph.index !== 0) {

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
          let glyph = font.charToGlyph(String.fromCodePoint(code));
          if (glyph && glyph.index !== 0) {

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
  let [ minX, minY, maxX, maxY ] = [ 0, 0, 0, 0 ];

  for (let dst_code of all_dst_charcodes) {
    let src_code = mapping[dst_code].code;
    let src_font = mapping[dst_code].font;
    let font     = fonts[src_font];

    let glyph = font.charToGlyph(String.fromCodePoint(src_code));
    if (!glyph || glyph.index === 0) continue;

    let { x1, y1, x2, y2 } = glyph.getBoundingBox();
    let scale = args.size / font.unitsPerEm;

    x1 *= scale;
    y1 *= scale;
    x2 *= scale;
    y2 *= scale;

    if (x1 < minX) minX = x1;
    if (x2 > maxX) maxX = x2;
    if (y1 < minY) minY = y1;
    if (y2 > maxY) maxY = y2;
  }

  // calculate canvas size, reserving one pixel on each side to account for
  // anti-aliasing effects on largest symbols
  const ALIAS_BORDER = 1;

  let width_before  = Math.ceil(-minX) + ALIAS_BORDER;
  let width_after   = Math.ceil(maxX)  + ALIAS_BORDER;
  let height_before = Math.ceil(-minY) + ALIAS_BORDER;
  let height_after  = Math.ceil(maxY)  + ALIAS_BORDER;

  let width  = width_before + width_after;
  let height = height_before + height_after;
  let canvas = createCanvas(width, height);
  let ctx    = canvas.getContext('2d');

  for (let dst_code of all_dst_charcodes) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    let src_code = mapping[dst_code].code;
    let src_font = mapping[dst_code].font;
    let font     = fonts[src_font];

    let glyph = font.charToGlyph(String.fromCodePoint(src_code));
    if (!glyph || glyph.index === 0) continue;

    ctx.translate(width_before, height_after);
    font.draw(ctx, String.fromCodePoint(src_code), 0, 0, args.size, { hinting: true, features: {} });
    ctx.restore();

    // calculate more accurate x (but not y) boundaries for character
    let { x1, x2 } = glyph.getBoundingBox();
    let scale = args.size / font.unitsPerEm;

    x1 *= scale;
    x2 *= scale;

    // width of this character before and after x=0 line
    let x_before   = Math.ceil(-x1) + ALIAS_BORDER;
    let x_after    = Math.ceil(x2)  + ALIAS_BORDER;
    let char_width = x_before + x_after; // max bitmap width

    // width of empty area on the left
    let margin_left  = width_before - x_before;

    let image_data = ctx.getImageData(margin_left, 0, char_width, height).data;
    let pixels = [];

    // extract pixels array
    for (let pos = 3, y = 0; y < height; y++) {
      let line = [];

      for (let x = 0; x < char_width; x++, pos += 4) {
        let alpha = image_data[pos];

        line.push(alpha);
      }

      pixels.push(line);
    }

    let glyph_bbox = {
      x: -x_before,
      y: -height_before,
      width: char_width,
      height
    };

    glyphs.push({
      code: dst_code,
      advanceWidth: glyph.advanceWidth * args.size / font.unitsPerEm,
      bbox: glyph_bbox,
      kerning: {},
      pixels
    });
  }

  if (!args.no_kerning) {
    let existing_dst_charcodes = glyphs.map(g => g.code);

    for (let { code, kerning } of glyphs) {
      let src_code = mapping[code].code;
      let src_font = mapping[code].font;
      let font     = fonts[src_font];
      let glyph    = font.charToGlyph(String.fromCodePoint(src_code));

      for (let dst_code2 of existing_dst_charcodes) {
        // can't merge kerning values from 2 different fonts
        if (mapping[dst_code2].font !== src_font) continue;

        let src_code2 = mapping[dst_code2].code;
        let glyph2 = font.charToGlyph(String.fromCodePoint(src_code2));
        let krn_value = font.getKerningValue(glyph, glyph2);

        if (krn_value) kerning[dst_code2] = krn_value * args.size / font.unitsPerEm;
      }
    }
  }

  let first_font = fonts[args.font[0].source_path];
  let first_font_scale = args.size / first_font.unitsPerEm;

  let typoAscent = Math.round(first_font.tables.os2.sTypoAscender * first_font_scale);
  let typoDescent = Math.round(first_font.tables.os2.sTypoDescender * first_font_scale);
  let typoLineGap = Math.round(first_font.tables.os2.sTypoLineGap * first_font_scale);

  return {
    ascent: Math.ceil(maxY),
    descent: Math.floor(minY),
    typoAscent,
    typoDescent,
    typoLineGap,
    size: args.size,
    glyphs
  };
};
