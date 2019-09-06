#!/bin/sh

mkdir -p ./lv_font_conf/lib/freetype/build

emcc --bind -o ./lv_font_conf/lib/freetype/build/ft_render.js ./lv_font_conf/lib/freetype/render.c -L/usr/local/lib -lfreetype -I/usr/local/include/freetype2 -s MODULARIZE=1
