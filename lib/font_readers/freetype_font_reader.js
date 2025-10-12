'use strict';

const FontReader = require('./font_reader');
const ft_render = require('../freetype');
const opentype = require('opentype.js');

/**
 * @class FreeTypeFontReader
 * @extends FontReader
 * Handles TTF/OTF fonts using FreeType for rendering and OpenType.js for metadata
 */
class FreeTypeFontReader extends FontReader {
  constructor(sourcePath, sourceBuffer, args) {
    super(sourcePath, sourceBuffer, args);
    this.ftFont = ft_render.fontface_create(sourceBuffer, args.size);

    // Parse OpenType font for kerning and metadata
    let buffer = sourceBuffer;
    if (Buffer.isBuffer(buffer)) {
      buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    this.openTypeFont = opentype.parse(buffer);
  }

  hasGlyph(charCode) {
    return ft_render.glyph_exists(this.ftFont, charCode);
  }

  renderGlyph(charCode, options) {
    return ft_render.glyph_render(this.ftFont, charCode, options);
  }

  getFontMetrics() {
    const scale = this.args.size / this.ftFont.units_per_em;
    const os2Metrics = ft_render.fontface_os2_table(this.ftFont);

    return {
      typoAscent: Math.round(os2Metrics.typoAscent * scale),
      typoDescent: Math.round(os2Metrics.typoDescent * scale),
      typoLineGap: Math.round(os2Metrics.typoLineGap * scale)
    };
  }

  getUnderlineMetrics() {
    if (!this.openTypeFont || !this.openTypeFont.tables.post) return { position: 0, thickness: 1 };

    const scale = this.args.size / this.ftFont.units_per_em;
    const postTable = this.openTypeFont.tables.post;

    return {
      position: Math.round(postTable.underlinePosition * scale),
      thickness: Math.round(postTable.underlineThickness * scale)
    };
  }

  getKerningValue(charCode1, charCode2) {
    if (!this.openTypeFont) return 0;

    const glyph1 = this.openTypeFont.charToGlyph(String.fromCodePoint(charCode1));
    const glyph2 = this.openTypeFont.charToGlyph(String.fromCodePoint(charCode2));
    const kernValue = this.openTypeFont.getKerningValue(glyph1, glyph2);

    if (kernValue) {
      return kernValue * this.args.size / this.openTypeFont.unitsPerEm;
    }
    return 0;
  }

  destroy() {
    ft_render.fontface_destroy(this.ftFont);
  }
}

module.exports = FreeTypeFontReader;
