'use strict';

const FontReader = require('./font_reader');
const AppError = require('../app_error');

/**
 * @class BitmapFontReader
 * @extends FontReader
 * Base class for bitmap font formats (PCF, BDF, etc.)
 * Handles common bitmap scaling and rendering logic
 */
class BitmapFontReader extends FontReader {
  constructor(sourcePath, sourceBuffer, args, reader) {
    super(sourcePath, sourceBuffer, args);
    this.reader = reader;
  }

  hasGlyph(charCode) {
    return this.reader.hasGlyph(charCode);
  }

  // eslint-disable-next-line no-unused-vars
  renderGlyph(charCode, options) {
    const glyph = this.reader.getGlyph(charCode);
    if (!glyph) return null;

    // Check for integer scaling only
    const nativeSize = this.reader.getNativeSize();
    if (this.args.size % nativeSize !== 0) {
      throw new AppError(
        `Bitmap font scaling must be integer multiple. Requested ${this.args.size}px, native ${nativeSize}px.`
      );
    }

    const scaleFactor = this.args.size / nativeSize;
    const scaledWidth = glyph.width * scaleFactor;
    const scaledHeight = glyph.height * scaleFactor;

    const scaledPixels = scaleFactor === 1 ? glyph.pixels : this.scalePixels(glyph, scaleFactor);

    return {
      width: scaledWidth,
      height: scaledHeight,
      x: Math.round(glyph.left * scaleFactor),
      y: Math.round((glyph.top - glyph.height) * scaleFactor),
      advance_x: Math.round(glyph.advance_width * scaleFactor),
      pixels: scaledPixels,
      freetype: null // Bitmap fonts don't have freetype data
    };
  }

  scalePixels(glyph, scaleFactor) {
    const scaledPixels = [];
    // Pixel replication - make each pixel bigger
    for (let origY = 0; origY < glyph.height; origY++) {
      for (let origX = 0; origX < glyph.width; origX++) {
        const pixelValue = glyph.pixels[origY] ? glyph.pixels[origY][origX] || 0 : 0;
        this.replicatePixel(scaledPixels, origY, origX, pixelValue, scaleFactor);
      }
    }
    return scaledPixels;
  }

  replicatePixel(scaledPixels, origY, origX, pixelValue, scaleFactor) {
    // Replicate this pixel in the scaled output
    for (let dy = 0; dy < scaleFactor; dy++) {
      for (let dx = 0; dx < scaleFactor; dx++) {
        const newY = origY * scaleFactor + dy;
        const newX = origX * scaleFactor + dx;
        if (!scaledPixels[newY]) scaledPixels[newY] = [];
        scaledPixels[newY][newX] = pixelValue;
      }
    }
  }

  getFontMetrics() {
    const metrics = this.reader.getFontMetrics();
    return {
      typoAscent: metrics.fontAscent,
      typoDescent: -metrics.fontDescent, // Bitmap descent is positive, lvgl expects negative
      typoLineGap: 1 // Add 1 pixel line gap to match LVGL built-in fonts
    };
  }

  getUnderlineMetrics() {
    return {
      position: -2, // Reasonable default
      thickness: 1  // Reasonable default
    };
  }

  // eslint-disable-next-line no-unused-vars
  getKerningValue(charCode1, charCode2) {
    // Bitmap fonts don't support kerning
    return 0;
  }

  destroy() {
    // Bitmap fonts don't need explicit cleanup
  }
}

module.exports = BitmapFontReader;
