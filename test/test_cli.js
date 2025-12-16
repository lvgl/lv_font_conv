'use strict';

const assert            = require('assert');
const { execFileSync }  = require('child_process');
const fs                = require('fs');
const path              = require('path');
const rimraf            = require('rimraf');
const fc                = require('fast-check');
const run               = require('../lib/cli').run;
const range             = require('../lib/cli')._range;

const script_path = path.join(__dirname, '../lv_font_conv.js');
const font = require.resolve('roboto-fontface/fonts/roboto/Roboto-Black.woff');

describe('Cli', function () {

  it('Should run', function () {
    let out = execFileSync(script_path, [], { stdio: 'pipe' });
    assert.equal(out.toString().substring(0, 5), 'usage');
  });

  it('Should print error if range is specified without font', async function () {
    await assert.rejects(
      run('--range 123 --font test'.split(' '), true),
      /Only allowed after/
    );
  });

  it('Should print error if range is invalid', async function () {
    await assert.rejects(
      run('--font test --range invalid'.split(' '), true),
      /argument -r\/--range: invalid range value: 'invalid'/
    );
  });

  it('Should require character set specified for each font', async function () {
    await assert.rejects(
      run('--font test --size 18 --bpp 4 --format dump'.split(' '), true),
      /You need to specify either /
    );
  });

  it('Should print error if size is invalid', async function () {
    await assert.rejects(
      run('--size 10xxx'.split(' '), true),
      /argument --size: invalid positive_int value: '10xxx'/
    );
  });

  it('Should print error if size is zero', async function () {
    await assert.rejects(
      run('--size 0'.split(' '), true),
      /argument --size: invalid positive_int value: '0'/
    );
  });

  it('Should write a font using "dump" writer', async function () {
    let rnd = Math.random().toString(16).slice(2, 10);
    let dir = path.join(__dirname, rnd);

    try {
      await run([
        '--font', font, '--range', '0x20-0x22', '--size', '18',
        '-o', dir, '--bpp', '2', '--format', 'dump'
      ], true);

      assert.deepEqual(fs.readdirSync(dir), [ '20.png', '21.png', '22.png', 'font_info.json' ]);
    } finally {
      rimraf.sync(dir);
    }
  });

  it('Should write a font using "bin" writer', async function () {
    let rnd = Math.random().toString(16).slice(2, 10) + '.font';
    let file = path.join(__dirname, rnd);

    try {
      await run([
        '--font', font, '--range', '0x20-0x22', '--size', '18',
        '-o', file, '--bpp', '2', '--format', 'bin'
      ], true);

      let contents = fs.readFileSync(file);

      assert.equal(contents.slice(4, 8), 'head');
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('Should require output for "dump" writer', async function () {
    await assert.rejects(
      run([ '--font', font, '--range', '0x20-0x22', '--size', '18', '--bpp', '2', '--format', 'dump' ], true),
      /Output is required for/
    );
  });

  describe('range', function () {
    it('Should accept single number', function () {
      assert.deepEqual(range('42'), [ 42, 42, 42 ]);
    });

    it('Should accept single number (hex)', function () {
      assert.deepEqual(range('0x2A'), [ 42, 42, 42 ]);
    });

    it('Should accept simple range', function () {
      assert.deepEqual(range('40-0x2A'), [ 40, 42, 40 ]);
    });

    it('Should accept single number with mapping', function () {
      assert.deepEqual(range('42=>72'), [ 42, 42, 72 ]);
    });

    it('Should accept range with mapping', function () {
      assert.deepEqual(range('42-45=>0x48'), [ 42, 45, 72 ]);
    });

    it('Should error on invalid ranges', function () {
      assert.throws(
        () => range('20-19'),
        /Invalid range/
      );
    });

    it('Should error on invalid numbers', function () {
      assert.throws(
        () => range('13-abc80'),
        /not a number/
      );
    });

    it('Should not accept characters out of unicode range', function () {
      assert.throws(
        () => range('1114444'),
        /out of unicode/
      );
    });
  });

  describe('pixel-order', function () {
    /**
     * Property 10: LSB and compression are mutually exclusive.
     * Any configuration specifying both LSB pixel ordering and compression
     * should produce an error.
     */
    it('Property 10: LSB with compression should error', async function () {
      // Test that LSB + compression (default, no --no-compress) always fails
      await assert.rejects(
        run([
          '--font', font, '--range', '0x41', '--size', '18',
          '--bpp', '2', '--format', 'bin', '--pixel-order', 'LSB',
          '-o', 'test_output.bin'
        ], true),
        /LSB requires --no-compress/
      );
    });

    it('Property 10: LSB with compression - property test', async function () {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(1, 2, 4, 8),  // valid BPP values
          fc.constantFrom('bin', 'lvgl', 'dump'),  // valid formats
          async (bpp, format) => {
            // LSB without --no-compress should always fail
            try {
              await run([
                '--font', font, '--range', '0x41', '--size', '18',
                '--bpp', String(bpp), '--format', format, '--pixel-order', 'LSB',
                '-o', 'test_output_prop'
              ], true);
              // If we get here without error, the test should fail
              assert.fail('Expected error for LSB without --no-compress');
            } catch (err) {
              // Should contain error about LSB incompatibility
              assert.ok(
                /LSB requires --no-compress/.test(err.message),
                `Expected LSB incompatibility error, got: ${err.message}`
              );
            }
          }
        ),
        { numRuns: 12 }  // 4 BPP * 3 formats = 12 combinations
      );
    });

    it('Should accept LSB with --no-compress', async function () {
      let rnd = Math.random().toString(16).slice(2, 10) + '.font';
      let file = path.join(__dirname, rnd);

      try {
        await run([
          '--font', font, '--range', '0x41', '--size', '18',
          '-o', file, '--bpp', '2', '--format', 'bin',
          '--pixel-order', 'LSB', '--no-compress'
        ], true);

        // Should succeed and create file
        assert.ok(fs.existsSync(file));
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it('Should accept MSB with compression (default)', async function () {
      let rnd = Math.random().toString(16).slice(2, 10) + '.font';
      let file = path.join(__dirname, rnd);

      try {
        await run([
          '--font', font, '--range', '0x41', '--size', '18',
          '-o', file, '--bpp', '2', '--format', 'bin',
          '--pixel-order', 'MSB'
        ], true);

        // Should succeed and create file
        assert.ok(fs.existsSync(file));
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it('Should default to MSB when --pixel-order not specified', async function () {
      let rnd = Math.random().toString(16).slice(2, 10) + '.font';
      let file = path.join(__dirname, rnd);

      try {
        await run([
          '--font', font, '--range', '0x41', '--size', '18',
          '-o', file, '--bpp', '2', '--format', 'bin'
        ], true);

        // Should succeed (MSB is default, compatible with compression)
        assert.ok(fs.existsSync(file));
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it('Should reject invalid pixel-order value', async function () {
      await assert.rejects(
        run([
          '--font', font, '--range', '0x41', '--size', '18',
          '--bpp', '2', '--format', 'bin', '--pixel-order', 'INVALID',
          '-o', 'test_output.bin'
        ], true),
        /invalid choice.*INVALID/i
      );
    });
  });
});
