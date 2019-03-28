// Read fonts

'use strict';


const canvas   = require('canvas');
const fontkit  = require('fontkit');
const Ranger   = require('./ranger');


module.exports = function collect_font_data(args) {
  // merge all ranges
  let ranger = new Ranger();

  for (let { source, ranges } of args.font) {
    for (let item of ranges) {
      if (item.range) {
        ranger.add_range(source, ...item.range);
      }

      if (item.symbols) {
        ranger.add_symbols(source, item.symbols);
      }
    }
  }

  let mapping = ranger.get();
  let fonts = {};
  let output = [];

  for (let { source } of args.font) {
    if (fonts[source]) continue;
    fonts[source] = fontkit.openSync(source);
  }

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

    let cv = canvas.createCanvas(width, height);
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
