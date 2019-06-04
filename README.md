lv_font_conv - font convertor to compact bitmap format
======================================================

[![Build Status](https://img.shields.io/travis/littlevgl/lv_font_conv/master.svg?style=flat)](https://travis-ci.org/littlevgl/lv_font_conv)
[![NPM version](https://img.shields.io/npm/v/lv_font_conv.svg?style=flat)](https://www.npmjs.org/package/lv_font_conv)

Converts TTF/WOFF fonts to __[compact format](https://github.com/littlevgl/lv_font_conv/blob/master/doc/font_spec.md)__, suitable for small embedded systems. Main features are:

- Allows bitonal and anti-aliased glyphs (1-4 bits per pixel).
- Preserves kerning info.
- Compression.
- Users can select required glyphs only (subsetting).
- Multiple font sources can be merged.
- Simple CLI interface, easy to integrate into external build systems.


## Install the script

[node.js](https://nodejs.org/en/download/) v10+ required.

Global install of the last version, execute as "lv_font_conv"

```sh
# install release from npm registry
npm i lv_font_conv -g
# install from github's repo, master branch
npm i littlevgl/lv_font_conv -g
```

**run via [npx](https://www.npmjs.com/package/npx) without install**

```sh
# run from npm registry
npx lv_font_conv -h
# run from github master
npx github:littlevgl/lv_font_conv -h
```

Note, runing via `npx` may take some time until modules installed, be patient.

## CLI params

Common:

- `--bpp` - bits per pixel (antialiasing).
- `--size` - output font size (pixels).
- `-o`, `--output` - output path (file or directory, depends on format).
- `--format` - output format.
  - `--format dump` - dump glyph images and font info, useful for debug.
  - `--format bin` - dump font in binary form (as described in [spec](https://github.com/littlevgl/lv_font_conv/blob/master/doc/font_spec.md)).
  - `--format lvgl` - dump font in [LittlevGL](https://github.com/littlevgl/lvgl) format.

Per font:

- `--font` - path to font file (ttf/woff/woff2). May be used multiple time for
  merge.
- `-r`, `--range` - single glyph or range + optional mapping, belongs to
  previously declared `--font`. Can be used multiple times. Examples:
  - `-r 0x1F450` - single value, dec or hex format.
  - `-r 0x1F450-0x1F470` - range.
  - `-r '0x1F450=>0xF005'` - single glyph with mapping.
  - `-r '0x1F450-0x1F470=>0xF005'` - range with mapping.
  - `-r 0x1F450 -r 0x1F451-0x1F470` - 2 ranges.
  - `-r 0x1F450,0x1F451-0x1F470` - the same as above, but defined with single `-r`.
- `--symbols` - list of characters to copy (instead of numeric format in `-r`).
  - `--symbols 0123456789.,` - extract chars to display numbers

Additional debug options:

- `--no-compress` - disable built-in RLE compression.
- `--no-prefilter` - disable bitmap lines filter (XOR), used to improve
  compression ratio.
- `--no-kerning` - drop kerning info to reduce size (not recommended).
- `--full-info` - don't shorten 'font_info.json' (include pixels data).


## Examples

Merge english from Roboto Regular and icons from Font Awesome, and show debug
info:

`env DEBUG=* lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F --font FontAwesome.ttf -r 0xFE00=>0x81 --size 16 --format bin --bpp 3 -o output.font`

Merge english & russian from Roboto Regular, and show debug info:

`env DEBUG=* lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F -r 0x401,0x410-0x44F,0x451 --size 16 --format bin --bpp 3 -o output.font`

Dump all Roboto glyphs to inspect icons and font details:

`lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F --size 16 --format dump --bpp 3 -o ./dump`
