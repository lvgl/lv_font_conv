FROM trzeci/emscripten

RUN wget https://sourceforge.net/projects/freetype/files/freetype2/2.10.1/freetype-2.10.1.tar.xz && \
    tar xf freetype-2.10.1.tar.xz

RUN cd freetype-2.10.1 && \
    gcc -o objs/apinames src/tools/apinames.c && \
    emconfigure ./configure && \
    emmake make && \
    emmake make install
