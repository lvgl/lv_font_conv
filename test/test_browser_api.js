'use strict';

const assert           = require('assert');
const { execFileSync } = require('child_process');
const fs               = require('fs');
const os               = require('os');
const path             = require('path');

const browserify = require.resolve('browserify/bin/cmd.js');
const font = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');

describe('Browser API', function () {

  it('Should parse arguments from the browserified bundle', function () {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lv-font-conv-browser-'));
    let bundle = path.join(dir, 'convert_browser.js');

    try {
      execFileSync(process.execPath, [
        browserify,
        path.join(__dirname, '../web/convert_browser.js'),
        '--standalone',
        'lv_font_conv',
        '-o',
        bundle
      ]);

      let api = require(bundle);
      let args = api.parse_args([
        '--font', font,
        '--range', '0x20-0x22',
        '--size', '18',
        '-o', path.join(dir, 'font.c'),
        '--bpp', '2',
        '--format', 'lvgl',
        '--no-compress'
      ], false, fs, path);

      assert.equal(args.format, 'lvgl');
      assert.equal(args.font.length, 1);
      assert.equal(args.font[0].ranges.length, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
