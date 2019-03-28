// Parse input arguments and execute convertor

'use strict';


const argparse          = require('argparse');
const collect_font_data = require('./collect_font_data');
const create_font       = require('./create_font');
const parse_range       = require('./range_parse');
const store_font        = require('./store_font');


class ActionFontAdd extends argparse.Action {
  call(parser, namespace, value) {
    let items = (namespace[this.dest] || []).slice();
    items.push({ source: value, ranges: [] });
    namespace[this.dest] = items;
  }
}


// add range or symbols to font;
// need to merge them into one array here so overrides work correctly
class ActionFontRangeAdd extends argparse.Action {
  call(parser, namespace, value) {
    let fonts = namespace.font || [];

    if (fonts.length === 0) {
      throw new Error(`argument "${this.getName()}": Only allowed after --font`);
    }

    let lastFont = fonts[fonts.length - 1];

    // { symbols: 'ABC' }, or { range: [ 65, 67, 65 ] }
    lastFont.ranges.push({ [this.dest]: value });
  }
}


// exclude negative numbers and non-numbers
function int(str) {
  if (!/^\d+$/.test(str)) throw new Error(`${str} is not a valid number`);

  let n = parseInt(str, 10);

  if (n <= 0) throw new Error(`${str} is not a valid number`);

  return n;
}


// wrap range parser into function to show error text correctly (it uses function name)
function range(str) {
  return parse_range(str);
}


module.exports.run = function (argv, debug = false) {

  let parser = new argparse.ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    //description: '',
    debug
  });

  parser.addArgument(
    [ '-s', '--size' ],
    {
      help: 'output font size',
      type: int,
      required: true
    }
  );

  parser.addArgument(
    [ '-o', '--output' ],
    { help: 'output file path' }
  );

  parser.addArgument(
    [ '-b', '--bpp' ],
    {
      help: 'bits per pixel',
      choices: [ 1, 2, 4, 8 ],
      type: int,
      required: true
    }
  );

  /*parser.addArgument(
    [ '-c', '--compress' ],
    { help: 'compression algorithm' }
  );*/

  parser.addArgument(
    [ '-F', '--format' ],
    {
      help: 'output format, useful for debug & experiments',
      choices: create_font.formats,
      defaultValue: create_font.formats[0]
    }
  );

  parser.addArgument(
    [ '-f', '--font' ],
    {
      help: 'font file path (may be used multiple times)',
      action: ActionFontAdd,
      required: true
    }
  );

  parser.addArgument(
    [ '-r', '--range' ],
    {
      help: 'range (may be used multiple times, belongs to previously declared --font)',
      type: range,
      action: ActionFontRangeAdd
    }
  );

  parser.addArgument(
    [ '-S', '--symbols' ],
    {
      help: 'list of characters to copy (instead of numeric format in -r)',
      action: ActionFontRangeAdd
    }
  );

  let args = parser.parseArgs(argv.length ? argv : [ '-h' ]);

  let font_data = collect_font_data(args);

  let files = create_font(args, font_data);

  store_font(files);
};
