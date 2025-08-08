'use strict';

const BitmapFontAdapter = require('./bitmap_font_adapter');
const BDFReader = require('../bdf_reader');

/**
 * @class BDFFontAdapter
 * @extends BitmapFontAdapter
 * Handles BDF (Bitmap Distribution Format) text-based bitmap fonts
 */
class BDFFontAdapter extends BitmapFontAdapter {
  constructor(sourcePath, sourceBuffer, args) {
    const reader = new BDFReader(sourceBuffer);
    reader.parse();
    super(sourcePath, sourceBuffer, args, reader);
  }
}

module.exports = BDFFontAdapter;
