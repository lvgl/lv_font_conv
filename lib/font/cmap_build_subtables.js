/**
 * Find an optimal configuration of cmap tables representing a set of codepoints,
 * using a simple breadth-first algorithm.
 *
 * Assumptions:
 *  - Codepoints have one-to-one correspondence to glyph IDs.
 *  - Glyph IDs increase with codepoints.
 *  - Glyph IDs are consecutive (1..N without gaps).
 *
 * With those assumptions we can omit glyph IDs from calculations entirely:
 * if codepoints fit in format0, glyph IDs will as well.
 *
 * Format6 is not considered; if glyph IDs can be delta-coded,
 * multiple format0 tables are guaranteed to be smaller than a single format6.
 *
 * Sparse format is not used because, with consecutive glyph IDs,
 * sparse_tiny will always be preferred.
 */

'use strict';

function estimate_format0_tiny_size(/*start_code, end_code*/) {
  return 16;
}

function estimate_format0_size(start_code, end_code) {
  return 16 + (end_code - start_code + 1);
}

// function estimate_sparse_size(count) {
//   return 16 + count * 4;
// }

function estimate_sparse_tiny_size(count) {
  return 16 + count * 2;
}

module.exports = function cmap_split(all_codepoints) {
  all_codepoints = all_codepoints.sort((a, b) => a - b);

  const min_paths = [];

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

      // Tiny sparse will always be preferred over full sparse because glyph ids are consecutive
      if (all_codepoints[i] - all_codepoints[j] < 65536) {
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
    }

    min_paths[i] = min;
  }

  const result = [];

  for (let i = all_codepoints.length - 1; i >= 0;) {
    let path = min_paths[i];
    result.unshift([ path.format, all_codepoints.slice(path.start, path.end + 1) ]);
    i = path.start - 1;
  }

  return result;
};
