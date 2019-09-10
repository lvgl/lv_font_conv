#!/bin/sh

mkdir -p /src/lv_font_conv/lib/freetype/build

emcc --bind \
  -o /src/lv_font_conv/lib/freetype/build/ft_render.js \
  /src/lv_font_conv/lib/freetype/render.c \
  -L/usr/local/lib -lfreetype -I/usr/local/include/freetype2 \
  -s "EXPORTED_FUNCTIONS=[\
    '_FT_Init_FreeType',\
    '_FT_Done_FreeType',\
    '_FT_New_Memory_Face',\
    '_FT_Done_Face',\
    '_FT_Set_Char_Size',\
    '_FT_Set_Pixel_Sizes',\
    '_FT_Get_Char_Index',\
    '_FT_Load_Glyph',\
    '_FT_Render_Glyph',\
    '_init_constants'\
  ]"\
  -s "EXTRA_EXPORTED_RUNTIME_METHODS=[\
    'ccall',\
    'getValue',\
    'writeArrayToMemory'\
  ]"\
  -s MODULARIZE=1
