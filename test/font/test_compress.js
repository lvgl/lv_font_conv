'use strict';


const assert = require('assert');
const compress = require('../../lib/font/compress');
const { BitStream } = require('bit-buffer');


function c(data, opts) {
  const buf = Buffer.alloc(data.length * 2 + 100);
  const bs = new BitStream(buf);
  bs.bigEndian = true;
  compress(bs, data, opts);
  const result = Buffer.alloc(bs.byteIndex);
  buf.copy(result, 0, 0, bs.byteIndex);
  return result;
}

describe('Compress', function () {

  it('pass through, bpp=8', function () {
    assert.deepEqual(
      c([ 0x1, 0x2, 0x3, 0x2 ], { bpp: 8 }),
      Buffer.from([ 0x1, 0x2, 0x3, 0x2 ])
    );
  });

  it('pass through, bpp=4', function () {
    assert.deepEqual(
      c([ 0x1, 0x2, 0x3, 0x2 ], { bpp: 4 }),
      // 0001 0010 0011 0010
      Buffer.from([ 0x12, 0x32 ])
    );
  });

  it('pass through, bpp=3', function () {
    assert.deepEqual(
      c([ 0xFF, 0xF1, 0xFF ], { bpp: 3 }),
      // 111 001 11|1 0000000
      Buffer.from([ 0xE7, 0x80 ])
    );
  });

  it('collapse to bit', function () {
    assert.deepEqual(
      c([ 0x1, 0x3, 0x3, 0x3, 0x1 ], { bpp: 4 }),
      // 0001 0011 | 0011 1 0 00|01 000000
      Buffer.from([ 0b00010011, 0b00111000, 0b01000000 ])
    );
  });

  it('collapse 10+ repeats with counter', function () {
    const data = Array(15).fill(0);
    data[data.length - 1] = 0b11;
    assert.deepEqual(
      c(data, { bpp: 2 }),
      // 00 00 1111|1111111 0|00010 11 0
      Buffer.from([ 0b00001111, 0b11111110, 0b00010110 ])
    );
  });

  it('split repeats if counter overflows', function () {
    const data = Array(77).fill(0);
    data[data.length - 1] = 3;
    assert.deepEqual(
      c(data, { bpp: 2 }),
      // 00 00 1111|1111111 1|11111 00 1|1 0000000
      Buffer.from([ 0b00001111, 0b11111111, 0b11111001, 0b10000000 ])
    );
  });

});
