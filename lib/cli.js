// Parse input arguments and execute convertor

'use strict';


const argparse     = require('argparse');
const parse_range  = require('./range_parse');
const Ranger       = require('./ranger');


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

    // this.dest is either 'range' or 'symbols'
    lastFont.ranges.push([ this.dest, value ]);
  }
}


module.exports.run = function (argv, debug = false) {

  let parser = new argparse.ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'TODO',
    debug
  });

  parser.addArgument(
    [ '-s', '--size' ],
    { help: 'output font size' }
  );

  parser.addArgument(
    [ '-o', '--output' ],
    { help: 'output file path' }
  );

  parser.addArgument(
    [ '-b', '--bpp' ],
    { help: 'bits per pixel' }
  );

  parser.addArgument(
    [ '-c', '--compress' ],
    { help: 'compression algorithm' }
  );

  parser.addArgument(
    [ '-F', '--format' ],
    {
      help: 'output format, useful for debug & experiments',
      choices: [ 'json', 'images' ]
    }
  );

  parser.addArgument(
    [ '-f', '--font' ],
    {
      help: 'local path or URL (may be used multiple times)',
      action: ActionFontAdd,
      required: true
    }
  );

  parser.addArgument(
    [ '-r', '--range' ],
    {
      help: 'range (may be used multiple times, belongs to previously declared --font)',
      // wrap parser into function to show error text correctly (it uses function name)
      type: function range(str) { return parse_range(str); },
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

  // merge all ranges
  let ranger = new Ranger();

  for (let font of args.font) {
    for (let [ key, value ] of font.ranges) {
      if (key === 'range') {
        ranger.add_range(font.source, ...value);
      } else {
        // assuming key === 'symbols'
        ranger.add_symbols(font.source, value);
      }
    }
  }

  console.log(ranger.get());
};
