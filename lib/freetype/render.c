#include <emscripten.h>
#include <ft2build.h>
#include FT_FREETYPE_H

static void set_js_variable(char* name, int value) {
  char buffer[strlen(name) + 32];
  sprintf(buffer, "Module.%s = %d;", name, value);
  emscripten_run_script(buffer);
}

// Expose constants, used in calls from js
void init_constants()
{
  set_js_variable("FT_LOAD_DEFAULT",               FT_LOAD_DEFAULT);
  set_js_variable("FT_LOAD_NO_HINTING",            FT_LOAD_NO_HINTING);
  set_js_variable("FT_LOAD_RENDER",                FT_LOAD_RENDER);
  set_js_variable("FT_LOAD_FORCE_AUTOHINT",        FT_LOAD_FORCE_AUTOHINT);
  set_js_variable("FT_LOAD_PEDANTIC",              FT_LOAD_PEDANTIC);
  set_js_variable("FT_LOAD_MONOCHROME",            FT_LOAD_MONOCHROME);
  set_js_variable("FT_LOAD_NO_AUTOHINT",           FT_LOAD_NO_AUTOHINT);

  set_js_variable("FT_RENDER_MODE_NORMAL",         FT_RENDER_MODE_NORMAL);
  set_js_variable("FT_RENDER_MODE_MONO",           FT_RENDER_MODE_MONO);

  set_js_variable("FT_KERNING_DEFAULT",            FT_KERNING_DEFAULT);
  set_js_variable("FT_KERNING_UNFITTED",           FT_KERNING_UNFITTED);
  set_js_variable("FT_KERNING_UNSCALED",           FT_KERNING_UNSCALED);

  set_js_variable("OFFSET_FACE_GLYPH",             offsetof(FT_FaceRec, glyph));
  set_js_variable("OFFSET_GLYPH_BITMAP_LEFT",      offsetof(FT_GlyphSlotRec, bitmap_left));
  set_js_variable("OFFSET_GLYPH_BITMAP_TOP",       offsetof(FT_GlyphSlotRec, bitmap_top));
  set_js_variable("OFFSET_GLYPH_BITMAP_WIDTH",     offsetof(FT_GlyphSlotRec, bitmap.width));
  set_js_variable("OFFSET_GLYPH_BITMAP_ROWS",      offsetof(FT_GlyphSlotRec, bitmap.rows));
  set_js_variable("OFFSET_GLYPH_BITMAP_PITCH",     offsetof(FT_GlyphSlotRec, bitmap.pitch));
  set_js_variable("OFFSET_GLYPH_BITMAP_ADVANCE_X", offsetof(FT_GlyphSlotRec, advance.x));
  set_js_variable("OFFSET_GLYPH_BITMAP_ADVANCE_Y", offsetof(FT_GlyphSlotRec, advance.y));
  set_js_variable("OFFSET_GLYPH_BITMAP_BUFFER",    offsetof(FT_GlyphSlotRec, bitmap.buffer));
}
