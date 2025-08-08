'use strict';

const AppError = require('./app_error');

// Import all adapter classes
const FontAdapter = require('./adapters/font_adapter');
const BitmapFontAdapter = require('./adapters/bitmap_font_adapter');
const FreeTypeFontAdapter = require('./adapters/freetype_font_adapter');
const PCFFontAdapter = require('./adapters/pcf_font_adapter');
const BDFFontAdapter = require('./adapters/bdf_font_adapter');

// Import readers for detection
const BDFReader = require('./bdf_reader');

/**
 * Factory function to create the appropriate font adapter based on font type
 * @param {string} sourcePath - Path to the font file
 * @param {Buffer} sourceBuffer - Font file data
 * @param {Object} args - Font conversion arguments
 * @returns {FontAdapter} The appropriate font adapter instance
 */
function createFontAdapter(sourcePath, sourceBuffer, args) {
  if (FontAdapter.isPCFFont(sourceBuffer)) {
    return new PCFFontAdapter(sourcePath, sourceBuffer, args);
  } else if (BDFReader.isBDFFont(sourceBuffer)) {
    return new BDFFontAdapter(sourcePath, sourceBuffer, args);
  }

  try {
    return new FreeTypeFontAdapter(sourcePath, sourceBuffer, args);
  } catch (err) {
    throw new AppError(`Cannot load font "${sourcePath}": Unknown or unsupported font format`);
  }
}

// Add factory method to FontAdapter class for backward compatibility
FontAdapter.create = createFontAdapter;

// Export everything
module.exports = {
  FontAdapter,
  BitmapFontAdapter,
  FreeTypeFontAdapter,
  PCFFontAdapter,
  BDFFontAdapter,
  createFontAdapter
};
