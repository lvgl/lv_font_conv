'use strict';

const BitmapFontAdapter = require('./bitmap_font_adapter');
const PCFReader = require('../pcf_reader');

/**
 * @class PCFFontAdapter
 * @extends BitmapFontAdapter
 * Handles PCF (Portable Compiled Format) bitmap fonts
 */
class PCFFontAdapter extends BitmapFontAdapter {
  constructor(sourcePath, sourceBuffer, args) {
    const reader = new PCFReader(sourceBuffer);
    reader.parse();
    super(sourcePath, sourceBuffer, args, reader);
  }
}

module.exports = PCFFontAdapter;
