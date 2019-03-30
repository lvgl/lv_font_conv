// Indernal API to convert input data into output font data
// Used by both CLI and Web wrappers.
'use strict';

const collect_font_data = require('./collect_font_data');
const create_font       = require('./create_font');


//
// Input:
// - args like from CLI (optionally extended with binary content of files)
// - ceateCanvas() helper (for platform transparency)
//
// Output:
// - { name1: bin_data1, name2: bin_data2, ... }
//
// returns hash with files to write
//
module.exports = function convert(args, createCanvas) {
  let font_data = collect_font_data(args, createCanvas);
  let files = create_font(args, font_data);

  return files;
};

module.exports.formats = create_font.formats;
