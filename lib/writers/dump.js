// Write font data into png images

'use strict';


const path     = require('path');
const { PNG }  = require('pngjs');
const AppError = require('../app_error');


module.exports = function write_images(args, font_data) {
  if (!args.output) throw new AppError('Output is required for "dump" writer');

  let files = {};

  for (let { code, pixels } of font_data) {
    let width = pixels[0].length, height = pixels.length;
    let png = new PNG({ width, height });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let offset = (y * width + x) * 4;

        // calculate significant bits, e.g. for args.bpp=2 it's 0, 1, 2 or 3
        let value = Math.floor(pixels[y][x] / (256 >> args.bpp));

        // spread those bits around 0..255 range, e.g. for args.bpp=2 it's 0, 85, 170 or 255
        value = value * 255 / (Math.pow(2, args.bpp) - 1);

        // invert value to get black-on-white picture
        value = 255 - value;

        png.data[offset]     = value; // R
        png.data[offset + 1] = value; // G
        png.data[offset + 2] = value; // B
        png.data[offset + 3] = 255;   // A
      }
    }

    files[path.join(args.output, `${code.toString(16)}.png`)] = PNG.sync.write(png);
  }

  return files;
};
