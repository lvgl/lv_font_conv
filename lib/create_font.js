// Create font

'use strict';


let writers = {
  dump: require('./writers/dump')
};


module.exports = function create_font(args, font_data) {
  return writers[args.format](args, font_data);
};

module.exports.formats = Object.keys(writers);
