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
- `advanceWidth` placed in 'glyf' table
- Total glyphs count limited to 65536 (char codes are not limited, up to 0x10FFF
  supported).
- No vertical fonts.
- No ligatures.


## Table: 'head' (font header)

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/head)

Global values.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | 'head' (table marker)
2 | Version (reserved)
2 | Number of additional tables (2 bytes to simplify align)
2 | Font size (px), as defined in convertor params
2 | Ascent (uint16), as returned by `Font.ascender` of `opentype.js` (usually HHead ascent)
2 | Descent (int16, negative), as returned by `Font.descender` of `opentype.js` (usually HHead descent)
2 | typoAscent (uint16), typographic ascent
2 | typoDescent (int16), typographic descent
2 | typoLineGap (uint16), typographic line gap
2 | min Y (used to quick check line intersections with other objects)
2 | max Y
2 | default advanceWidth (if glyph advanceWidth bits length = 0)
1 | indexToLocFormat in `loca` table (`0` - Offset16, `1` - Offset32)
1 | glyphIdFormat (`0` - 1 byte, `1` - 2 bytes)
1 | kernFormat (`0` - 1 byte FP4.4, `1` - 2 bytes FP12.4)
1 | advanceWidthFormat (`0` - Uint, `1` - unsigned with 4 bits fractional part)
1 | Bits per pixel (1, 2, 3 or 4)
1 | Glyph BBox x/y bits length (signed value)
1 | Glyph BBox w/h bits length (unsigned)
1 | Glyph advanceWidth bits length (unsigned, may be FP4)
1 | Compression alg ID (0 - raw bits, other - TBD)

Note, `Ascent + abs(Descent)` may be NOT equal to font size.


## Table: 'cmap'

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap)

Map code points to internal IDs. Consists of optimized "subtables" for compact
data store.

Differs from original by list of fixed subtable headers for quick lookup.
Subtable formats implemented only partially.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | 'head' (table marker)
4 | Subtables count (4 to simplify align)
16 | Subtable 1 header
16 | Subtable 2 header
...|...
? | Subtable 1 data
? | Subtable 2 data
...|...

**NOTE**. Subtable data length MUST be aligned to 4.

All subtables are non intersecting ranges, headers and content
are ordered by codePoint for fast scan or binary search.

### Subtable header

Size (bytes) | Description
-------------|------------
4 | Data offset
4 | Range start (min codePoint)
2 | Range length (up to 65535)
2 | Glyph ID offset (for delta-coding in `Format 0`)
2 | Entries count
1 | Format type (`0` => Format 0, `1` => Format 6, `2` => Spatial)
1 | - (align to 4)

### Subtable Format 0 data

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap#format-0-byte-encoding-table)

`Array[uint8]`, continuous, delta-coded.

- Index = codePoint - (Min codePoint)
- Map to 1-byte Glyph ID as `Value + Glyph ID offset`.

bytes | description
------|------------
1 | delta-encoded Glyph ID for (range_start + 0) codePoint
1 | delta-encoded Glyph ID for (range_start + 1) codePoint
... | ...
1 | delta-encoded Glyph ID for (range_end) codePoint

**Note 1**. "Missed" chars are mapped to 0

**Note 2**. Since we order glyph by codePoint and generate Glyph IDs in the
same order, most of sequences can be effectively described via Format 0. This
may be not true for all theoretic cases, but seems to work for us.


### Subtable Format 6 data

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap#format-6-trimmed-table-mapping)

`Array[uint16]`, continuous, delta-coded.

The same as Format 0, but supports wider id range (up to 65535). This is
reserved and not used in current converter.

bytes | description
------|------------
2 | delta-encoded Glyph ID for (range_start + 0) codePoint
2 | delta-encoded Glyph ID for (range_start + 1) codePoint
... | ...
2 | delta-encoded Glyph ID for (range_end) codePoint


### Subtable format "spatial"

For non continuous sets (CJK subsets, for example). List of `uint16_t` pairs with
`{ delta_encoded_codepoint, glyph_id }`. Number of entries stored in
subtable header.

bytes | description
------|------------
2 | (codePoint1 - range_start)
2 | delta-encoded Glyph1 ID
2 | (codePoint2 - range_start)
2 | delta-encoded Glyph2 ID
... | ...


## Table: 'loca'

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/loca)

Data offsets in 'glyf' table for each glyph id. Can be `Offset16` or `Offset32`.
Type is defined in `head` table.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | 'loca' (table marker)
4 | Entries count (4 to simplify slign)
2 or 4 | id1 offset
2 or 4 | id2 offset
... | ...


## Table: 'glyf'

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf)

Contains glyph bitmap data. Data offsets for each id defined in `loca` table.

Coordinate system is `(right, up)` - point `(0, 0)` located at (baseline, left)
corner - as in OpenType fonts. Glyph BBox's `(x, y)` defines bottom left corner.

Image inside of BBox is drawn from top left corner, to right and down.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | 'glyf' (table marker)
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


## Table 'kern'

[Initial Reference](https://docs.microsoft.com/en-us/typography/opentype/spec/kern)

Kerning info (optional). Consists of 2 parts, to simplify aligned access:

1. Array of pairs `[ id_left, id_right ]`. Pairs are sorted and can be assessed
   as single number for fast binary search.
2. Array of kerning values for each pair.

Record elements:

- id - 1 or 2 bytes (glyph id from `cmap` table)
- kerning value - FP12.4 or FP4.4 fixed point value (1 or 2 bytes)

Size of glyph id & kerning value defined in `head` table.

Size (bytes) | Description
-------------|------------
4 | Record size (for quick skip)
4 | 'kern' (table marker)
4 | Entries count
2 or 4 | Kerning pair 1
2 or 4 | Kerning pair 2
...|...
2 or 4 | Kerning pair last
1 or 2 | Value 1
1 or 2 | Value 2
... | ...
1 or 2 | Value last


## Compression

Glyph data uses modified RLE compression - [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf), with prefilter and tuned options.

Everything works with "pixels" (groups of 2, 3 or 4 bits). That will not work
for bitonal fonts, but those are small enougth.

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
  value used, and process starts from begining (1).

See [I3BN](https://thesai.org/Downloads/Volume7No7/Paper_34-New_modified_RLE_algorithms.pdf)
for initial idea and images.

Constants (repeats & counter size) are found by experimenting with different
font sizes & bpp. Those don't affect result too much (only 1-2%).

Also see:

- [Compressor sources](https://github.com/littlevgl/lv_font_conv/blob/master/lib/font/compress.js).
- [Compressor tests](https://github.com/littlevgl/lv_font_conv/blob/master/test/font/test_compress.js).

### Decompression

Everything done in reverse to compression. Data length determined by bitmap size.

To improve performance, you may apply this "hacks" on decompress stage:

1. Align lines in decompressed images to 1 or 4 bytes, to simplify next
   operations. For example, post-filter's lines XOR can be done by words.
2. Return 3-bpp pixels as 4-bpp or 8-bpp, to simplify compose.
