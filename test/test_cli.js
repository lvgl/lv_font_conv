'use strict';


const assert            = require('assert');
const { join }          = require('path');
const { execFileSync }  = require('child_process');
const { run }           = require('../lib/cli');


const script_path = join(__dirname, '../lv_font_conv.js');


describe('Script', function () {

  it('Should run', function () {
    let out = execFileSync(script_path, [], { stdio: 'pipe' });
    assert.equal(out.toString().substring(0, 5), 'usage');
  });


  it('Should print error if range is specified without font', function () {
    assert.throws(() => {
      run('--range 123 --font test'.split(' '), true);
    }, /Only allowed after/);
  });


  it('Should print error if range is invalid', function () {
    assert.throws(() => {
      run('--font test --range invalid'.split(' '), true);
    }, /Invalid range value/);
  });
});
