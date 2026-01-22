const collect_font_data = require('../lib/collect_font_data');
const binWriter = require('../lib/writers/bin');
const lvglWriter = require('../lib/writers/lvgl');

const { parse_args } = require('../lib/parse_args');

const writers = {
  bin: binWriter,
  lvgl: lvglWriter
};

function correctFs(fs) {
  // Workaround to handle issue caused by polyfill
  // The ESM build is setup to polyfill Node APIs since it has to run in the browser.
  // The build will polyfill the Node Buffer. However, the build will also run in Node.
  // In Node, fs.readFileSync will be the actual Node fs.readFileSync which returns a Buffer.
  // However, that actual Buffer instance won't be the same as the polyfilled Buffer instance.
  // This causes issues when code later checks if the result of fs.readFileSync is an instance of Buffer.
  // To workaround this, we override fs.readFileSync to always return either a string or a polyfilled Buffer.
  function correctedReadFileSync(path, encoding) {
    const result = fs.readFileSync(path, encoding);

    if (!encoding) {
      // When run in Node, will convert an actual Node Buffer to a polyfilled Buffer.
      return Buffer.from(result);
    } else {
      return result;
    }
  }

  const correctedFs = {
    ...fs,
    readFileSync: correctedReadFileSync
  };

  return {
    parse_args: (argv, debug, path) => parse_args(argv, debug, correctedFs, path),
    convertBrowser: async args => {
      const font_data = await collect_font_data(args, correctedFs);
      const files = writers[args.format](args, font_data);

      return files;
    }
  };
}

module.exports = correctFs;
module.exports.formats = Object.keys(writers);
