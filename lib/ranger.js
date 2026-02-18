'use strict';

/**
 * Merge font ranges into a single mapping.
 */
class Ranger {
  constructor() {
    this.data = {};
  }

  // Input:
  //  -r 0x1F450 - single value, dec or hex format
  //  -r 0x1F450-0x1F470 - range
  //  -r 0x1F450=>0xF005 - single glyph with mapping
  //  -r 0x1F450-0x1F470=>0xF005 - range with mapping
  add_range(font, start, end, mapped_start) {
    let offset = mapped_start - start;
    let output = [];

    for (let i = start; i <= end; i++) {
      this._set_char(font, i, i + offset);
      output.push(i);
    }

    return output;
  }

  // Input: characters to copy, e.g. '1234567890abcdef'
  add_symbols(font, str) {
    let output = [];

    for (let chr of str) {
      let code = chr.codePointAt(0);
      this._set_char(font, code, code);
      output.push(code);
    }

    return output;
  }

  _set_char(font, code, mapped_to) {
    this.data[mapped_to] = { font, code };
  }

  get() {
    return this.data;
  }
}

module.exports = Ranger;
