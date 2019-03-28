'use strict';


const assert            = require('assert');
const path              = require('path');
const collect_font_data = require('../lib/collect_font_data');

const font = path.join(require.resolve('roboto-fontface'), '../../../fonts/roboto/Roboto-Black.woff');


describe('Collect font data', function () {

  it('Should convert symbols to bitmap', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ [ 'range', [ 0x41, 0x41, 0x41 ] ] ]
      } ],
      size: 18
    });

    assert.equal(out.length, 1);
    assert.equal(out[0].code, 0x41);
    assert.equal(out[0].pixels.length, 18); // height
    assert.equal(out[0].pixels[0].length, 10); // width
  });


  it('Should not fail on combining characters', function () {
    let out = collect_font_data({
      font: [ {
        source: font,
        ranges: [ [ 'range', [ 0x300, 0x300, 0x300 ] ] ]
      } ],
      size: 18
    });

    // ignore those characters for now
    assert.equal(out.length, 0);
  });
});
