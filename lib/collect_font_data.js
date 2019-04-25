// Read fonts

'use strict';


// fontkit
//const fontkit  = require('fontkit');

// opentype
const opentype = require('opentype.js');

const AppError = require('./app_error');
const Ranger   = require('./ranger');
const utils    = require('./utils');


module.exports = function collect_font_data(args, createCanvas) {
  // read fonts
  let fonts = {};

  for (let { source_path, source_bin } of args.font) {
    // don't load font again if it's specified multiple times in args
    if (fonts[source_path]) continue;

    try {
      // fontkit
      //fonts[source_path] = source_bin ? fontkit.create(source_bin) : fontkit.openSync(source_path);

      // opentype
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
        let chars = ranger.add_range(source_path, ...item.range);
        let is_empty = true;

        for (let code of chars) {
          // fontkit
          //if (font.hasGlyphForCodePoint(code)) {

          // opentype
          let glyph = font.charToGlyph(String.fromCodePoint(code));
          if (glyph && glyph.index !== 0) {

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
          // fontkit
          //if (font.hasGlyphForCodePoint(code)) {

          // opentype
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

  for (let dst_code of all_dst_charcodes) {
    let src_code = mapping[dst_code].code;
    let src_font = mapping[dst_code].font;
    let font     = fonts[src_font];

    // fontkit
    //if (!font.hasGlyphForCodePoint(src_code)) continue;
    //glyph = font.glyphForCodePoint(src_code);
    //let { minX, minY, maxX, maxY } = glyph.bbox;
    //if (minX > maxX || minY > maxY) minX = minY = maxX = maxY = 0;

    // opentype
    let glyph = font.charToGlyph(String.fromCodePoint(src_code));
    if (!glyph || glyph.index === 0) continue;
    let { x1, y1, x2, y2 } = glyph.getBoundingBox();
    let [ minX, minY, maxX, maxY ] = [ x1, y1, x2, y2 ];

    // reserve one pixel on each side to account for possible anti-aliasing effects
    const ALIAS_BORDER = 1;

    let width_before  = Math.ceil(-minX * args.size / font.unitsPerEm) + ALIAS_BORDER;
    let width_after   = Math.ceil(maxX * args.size / font.unitsPerEm) + ALIAS_BORDER;
    let height_before = Math.ceil(-minY * args.size / font.unitsPerEm) + ALIAS_BORDER;
    let height_after  = Math.ceil(maxY * args.size / font.unitsPerEm) + ALIAS_BORDER;

    let canvas = createCanvas(width_before + width_after, height_before + height_after);

    let ctx    = canvas.getContext('2d');
    let width  = canvas.width;
    let height = canvas.height;

    ctx.translate(width_before, height_before);

    // fontkit
    //ctx.scale(1, 1);
    //glyph.render(ctx, args.size);

    // opentype
    ctx.scale(1, -1);
    font.draw(ctx, String.fromCodePoint(src_code), 0, 0, args.size, { hinting: true });

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

    glyphs.push({
      code: dst_code,
      advanceWidth: glyph.advanceWidth * args.size / font.unitsPerEm,
      bbox: glyph_bbox,
      kerning: {},
      pixels
    });
  }

  glyphs = glyphs.map(utils.autocrop);

  // fontkit
  //if (!args.no_kerning) {} // not supported

  // opentype
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
  let ascent, descent, typoAscent, typoDescent, typoLineGap;

  // fontkit
  //ascent = Math.round(first_font.ascent * first_font_scale);
  //descent = Math.round(first_font.descent * first_font_scale);
  //typoAscent = Math.round(first_font['OS/2'].typoAscender * first_font_scale);
  //typoDescent = Math.round(first_font['OS/2'].typoDescender * first_font_scale);
  //typoLineGap = Math.round(first_font['OS/2'].typoLineGap * first_font_scale);

  // opentype
  ascent = Math.round(first_font.ascender * first_font_scale);
  descent = Math.round(first_font.descender * first_font_scale);
  typoAscent = Math.round(first_font.tables.os2.sTypoAscender * first_font_scale);
  typoDescent = Math.round(first_font.tables.os2.sTypoDescender * first_font_scale);
  typoLineGap = Math.round(first_font.tables.os2.sTypoLineGap * first_font_scale);

  return {
    ascent,
    descent,
    typoAscent,
    typoDescent,
    typoLineGap,
    size: args.size,
    glyphs
  };
};
