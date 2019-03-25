// Parse ranges and expand them into single object

'use strict';

function parse_number(str) {
  let m = /^(?:(?:0x([0-9a-f]+))|([0-9]+))$/i.exec(str.trim());

  if (!m) throw new Error(str + ' is not a number');

  let [ , hex, dec ] = m;

  let value = hex ? parseInt(hex, 16) : parseInt(dec, 10);

  if (value > 0x10FFFF) throw new Error(str + ' is out of unicode range');

  return value;
}


function parse_range(str) {
  let m = /^(.+?)(?:-(.+?))?(?:=>(.+?))?$/i.exec(str);

  let [ , start, end, mapped_start ] = m;

  if (!end) end = start;
  if (!mapped_start) mapped_start = start;

  start = parse_number(start);
  end = parse_number(end);

  if (start > end) throw new Error('Invalid range: ' + str);

  mapped_start = parse_number(mapped_start);

  return [ start, end, mapped_start ];
}

module.exports = parse_range;
