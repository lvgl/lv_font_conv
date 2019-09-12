FROM trzeci/emscripten

RUN wget https://sourceforge.net/projects/freetype/files/freetype2/2.10.1/freetype-2.10.1.tar.xz && \
    tar xf freetype-2.10.1.tar.xz

RUN apt-get -qq -y update && \
    apt-get -qq install -y --no-install-recommends file

RUN cd freetype-2.10.1 && \
    gcc -o objs/apinames src/tools/apinames.c && \
    emconfigure ./configure CFLAGS='-Os -D FT_CONFIG_OPTION_SYSTEM_ZLIB=1 -s USE_ZLIB=1' && \
    emmake make && \
    emmake make install
