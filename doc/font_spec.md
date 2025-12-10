# Bitmap font format for embedded systems

Compact binary bitmap font format tailored for embedded targets with limited
memory. Highlights:

- Kerning support (missing in legacy BDF/PCF).
- Configurable bits per pixel (1-4) for bitonal or anti-aliased glyphs.
- Storage optimized for bounding boxes with built-in compression.

The format is based on the OpenType spec (https://docs.microsoft.com/en-us/typography/opentype/spec/) but simplified for bitmaps:

- No separate global header; everything lives in the `head` table.
- `advanceWidth` moves to the `glyf` table.
- Glyph count limited to 65536 (code points still up to 0x10FFFF).
- No vertical fonts or ligatures.

Unless noted otherwise, multi-byte numbers are little-endian.


## Table: `head` (font header)

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/head)

Global values.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `head` (table marker)
4 | Version (reserved)
2 | Number of additional tables (2-byte align helper)
2 | Font size (px), as defined in converter params
2 | Ascent (uint16), from `Font.ascender` of `opentype.js` (usually HHead ascent)
2 | Descent (int16, negative), from `Font.descender` of `opentype.js` (usually HHead descent)
2 | typoAscent (uint16), typographic ascent
2 | typoDescent (int16), typographic descent
2 | typoLineGap (uint16), typographic line gap
2 | min Y (quick check for line intersections)
2 | max Y
2 | Default advanceWidth (uint16) if advanceWidth bits length = 0
2 | kerningScale, FP12.4 unsigned; scales kerning data to 1 byte
1 | indexToLocFormat in `loca` (`0` - Offset16, `1` - Offset32)
1 | glyphIdFormat (`0` - 1 byte, `1` - 2 bytes)
1 | advanceWidthFormat (`0` - uint, `1` - unsigned with 4 fractional bits)
1 | Bits per pixel (1, 2, 3, or 4)
1 | Glyph BBox x/y bits length (unsigned)
1 | Glyph BBox w/h bits length (unsigned)
1 | Glyph advanceWidth bits length (unsigned, may be FP4)
1 | Compression algorithm ID (0 - raw bits, 1 - RLE with XOR prefilter, 2 - RLE without prefilter)
1 | Subpixel rendering: `0` none, `1` horizontal x3, `2` vertical x3
1 | Reserved (align to 2x)
2 | Underline position (int16), scaled `post.underlinePosition`
2 | Underline thickness (uint16), scaled `post.underlineThickness`
x | Unused (align header length to 4x)

Note: `Ascent + abs(Descent)` may not equal font size.


## Table: `cmap`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap)

Maps code points to internal IDs via optimized subtables for compact storage.

Differs from the original by using fixed subtable headers for faster lookup.
Only a subset of subtable formats is implemented.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `cmap` (table marker)
4 | Subtables count (4 to simplify align)
16 | Subtable 1 header
16 | Subtable 2 header
...|...
? | Subtable 1 data (aligned to 4)
? | Subtable 2 data (aligned to 4)
...|...

All subtables are non-intersecting ranges. Headers and content are ordered by
codePoint for fast scan or binary search.

### Subtable header

Size (bytes) | Description
-------------|------------
4 | Data offset (or 0 if data segment does not exist)
4 | Range start (min codePoint)
2 | Range length (up to 65535)
2 | Glyph ID offset (for delta-coding)
2 | Data entries count (for sparse data)
1 | Format type (`0` => format 0, `1` => format sparse, `2` => format 0 tiny, `3` => format sparse tiny)
1 | - (align to 4)

### Subtable "format 0" data

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap#format-0-byte-encoding-table)

`Array[uint8]` (continuous, delta-coded), or empty data.

- Index = codePoint - (Min codePoint)
- Map to Glyph ID as `Value + Glyph ID offset`.

bytes | description
------|------------
1 | delta-encoded Glyph ID for (range_start + 0) codePoint
1 | delta-encoded Glyph ID for (range_start + 1) codePoint
... | ...
1 | delta-encoded Glyph ID for (range_end) codePoint

"Missed" chars map to 0.


### Subtable "format sparse" data

For non-continuous sets (CJK subsets, for example). `Array[entries]` of
delta-coded code points + `Array[entries]` of delta-coded glyph IDs.

bytes | description
------|------------
2 | (codePoint1 - range_start)
2 | (codePoint2 - range_start)
...|...
2 | (last codepoint - range_start)
2 | delta-encoded Glyph1 ID
2 | delta-encoded Glyph2 ID
... | ...
2 | delta-encoded last glyph ID


### Subtable "format 0 tiny"

Special case of "format 0" without IDs index.

In most cases, glyph IDs are consecutive and have no gaps. Then we can
calculate ID value as `glyph ID offset + codepoint index`.

This format has only a header and no data.


### Subtable "format sparse tiny"

Exactly as "format sparse", but without glyph ID index at the end
(code points only).

See "format 0 tiny" for details.


## Table: `loca`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/loca)

Data offsets in `glyf` for each glyph id. Can be `Offset16` or `Offset32`
(defined in `head`).

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `loca` (table marker)
4 | Entries count (4 to simplify align)
2 or 4 | id1 offset
2 or 4 | id2 offset
... | ...


## Table: `glyf`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf)

Contains glyph bitmap data. Data offsets for each id are defined in `loca`.

Coordinate system is `(right, up)` - point `(0, 0)` located at (baseline, left)
corner, as in OpenType fonts. Glyph BBox `(x, y)` defines bottom-left corner.

Image inside the BBox is drawn from top-left corner, to the right and down.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `glyf` (table marker)
?? | Glyph id1 data
?? | Glyph id2 data
...| ...

Note: Glyph ID 0 is reserved for "undefined". It is recommended to set it to
0xFFFE char image.

Glyph data is NOT aligned and should be loaded byte-by-byte.


### Glyph data

Stream of bits.

Bounding box is NOT tied to typographic area (height * advanceWidth) and can
shift. The real image can overflow typographic space.

Size (bits) | Description
------------|------------
NN | advanceWidth (length/format in font header, may have 4 fractional bits)
NN | BBox X (length in font header)
NN | BBox Y (length in font header)
NN | BBox Width (length in font header)
NN | BBox Height (length in font header)
?? | Compressed bitmap

If bitmaps are generated for subpixel rendering, then BBox Width or BBox Height
value will be 3x more than the "normal" one. They always contain real size of
content, not rendered size.


## Table `kern`

Initial References: [1](https://docs.microsoft.com/en-us/typography/opentype/spec/kern),
[2](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6kern.html)

Kerning info is optional. Only a small subset of `kern`/`GPOS` features is
supported:

- Horizontal kerning only.
- Two subtable formats for compact storage (sorted pairs and table of glyph classes).
- No feature stacking (combination of subtables). The `kern` table contains data
  in one of the supported formats.

Stored kerning values are always FP4.4 fixed point with sign. Multiply by
FP12.4 `kerningScale` from the font header. Seven-bit resolution covers common
cases, but kerning for fonts over 40px can exceed signed FP4.4. `kerningScale`
widens the usable range.

Data layout:

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `kern` (table marker)
1 | Format type (0 and 3 supported)
3 | - (align)
?? | Format content

### Format 0 (sorted pairs)

Sorted list of `(id_left, id_right, value)` where ids are combined into
`uint32_t` and binary searchable. Good for ASCII-size sets; inefficient for
multi-language.

Unlike the original, id pairs and values are stored separately for alignment.

Content:

Size (bytes) | Description
-------------|------------
4 | Entries (pairs) count
2 or 4 | Kerning pair 1 (glyph id left, glyph id right)
2 or 4 | Kerning pair 2
...|...
2 or 4 | Kerning pair last
1 | Value 1
1 | Value 2
... | ...
1 | Value last

Kerning pair size depends on `glyphIdFormat` from the header.

### Format 3 (array M*N of classes)

See Apple's [TrueType reference](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6kern.html).

Data format is very similar to the Apple suggestion, except kerning values are
stored directly (no index) because values are always 1 byte.

Content:

Size (bytes) | Description
-------------|------------
2 | The number of glyphs in this font (class mapping length). `M`.
1 | The number of left-hand classes (table rows width). `W`.
1 | The number of right-hand classes (table column height). `H`.
M | Left-hand classes mapping; index = glyph_id, value => class id.
M | Right-hand classes mapping.
W*H| Kerning values array.

Class id `0` is reserved and means "kerning does not exist" for this glyph. It is
NOT stored in the kerning array.

Resulting data index: `kerningArray[(leftClass-1)*rightClassesCount + (rightClass-1)]`

As noted in the original spec, this format is restricted to 256 classes. That is
enough for complex cases. For a full `Roboto Regular` font dump, size of
auto-restored table is about 80*100 (auto-restore means reverse-building from
pairs). For this reason `Format 2` support was not added to this spec.


## Compression

Glyph data uses modified RLE compression - [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf), with prefilter and tuned options.

Everything works with "pixels" (groups of 2, 3, 4, or 8 bits). That does not
work for bitonal fonts, but those are small enough.

Notable compression gain starts around 30px sizes because:

- Kerning table occupies fixed size, notable for small fonts.
- Input is already compacted by storing bounding box data only.

Decompression cost is negligible, so compression stays enabled except for 1-bpp
fonts.

### Pre-filter

Before compression, lines are XOR-ed with previous ones. That gives about 10%
extra gain. Since no advanced entropy encoding is used, XOR is sufficient and
often better than diff:

- XOR does not depend on pixel resolution/encoding.
- Can be optimized with word-wide operations if needed.

### Compression algorithm

1. At least 1 repeat is required to switch into RLE mode (first pixel passes as is).
   That helps to pass anti-aliasing pixels without size increase.
2. First 10 repeats are replaced with 1 bit (`0` - end).
3. Next (11th) is followed by 6-bit counter. If the counter overflows, max
   possible value is used and the process restarts from step 1.

See [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf)
for the initial idea and images.

Constants (repeats and counter size) were chosen by experimentation on different
font sizes and bpp. They do not affect results much (1-2%).

Also see:

- [Compressor sources](https://github.com/lvgl/lv_font_conv/blob/master/lib/font/compress.js).
- [Compressor tests](https://github.com/lvgl/lv_font_conv/blob/master/test/font/test_compress.js).

### Decompression

Everything is the reverse of compression. Data length is determined by bitmap size.

To improve performance, you may apply these hacks during decompression:

1. Align lines in decompressed images to 1 or 4 bytes to simplify later steps
   (for example, post-filter line XOR by words).
2. Return 3-bpp pixels as 4-bpp or 8-bpp to simplify composition.
