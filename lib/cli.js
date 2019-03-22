// Parse input arguments and execute convertor
'use strict';


const argparse = require('argparse');
const format   = require('util').format;


class FontStartAction extends argparse.Action {
  call(parser, namespace, value) {
    let items = (namespace[this.dest] || []).slice();
    items.push({ name: value, args: {} });
    namespace[this.dest] = items;
  }
}


class FontArgumentActionAppend extends argparse.Action {
  call(parser, namespace, value) {
    let fonts = namespace.font || [];

    if (fonts.length === 0) {
      let message = format('argument "%s": Only allowed after --font', this.getName());
      let err = new TypeError(message);
      err.code = 'ARGError';
      throw err;
    }

    let lastFont = fonts[fonts.length - 1];

    lastFont.args[this.dest] = lastFont.args[this.dest] || [];
    lastFont.args[this.dest].push(value);
  }
}


function range(value) {
  let reg = /^((0x)[0-9a-f]+|[0-9]+)(?:-((0x)[0-9a-f]+|[0-9]+))?$/i.exec(value);

  if (!reg) throw new Error(value + ' is not a number or range.');

  let [ , start, start_hex, end, end_hex ] = reg;

  if (typeof end === 'undefined') {
    end = start;
    end_hex = start_hex;
  }

  start = parseInt(start, start_hex ? 16 : 10);
  end = parseInt(end, end_hex ? 16 : 10);

  return [ start, end ];
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
      action: FontStartAction,
      required: true
    }
  );

  parser.addArgument(
    [ '-r', '--range' ],
    {
      help: 'range (may be used multiple times, belongs to previously declared --font)',
      metavar: 'AAAA-BBBB',
      action: FontArgumentActionAppend,
      type: range
    }
  );

  let args = parser.parseArgs(argv.length ? argv : [ '-h' ]);

  console.log(JSON.stringify(args, true, 2));
};
