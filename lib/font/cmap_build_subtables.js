// Find an optimal configuration of cmap tables representing set of codepoints,
// using simple breadth-first algorithm
//
// It assumes that codepoints have one-to-one correspondence to glyph ids,
// and glyph ids are always bigger for bigger codepoints (this way we can omit
// glyph ids from all calculations entirely: if codepoints fit in format0,
// then glyph ids also will).
//
// format6 is not considered, because if glyph ids can be delta-coded,
// multiple format0 tables are guaranteed to be smaller than a single format6.
//

'use strict';


function estimate_format0_tiny_size(/*start_code, end_code*/) {
  return 16;
}

function estimate_format0_size(start_code, end_code) {
  return 16 + (end_code - start_code + 1);
}

function estimate_sparse_size(count) {
  return 16 + count * 4;
}

function estimate_sparse_tiny_size(count) {
  return 16 + count * 2;
}

module.exports = function cmap_split(all_codepoints) {
  all_codepoints = all_codepoints.sort((a, b) => a - b);

  let min_paths = [];

  for (let i = 0; i < all_codepoints.length; i++) {
    let min = { dist: Infinity };

    for (let j = 0; j <= i; j++) {
      let prev_dist = (j - 1 >= 0) ? min_paths[j - 1].dist : 0;
      let s;

      if (all_codepoints[i] - all_codepoints[j] < 256) {
        s = estimate_format0_size(all_codepoints[j], all_codepoints[i]);

        /* eslint-disable max-depth */
        if (prev_dist + s < min.dist) {
          min = {
            dist: prev_dist + s,
            start: j,
            end: i,
            format: 'format0'
          };
        }
      }

      if (all_codepoints[i] - all_codepoints[j] < 256 && all_codepoints[i] - i === all_codepoints[j] - j) {
        s = estimate_format0_tiny_size(all_codepoints[j], all_codepoints[i]);

        /* eslint-disable max-depth */
        if (prev_dist + s < min.dist) {
          min = {
            dist: prev_dist + s,
            start: j,
            end: i,
            format: 'format0_tiny'
          };
        }
      }

      s = estimate_sparse_size(i - j + 1);

      if (prev_dist + s < min.dist) {
        min = {
          dist: prev_dist + s,
          start: j,
          end: i,
          format: 'sparse'
        };
      }

      s = estimate_sparse_tiny_size(i - j + 1);

      if (prev_dist + s < min.dist) {
        min = {
          dist: prev_dist + s,
          start: j,
          end: i,
          format: 'sparse_tiny'
        };
      }
    }

    min_paths[i] = min;
  }

  let result = [];

  for (let i = all_codepoints.length - 1; i >= 0;) {
    let path = min_paths[i];
    result.unshift([ path.format, all_codepoints.slice(path.start, path.end + 1) ]);
    i = path.start - 1;
  }

  return result;
};
