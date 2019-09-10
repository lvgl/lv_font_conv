#include <emscripten.h>
#include <ft2build.h>
#include FT_FREETYPE_H

static void set_js_variable(char* name, int value) {
  char buffer[strlen(name) + 32];
  sprintf(buffer, "Module.%s = %d;", name, value);
  emscripten_run_script(buffer);
}

// expose constants required in js
void init_constants()
{
  set_js_variable("FT_LOAD_DEFAULT",            FT_LOAD_DEFAULT);
  set_js_variable("FT_RENDER_MODE_NORMAL",      FT_RENDER_MODE_NORMAL);
  set_js_variable("OFFSET_FACE_GLYPH",          offsetof(FT_FaceRec, glyph));
  set_js_variable("OFFSET_GLYPH_BITMAP_LEFT",   offsetof(FT_GlyphSlotRec, bitmap_left));
  set_js_variable("OFFSET_GLYPH_BITMAP_TOP",    offsetof(FT_GlyphSlotRec, bitmap_top));
  set_js_variable("OFFSET_GLYPH_BITMAP_WIDTH",  offsetof(FT_GlyphSlotRec, bitmap.width));
  set_js_variable("OFFSET_GLYPH_BITMAP_ROWS",   offsetof(FT_GlyphSlotRec, bitmap.rows));
  set_js_variable("OFFSET_GLYPH_BITMAP_BUFFER", offsetof(FT_GlyphSlotRec, bitmap.buffer));
}
