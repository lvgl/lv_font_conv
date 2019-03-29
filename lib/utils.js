
'use strict';


module.exports.autocrop = function autocrop(glyph) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // scan the entire image trying to find bbox
  for (let y = 0; y < glyph.bbox.height; y++) {
    for (let x = 0; x < glyph.bbox.width; x++) {
      if (glyph.pixels[y][x]) {
        minX = x > minX ? minX : x;
        minY = y > minY ? minY : y;
        maxX = x < maxX ? maxX : x;
        maxY = y < maxY ? maxY : y;
      }
    }
  }

  // create new pixels array
  let pixels = [];

  for (let y = minY; y <= maxY; y++) {
    let line = [];

    for (let x = minX; x <= maxX; x++) {
      line.push(glyph.pixels[y][x]);
    }

    pixels.push(line);
  }

  let bbox;

  if (minX <= maxX && minY <= maxY) {
    bbox = {
      x: minX + glyph.bbox.x,
      y: minY + glyph.bbox.y,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  } else {
    // bounding box doesn't exist, e.g. whitespace
    bbox = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  return Object.assign({}, glyph, { pixels, bbox });
};


function set_byte_depth(depth) {
  return function (byte) {
    // calculate significant bits, e.g. for depth=2 it's 0, 1, 2 or 3
    let value = ~~(byte / (256 >> depth));

    // spread those bits around 0..255 range, e.g. for depth=2 it's 0, 85, 170 or 255
    let scale = (2 << (depth - 1)) - 1;

    return (value * 0xFFFF / scale) >> 8;
  };
}


module.exports.set_depth = function set_depth(glyph, depth) {
  let pixels = [];
  let fn = set_byte_depth(depth);

  for (let y = 0; y < glyph.bbox.height; y++) {
    pixels.push(glyph.pixels[y].map(fn));
  }

  return Object.assign({}, glyph, { pixels });
};


module.exports.get_max_bbox = function get_max_bbox(glyphs) {
  let bboxMax = { x: 0, y: 0, width: 0, height: 0 };

  for (let glyph of glyphs) {
    if (bboxMax.width === 0 && bboxMax.height === 0) {
      bboxMax = glyph.bbox;
    } else {
      let minX = Math.min(glyph.bbox.x, bboxMax.x);
      let minY = Math.min(glyph.bbox.y, bboxMax.y);
      let maxX = Math.max(glyph.bbox.x + glyph.bbox.width, bboxMax.x + bboxMax.width) - 1;
      let maxY = Math.max(glyph.bbox.y + glyph.bbox.height, bboxMax.y + bboxMax.height) - 1;

      bboxMax = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      };
    }
  }

  return bboxMax;
};
