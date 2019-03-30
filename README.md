lv_font_conv - font convertor for LittlevGL
===========================================

[![Build Status](https://img.shields.io/travis/littlevgl/lv_font_conv/master.svg?style=flat)](https://travis-ci.org/littlevgl/lv_font_conv)
[![NPM version](https://img.shields.io/npm/v/lv_font_conv.svg?style=flat)](https://www.npmjs.org/package/lv_font_conv)

[WIP]

Converts TTF fonts to internal LittlevGL format. Supports subsetting & merge.

## Usage example

TBD


## Install the script

[node.js](https://nodejs.org/en/download/) required.

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


## CLI params

Common:

- `--bpp` - bits per pixel (antialiasing).
- `--size` - output font size (pixels).
- `-o`, `--output` - output path (file or directory, depends on format).
- `--format` - output format.
  - `--format dump` - dump glyph images and font info, useful for debug.


Per font:

- `--font` - path to font file (ttf/woff/woff2). May be used multiple time for
  merge.
- `-r`, `--range` - single glyph or range + optional mapping, belongs to
  previously declared `--font`. Examples:
  - `-r 0x1F450` - single value, dec or hex format.
  - `-r 0x1F450-0x1F470` - range.
  - `-r 0x1F450=>0xF005` - single glyph with mapping.
  - `-r 0x1F450-0x1F470=>0xF005` - range with mapping.
- `--symbols` - list of characters to copy (instead of numeric format in `-r`).
  - `--symbols 0123456789.,` - extract chars to display numbers
