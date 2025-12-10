# lv_font_conv

[![CI](https://github.com/lvgl/lv_font_conv/workflows/CI/badge.svg?branch=master)](https://github.com/lvgl/lv_font_conv/actions)
[![NPM version](https://img.shields.io/npm/v/lv_font_conv.svg?style=flat)](https://www.npmjs.org/package/lv_font_conv)

Convert TTF/WOFF/OTF fonts into a [compact bitmap format](https://github.com/lvgl/lv_font_conv/blob/master/doc/font_spec.md) that fits small embedded systems. Key capabilities:

- Supports bitonal and anti-aliased glyphs (1-4 bits per pixel).
- Preserves kerning data.
- Built-in compression.
- Subset selection for only the glyphs you need.
- Merge multiple font sources.
- Simple CLI that plugs easily into build systems.

## Installation

Requires [Node.js](https://nodejs.org/en/download/) v14+.

Global install of the latest release:

```sh
# Install from npm
npm i lv_font_conv -g
# Install from GitHub (master branch)
npm i lvgl/lv_font_conv -g
```

Run via [npx](https://www.npmjs.com/package/npx) without installing:

```sh
# From npm
npx lv_font_conv -h
# From GitHub master
npx github:lvgl/lv_font_conv -h
```

`npx` downloads dependencies on first use, so the initial run can take a moment.

## CLI options

Common:

- `--bpp` - bits per pixel (antialiasing).
- `--size` - output font size (pixels).
- `-o`, `--output` - output path (file or directory, depending on format).
- `--format` - output format.
  - `--format dump` - export glyph images and font info for debugging.
  - `--format bin` - export a binary font (see the [spec](https://github.com/lvgl/lv_font_conv/blob/master/doc/font_spec.md)).
  - `--format lvgl` - export in [LVGL](https://github.com/lvgl/lvgl) format.
- `--force-fast-kern-format` - always use the faster kerning storage format at the cost of some size; if size differs, it is reported.
- `--lcd` - generate bitmaps with 3x horizontal resolution for subpixel smoothing.
- `--lcd-v` - generate bitmaps with 3x vertical resolution for subpixel smoothing.
- `--use-color-info` - try to use glyph color data to create grayscale icons. Gray tones are emulated via transparency, so contrasty backgrounds work best.
- `--lv-include` - with `--format lvgl`, set an alternate path for `lvgl.h`.
- `--no-compress` - disable built-in RLE compression.
- `--no-prefilter` - disable the XOR prefilter that improves compression ratio.
- `--byte-align` - pad bitmap lines to whole bytes (requires `--no-compress` and `--bpp != 3`).
- `--no-kerning` - drop kerning info to reduce size (not recommended).

Per-font:

- `--font` - path to a font file (ttf/woff/woff2/otf). May be used multiple times for merging.
- `-r`, `--range` - single glyph or range with optional mapping for the previously declared `--font`. Can be used multiple times. Examples:
  - `-r 0x1F450` - single value (dec or hex).
  - `-r 0x1F450-0x1F470` - range.
  - `-r '0x1F450=>0xF005'` - single glyph with mapping.
  - `-r '0x1F450-0x1F470=>0xF005'` - range with mapping.
  - `-r 0x1F450 -r 0x1F451-0x1F470` - two ranges.
  - `-r 0x1F450,0x1F451-0x1F470` - same as above with a single `-r`.
- `--symbols` - list of characters to copy (instead of numeric format in `-r`).
  - `--symbols 0123456789.,` - extract characters for numbers.
- `--autohint-off` - do not force autohinting ("light" is on by default).
- `--autohint-strong` - use stronger autohinting (will break kerning).

Debug:

- `--full-info` - do not shorten `font_info.json` (include pixel data).

## Examples

Merge English from Roboto Regular and icons from Font Awesome, and show debug info:

`env DEBUG=* lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F --font FontAwesome.ttf -r 0xFE00=>0x81 --size 16 --format bin --bpp 3 --no-compress -o output.font`

Merge English and Russian from Roboto Regular, and show debug info:

`env DEBUG=* lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F -r 0x401,0x410-0x44F,0x451 --size 16 --format bin --bpp 3 --no-compress -o output.font`

Dump all Roboto glyphs to inspect icons and font details:

`lv_font_conv --font Roboto-Regular.ttf -r 0x20-0x7F --size 16 --format dump --bpp 3 -o ./dump`

**Note:** `--no-compress` is temporary to avoid confusion until LVGL adds compression support.

## Technical notes

### Supported output formats

1. **bin** - universal binary format as described in https://github.com/lvgl/lv_font_conv/tree/master/doc.
2. **lvgl** - C file for LVGL. Slightly larger because C cannot easily define relative offsets in data blocks.
3. **dump** - folder with each glyph in a separate image plus JSON font data (debug-friendly).

### Merged font metrics

When multiple fonts are merged, sources can have different metrics. The result follows these rules:

1. No scaling. Glyphs keep the size intended by the font authors.
2. Baseline is shared.
3. `OS/2` metrics (`sTypoAscender`, `sTypoDescender`, `sTypoLineGap`) come from the first font in the list.
4. `hhea` metrics (`ascender`, `descender`), defined as the max/min point of all glyphs, are recalculated for the merged set.

## Development

The package includes a WebAssembly build of FreeType with helper functions. Docker wraps everything, so you do not need manual tool installs. See `package.json` for more commands; use these if you upgrade FreeType or helpers.

Build the Docker image with Emscripten and FreeType (usually once):

```sh
npm run build:dockerimage
```

Compile helpers and create the WebAssembly files:

```sh
npm run build:freetype
```

Local development notes:

- On Apple Silicon or other ARM hosts, Docker may pull `emscripten/emsdk:3.1.1` for `linux/amd64`. If you see a platform warning, either set `DOCKER_DEFAULT_PLATFORM=linux/amd64` or choose an ARM-compatible base image before running the Docker-based build scripts.
- To preview the web UI locally, run `npm start`. Parcel serves `web/index.html`, listens on `http://localhost:1234` by default (set `PORT` to override), and opens your browser automatically.
- Note: `package.json` omits the `main` field to keep Parcel’s development server running fine; CLI entry remains via the `bin` field (`lv_font_conv.js`).
- Browser bundle note: the web UI uses a browser-safe converter (`web/convert_browser.js`) that excludes Node-only writers. You can also run `npm run build` and open `dist/index.html` to verify the browser bundle works without Node APIs.
