0.3.0 / WIP
------------------

- Added options `--lcd` & `--lcd-v` for subpixel rendering.
- Added FreeType data properties to dump info.
- Fixed glyph width (missed fractional part after switch to FreeType)
- Fixed missed sigh for negative X/Y bitmap offsets.


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
