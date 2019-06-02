const convert = require('../lib/convert');

let selectedFile1 = null;
let selectedFile2 = null;

function handleFiles1() {
  const fileList1 = this.files;

  if (!fileList1.length) {
    selectedFile1 = null;
    return;
  }

  const file1 = fileList1[0];

  const reader1 = new FileReader();
  reader1.onload = e => {
    selectedFile1 = {
      name: file1.name,
      size: file1.size,
      type: file1.type,
      data: e.target.result
    };
  };
  reader1.readAsArrayBuffer(file1);
}

function handleFiles2() {
  const fileList2 = this.files;

  if (!fileList2.length) {
    selectedFile2 = null;
    return;
  }

  const file2 = fileList2[0];

  const reader2 = new FileReader();
  reader2.onload = e => {
    selectedFile2 = {
      data: e.target.result,
      name: file2.name,
      size: file2.size,
      type: file2.type
    };
  };
  reader2.readAsArrayBuffer(file2);
}


function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

document.querySelector('#font_file_1').addEventListener('change', handleFiles1, false);
document.querySelector('#font_file_2').addEventListener('change', handleFiles2, false);

document.querySelector('#converterForm').addEventListener('submit', function handleSubmit(e) {
  e.preventDefault();

  var _name = document.getElementById('name').value;
  var _size = document.getElementById('height').value;
  var _bpp = document.getElementById('bpp').value;
  /* eslint-disable max-depth, radix */
  let fcnt = 0;
  let fonts = [];
  let r_str = document.getElementById('range_1').value;
  let syms = document.getElementById('symbols_1').value;
  if (selectedFile1 && (r_str.length || syms.length)) {
    fonts[fcnt] = {
      source_path: selectedFile1.name,
      source_bin: selectedFile1.data,
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

  r_str = document.getElementById('range_2').value;
  syms = document.getElementById('symbols_2').value;
  if (selectedFile2 && (r_str.length || syms.length)) {
    fonts[fcnt] = {
      source_path: selectedFile2.name,
      source_bin: selectedFile2.data,
      ranges: [ { range : [], symbols:'' } ] };
    fonts[fcnt].ranges[0].symbols = syms;
    if (r_str.length) {
      let r_sub = r_str.split(',');
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
  }

  const result = convert({
    font: fonts,
    size: parseInt(_size, 10),
    bpp: parseInt(_bpp, 10),
    no_compress : true,
    no_prefilter : true,
    format: 'lvgl',
    output: _name
  }, createCanvas);

  var FileSaver = require('file-saver');

  var blob = new Blob([ result[_name] ], {
    type: 'text/plain;charset=utf-8'
  });

  FileSaver.saveAs(blob, _name + '.c');
}, false);
