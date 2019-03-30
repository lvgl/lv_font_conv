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
      parser.error(`argument "${this.getName()}": Only allowed after --font`);
    }

    let lastFont = fonts[fonts.length - 1];

    // { symbols: 'ABC' }, or { range: [ 65, 67, 65 ] }
    lastFont.ranges.push({ [this.dest]: value });
  }
}


// Formatter with support of `\n` in Help texts.
class RawTextHelpFormatter2 extends argparse.RawDescriptionHelpFormatter {
  // copy of original RawTextHelpFormatter method with 2 lines commented
  _splitLines(text, width) {
    let lines = [];
    let delimiters = [ ' ', '.', ',', '!', '?' ];
    let re = new RegExp(`[${delimiters.join('')}][^${delimiters.join('')}]*$`);

    //text = text.replace(/[\n|\t]/g, ' ');

    text = text.trim();
    //text = text.replace(this._whitespaceMatcher, ' ');

    // Wraps the single paragraph in text (a string) so every line
    // is at most width characters long.
    text.split(argparse.Const.EOL).forEach(function (line) {
      if (width >= line.length) {
        lines.push(line);
        return;
      }

      let wrapStart = 0;
      let wrapEnd = width;
      let delimiterIndex = 0;
      while (wrapEnd <= line.length) {
        if (wrapEnd !== line.length && delimiters.indexOf(line[wrapEnd] < -1)) {
          delimiterIndex = (re.exec(line.substring(wrapStart, wrapEnd)) || {}).index;
          wrapEnd = wrapStart + delimiterIndex + 1;
        }
        lines.push(line.substring(wrapStart, wrapEnd));
        wrapStart = wrapEnd;
        wrapEnd += width;
      }
      if (wrapStart < line.length) {
        lines.push(line.substring(wrapStart, wrapEnd));
      }
    });

    return lines;
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
    formatterClass: RawTextHelpFormatter2,
    debug
  });

  parser.addArgument(
    [ '--size' ],
    {
      help: 'Output font size, pixels.',
      metavar: 'PIXELS',
      type: int,
      required: true
    }
  );

  parser.addArgument(
    [ '-o', '--output' ],
    {
      help: 'Output path.',
      metavar: '<path>'
    }
  );

  parser.addArgument(
    [ '--bpp' ],
    {
      help: 'Bits per pixel, for antialiasing.',
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
    [ '--format' ],
    {
      help: 'Output format.',
      choices: create_font.formats,
      defaultValue: create_font.formats[0]
    }
  );

  parser.addArgument(
    [ '--font' ],
    {
      help: 'Source font path. Can be used multiple times to merge glyphs from different fonts.',
      metavar: '<path>',
      action: ActionFontAdd,
      required: true
    }
  );

  parser.addArgument(
    [ '-r', '--range' ],
    {
      help: `
Range of glyphs to copy. Can be used multiple times, belongs to previously declared "--font". Examples:
  -r 0x1F450
  -r 0x20-0x7F
  -r 32-127
  -r 0x1F450=>0xF005
  -r 0x1F450-0x1F470=>0xF005
`,
      type: range,
      action: ActionFontRangeAdd
    }
  );

  parser.addArgument(
    [ '--symbols' ],
    {
      help: `
List of characters to copy, belongs to previously declared "--font". Examples:
  --symbols ,.0123456789
  --symbols abcdefghigklmnopqrstuvwxyz
`,
      action: ActionFontRangeAdd
    }
  );

  let args = parser.parseArgs(argv.length ? argv : [ '-h' ]);

  for (let { source, ranges } of args.font) {
    if (ranges.length === 0) {
      parser.error(`You need to specify either "--range" or "--symbols" for font "${source}"`);
    }
  }

  let font_data = collect_font_data(args);

  let files = create_font(args, font_data);

  store_font(files);
};
