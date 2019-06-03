import './index.scss';
import 'bootstrap';

const convert = require('../lib/convert');

let selectedFile = null;

document.querySelector('#sourceFontFile').addEventListener('change', function handleFiles() {
  const fileList = this.files;

  if (!fileList.length) {
    selectedFile = null;
    return;
  }

  const file = fileList[0];

  const reader = new FileReader();
  reader.onload = e => {
    selectedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      data: e.target.result
    };
  };
  reader.readAsArrayBuffer(file);

}, false);


// helper
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}


document.querySelector('#converterForm').addEventListener('submit', function handleSubmit(e) {
  e.preventDefault();

  /*eslint-disable no-console*/
  console.log(selectedFile);

  const result = convert({
    font: [
      {
        source_path: selectedFile.name,
        source_bin: selectedFile.data,
        ranges: [
          { range: [ 0x20, 0x7f, 0x20 ] }
        ]
      }
    ],
    size: 16,
    bpp: 4,
    format: 'dump',
    output: './'
  }, createCanvas);

  console.log(result);

}, false);
