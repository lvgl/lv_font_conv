'use strict';


const assert     = require('assert');
const cmap_split = require('../../lib/font/cmap_build_subtables');

function range(from, to) {
  return Array(to - from + 1).fill(0).map((_, i) => from + i);
}


describe('Cmap build subtables', function () {

  it('Should represent a single character as format0', function () {
    assert.deepEqual(cmap_split([ 42 ]), [ [ 'format0', [ 42 ] ] ]);
  });

  it('Should represent two characters as sparse', function () {
    assert.deepEqual(cmap_split([ 10, 100 ]), [ [ 'sparse', [ 10, 100 ] ] ]);
  });

  it('Should split ranges', function () {
    assert.deepEqual(cmap_split([ 1, ...range(100, 110), 200 ]), [
      [ 'format0', [ 1 ] ],
      [ 'format0', range(100, 110) ],
      [ 'format0', [ 200 ] ]
    ]);
  });

  it('Should split more than 256 characters into multiple ranges', function () {
    assert.deepEqual(cmap_split(range(1, 257)), [
      [ 'format0', [ 1 ] ],
      [ 'format0', range(2, 257) ]
    ]);
  });

  it('Should split en+de+ru set optimally', function () {
    let set = [
      ...range(65, 90), ...range(97, 122), // en + de
      196, 214, 220, 223, 228, 246, 252,   // de, umlauts and eszett
      1025, ...range(1040, 1103), 1105,    // ru
      7838                                 // de, capital eszett
    ];

    assert.deepEqual(cmap_split(set), [
      [ 'format0', [ ...range(65, 90), ...range(97, 122) ] ],
      [ 'sparse', [ 196, 214, 220, 223, 228, 246, 252, 1025 ] ],
      [ 'format0', [ ...range(1040, 1103), 1105 ] ],
      [ 'format0', [ 7838 ] ]
    ]);
  });
});
