'use strict';


const assert            = require('assert');
const collect_font_data = require('../lib/collect_font_data');
const fs                = require('fs');


const source_path = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');
const source_bin  = fs.readFileSync(source_path);


describe('Collect font data', function () {

  it('Should convert range to bitmap', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x41, 0x42, 0x80 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 2);
    assert.equal(out.glyphs[0].code, 0x80);
    assert.equal(out.glyphs[1].code, 0x81);
  });


  it('Should convert symbols to bitmap', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { symbols: 'AB' } ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 2);
    assert.equal(out.glyphs[0].code, 0x41);
    assert.equal(out.glyphs[1].code, 0x42);
  });


  it('Should not fail on combining characters', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x300, 0x300, 0x300 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 1);
    assert.equal(out.glyphs[0].code, 0x300);
    assert.strictEqual(out.glyphs[0].advanceWidth, 0);
  });


  it('Should allow specifying same font multiple times', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x41, 0x41, 0x41 ] } ]
      }, {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x51, 0x51, 0x51 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 2);
  });


  it('Should allow multiple ranges', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x41, 0x41, 0x41, 0x51, 0x52, 0x51 ] } ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 3);
  });



  it('Should work with sparse ranges', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ { range: [ 0x3d0, 0x3d8, 0x3d0 ] } ]
      } ],
      size: 10
    });

    assert.equal(out.glyphs.length, 3);
    assert.equal(out.glyphs[0].code, 0x3d1);
    assert.equal(out.glyphs[1].code, 0x3d2);
    assert.equal(out.glyphs[2].code, 0x3d6);
  });


  it('Should read kerning values', async function () {
    let out = await collect_font_data({
      font: [ {
        source_path,
        source_bin,
        ranges: [ // AVW
          { range: [ 0x41, 0x41, 1 ] },
          { range: [ 0x56, 0x57, 2 ] }
        ]
      } ],
      size: 18
    });

    assert.equal(out.glyphs.length, 3);

    // A
    assert.equal(out.glyphs[0].code, 1);
    assert(out.glyphs[0].kerning[1] === undefined);
    assert(out.glyphs[0].kerning[2] < 0);
    assert(out.glyphs[0].kerning[3] < 0);

    // V
    assert.equal(out.glyphs[1].code, 2);
    assert(out.glyphs[1].kerning[1] < 0);
    assert(out.glyphs[1].kerning[2] === undefined);
    assert(out.glyphs[1].kerning[3] === undefined);

    // W
    assert.equal(out.glyphs[2].code, 3);
    assert(out.glyphs[2].kerning[1] < 0);
    assert(out.glyphs[2].kerning[2] === undefined);
    assert(out.glyphs[2].kerning[3] === undefined);
  });


  it('Should error on empty ranges', async function () {
    await assert.rejects(
      collect_font_data({
        font: [ {
          source_path,
          source_bin,
          ranges: [ { range: [ 0x3d3, 0x3d5, 0x3d3 ] } ]
        } ],
        size: 18
      }),
      /doesn't have any characters/
    );
  });


  it('Should error on empty symbol sets', async function () {
    await assert.rejects(
      collect_font_data({
        font: [ {
          source_path,
          source_bin,
          ranges: [ { symbols: '\u03d3\u03d4\u03d5' } ]
        } ],
        size: 18
      }),
      /doesn't have any characters/
    );
  });


  it('Should error when font format is unknown', async function () {
    await assert.rejects(
      collect_font_data({
        font: [ {
          source_path: __filename,
          source_bin: fs.readFileSync(__filename),
          ranges: [ { range: [ 0x20, 0x20, 0x20 ] } ]
        } ],
        size: 18
      }),
      /Cannot load font.*(Unknown|Unsupported)/
    );
  });
});
