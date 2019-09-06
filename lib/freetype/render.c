#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
float test(float a, float b)
{
  return a + b;
}
