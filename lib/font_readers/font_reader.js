'use strict';


/**
 * @class FontReader
 * @abstract
 * Unified interface for font reading that abstracts away
 * the differences between FreeType, PCF, and BDF fonts
 */
class FontReader {
  constructor(sourcePath, sourceBuffer, args) {
    if (new.target === FontReader) {
      throw new Error('Cannot instantiate FontReader directly.');
    }
    this.sourcePath = sourcePath;
    this.sourceBuffer = sourceBuffer;
    this.args = args;
  }

  static isPCFFont(buffer) {
    if (buffer.length < 4) return false;
    return buffer[0] === 0x01 && buffer[1] === 0x66 && buffer[2] === 0x63 && buffer[3] === 0x70;
  }

  /**
   * Check if the font contains a glyph for the given character code.
   * @abstract
   * @param {number} charCode - The Unicode character code to check.
   * @returns {boolean} True if the glyph exists, false otherwise.
   * @throws {Error} if not implemented by subclasses.
   */
  // eslint-disable-next-line no-unused-vars
  hasGlyph(charCode) {
    throw new Error('Method \'hasGlyph()\' must be implemented by subclasses.');
  }

  /**
   * Render a glyph for the given character code.
   * @abstract
   * @param {number} charCode - The Unicode character code to render.
   * @param {Object} options - Rendering options (e.g., hinting, LCD).
   * @returns {Object|null} Glyph data with pixels, metrics, etc., or null if not found.
   * @throws {Error} if not implemented by subclasses.
   */
  // eslint-disable-next-line no-unused-vars
  renderGlyph(charCode, options) {
    throw new Error('Method \'renderGlyph()\' must be implemented by subclasses.');
  }

  /**
   * Get font-level metrics (ascent, descent, line gap).
   * @abstract
   * @returns {Object} Font metrics with typoAscent, typoDescent, typoLineGap.
   * @throws {Error} if not implemented by subclasses.
   */
  getFontMetrics() {
    throw new Error('Method \'getFontMetrics()\' must be implemented by subclasses.');
  }

  /**
   * Get kerning value between two character codes.
   * @abstract
   * @param {number} charCode1 - The first character code.
   * @param {number} charCode2 - The second character code.
   * @returns {number} Kerning adjustment value.
   * @throws {Error} if not implemented by subclasses.
   */
  // eslint-disable-next-line no-unused-vars
  getKerningValue(charCode1, charCode2) {
    throw new Error('Method \'getKerningValue()\' must be implemented by subclasses.');
  }

  /**
   * Clean up any resources used by the font reader.
   * @virtual
   */
  destroy() {
    // default: no-op
  }
}

module.exports = FontReader;
