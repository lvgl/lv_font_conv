'use strict';

/**
 * PixelOrder module - pixel bit ordering within bytes
 *
 * Provides MSB/LSB pixel reordering to control the bit arrangement
 * of pixels within each byte. Supports 1, 2, 4, 8 BPP configurations.
 */

const VALID_ORDERS = [ 'MSB', 'LSB' ];
const VALID_BPP = [ 1, 2, 4, 8 ];

/**
 * Validate pixel order parameter
 * @param {string} order - pixel order string
 * @returns {boolean} whether the order is valid
 */
function validateOrder(order) {
  return VALID_ORDERS.includes(order);
}

/**
 * Validate BPP parameter
 * @param {number} bpp - bits per pixel
 * @returns {boolean} whether the bpp is valid
 */
function validateBpp(bpp) {
  return VALID_BPP.includes(bpp);
}

/**
 * Reorder pixel bits within a single byte (byte-level post-processing)
 *
 * MSB mode: most significant bit represents the leftmost pixel (default, returned as-is)
 * LSB mode: least significant bit represents the leftmost pixel (requires bit reordering)
 *
 * @param {number} byte - input byte (0-255)
 * @param {number} bpp - bits per pixel (1, 2, 4, 8)
 * @param {string} order - 'MSB' or 'LSB'
 * @returns {number} reordered byte
 */
function reorderByte(byte, bpp, order) {
  if (!validateOrder(order)) {
    throw new Error(`Invalid pixel order: ${order}. Valid options: ${VALID_ORDERS.join(', ')}`);
  }
  if (!validateBpp(bpp)) {
    throw new Error(`Invalid BPP: ${bpp}. Valid options: ${VALID_BPP.join(', ')}`);
  }

  // MSB is the default behavior, no reordering needed
  if (order === 'MSB') {
    return byte & 0xFF;
  }

  // 8 BPP has only one pixel per byte, no reordering needed
  if (bpp === 8) {
    return byte & 0xFF;
  }

  // LSB mode: reverse the pixel order within the byte
  const pixelsPerByte = 8 / bpp;
  const mask = (1 << bpp) - 1;
  let result = 0;

  for (let i = 0; i < pixelsPerByte; i++) {
    // Extract pixel from original byte (high bits to low bits)
    const shift = (pixelsPerByte - 1 - i) * bpp;
    const pixel = (byte >> shift) & mask;

    // Place pixel at the reversed position (low bits to high bits)
    result |= pixel << (i * bpp);
  }

  return result;
}

/**
 * Reorder pixel bit ordering for an array of bytes
 * @param {Array<number>} bytes - byte array
 * @param {number} bpp - bits per pixel (1, 2, 4, 8)
 * @param {string} order - 'MSB' or 'LSB'
 * @returns {Array<number>} reordered byte array
 */
function reorderBytes(bytes, bpp, order) {
  if (!Array.isArray(bytes)) {
    throw new Error('bytes must be an array');
  }
  return bytes.map(b => reorderByte(b, bpp, order));
}

module.exports = {
  validateOrder,
  validateBpp,
  reorderByte,
  reorderBytes,
  VALID_ORDERS,
  VALID_BPP
};
