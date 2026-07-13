const collect_font_data = require('../lib/collect_font_data');
const binWriter = require('../lib/writers/bin');
const lvglWriter = require('../lib/writers/lvgl');

const { parse_args: parseCliArgs } = require('../lib/parse_args');

const writers = {
  bin: binWriter,
  lvgl: lvglWriter
};

async function convertBrowser(args) {
  const font_data = await collect_font_data(args);
  const files = writers[args.format](args, font_data);

  return files;
}

function parse_args(argv, debug, fs, path) {
  return parseCliArgs(argv, debug, fs, path, {
    disable_help: true,
    disable_formatter_validation: true
  });
}

module.exports = { convertBrowser, parse_args };
module.exports.formats = Object.keys(writers);
