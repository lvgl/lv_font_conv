// Parse input arguments and execute converter.

'use strict';

const fs          = require('fs');
const mkdirp      = require('mkdirp');
const path        = require('path');

const convert     = require('./convert');

const { parse_args, range } = require('./parse_args');

module.exports.run = async function (argv, debug = false) {
  const args = parse_args(argv, debug, fs, path);

  //
  // Convert
  //

  let files = await convert(args);

  //
  // Store files
  //

  for (let [ filename, data ] of Object.entries(files)) {
    let dir = path.dirname(filename);

    mkdirp.sync(dir);

    fs.writeFileSync(filename, data);
  }

};

// Export for tests
module.exports._range = range;
