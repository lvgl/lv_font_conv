'use strict';


const assert = require('assert');
const Font   = require('../../lib/font/font');

/*eslint-disable max-len*/

// Regenerate:
// ./lv_font_conv.js --font ./node_modules/roboto-fontface/fonts/roboto/Roboto-Regular.woff -r 65-65 -r 86-86 --bpp 1 --size 10 --format dump -o 1111 --full-info
const font_data = require('./fixtures/font_info_AV.json');
const font_options = { bpp: 2 };

/*eslint-enable max-len*/


describe('Font', function () {

  it('head table', function () {
    let font = new Font(font_data, font_options);
    let bin = font.head.toBin();

    assert.equal(bin.readUInt32LE(0), bin.length);
    assert.equal(bin.length % 4, 0);

    // Make sure name chars order is proper
    assert.equal(bin.readUInt8(4), 'h'.charCodeAt(0));
    assert.equal(bin.readUInt8(5), 'e'.charCodeAt(0));
    assert.equal(bin.readUInt8(6), 'a'.charCodeAt(0));
    assert.equal(bin.readUInt8(7), 'd'.charCodeAt(0));

    assert.equal(bin.readUInt32LE(8), 1); // version
    assert.equal(bin.readUInt16LE(12), 4); // amount of next tables
    assert.equal(bin.readUInt16LE(14), font_data.size);
    assert.equal(bin.readUInt16LE(16), font_data.ascent);
    assert.equal(bin.readInt16LE(18), font_data.descent);
    assert.equal(bin.readUInt16LE(20), font_data.typoAscent);
    assert.equal(bin.readInt16LE(22), font_data.typoDescent);
    assert.equal(bin.readUInt16LE(24), font_data.typoLineGap);

    assert.equal(bin.readInt16LE(26), 0); // minY
    assert.equal(bin.readInt16LE(28), 8); // maxY

    // Default advanceWidth 0 for proportional fonts
    assert.equal(bin.readUInt16LE(30), 0);

    assert.equal(bin.readUInt8(32), 0); // indexToLocFormat
    assert.equal(bin.readUInt8(33), 0); // glyphIdFofmat
    assert.equal(bin.readUInt8(34), 0); // kerningFormat
    assert.equal(bin.readUInt8(35), 1); // advanceWidthFormat (with fractional)

    assert.equal(bin.readUInt8(36), font_options.bpp);

    assert.equal(bin.readUInt8(37), 1); // xy_bits
    assert.equal(bin.readUInt8(38), 4); // wh_bits
    assert.equal(bin.readUInt8(39), 8); // advanceWidth bits (FP4.4)

    assert.equal(bin.readUInt8(40), 1); // compression id
  });


  it('glyf table', function () {
    let font = new Font(font_data, font_options);
    let bin = font.glyf.toBin();

    assert.equal(bin.readUInt16LE(0), bin.length);
    assert.equal(bin.length % 4, 0);
    assert.equal(bin.readUInt32LE(4), Buffer.from('glyf').readUInt32LE(0));
  });


  it('cmap table', function () {
    let font = new Font(font_data, font_options);
    let bin = font.cmap.toBin();

    assert.equal(bin.readUInt16LE(0), bin.length);
    assert.equal(bin.length % 4, 0);
    assert.equal(bin.readUInt32LE(4), Buffer.from('cmap').readUInt32LE(0));
  });


  it('loca table', function () {
    let font = new Font(font_data, font_options);
    let bin = font.loca.toBin();

    assert.equal(bin.readUInt16LE(0), bin.length);
    assert.equal(bin.length % 4, 0);
    assert.equal(bin.readUInt32LE(4), Buffer.from('loca').readUInt32LE(0));
  });


  it('kern table', function () {
    let font = new Font(font_data, font_options);
    let bin = font.kern.toBin();

    assert.equal(bin.readUInt16LE(0), bin.length);
    assert.equal(bin.length % 4, 0);
    assert.equal(bin.readUInt32LE(4), Buffer.from('kern').readUInt32LE(0));
  });
});
