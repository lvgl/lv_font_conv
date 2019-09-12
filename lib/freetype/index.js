'use strict';


const ft_render = require('./build/ft_render');

let m = null;     // freetype module
let library = 0;  // pointer to library struct in webasm


// workaround because of bug in emscripten:
// https://github.com/emscripten-core/emscripten/issues/5820
function module_init() {
  return new Promise(resolve => {
    ft_render().then(freetype => {
      m = freetype;
      resolve();
    });
  });
}


module.exports.init = async function () {
  if (!m) {
    await module_init();
    m._init_constants();
  }

  if (!library) {
    let ptr = m._malloc(4);
    let error = m.ccall('FT_Init_FreeType', 'number', [ 'number' ], [ ptr ]);

    if (error) {
      throw new Error(`error in FT_Init_FreeType: ${error}`);
    }

    library = m.getValue(ptr, 'i32');
    m._free(ptr);
  }
};


module.exports.fontface_create = function (source, size) {
  let ptr = m._malloc(4);
  let font_buf = m._malloc(source.length);
  let error;

  m.writeArrayToMemory(source, font_buf);

  error = m.ccall('FT_New_Memory_Face', 'number',
    [ 'number', 'number', 'number', 'number', 'number' ],
    [ library, font_buf, source.length, 0, ptr ]
  );

  if (error) {
    throw new Error(`error in FT_New_Memory_Face: ${error}`);
  }

  let face = m.getValue(ptr, 'i32');
  m._free(ptr);

  error = m.ccall('FT_Set_Char_Size', 'number',
    [ 'number', 'number', 'number', 'number', 'number' ],
    [ face, 0, size * 64, 300, 300 ]
  );

  if (error) {
    throw new Error(`error in FT_Set_Char_Size: ${error}`);
  }

  error = m.ccall('FT_Set_Pixel_Sizes', 'number',
    [ 'number', 'number', 'number' ],
    [ face, 0, size ]
  );

  if (error) {
    throw new Error(`error in FT_Set_Pixel_Sizes: ${error}`);
  }

  return {
    ptr: face,
    font: font_buf
  };
};


module.exports.glyph_exists = function (face, code) {
  let glyph_index = m.ccall('FT_Get_Char_Index', 'number',
    [ 'number', 'number' ],
    [ face.ptr, code ]
  );

  return glyph_index !== 0;
};


module.exports.glyph_render = function (face, code) {
  let glyph_index = m.ccall('FT_Get_Char_Index', 'number',
    [ 'number', 'number' ],
    [ face.ptr, code ]
  );

  if (glyph_index === 0) {
    throw new Error(`glyph does not exist for codepoint ${code}`);
  }

  let error;

  error = m.ccall('FT_Load_Glyph', 'number',
    [ 'number', 'number', 'number' ],
    [ face.ptr, glyph_index, m.FT_LOAD_DEFAULT ]
  );

  if (error) {
    throw new Error(`error in FT_Load_Glyph: ${error}`);
  }

  let glyph = m.getValue(face.ptr + m.OFFSET_FACE_GLYPH, 'i32');

  error = m.ccall('FT_Render_Glyph', 'number',
    [ 'number', 'number' ],
    [ glyph, m.FT_RENDER_MODE_NORMAL ]
  );

  if (error) {
    throw new Error(`error in FT_Render_Glyph: ${error}`);
  }

  let g_w = m.getValue(glyph + m.OFFSET_GLYPH_BITMAP_WIDTH, 'i32');
  let g_h = m.getValue(glyph + m.OFFSET_GLYPH_BITMAP_ROWS, 'i32');
  //let g_x = m.getValue(glyph + m.OFFSET_GLYPH_BITMAP_LEFT, 'i32');
  //let g_y = m.getValue(glyph + m.OFFSET_GLYPH_BITMAP_TOP, 'i32');
  let buffer = m.getValue(glyph + m.OFFSET_GLYPH_BITMAP_BUFFER, 'i32');

  /*let output = '';
  for (let y = 0; y < g_h; y++) {
    for (let x = 0; x < g_w; x++) {
      let value = m.getValue(buffer + y * g_w + x, 'i8');
      if (value) {
        output += (value + 0x100 + (value < 0 ? 0x100 : 0)).toString(16).slice(1) + ' ';
      } else {
        output += '    ';
      }
    }
    if (y !== g_h - 1) output += '\n';
  }*/

  let output = [];

  for (let y = 0; y < g_h; y++) {
    let line = [];
    for (let x = 0; x < g_w; x++) {
      let value = m.getValue(buffer + y * g_w + x, 'i8');
      line.push(value + (value < 0 ? 0x100 : 0));
    }
    output.push(line);
  }

  return output;
};


module.exports.fontface_destroy = function (face) {
  let error = m.ccall('FT_Done_Face', 'number', [ 'number' ], [ face.ptr ]);

  if (error) {
    throw new Error(`error in FT_Done_Face: ${error}`);
  }

  m._free(face.font);
  face.ptr = 0;
  face.font = 0;
};


module.exports.destroy = function () {
  let error = m.ccall('FT_Done_FreeType', 'number', [ 'number' ], [ library ]);

  if (error) {
    throw new Error(`error in FT_Done_FreeType: ${error}`);
  }

  library = 0;

  // don't unload webasm - slows down tests too much
  //m = null;
};
