'use strict';


const assert = require('assert');
const Ranger = require('../lib/ranger');


describe('Ranger', function () {

  it('Should accept symbols', function () {
    let ranger = new Ranger();
    assert.equal(ranger.add_symbols('font', 'aba8').length, 4);
    assert.deepEqual(ranger.get(), { 56: { font: 'font', code: 56 },
      97: { font: 'font', code: 97 }, 98: { font: 'font', code: 98 } });
  });

  it('Should handle astral characters correctly', function () {
    let ranger = new Ranger();
    assert.equal(ranger.add_symbols('font', 'a𐌀b𐌁').length, 4);
    assert.deepEqual(ranger.get(), { 97: { font: 'font', code: 97 }, 98: { font: 'font', code: 98 },
      66304: { font: 'font', code: 66304 }, 66305: { font: 'font', code: 66305 } });
  });

  it('Should merge ranges', function () {
    let ranger = new Ranger();
    assert.equal(ranger.add_range('font', 42, 44, 42).length, 3);
    assert.equal(ranger.add_range('font2', 46, 46, 85).length, 1);
    assert.deepEqual(ranger.get(), { 42: { font: 'font', code: 42 }, 43: { font: 'font', code: 43 },
      44: { font: 'font', code: 44 }, 85: { font: 'font2', code: 46 } });
  });
});
