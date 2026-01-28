if (typeof globalThis !== 'undefined') {
  globalThis.__LV_FONT_CONV_BROWSER__ = true;
}

/* global globalThis */

const collect_font_data = require('../lib/collect_font_data');
const binWriter = require('../lib/writers/bin');
const lvglWriter = require('../lib/writers/lvgl');
const { parse_args } = require('../lib/parse_args');

const writers = {
  bin: binWriter,
  lvgl: lvglWriter
};

async function convertBrowser(args) {
  const font_data = await collect_font_data(args);
  const files = writers[args.format](args, font_data);
  return files;
}

module.exports = { convertBrowser, parse_args };
module.exports.formats = Object.keys(writers);
