// Read fonts

'use strict';


const fontkit  = require('fontkit');
const AppError = require('./app_error');
const Ranger   = require('./ranger');


module.exports = function collect_font_data(args, createCanvas) {
  // read fonts
  let fonts = {};

  for (let { source_path, source_bin } of args.font) {
    // don't load font again if it's specified multiple times in args
    if (fonts[source_path]) continue;

    try {
      fonts[source_path] = source_bin ? fontkit.create(source_bin) : fontkit.openSync(source_path);
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
  let output = [];

  for (let dst_code of Object.keys(mapping).sort((a, b) => a - b)) {
    let src_code = mapping[dst_code].code;
    let src_font = mapping[dst_code].font;
    let font     = fonts[src_font];

    if (!font.hasGlyphForCodePoint(src_code)) continue;

    let output_char = { code: Number(dst_code), pixels: [] };

    let glyph = font.glyphForCodePoint(src_code);
    let scale = font.unitsPerEm / (font.ascent - font.descent);

    let height = args.size;
    let width = Math.round(args.size * glyph.advanceWidth / (font.ascent - font.descent));

    // skip combining characters with advanceWidth=0:
    // U+300, U+301, U+303, U+309, U+30f, U+323, U+483, U+484, U+485, U+486, U+488, U+489
    if (width <= 0) continue;

    let cv = createCanvas(width, height);
    let ctx = cv.getContext('2d');

    // flip character and move baseline, so character fits in its box
    ctx.translate(0, args.size * font.ascent / (font.ascent - font.descent));
    ctx.scale(1, -1);

    // count font height as ascender+descender, not as em size
    // (we have fonts that are bigger than em box)
    glyph.render(ctx, args.size * scale);

    let image_data = ctx.getImageData(0, 0, width, height).data;

    for (let y = 0; y < height; y++) {
      let line = [];

      for (let x = 0; x < width; x++) {
        let offset = (y * width + x) * 4;

        // use alpha, ignore rgb (they're 0 0 0 for non-colored fonts)
        line.push(image_data[offset + 3]);
      }

      output_char.pixels.push(line);
    }

    output.push(output_char);
  }

  return output;
};
