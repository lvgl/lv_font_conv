const convert = require('../lib/convert');
const FileSaver = require('file-saver');

/*eslint-env jquery*/


function handleFiles() {
  const fileList = this.files;

  const $fontControls = $(this).closest('.font-controls');

  if (!fileList.length) {
    $fontControls.data('selected-file', null);
    return;
  }

  const file = fileList[0];

  const reader = new FileReader();
  reader.onload = e => {
    $(this).closest('.font-controls').data('selected-file', {
      name: file.name,
      size: file.size,
      type: file.type,
      data: e.target.result
    });
  };
  reader.readAsArrayBuffer(file);
}


function addFontFileChangeHandlers() {
  $('.font_file').off('change', handleFiles);
  $('.font_file').on('change', handleFiles);
}

function resetInput($e) {
  $e.wrap('<form>').closest('form').get(0).reset();
  $e.unwrap();
}

function addFont() {
  let $clone = $('#font-controls-clone-source').clone(false);
  resetInput($clone.find('.font_file'));
  resetInput($clone.find('.font_range'));
  resetInput($clone.find('.font_symbols'));
  $clone.data('selected-file', null); /* just to be sure */
  $clone.insertBefore($('#insert-button'));
  $('<button></button>').addClass('btn btn-primary btn-md').text('Remove this font').click(function () {
    $(this).parent().remove();
  }).insertBefore($clone.find('hr'));
  addFontFileChangeHandlers();
}

$('#insert-button').click(addFont);

addFontFileChangeHandlers();

document.querySelector('#converterForm').addEventListener('submit', function handleSubmit(e) {
  e.preventDefault();

  var _name = document.getElementById('name').value;
  var _size = document.getElementById('height').value;
  var _bpp = document.getElementById('bpp').value;
  /* eslint-disable max-depth, radix */
  let fcnt = 0;
  let fonts = [];
  let r_str;
  let syms;
  $('.font-controls').each(function (index, el) {
    let $fontControls = $(el);
    r_str = $fontControls.find('.font_range').val();
    syms = $fontControls.find('.font_symbols').val();
    let selectedFile = $fontControls.data('selected-file');
    if (selectedFile && (r_str.length || syms.length)) {
      fonts[fcnt] = {
        source_path: selectedFile.name,
        source_bin: Buffer.from(selectedFile.data),
        ranges: [ { range : [], symbols:'' } ] };
      fonts[fcnt].ranges[0].symbols = syms;
      let r_sub = r_str.split(',');
      if (r_str.length) {
        // Parse the ranges. A range is array with 3 elements:
        //[range start, range end, range remap start]
        // Multiple ranges just means
        //an other 3 element in the array
        for (let i = 0; i < r_sub.length; i++) {
          let r = r_sub[i].split('-');
          fonts[fcnt].ranges[0].range[i * 3 + 0] = parseInt(r[0]);
          if (r[1]) {
            fonts[fcnt].ranges[0].range[i * 3 + 1] = parseInt(r[1]);
          } else {
            fonts[fcnt].ranges[0].range[i * 3 + 1] = parseInt(r[0]);
          }
          fonts[fcnt].ranges[0].range[i * 3 + 2] = parseInt(r[0]);
        }
      }
      fcnt++;
    }
  });

  const AppError = require('../lib/app_error');

  const args = {
    font: fonts,
    size: parseInt(_size, 10),
    bpp: parseInt(_bpp, 10),
    no_compress : !(document.getElementById('compression').checked),
    lcd: document.getElementById('subpixel2').checked,
    lcd_v: document.getElementById('subpixel3').checked,
    use_color_info: document.getElementById('use_color_info').checked,
    format: 'lvgl',
    output: _name
  };

  convert(args).then(result => {
    const blob = new Blob([ result[_name] ], { type: 'text/plain;charset=utf-8' });

    FileSaver.saveAs(blob, _name + '.c');
  }).catch(err => {
    /*eslint-disable no-alert*/
    // Try to beautify normal errors
    if (err instanceof AppError) {
      alert(err.message.trim());
      return;
    }

    alert(err);

    /* eslint-disable no-console */
    console.error(err);
  });
}, false);
