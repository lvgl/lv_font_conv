'use strict';

const commonjs = require('@rollup/plugin-commonjs');
const nodePolyfills = require('rollup-plugin-polyfill-node');
const nodeResolve = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');

module.exports = () => ({
  input: 'web/convert_browser.js',
  output: {
    dir: 'esm_output',
    format: 'es',        // Specifies the output format as ES Modules
    // This isn't getting polyfilled automatically, so we add it manually.
    // Polyfill for 'global' in browser, 'globalThis' is standard for both browser and Nodes.
    intro: 'let global = globalThis;'
  },
  plugins: [
    commonjs(), // Converts CJS modules in dependencies/source to ESM
    json(),
    nodeResolve({
      browser: true, // Prioritizes the 'browser' field in package.json
      preferBuiltins: false // Tells Rollup to not prefer built-ins (like 'fs')
    }),
    // Must come after commonjs and nodeResolve
    nodePolyfills({
      include: [ 'node_modules/**/*', '**/*.js' ],
      exclude: [ /argparse/ ]
    })
  ]
});
