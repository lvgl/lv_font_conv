'use strict';


const assert      = require('assert');
const parse_range = require('../lib/range_parse');


describe('parse_range', function () {

  it('Should accept single number', function () {
    assert.deepEqual(parse_range('42'), [ 42, 42, 42 ]);
  });

  it('Should accept single number (hex)', function () {
    assert.deepEqual(parse_range('0x2A'), [ 42, 42, 42 ]);
  });

  it('Should accept simple range', function () {
    assert.deepEqual(parse_range('40-0x2A'), [ 40, 42, 40 ]);
  });

  it('Should accept single number with mapping', function () {
    assert.deepEqual(parse_range('42=>72'), [ 42, 42, 72 ]);
  });

  it('Should accept range with mapping', function () {
    assert.deepEqual(parse_range('42-45=>0x48'), [ 42, 45, 72 ]);
  });

  it('Should error on invalid ranges', function () {
    assert.throws(
      () => parse_range('20-19'),
      /Invalid range/
    );
  });

  it('Should error on invalid numbers', function () {
    assert.throws(
      () => parse_range('13-abc80'),
      /not a number/
    );
  });

  it('Should not accept characters out of unicode range', function () {
    assert.throws(
      () => parse_range('1114444'),
      /out of unicode/
    );
  });
});
