'use strict';


const assert            = require('assert');
const collect_font_data = require('../lib/collect_font_data');
const canvas            = require('canvas');


function createCanvas(w, h) {
  return canvas.createCanvas(w, h);
}


const font = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');


describe('Collect font data', function () {

  it('Should convert range to bitmap', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ { range: [ 0x41, 0x42, 0x80 ] } ]
      } ],
      size: 18
    }, createCanvas);

    assert.equal(out.glyphs.length, 2);
    assert.equal(out.glyphs[0].code, 0x80);
    assert.equal(out.glyphs[1].code, 0x81);
  });


  it('Should convert symbols to bitmap', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ { symbols: 'AB' } ]
      } ],
      size: 18
    }, createCanvas);

    assert.equal(out.glyphs.length, 2);
    assert.equal(out.glyphs[0].code, 0x41);
    assert.equal(out.glyphs[1].code, 0x42);
  });


  it('Should not fail on combining characters', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ { range: [ 0x300, 0x300, 0x300 ] } ]
      } ],
      size: 18
    }, createCanvas);

    assert.equal(out.glyphs.length, 1);
    assert.equal(out.glyphs[0].code, 0x300);
    assert.strictEqual(out.glyphs[0].advanceWidth, 0);
  });


  it('Should allow specifying same font multiple times', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ { range: [ 0x41, 0x41, 0x41 ] } ]
      }, {
        source_path: font,
        ranges: [ { range: [ 0x51, 0x51, 0x51 ] } ]
      } ],
      size: 18
    }, createCanvas);

    assert.equal(out.glyphs.length, 2);
  });


  it('Should work with sparse ranges', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ { range: [ 0x3d0, 0x3d8, 0x3d0 ] } ]
      } ],
      size: 10
    }, createCanvas);

    assert.equal(out.glyphs.length, 3);
    assert.equal(out.glyphs[0].code, 0x3d1);
    assert.equal(out.glyphs[1].code, 0x3d2);
    assert.equal(out.glyphs[2].code, 0x3d6);
  });


  it('Should read kerning values', function () {
    let out = collect_font_data({
      font: [ {
        source_path: font,
        ranges: [ // AVW
          { range: [ 0x41, 0x41, 1 ] },
          { range: [ 0x56, 0x57, 2 ] }
        ]
      } ],
      size: 18
    }, createCanvas);

    assert.equal(out.glyphs.length, 3);

    // A
    assert.equal(out.glyphs[0].code, 1);
    assert(out.glyphs[0].kerning[1] === undefined);
    assert(out.glyphs[0].kerning[2] < 0);
    assert(out.glyphs[0].kerning[3] < 0);

    // V
    assert.equal(out.glyphs[1].code, 2);
    assert(out.glyphs[1].kerning[1] < 0);
    assert(out.glyphs[1].kerning[2] === undefined);
    assert(out.glyphs[1].kerning[3] === undefined);

    // W
    assert.equal(out.glyphs[2].code, 3);
    assert(out.glyphs[2].kerning[1] < 0);
    assert(out.glyphs[2].kerning[2] === undefined);
    assert(out.glyphs[2].kerning[3] === undefined);
  });


  it('Should error on empty ranges', function () {
    assert.throws(() => {
      collect_font_data({
        font: [ {
          source_path: font,
          ranges: [ { range: [ 0x3d3, 0x3d5, 0x3d3 ] } ]
        } ],
        size: 18
      }, createCanvas);
    }, /doesn't have any characters/);
  });


  it('Should error on empty symbol sets', function () {
    assert.throws(() => {
      collect_font_data({
        font: [ {
          source_path: font,
          ranges: [ { symbols: '\u03d3\u03d4\u03d5' } ]
        } ],
        size: 18
      }, createCanvas);
    }, /doesn't have any characters/);
  });


  it('Should error when font format is unknown', function () {
    assert.throws(() => {
      collect_font_data({
        font: [ {
          source_path: __filename,
          ranges: [ { range: [ 0x20, 0x20, 0x20 ] } ]
        } ],
        size: 18
      }, createCanvas);
    }, /Cannot load font.*Unknown font format/);
  });
});
