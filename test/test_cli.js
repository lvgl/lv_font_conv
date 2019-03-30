'use strict';


const assert            = require('assert');
const { execFileSync }  = require('child_process');
const fs                = require('fs');
const path              = require('path');
const rimraf            = require('rimraf');
const { run }           = require('../lib/cli');


const script_path = path.join(__dirname, '../lv_font_conv.js');
const font = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');


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


  it('Should require character set specified for each font', function () {
    assert.throws(() => {
      run('--font test --size 18 --bpp 4'.split(' '), true);
    }, /You need to specify either /);
  });


  it('Should print error if size is invalid', function () {
    assert.throws(() => {
      run('--size 10xxx'.split(' '), true);
    }, /Invalid int value/);
  });


  it('Should print error if size is zero', function () {
    assert.throws(() => {
      run('--size 0'.split(' '), true);
    }, /Invalid int value/);
  });


  it('Should process a font', function () {
    let rnd = Math.random().toString(16).slice(2, 10);
    let dir = path.join(__dirname, rnd);

    try {
      run([ '--font', font, '--range', '0x20-0x22', '--size', '18', '-o', dir, '--bpp', '2' ], true);

      assert.deepEqual(fs.readdirSync(dir), [ '20.png', '21.png', '22.png' ]);
    } finally {
      rimraf.sync(dir);
    }
  });


  it('Should require output for "dump" writer', function () {
    assert.throws(() => {
      run([ '--font', font, '--range', '0x20-0x22', '--size', '18', '--bpp', '2' ], true);
    }, /Output is required for/);
  });
});
