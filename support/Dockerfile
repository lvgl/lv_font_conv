FROM emscripten/emsdk:1.40.1

RUN wget --no-check-certificate https://download.savannah.gnu.org/releases/freetype/freetype-2.10.4.tar.xz && \
    tar xf freetype-2.10.4.tar.xz

RUN apt-get -qq -y update && \
    apt-get -qq install -y --no-install-recommends file

RUN cd freetype-2.10.4 && \
    gcc -o objs/apinames src/tools/apinames.c && \
    mv ./modules.cfg ./modules.cfg.orig && \
    grep -v -E "+= type1|+= cid|+= pfr|+= type42|+= winfonts|+= pcf|+= bdf|+= cache|+= gxvalid|+= lzw|+= bzip2|+= otvalid" modules.cfg.orig > modules.cfg && \
    emconfigure ./configure CFLAGS='-Os -D FT_CONFIG_OPTION_SYSTEM_ZLIB -s USE_ZLIB=1 -DFT_CONFIG_OPTION_DISABLE_STREAM_SUPPORT' && \
    emmake make && \
    emmake make install
