'use strict';

const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');

module.exports = () => ({
  input: 'web/convert_browser.js', // Your main CJS entry file
  output: {
    dir: 'esm_output',      // The output directory for your bundled files
    format: 'es'        // Specifies the output format as ES Modules
  },
  plugins: [
    commonjs(), // This plugin converts CJS modules in your dependencies/source to ESM
    json()
  ]
});
