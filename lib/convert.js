// Internal API to convert input data into output font data
// Used by both CLI and Web wrappers.

'use strict';

const collect_font_data = require('./collect_font_data');

const writers = {
  dump: require('./writers/dump'),
  bin: require('./writers/bin'),
  lvgl: require('./writers/lvgl')
};

//
// Input:
// - args like from CLI (optionally extended with binary content of files)
//
// Output:
// - { name1: bin_data1, name2: bin_data2, ... }
//
// returns hash with files to write
//
async function convert(args) {
  const font_data = await collect_font_data(args);
  const files = writers[args.format](args, font_data);

  return files;
}

module.exports = convert;
module.exports.formats = Object.keys(writers);
