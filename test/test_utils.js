'use strict';


const assert    = require('assert');
const set_depth = require('../lib/utils').set_depth;


describe('Utils', function () {

  describe('set_depth', function () {
    it('Should reduce glyph to depth=1', function () {
      let input  = [ 0b00000000, 0b01111111, 0b10000000, 0b11111111 ];
      let expect = [ 0b00000000, 0b00000000, 0b11111111, 0b11111111 ];
      let depth  = 1;

      let glyph = set_depth({
        bbox: { x: 0, y: 0, width: input.length, height: 1 },
        pixels: [ input ]
      }, depth);

      assert.deepEqual(glyph.pixels[0], expect);
    });

    it('Should reduce glyph to depth=2', function () {
      let input  = [ 0b00111111, 0b01000000, 0b10111111, 0b11000000 ];
      let expect = [ 0b00000000, 0b01010101, 0b10101010, 0b11111111 ];
      let depth  = 2;

      let glyph = set_depth({
        bbox: { x: 0, y: 0, width: input.length, height: 1 },
        pixels: [ input ]
      }, depth);

      assert.deepEqual(glyph.pixels[0], expect);
    });

    it('Should reduce glyph to depth=3', function () {
      let input =  [ 0b00111111, 0b01000000, 0b01011111, 0b01100000, 0b01111111,
        0b10000000, 0b10011111, 0b10100000, 0b10111111, 0b11000000 ];
      let expect = [ 0b00100100, 0b01001001, 0b01001001, 0b01101101, 0b01101101,
        0b10010010, 0b10010010, 0b10110110, 0b10110110, 0b11011011 ];
      let depth  = 3;

      let glyph = set_depth({
        bbox: { x: 0, y: 0, width: input.length, height: 1 },
        pixels: [ input ]
      }, depth);

      assert.deepEqual(glyph.pixels[0], expect);
    });

    it('Should reduce glyph to depth=8', function () {
      let input  = [ 0b11001001, 0b00001111, 0b11011010, 0b10100010 ];
      let expect = [ 0b11001001, 0b00001111, 0b11011010, 0b10100010 ];
      let depth  = 8;

      let glyph = set_depth({
        bbox: { x: 0, y: 0, width: input.length, height: 1 },
        pixels: [ input ]
      }, depth);

      assert.deepEqual(glyph.pixels[0], expect);
    });
  });
});
