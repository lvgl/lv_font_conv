'use strict';


const assert            = require('assert');
const collect_font_data = require('../lib/collect_font_data');

const font = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');


describe('Collect font data', function () {

  it('Should convert range to bitmap', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ { range: [ 0x41, 0x42, 0x80 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.length, 2);

    assert.equal(out[0].code, 0x80);
    assert.equal(out[0].pixels.length, 18); // height
    assert.equal(out[0].pixels[0].length, 10); // width

    assert.equal(out[1].code, 0x81);
    assert.equal(out[1].pixels.length, 18); // height
    assert.equal(out[1].pixels[0].length, 10); // width
  });


  it('Should convert symbols to bitmap', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ { symbols: 'AB' } ]
      } ],
      size: 18
    });

    assert.equal(out.length, 2);

    assert.equal(out[0].code, 0x41);
    assert.equal(out[0].pixels.length, 18); // height
    assert.equal(out[0].pixels[0].length, 10); // width

    assert.equal(out[1].code, 0x42);
    assert.equal(out[1].pixels.length, 18); // height
    assert.equal(out[1].pixels[0].length, 10); // width
  });


  it('Should not fail on combining characters', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ { range: [ 0x300, 0x300, 0x300 ] } ]
      } ],
      size: 18
    });

    // ignore those characters for now
    assert.equal(out.length, 0);
  });


  it('Should allow specifying same font multiple times', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ { range: [ 0x41, 0x41, 0x41 ] } ]
      }, {
        source: font,
        ranges: [ { range: [ 0x51, 0x51, 0x51 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.length, 2);
  });


  it('Should work with sparse ranges', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ { range: [ 0x3d0, 0x3d8, 0x3d0 ] } ]
      } ],
      size: 10
    });

    assert.equal(out.length, 3);
    assert.equal(out[0].code, 0x3d1);
    assert.equal(out[1].code, 0x3d2);
    assert.equal(out[2].code, 0x3d6);
  });
});
