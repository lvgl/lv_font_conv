1.1.1 / 2020-09-01
------------------

- `--version` should show number from `package.json`.


1.1.0 / 2020-07-27
------------------

- Added `post.underlinePosition` & `post.underlineThickness` info to font header.


1.0.0 / 2020-06-26
------------------

- Maintenance release.
- Set package version 1.x, to label package as stable.
- Deps bump.


0.4.3 / 2020-03-05
------------------

- Enabled `--bpp 8` mode.


0.4.2 / 2020-01-05
------------------

- Added `--lv_include` option to set alternate `lvgl.h` path.
- Added guards to hide `.subpx` property for lvgl 6.0 (supported from 6.1 only), #32.
- Dev deps bump


0.4.1 / 2019-12-09
------------------

- Allow memory growth for FreeType build, #29.
- Dev deps bump.
- Web build update.


0.4.0 / 2019-11-29
------------------

- Note, this release is for lvgl 6.1 and has potentially breaking changes
  (see below). If you have compatibility issues with lvgl 6.0 - use previous
  versions or update your code.
- Spec change: added subpixels info field to font header (header size increased).
- Updated `bin` & `lvgl` writers to match new spec.
- lvgl: fixed data type for kerning values (needs appropriate update
  in LittlevGL 6.1+).
- Fix errors display (disable emscripten error catcher).


0.3.1 / 2019-10-24
------------------

- Fixed "out of range" error for big `--size`.


0.3.0 / 2019-10-12
------------------

- Added beta options `--lcd` & `--lcd-v` for subpixel rendering (still need
  header info update).
- Added FreeType data properties to dump info.
- Fixed glyph width (missed fractional part after switch to FreeType).
- Fixed missed sigh for negative X/Y bitmap offsets.
- Deps bump.


0.2.0 / 2019-09-26
------------------

- Use FreeType renderer. Should solve all regressions, reported in 0.1.0.
- Enforced light autohinting (horizontal lines only).
- Use special hinter for monochrome output (improve quality).
- API changed to async.
- Fix: added missed `.bitmap_format` field to lvgl writer.
- Fix: changed struct fields init order to match declaration, #25.


0.1.0 / 2019-09-03
------------------

- First release.
