# Bitmap fonts format for embedded systems

This spec defines binary bitmap fonts format, usable for embedded systems with
constrained resources. Main features are:

- Kerning support (existing BDF/PCF fonts don't have it).
- Different bits per pixel (1..4). Usable for bi-tonal and anti-aliased fonts.
- Highly optimized storage size (keep bounding-box data only, with built-in
  compression).

Based on https://docs.microsoft.com/en-us/typography/opentype/spec/,
but simplified for bitmap fonts:

- No separate global header, everything in 'head' table
- `advanceWidth` placed in `glyf` table
- Total glyphs count limited to 65536 (char codes are not limited, up to 0x10FFFF
  supported).
- No vertical fonts.
- No ligatures.

All multi-byte numbers are stored in LE (little-endian) order.

## Table: `head` (font header)

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/head)

Global values.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `head` (table marker)
4 | Version (reserved)
2 | Number of additional tables (2 bytes to simplify align)
2 | Font size (px), as defined in convertor params
2 | Ascent (uint16), as returned by `Font.ascender` of `opentype.js` (usually HHead ascent)
2 | Descent (int16, negative), as returned by `Font.descender` of `opentype.js` (usually HHead descent)
2 | typoAscent (uint16), typographic ascent
2 | typoDescent (int16), typographic descent
2 | typoLineGap (uint16), typographic line gap
2 | min Y (used to quick check line intersections with other objects)
2 | max Y
2 | default advanceWidth (uint16), if glyph advanceWidth bits length = 0
2 | kerningScale, FP12.4 unsigned, scale for kerning data, to fit source in 1 byte
1 | indexToLocFormat in `loca` table (`0` - Offset16, `1` - Offset32)
1 | glyphIdFormat (`0` - 1 byte, `1` - 2 bytes)
1 | advanceWidthFormat (`0` - Uint, `1` - unsigned with 4 bits fractional part)
1 | Bits per pixel (1, 2, 3 or 4)
1 | Glyph BBox x/y bits length (unsigned)
1 | Glyph BBox w/h bits length (unsigned)
1 | Glyph advanceWidth bits length (unsigned, may be FP4)
1 | Compression alg ID (0 - raw bits, 1 - RLE-like with XOR prefilter, 2 - RLE-like only without prefilter)
1 | Subpixel rendering. `0` - none, `1` - horisontal resolution of bitmaps is 3x, `2` - vertical resolution of bitmaps is 3x.
1 | Reserved (align to 2x)
2 | Underline position (int16), scaled `post.underlinePosition`
2 | Underline thickness (uint16), scaled `post.underlineThickness`
x | Unused (Align header length to 4x)

Note, `Ascent + abs(Descent)` may be NOT equal to font size.


## Table: `cmap`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap)

Map code points to internal IDs. Consists of optimized "subtables" for compact
data store.

Differs from original by list of fixed subtable headers for quick lookup.
Subtable formats implemented only partially.

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

All subtables are non intersecting ranges, headers and content
are ordered by codePoint for fast scan or binary search.

### Subtable header

Size (bytes) | Description
-------------|------------
4 | Data offset (or 0 if data segment not exists)
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

"Missed" chars are mapped to 0


### Subtable "format sparse" data

For non continuous sets (CJK subsets, for example). `Array[entries]` of
delta-coded codepoints + `Array[entries]` of delta-coded glyph IDs.

bytes | description
------|------------
2 | (codePoint1 - range_start)
2 | (codePoint2 - range_start)
...|...
2 |(last codepoint - range_start)
2 | delta-encoded Glyph1 ID
2 | delta-encoded Glyph2 ID
... | ...
2 | delta-encoded last glyph ID


### Subtable "format 0 tiny"

Special case of "format 0", without IDs index.

In most of cases, glyph IDs will be consecutive and have no gaps. Then we can
calculate ID value as `glyph ID offset + codepoint index`.

In total, this format will have header only, without data.


### Subtable "format sparse tiny"

Exactly as "format sparse", but without glyph IDs index at the end
(with codepoints only).

See "format 0 tiny" for explanations.


## Table: `loca`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/loca)

Data offsets in `glyf` table for each glyph id. Can be `Offset16` or `Offset32`.
Type is defined in `head` table.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `loca` (table marker)
4 | Entries count (4 to simplify slign)
2 or 4 | id1 offset
2 or 4 | id2 offset
... | ...


## Table: `glyf`

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf)

Contains glyph bitmap data. Data offsets for each id defined in `loca` table.

Coordinate system is `(right, up)` - point `(0, 0)` located at (baseline, left)
corner - as in OpenType fonts. Glyph BBox's `(x, y)` defines bottom left corner.

Image inside of BBox is drawn from top left corner, to right and down.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `glyf` (table marker)
?? | Glyph id1 data
?? | Glyph id2 data
...| ...

Note, Glyph ID 0 is reserved for "undefined". It's recommended set it to
0xFFFE char image.

**Note**. Glyph data is NOT aligned (now) and should be loaded byte-by-byte.


### Glyph data

Stream of bits.

Note, bounding box is NOT related to typographic area (height * advanceWidth),
and can be shifted anyhow. Real image can overflow typographic space.

Size (bits) | Description
------------|------------
NN | advanceWidth (length/format in font header, may have 4 fractional bits)
NN | BBox X (length in font header)
NN | BBox Y (see length in font header
NN | BBox Width (see length in font header)
NN | BBox Height (see length in font header)
?? | Compressed bitmap

If bitmaps are generated for subpixel rendering, then BBox Width or BBox Height
value will be 3x more than "normal" one. They always contain real size of
content, not rendered size.


## Table `kern`

Initial References: [1](https://docs.microsoft.com/en-us/typography/opentype/spec/kern),
[2](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6kern.html)

Kerning info is optional. Only a very small subset of `kern`/`GPOS` features is
supported:

- Horisontal kerning only.
- 2 subtables formats, for compact store (sorted pairs and table of glyph classes).
- No feature stacking (combination of subtables). `kern` table contain just data
  in one of supported formats.

Stored kerning values are - always FP4.4 fixed point with sign. It should be
multiplied to FP12.4 `kerningScale` from font header. Note, 7 bits resolution is
enough for our simple needs. But kerning of fonts > 40px can exceed max value
of signed FP4.4. So `kerningScale` allows properly scale covered range.

Data layout:

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | `kern` (table marker)
1 | Format type (0 & 3 now supported)
3 | - (align)
?? | format content

### Format 0 (Sorted pairs)

Just a sorted list of `(id_left, id_right, value)`, where id's are combined into
`uint32_t`, and binary searchable. This format may provide some saving for
`ascii` set (english), but become very ineffective for multiple languages.

Unlike original, id pairs and values are stored separate to simplify align.

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

Kerning pair size depends on `glyphIdFormat` from header.

### Format 3 (Array M*N of classes)

See Apple's [truetype reference](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6kern.html).

Data format is very similar to one, suggested by Apple. The only difference is,
we store kerning values directly (without index), because values are
always 1 byte.

Content:

Size (bytes) | Description
-------------|------------
2 | The number of glyphs in this font (class mapping length). `M`.
1 | The number of left-hand classes (table rows wigth). `W`.
1 | The number of right-hand classes (table column height). `H`.
M | left-hand classes mapping, index = glyph_id, value => class id.
M | right-hand classes mapping.
W*H| kerning values array.

Note about class mappings. Class id `0` is reserved and means "kerning not
exists" for this glyph. It's NOT stored in kerning array.

Rsulting data is: `kerningArray[(leftClass-1)*rightClassesCount + (rightClass-1)]`

As been said in original spec, this format is restricted by 256 classes. But
that's enough for very complex cases. For full `Roboto Regular` font dump,
size of auto-restored table is ~80*100 (under auto-restore we mean reverse-build
process, because initially kerning data is extracted for "pairs" without regard
to structures behind). For this reason `Format 2` support was not added to this
spec.


## Compression

Glyph data uses modified RLE compression - [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf), with prefilter and tuned options.

Everything works with "pixels" (groups of 2, 3, 4 or 8 bits). That will not work
for bitonal fonts, but those are small enough.

Notable compression gain starts with ~30px sizes. That's explained by 2 moments:

- Kerning table occupies fixed size, notable for small fonts.
- We already "compress" input - store bounding box data only.

But since decompression costs nothing, we keep it on always, except 1-bpp fonts.

### Pre-filter

Prior to compress data, lines are XOR-ed with previous ones. That gives 10%
of additional gain. Since we don't use advanced entropy encoding, XOR will be
enough and more effective than diff:

- XOR does not depend on pixel resolution/encoding.
- Can be optimized with word-wide operations if needed.

### Compression algorithm

1. At least 1 repeat requires to fall into RLE mode (first pixel pass as is).
   That helps to pass anti-aliasing pixels without size increase.
2. First 10 repeats are replaced with `1` bit (`0` - end).
3. Next (11-th) is followed by 6-bit counter. If counter overflows, max possible
  value used, and process starts from beginning (1).

See [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf)
for initial idea and images.

Constants (repeats & counter size) are found by experimenting with different
font sizes & bpp. Those don't affect result too much (only 1-2%).

Also see:

- [Compressor sources](https://github.com/lvgl/lv_font_conv/blob/master/lib/font/compress.js).
- [Compressor tests](https://github.com/lvgl/lv_font_conv/blob/master/test/font/test_compress.js).

### Decompression

Everything done in reverse to compression. Data length determined by bitmap size.

To improve performance, you may apply this "hacks" on decompress stage:

1. Align lines in decompressed images to 1 or 4 bytes, to simplify next
   operations. For example, post-filter's lines XOR can be done by words.
2. Return 3-bpp pixels as 4-bpp or 8-bpp, to simplify compose.
