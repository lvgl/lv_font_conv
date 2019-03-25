'use strict';


const assert = require('assert');
const Ranger = require('../lib/ranger');


describe('Ranger', function () {

  it('Should accept symbols', function () {
    let map = new Ranger().add_symbols('font', 'aba8').get();
    assert.deepEqual(map, { 56: { font: 'font', code: 56 },
      97: { font: 'font', code: 97 }, 98: { font: 'font', code: 98 } });
  });

  it('Should handle astral characters correctly', function () {
    let map = new Ranger().add_symbols('font', 'a𐌀b𐌁').get();
    assert.deepEqual(map, { 97: { font: 'font', code: 97 }, 98: { font: 'font', code: 98 },
      66304: { font: 'font', code: 66304 }, 66305: { font: 'font', code: 66305 } });
  });

  it('Should merge ranges', function () {
    let map = new Ranger().add_range('font', 42, 44, 42).add_range('font2', 46, 46, 85).get();
    assert.deepEqual(map, { 42: { font: 'font', code: 42 }, 43: { font: 'font', code: 43 },
      44: { font: 'font', code: 44 }, 85: { font: 'font2', code: 46 } });
  });
});
