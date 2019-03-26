// Store font

'use strict';


const fs     = require('fs');
const mkdirp = require('mkdirp');
const path   = require('path');


module.exports = function store_font(files) {
  for (let [ filename, data ] of Object.entries(files)) {
    let dir = path.dirname(filename);

    mkdirp.sync(dir);

    fs.writeFileSync(filename, data);
  }
};
